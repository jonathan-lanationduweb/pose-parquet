<?php
/**
 * Mode maintenance : réglages, écran d'administration, aperçu.
 *
 * Une option, six valeurs : actif, titre, message, image de fond (médiathèque)
 * et deux liens à afficher (Premibel, Allure Design). L'écran reprend la
 * maquette : formulaire à gauche, aperçu de la page publique à droite.
 *
 * Où la page s'affiche réellement :
 *   - sur le WordPress lui-même (Maintenance\Page), en HTTP 503 ;
 *   - sur le site statique, par le générateur, qui lit ces réglages dans
 *     l'export des contenus (voir docs/backend/wordpress-contenus.md).
 */

declare(strict_types=1);

namespace PoseParquet\Core\Maintenance;

use PoseParquet\Core\Contenus\Export;
use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Reglages {

	public const OPTION  = 'pose_parquet_maintenance';
	public const PAGE    = 'pose-parquet-maintenance';
	public const ACTION  = 'pp_maintenance_enregistrer';
	public const APERCU  = 'pp_maintenance_apercu';
	public const BASCULER = 'pp_maintenance_basculer';

	public const PREMIBEL_URL = 'https://www.premibel.fr/parquet/';
	public const ALLURE_URL   = 'https://www.allure-design.com/demander-un-devis/';

	/** @return array{actif:bool,titre:string,message:string,image:int,premibel:bool,allure:bool} */
	public static function defauts(): array {
		return [
			'actif'    => false,
			'titre'    => 'Le site revient bientôt.',
			'message'  => 'Nous effectuons actuellement une mise à jour de Pose-Parquet. En attendant, vous pouvez poursuivre votre projet auprès de nos deux destinations.',
			'image'    => 0,
			'premibel' => true,
			'allure'   => true,
		];
	}

	/** @return array{actif:bool,titre:string,message:string,image:int,premibel:bool,allure:bool} */
	public static function lire(): array {
		$v = get_option( self::OPTION, [] );
		$v = is_array( $v ) ? $v : [];
		return array_merge( self::defauts(), array_intersect_key( $v, self::defauts() ) );
	}

	public static function actif(): bool {
		return (bool) self::lire()['actif'];
	}

	public static function register(): void {
		add_action( 'admin_post_' . self::ACTION, [ self::class, 'enregistrer' ] );
		add_action( 'admin_post_' . self::APERCU, [ self::class, 'apercu' ] );
		add_action( 'admin_post_' . self::BASCULER, [ self::class, 'basculer' ] );
	}

	/** Pour l'export : ce que le site statique doit afficher. */
	public static function pour_export(): array {
		$m = self::lire();
		return [
			'actif'   => (bool) $m['actif'],
			'titre'   => $m['titre'],
			'message' => $m['message'],
			'image'   => Export::image( (int) $m['image'] ),
			'liens'   => [ 'premibel' => (bool) $m['premibel'], 'allure' => (bool) $m['allure'] ],
		];
	}

	public static function url(): string {
		return admin_url( 'admin.php?page=' . self::PAGE );
	}

	public static function render(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), esc_html__( 'Accès refusé', 'pose-parquet-core' ), [ 'response' => 403 ] );
		}
		$m         = self::lire();
		$image_url = $m['image'] ? (string) wp_get_attachment_image_url( (int) $m['image'], 'medium' ) : '';
		$apercu    = wp_nonce_url( admin_url( 'admin-post.php?action=' . self::APERCU ), self::APERCU );
		$retour     = isset( $_GET['pp-maintenance'] ) ? sanitize_key( wp_unslash( $_GET['pp-maintenance'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$enregistre = $retour === 'ok';
		require POSE_PARQUET_DIR . '/templates/admin-maintenance.php';
	}

	/** Enregistrement : droit, jeton, nettoyage de chaque valeur. */
	public static function enregistrer(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), '', [ 'response' => 403 ] );
		}
		check_admin_referer( self::ACTION );

		$titre   = isset( $_POST['pp_titre'] ) ? sanitize_text_field( wp_unslash( $_POST['pp_titre'] ) ) : '';
		$message = isset( $_POST['pp_message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['pp_message'] ) ) : '';
		$image   = isset( $_POST['pp_image'] ) ? absint( $_POST['pp_image'] ) : 0;
		if ( $image && ! wp_attachment_is_image( $image ) ) {
			$image = 0;
		}
		$d = self::defauts();
		update_option(
			self::OPTION,
			[
				// L'état se bascule par l'interrupteur (basculer()) ; ce formulaire
				// n'enregistre que le contenu de la page, comme sur le socle.
				'actif'    => self::actif(),
				'titre'    => mb_substr( $titre !== '' ? $titre : $d['titre'], 0, 120 ),
				'message'  => mb_substr( $message !== '' ? $message : $d['message'], 0, 600 ),
				'image'    => $image,
				'premibel' => ! empty( $_POST['pp_premibel'] ),
				'allure'   => ! empty( $_POST['pp_allure'] ),
			],
			false
		);
		wp_safe_redirect( add_query_arg( 'pp-maintenance', 'ok', self::url() ) );
		exit;
	}

	/**
	 * Interrupteur Activé / Désactivé : son propre formulaire, confirmé, comme
	 * le panneau de maintenance d'Expert Parquet. Le contenu de la page ne
	 * change pas.
	 */
	public static function basculer(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), '', [ 'response' => 403 ] );
		}
		check_admin_referer( self::BASCULER );
		update_option( self::OPTION, array_merge( self::lire(), [ 'actif' => ! self::actif() ] ), false );
		$retour = wp_get_referer() ?: self::url();
		wp_safe_redirect( add_query_arg( 'pp-maintenance', self::actif() ? 'active' : 'desactivee', remove_query_arg( 'pp-maintenance', $retour ) ) );
		exit;
	}

	/**
	 * Où en est le site public, face au réglage de WordPress. Le réglage change
	 * tout de suite ; le site statique, seulement à la publication.
	 *
	 *   en_ligne                réglage désactivé, site publié ouvert
	 *   maintenance_a_publier   réglage activé, pas encore publié
	 *   en_maintenance          réglage activé et publié
	 *   reactivation_a_publier  réglage désactivé, site publié encore en maintenance
	 */
	public static function etat_public(): string {
		$actif   = self::actif();
		$publiee = \PoseParquet\Core\Publication\Publication::maintenance_publiee();
		$publiee = $publiee ?? $actif; // état publié inconnu : on ne suppose pas d'écart.
		if ( $actif ) {
			return $publiee ? 'en_maintenance' : 'maintenance_a_publier';
		}
		return $publiee ? 'reactivation_a_publier' : 'en_ligne';
	}

	/** @return array{0:string,1:string} libellé et variante (ok | attente | ko) de etat_public(). */
	public static function libelle_public( string $etat ): array {
		return [
			'en_ligne'               => [ __( 'Site en ligne', 'pose-parquet-core' ), 'ok' ],
			'maintenance_a_publier'  => [ __( 'Maintenance à publier', 'pose-parquet-core' ), 'attente' ],
			'en_maintenance'         => [ __( 'Site en maintenance', 'pose-parquet-core' ), 'attente' ],
			'reactivation_a_publier' => [ __( 'Réactivation à publier', 'pose-parquet-core' ), 'ko' ],
		][ $etat ] ?? [ __( 'Site en ligne', 'pose-parquet-core' ), 'ok' ];
	}

	/**
	 * Le panneau « Page de maintenance » du socle : interrupteur, puis deux
	 * états distincts — le réglage de WordPress et le site public — et, quand
	 * ils diffèrent, la publication à faire, avec son bouton.
	 */
	public static function panneau( bool $compact = false ): void {
		$actif  = self::actif();
		$public = self::etat_public();
		$pub    = \PoseParquet\Core\Publication\Publication::etat();
		$ecart  = in_array( $public, [ 'maintenance_a_publier', 'reactivation_a_publier' ], true );
		[ $libelle, $variante ] = self::libelle_public( $public );

		echo '<div class="adm-panneau" id="maintenance"' . ( $pub['statut'] === 'en_cours' ? ' data-pp-publication="en_cours"' : '' ) . '><div class="adm-panneau__entete"><h2 class="adm-panneau__titre"><span class="dashicons dashicons-admin-tools" aria-hidden="true"></span>' . esc_html__( 'Page de maintenance', 'pose-parquet-core' ) . '</h2>';
		\PoseParquet\Core\Admin\Socle::interrupteur(
			$actif,
			self::BASCULER,
			$actif ? __( 'Désactiver la maintenance ? Il faudra ensuite publier le site pour le rouvrir au public.', 'pose-parquet-core' ) : __( 'Activer la maintenance ? Après publication, les visiteurs verront la page de maintenance. Vous garderez l’accès à WordPress et au vrai site.', 'pose-parquet-core' )
		);
		echo '</div>';
		// Deux états, deux lignes : ce que WordPress a enregistré, ce que voient les visiteurs.
		\PoseParquet\Core\Admin\Socle::etat(
			[
				[ __( 'Configuration WordPress', 'pose-parquet-core' ), $actif ? __( 'Maintenance activée', 'pose-parquet-core' ) : __( 'Maintenance désactivée', 'pose-parquet-core' ) ],
				[ __( 'Site public', 'pose-parquet-core' ), $libelle, $variante ],
			]
		);
		$textes = [
			'en_ligne'               => __( 'Le site public est ouvert à tous.', 'pose-parquet-core' ),
			'maintenance_a_publier'  => __( 'Le site public est encore ouvert. Publiez pour afficher la page de maintenance.', 'pose-parquet-core' ),
			'en_maintenance'         => __( 'Les visiteurs voient la page de maintenance. Pour voir le vrai site, ajoutez ?apercu=1 à son adresse.', 'pose-parquet-core' ),
			'reactivation_a_publier' => __( 'Le site public est encore en maintenance. Publiez cette modification pour le réactiver.', 'pose-parquet-core' ),
		];
		echo '<p class="adm-panneau__texte' . ( $ecart ? ' adm-panneau__texte--fort' : '' ) . '">' . esc_html( $textes[ $public ] ) . '</p>';
		if ( $ecart ) {
			if ( $pub['statut'] === 'en_cours' ) {
				echo '<p class="adm-alerte-ligne"><span class="dashicons dashicons-update" aria-hidden="true"></span>' . esc_html__( 'Publication en cours… Cette page se met à jour toute seule.', 'pose-parquet-core' ) . '</p>';
			} elseif ( $pub['statut'] === 'echec' && $pub['raison'] !== '' ) {
				echo '<p class="adm-alerte-ligne adm-alerte-ligne--ko"><span class="dashicons dashicons-warning" aria-hidden="true"></span>' . esc_html__( 'La dernière publication a échoué :', 'pose-parquet-core' ) . ' ' . esc_html( $pub['raison'] ) . '</p>';
			}
			// Le moteur de publication existant, pas un second : le même bouton que l'écran Publication.
			// Sur le tableau de bord, le panneau Publication juste au-dessus le porte déjà.
			if ( ! $compact ) {
				echo '<div class="adm-panneau__publier">' . \PoseParquet\Core\Publication\Publication::bouton( $pub ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- composé et échappé dans bouton().
			}
		}
		if ( $compact ) {
			// Comme la maquette : un bouton secondaire vers l'écran complet (titre, message, image, aperçu).
			echo '<p class="adm-panneau__lien"><a class="adm-bouton" href="' . esc_url( self::url() ) . '"><span class="dashicons dashicons-admin-generic" aria-hidden="true"></span>' . esc_html__( 'Configurer la page de maintenance', 'pose-parquet-core' ) . '</a></p>';
		}
		echo '</div>';
	}

	/** Aperçu, dans le cadre de droite de l'écran : la vraie page, sans 503. */
	public static function apercu(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( '', '', [ 'response' => 403 ] );
		}
		check_admin_referer( self::APERCU );
		Page::afficher( self::lire(), false );
		exit;
	}
}
