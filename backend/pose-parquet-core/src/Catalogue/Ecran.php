<?php
/**
 * « Catalogue Premibel » : un écran de CONSULTATION.
 *
 * Le catalogue n'est pas géré dans WordPress. Il est synchronisé depuis
 * Premibel par le dépôt du site (`node _generator/sync-premibel.js`), puis
 * le build publie son état dans `data/catalogue-etat.json`. Cet écran lit ce
 * fichier sur le site public et l'affiche : aucun produit ne s'édite ici, et
 * WordPress ne lance pas la synchronisation (il n'a pas accès au générateur).
 */

declare(strict_types=1);

namespace PoseParquet\Core\Catalogue;

use PoseParquet\Core\Admin\SitePublic;
use PoseParquet\Core\Admin\Socle;
use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Ecran {

	public const PAGE       = 'pose-parquet-catalogue';
	public const TRANSIENT  = 'pp_catalogue_etat';
	public const ACTUALISER = 'pp_catalogue_actualiser';

	public static function register(): void {
		add_action( 'admin_post_' . self::ACTUALISER, [ self::class, 'actualiser' ] );
	}

	public static function url_fichier(): string {
		$local = \PoseParquet\Core\Contenus\Apercu::dossier();
		return $local ? $local . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'catalogue-etat.json' : SitePublic::url() . 'data/catalogue-etat.json';
	}

	/**
	 * L'état publié, mis en cache cinq minutes.
	 *
	 * @return array{ok:bool,donnees?:array<string,mixed>,erreur?:string}
	 */
	public static function lire(): array {
		$cache = get_transient( self::TRANSIENT );
		if ( is_array( $cache ) ) {
			return [ 'ok' => true, 'donnees' => $cache ];
		}
		// Le dossier local du site s'il est réglé (développement), sinon le site public.
		$local = \PoseParquet\Core\Contenus\Apercu::dossier();
		if ( $local && is_readable( $local . '/data/catalogue-etat.json' ) ) {
			$corps = (string) file_get_contents( $local . '/data/catalogue-etat.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		} else {
			$r = wp_remote_get( self::url_fichier(), [ 'timeout' => 6, 'redirection' => 2 ] );
			if ( is_wp_error( $r ) ) {
				return [ 'ok' => false, 'erreur' => $r->get_error_message() ];
			}
			$code = (int) wp_remote_retrieve_response_code( $r );
			if ( $code !== 200 ) {
				return [ 'ok' => false, 'erreur' => 'HTTP ' . $code ];
			}
			$corps = (string) wp_remote_retrieve_body( $r );
		}
		$d = json_decode( $corps, true );
		if ( ! is_array( $d ) || (int) ( $d['version'] ?? 0 ) !== 1 || ! isset( $d['statuts'], $d['produits'] ) ) {
			return [ 'ok' => false, 'erreur' => __( 'fichier illisible ou de version inconnue', 'pose-parquet-core' ) ];
		}
		set_transient( self::TRANSIENT, $d, 5 * MINUTE_IN_SECONDS );
		return [ 'ok' => true, 'donnees' => $d ];
	}

	public static function actualiser(): void {
		if ( ! current_user_can( Capabilities::EDIT_CONTENTS ) ) {
			wp_die( '', '', [ 'response' => 403 ] );
		}
		check_admin_referer( self::ACTUALISER );
		delete_transient( self::TRANSIENT );
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE ) );
		exit;
	}

	private static function nombre( mixed $n ): string {
		return is_numeric( $n ) ? number_format_i18n( (int) $n ) : '—';
	}

	public static function render(): void {
		if ( ! current_user_can( Capabilities::EDIT_CONTENTS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), esc_html__( 'Accès refusé', 'pose-parquet-core' ), [ 'response' => 403 ] );
		}
		$etat = self::lire();
		echo '<div class="wrap">';
		Socle::entete( __( 'Catalogue Premibel', 'pose-parquet-core' ), __( 'Consultation seulement : le catalogue est piloté par la synchronisation avec Premibel, pas par WordPress.', 'pose-parquet-core' ) );

		if ( ! $etat['ok'] ) {
			echo '<p class="adm-avertissement">' . esc_html(
				sprintf(
					/* translators: 1: URL, 2: erreur */
					__( 'État du catalogue indisponible : le site public n’a pas répondu (%2$s) à l’adresse %1$s. Vérifiez l’adresse du site public dans Réglages.', 'pose-parquet-core' ),
					self::url_fichier(),
					(string) $etat['erreur']
				)
			) . '</p></div>';
			return;
		}
		$d = (array) $etat['donnees'];
		$s = (array) ( $d['statuts'] ?? [] );
		$i = (array) ( $d['images'] ?? [] );
		$g = (array) ( $d['photosPartagees'] ?? [] );

		// Le nombre de références d'abord, en grand ; les autres mesures à sa suite.
		echo '<div class="adm-chiffres adm-chiffres--principal">';
		Socle::chiffre( __( 'Références', 'pose-parquet-core' ), self::nombre( $d['produits'] ?? null ) );
		Socle::chiffre( __( 'Visualisables', 'pose-parquet-core' ), self::nombre( $d['visualisables'] ?? null ) );
		Socle::chiffre( __( 'Rendu fidèle', 'pose-parquet-core' ), self::nombre( $s['ready'] ?? null ) );
		Socle::chiffre( __( 'Rendu indicatif', 'pose-parquet-core' ), self::nombre( $s['approximate'] ?? null ) );
		Socle::chiffre( __( 'Non visualisables', 'pose-parquet-core' ), self::nombre( $s['unavailable'] ?? null ) );
		echo '</div>';

		// Deux blocs de même poids, puis la synchronisation en pleine largeur.
		echo '<div class="adm-colonnes-2">';
		Socle::carte_ouvrir( __( 'État de synchronisation', 'pose-parquet-core' ) );
		$date = isset( $d['derniereSynchro'] ) ? strtotime( (string) $d['derniereSynchro'] ) : false;
		Socle::etat(
			[
				[ __( 'Date', 'pose-parquet-core' ), $date ? wp_date( 'j F Y à H:i', $date ) : '—' ],
				[ __( 'Source', 'pose-parquet-core' ), (string) wp_parse_url( (string) ( $d['source'] ?? '' ), PHP_URL_HOST ) ],
				[ __( 'Produits lus chez Premibel', 'pose-parquet-core' ), self::nombre( $d['produitsApi'] ?? null ) ],
				[ __( 'Parquets retenus', 'pose-parquet-core' ), self::nombre( $d['produits'] ?? null ) ],
				[ __( 'Références inactives', 'pose-parquet-core' ), self::nombre( $d['inactifs'] ?? null ) ],
			]
		);
		Socle::carte_fermer();

		Socle::carte_ouvrir( __( 'Qualité des images', 'pose-parquet-core' ) );
		$erreurs  = (int) ( $i['erreurs'] ?? 0 );
		$douteux  = (int) ( $g['douteux'] ?? 0 );
		Socle::etat(
			[
				[ __( 'Erreurs d’images', 'pose-parquet-core' ), self::nombre( $erreurs ), $erreurs ? 'ko' : 'ok' ],
				[ __( 'Images écartées', 'pose-parquet-core' ), sprintf( '%s (%s sans photo, %s avec bandeau de prix)', self::nombre( $i['ecartees'] ?? 0 ), self::nombre( $i['placeholders'] ?? 0 ), self::nombre( $i['bandeaux'] ?? 0 ) ) ],
				[ __( 'Photos partagées entre références', 'pose-parquet-core' ), sprintf( '%s groupes', self::nombre( $g['groupes'] ?? 0 ) ) ],
				[ __( 'Avertissements', 'pose-parquet-core' ), sprintf( '%s groupes douteux', self::nombre( $douteux ) ), $douteux ? 'attente' : 'ok' ],
			],
			__( 'Un groupe douteux : plusieurs références montrent la même photo sans être des variantes évidentes. À vérifier chez Premibel, pas ici.', 'pose-parquet-core' )
		);
		Socle::carte_fermer();
		echo '</div>';

		// La synchronisation : comment elle se lance, d'où l'écran lit l'état.
		$relire = '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="adm-carte__formulaire"><input type="hidden" name="action" value="' . esc_attr( self::ACTUALISER ) . '">'
			. wp_nonce_field( self::ACTUALISER, '_wpnonce', true, false )
			. '<button type="submit" class="adm-bouton adm-bouton--petit"><span class="dashicons dashicons-image-rotate" aria-hidden="true"></span>' . esc_html__( 'Relire l’état publié', 'pose-parquet-core' ) . '</button></form>';
		Socle::carte_ouvrir( __( 'Synchronisation', 'pose-parquet-core' ) );
		echo '<div class="adm-sync">';
		echo '<div><p class="adm-carte__aide">' . esc_html__( 'Elle se lance depuis le dépôt du site, puis le build publie le nouvel état :', 'pose-parquet-core' ) . '</p>';
		echo '<pre class="adm-commande"><code>' . esc_html( (string) ( $d['commande'] ?? 'node _generator/sync-premibel.js' ) ) . '</code></pre>';
		echo '<p class="adm-carte__aide">' . esc_html__( 'Lu sur :', 'pose-parquet-core' ) . ' <code>' . esc_html( self::url_fichier() ) . '</code></p></div>';
		echo '<div><div class="adm-info"><span class="dashicons dashicons-info-outline" aria-hidden="true"></span><span>' . esc_html__( 'WordPress ne lance pas la synchronisation : il n’a pas accès au générateur du site, et aucun produit ne s’édite ici. Les prix ne sont jamais importés.', 'pose-parquet-core' ) . '</span></div>';
		echo $relire . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- composé et échappé ci-dessus.
		echo '</div>';
		Socle::carte_fermer();
		echo '</div>';
	}
}
