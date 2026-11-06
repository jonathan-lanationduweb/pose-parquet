<?php
/**
 * L'adresse du site public (statique), vue depuis WordPress.
 *
 * Elle sert à deux choses, en lecture seulement :
 *   - afficher dans l'éditeur les illustrations des articles importés, dont
 *     les chemins sont relatifs au site (« ../assets/images/… ») ;
 *   - lire l'état du catalogue Premibel publié par le build
 *     (data/catalogue-etat.json).
 *
 * WordPress n'écrit jamais sur le site public : il le lit.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class SitePublic {

	public const OPTION  = 'pose_parquet_site_public';
	/** Le dossier du site sur cette machine (développement) : WordPress en sert les fichiers publics. */
	public const DOSSIER = 'pose_parquet_site_dossier';
	public const ACTION = 'pp_site_public';

	public static function register(): void {
		add_action( 'admin_post_' . self::ACTION, [ self::class, 'enregistrer' ] );
	}

	/** La préproduction publique (GitHub Pages). */
	public const PREPRODUCTION = 'https://jonathan-lanationduweb.github.io/pose-parquet/';

	/**
	 * Par défaut : le serveur local du dépôt en développement, la préproduction
	 * GitHub Pages en staging, le domaine en production. Un WordPress de
	 * staging ne doit jamais lire l'ancien site pose-parquet.com.
	 */
	public static function defaut(): string {
		return match ( wp_get_environment_type() ) {
			'local', 'development' => 'http://localhost:5180/',
			'staging'              => self::PREPRODUCTION,
			default                => 'https://pose-parquet.com/',
		};
	}

	public static function url(): string {
		$v = (string) get_option( self::OPTION, '' );
		return $v !== '' ? trailingslashit( $v ) : self::defaut();
	}

	public static function dossier(): string {
		return (string) get_option( self::DOSSIER, '' );
	}

	/**
	 * Lire un fichier du site public (catalogue, gabarit d'aperçu, instantané).
	 *
	 * Sur un serveur, `wp_safe_remote_get` : l'adresse est un réglage, et un
	 * compte administrateur volé pouvait la faire pointer vers le réseau
	 * interne de l'hébergeur (169.254.169.254, base de données…) — chaque
	 * écran qui lit le catalogue relançait la requête. La version sûre refuse
	 * les adresses privées et réservées. En local, le site public EST
	 * localhost : la version simple reste nécessaire.
	 *
	 * @param array<string,mixed> $args
	 * @return array<string,mixed>|\WP_Error
	 */
	public static function lire( string $url, array $args = [] ) {
		return \PoseParquet\Core\Security\Environnement::sur_serveur()
			? wp_safe_remote_get( $url, $args )
			: wp_remote_get( $url, $args );
	}

	public static function enregistrer(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), '', [ 'response' => 403 ] );
		}
		check_admin_referer( self::ACTION );
		$url = isset( $_POST['pp_site_public'] ) ? esc_url_raw( trim( wp_unslash( (string) $_POST['pp_site_public'] ) ), [ 'http', 'https' ] ) : '';
		if ( $url === '' ) {
			delete_option( self::OPTION );
		} else {
			update_option( self::OPTION, trailingslashit( $url ), false );
		}
		$dossier = isset( $_POST['pp_site_dossier'] ) ? trim( sanitize_text_field( wp_unslash( (string) $_POST['pp_site_dossier'] ) ) ) : '';
		if ( $dossier === '' ) {
			delete_option( self::DOSSIER );
		} else {
			// Refusé s'il ne ressemble pas au site : un index.html et un dossier assets/.
			$reel = realpath( $dossier );
			if ( $reel && is_dir( $reel . '/assets' ) && is_file( $reel . '/index.html' ) ) {
				update_option( self::DOSSIER, $reel, false );
			}
		}
		wp_safe_redirect( add_query_arg( 'pp-site-public', 'ok', admin_url( 'admin.php?page=' . Settings::PAGE ) ) );
		exit;
	}
}
