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
	 * Le panneau « Page de maintenance » du socle : interrupteur, état, et
	 * (sur le tableau de bord) un lien vers l'écran complet.
	 */
	public static function panneau( bool $compact = false ): void {
		$actif = self::actif();
		echo '<div class="adm-panneau" id="maintenance"><div class="adm-panneau__entete"><h2 class="adm-panneau__titre"><span class="dashicons dashicons-admin-tools" aria-hidden="true"></span>' . esc_html__( 'Page de maintenance', 'pose-parquet-core' ) . '</h2>';
		\PoseParquet\Core\Admin\Socle::interrupteur(
			$actif,
			self::BASCULER,
			$actif ? __( 'Rouvrir le site public ?', 'pose-parquet-core' ) : __( 'Activer la maintenance ? Les visiteurs verront la page de maintenance. Vous garderez l’accès à WordPress et au vrai site.', 'pose-parquet-core' )
		);
		echo '</div>';
		if ( $actif ) {
			echo '<p class="adm-panneau__alerte"><span class="adm-pastille adm-pastille--actif"></span> ' . esc_html__( 'Maintenance active : le public voit la page de maintenance (HTTP 503). Connecté, vous voyez le vrai site.', 'pose-parquet-core' ) . '</p>';
		} else {
			echo '<p class="adm-panneau__texte">' . esc_html__( 'Activez un mode maintenance pour afficher une page temporaire aux visiteurs. L’administration reste accessible.', 'pose-parquet-core' ) . '</p>';
		}
		// Le toggle change WordPress tout de suite, le site statique seulement à la publication : on le dit.
		$publiee = \PoseParquet\Core\Publication\Publication::maintenance_publiee();
		if ( $publiee !== null && $publiee !== $actif ) {
			echo '<p class="adm-alerte-ligne adm-alerte-ligne--ko"><span class="dashicons dashicons-warning" aria-hidden="true"></span>' . esc_html( $actif ? __( 'Maintenance activée — publication nécessaire : le site public ne l’affiche pas encore.', 'pose-parquet-core' ) : __( 'Maintenance désactivée — publication nécessaire : le site public l’affiche encore.', 'pose-parquet-core' ) ) . ' <a href="' . esc_url( \PoseParquet\Core\Publication\Publication::url() ) . '">' . esc_html__( 'Publier', 'pose-parquet-core' ) . '</a></p>';
		}
		if ( $compact ) {
			echo '<p class="adm-panneau__texte" style="margin:0"><a href="' . esc_url( self::url() ) . '">' . esc_html__( 'Titre, message, image et aperçu', 'pose-parquet-core' ) . '</a></p>';
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
