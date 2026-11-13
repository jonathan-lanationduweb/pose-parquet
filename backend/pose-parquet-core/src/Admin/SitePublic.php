<?php



declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class SitePublic {

	public const OPTION  = 'pose_parquet_site_public';

	public const DOSSIER = 'pose_parquet_site_dossier';
	public const ACTION = 'pp_site_public';

	public static function register(): void {
		add_action( 'admin_post_' . self::ACTION, [ self::class, 'enregistrer' ] );
	}


	public const PREPRODUCTION = 'https://jonathan-lanationduweb.github.io/pose-parquet/';



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

			$reel = realpath( $dossier );
			if ( $reel && is_dir( $reel . '/assets' ) && is_file( $reel . '/index.html' ) ) {
				update_option( self::DOSSIER, $reel, false );
			}
		}
		wp_safe_redirect( add_query_arg( 'pp-site-public', 'ok', admin_url( 'admin.php?page=' . Settings::PAGE ) ) );
		exit;
	}
}
