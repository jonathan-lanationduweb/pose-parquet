<?php
/**
 * La file des notifications : le visiteur n'attend plus le SMTP.
 *
 * MESURÉ AVANT. Une soumission réelle depuis le formulaire prenait 5 007 ms
 * dans le navigateur, dont 4 300 ms côté serveur. L'écriture en base en
 * consommait une trentaine ; tout le reste était deux appels à `wp_mail()`
 * qui échouaient au bout de ~2,1 s chacun, faute de SMTP joignable. Le
 * visiteur attendait donc quatre secondes des emails qui ne partaient pas,
 * puis lisait « Demande enregistrée ».
 *
 * Le diagnostic tient en une phrase : la remise d'un email est un travail
 * d'arrière-plan, et elle était dans le chemin de la requête.
 *
 *   AVANT   validation → base → historique → email → email → 201
 *   APRÈS   validation → base → historique → mise en file → 201
 *                                                  ↓
 *                                       (plus tard) email, réessai, état
 *
 * CE QUE LA MISE EN FILE NE CHANGE PAS. Elle ne fait pas partir un email qui
 * ne partait pas. Sans transport configuré, les envois échouent toujours —
 * simplement, ils échouent sans faire attendre personne, et l'échec se voit
 * dans l'administration au lieu de se deviner dans un journal.
 *
 * L'ORDONNANCEUR. On s'appuie sur WP-Cron, déjà présent, plutôt que sur une
 * table de file maison : moins de code, et le même mécanisme que tout le
 * reste de WordPress.
 *
 *   `wp_schedule_single_event()` porte le numéro de tentative dans ses
 *   arguments. Pas de colonne à ajouter, pas de migration, et deux tentatives
 *   d'un même envoi ne peuvent pas se confondre : WordPress déduplique sur le
 *   couple (hook, arguments), et l'argument diffère à chaque tentative.
 *
 * LOCAL. `DISABLE_WP_CRON` vaut `true` dans ce WordPress de développement, et
 * on ne le réactive pas en douce : aucune notification ne partira toute seule.
 * Deux façons de vider la file à la main, toutes deux passant par
 * `executer_echeances()` :
 *
 *   le bouton « Traiter la file maintenant » de Pose Parquet → État ;
 *   `php backend/tools/traiter-file-mail.php <racine WordPress>`.
 *
 * PRODUCTION. Un vrai cron système, une fois par minute :
 *
 *   * * * * * curl -s https://exemple.fr/wp-cron.php?doing_wp_cron >/dev/null
 *
 * avec `DISABLE_WP_CRON` à `true` pour que la requête d'un visiteur ne
 * déclenche jamais l'ordonnanceur. Voir docs/backend/production.md.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Mail;

use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Support\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Queue {

	/** Le hook planifié. Un seul, avec le type en argument. */
	public const HOOK = 'pose_parquet_envoyer_notification';

	/**
	 * Combien de fois on tente un envoi avant de le déclarer perdu.
	 *
	 * Quatre, et pas davantage : au-delà, ce n'est plus un incident passager,
	 * c'est une configuration à corriger — et une file qui réessaie
	 * indéfiniment masque exactement cela.
	 */
	public const MAX_TENTATIVES = 4;

	/**
	 * Attente avant CHAQUE tentative, en secondes.
	 *
	 * La première est à zéro : l'envoi part au tout prochain passage de
	 * l'ordonnanceur, donc en quelques secondes en production. Les suivantes
	 * s'espacent — cinq minutes, une demi-heure, deux heures — parce qu'un
	 * SMTP qui vient de refuser refusera encore dans la seconde, et que la
	 * panne qui dure se répare à la main, pas à la force du réessai.
	 */
	private const DELAIS = [ 1 => 0, 2 => 300, 3 => 1800, 4 => 7200 ];

	/**
	 * Branche la file sur l'ordonnanceur. Appelé au démarrage du plugin.
	 *
	 * Le hook est enregistré sur TOUTES les requêtes, pas seulement en
	 * administration : c'est wp-cron.php, qui n'est ni une page d'admin ni
	 * une route REST, qui le déclenchera.
	 */
	public static function register(): void {
		add_action( self::HOOK, [ self::class, 'traiter' ], 10, 4 );
	}

	/**
	 * Met en file les deux notifications d'une demande fraîchement créée.
	 *
	 * Rendu : l'état de chacune AU MOMENT DE LA RÉPONSE. `pending` veut dire
	 * « acceptée, pas encore tentée » — et c'est la vérité, pas un optimisme.
	 * La réponse HTTP ne prétend donc jamais qu'un email est parti.
	 *
	 * @return array{internal:string,visitor:string}
	 */
	public static function enfiler( int $project_id, string $request_id, ?Notifier $notifier = null, ?Repository $repository = null ): array {
		$notifier   = $notifier ?? new Notifier();
		$repository = $repository ?? new Repository();
		$etats      = [];

		foreach ( Notifier::TYPES as $type ) {
			if ( ! $notifier->concerne( $type ) ) {
				// Choix de réglage, pas incident : on le fige tout de suite.
				$repository->set_mail_status( $project_id, $type, Notifier::STATUS_SKIPPED, null );
				$etats[ $type ] = Notifier::STATUS_SKIPPED;
				continue;
			}
			self::planifier( $project_id, $type, 1, $request_id );
			$etats[ $type ] = Notifier::STATUS_PENDING;
		}

		return $etats;
	}

	/** Programme une tentative. */
	public static function planifier( int $project_id, string $type, int $tentative, string $request_id ): void {
		$delai = self::DELAIS[ $tentative ] ?? end( self::DELAIS );
		wp_schedule_single_event( time() + $delai, self::HOOK, [ $project_id, $type, $tentative, $request_id ] );
	}

	/**
	 * Une tentative d'envoi, déclenchée par l'ordonnanceur.
	 *
	 * IDEMPOTENCE. C'est la garantie la plus importante de cette classe, et
	 * elle ne repose pas sur la file : elle repose sur l'état en base. Un
	 * envoi déjà `sent` ou `skipped` ne repart pas, quel que soit le nombre de
	 * fois où l'événement est rejoué — double passage de cron, événement
	 * dupliqué, bouton cliqué deux fois. La file peut se tromper ; la colonne,
	 * non.
	 *
	 * CONCURRENCE. Deux exécutions simultanées liraient toutes deux `pending`
	 * et enverraient toutes deux. Un verrou MySQL nommé, pris sans attente,
	 * tranche : celui qui ne l'obtient pas s'en va, l'autre travaille. Même
	 * mécanisme que la réservation des jetons de formulaire, pour la même
	 * raison — il n'exige ni table, ni extension, ni service.
	 */
	public static function traiter( int $project_id, string $type, int $tentative = 1, string $request_id = '' ): void {
		if ( ! in_array( $type, Notifier::TYPES, true ) ) {
			return;
		}

		global $wpdb;
		$cle    = 'pp_mail_' . $project_id . '_' . $type;
		$verrou = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $cle ) );
		if ( (string) $verrou === '0' ) {
			return; // Une autre exécution s'en occupe.
		}

		try {
			$repository = new Repository();
			$project    = $repository->find_by_id( $project_id );
			if ( ! $project ) {
				Logger::error( 'Notification sans demande', [ 'request_id' => $request_id, 'project_id' => $project_id ] );
				return;
			}

			$etat = (string) ( $project[ $type . '_mail_status' ] ?? '' );
			if ( $etat === Notifier::STATUS_SENT || $etat === Notifier::STATUS_SKIPPED ) {
				return; // Déjà réglé : on ne renvoie pas.
			}

			$notifier = new Notifier();
			if ( ! $notifier->concerne( $type ) ) {
				$repository->set_mail_status( $project_id, $type, Notifier::STATUS_SKIPPED, null );
				return;
			}

			$resultat = $notifier->tenter( $project, $type );

			if ( $resultat['ok'] ) {
				$repository->set_mail_status( $project_id, $type, Notifier::STATUS_SENT, current_time( 'mysql', true ) );
				return;
			}

			$reste = $resultat['retryable'] && $tentative < self::MAX_TENTATIVES;
			if ( $reste ) {
				// On reste `pending` : la demande est toujours en file.
				self::planifier( $project_id, $type, $tentative + 1, $request_id );
				Logger::warning( 'Email non envoyé, nouvelle tentative programmée', [
					'request_id' => $request_id,
					'project_id' => $project_id,
					'mail_type'  => $type,
					'error_code' => $resultat['code'],
					'tentative'  => $tentative,
					'sur'        => self::MAX_TENTATIVES,
				] );
				return;
			}

			$repository->set_mail_status( $project_id, $type, Notifier::STATUS_FAILED, null );
			Logger::warning( 'Email non envoyé', [
				'request_id' => $request_id,
				'project_id' => $project_id,
				'mail_type'  => $type,
				'error_code' => $resultat['code'],
				'tentative'  => $tentative,
				'definitif'  => true,
			] );
		} finally {
			if ( $verrou !== null ) {
				$wpdb->query( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $cle ) );
			}
		}
	}

	/**
	 * Les événements de cette file qui sont dus, exécutés tout de suite.
	 *
	 * Sert au bouton de l'administration et au script de développement. En
	 * production, c'est le cron système qui appelle wp-cron.php et WordPress
	 * fait ce travail lui-même — cette méthode n'est alors qu'un filet.
	 *
	 * On ne touche QUE les événements de notre hook : vider la file de
	 * quelqu'un d'autre ne nous regarde pas.
	 *
	 * @return array{traites:int,restants:int}
	 */
	public static function executer_echeances( int $limite = 50 ): array {
		$maintenant = time();
		$traites    = 0;
		$restants   = 0;

		foreach ( (array) _get_cron_array() as $horodatage => $hooks ) {
			if ( ! isset( $hooks[ self::HOOK ] ) ) {
				continue;
			}
			foreach ( $hooks[ self::HOOK ] as $evenement ) {
				$args = array_values( (array) ( $evenement['args'] ?? [] ) );
				if ( $horodatage > $maintenant || $traites >= $limite ) {
					$restants++;
					continue;
				}
				// Retirer AVANT d'exécuter : si l'envoi relance une tentative,
				// c'est le nouvel événement qui compte, pas l'ancien.
				wp_unschedule_event( $horodatage, self::HOOK, $args );
				self::traiter( ...array_pad( array_slice( $args, 0, 4 ), 4, '' ) );
				$traites++;
			}
		}

		return [ 'traites' => $traites, 'restants' => $restants ];
	}

	/**
	 * Combien d'envois attendent, et le plus ancien depuis quand.
	 *
	 * Lu par l'écran « État » : une file qui grossit sans jamais se vider est
	 * le symptôme d'un ordonnanceur qui ne tourne pas, et c'est précisément ce
	 * qu'on veut voir d'un coup d'œil.
	 *
	 * @return array{total:int,dus:int,prochain:?int}
	 */
	public static function etat(): array {
		$maintenant = time();
		$total      = 0;
		$dus        = 0;
		$prochain   = null;

		foreach ( (array) _get_cron_array() as $horodatage => $hooks ) {
			if ( ! isset( $hooks[ self::HOOK ] ) ) {
				continue;
			}
			$n      = count( $hooks[ self::HOOK ] );
			$total += $n;
			if ( $horodatage <= $maintenant ) {
				$dus += $n;
			}
			if ( $prochain === null || $horodatage < $prochain ) {
				$prochain = (int) $horodatage;
			}
		}

		return [ 'total' => $total, 'dus' => $dus, 'prochain' => $prochain ];
	}

	/**
	 * Retire tous nos événements planifiés.
	 *
	 * Appelé à la désactivation : laisser des événements pointant vers un hook
	 * que plus personne n'écoute encombrerait le cron du site sans rien
	 * envoyer. Les états en base, eux, ne sont pas touchés — c'est de
	 * l'information, pas de la planification.
	 */
	public static function purger(): void {
		if ( function_exists( 'wp_unschedule_hook' ) ) {
			wp_unschedule_hook( self::HOOK );
		}
	}
}
