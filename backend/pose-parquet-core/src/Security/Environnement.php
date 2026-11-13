<?php



declare(strict_types=1);

namespace PoseParquet\Core\Security;

use PoseParquet\Core\Admin\SitePublic;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Environnement {

	public static function sur_serveur(): bool {
		return in_array( wp_get_environment_type(), [ 'staging', 'production' ], true );
	}

	public static function register(): void {
		if ( ! self::sur_serveur() ) {
			return;
		}
		add_action( 'init', [ self::class, 'entete_noindex' ], 0 );
		add_filter( 'robots_txt', [ self::class, 'robots' ], 99 );

		add_action( 'template_redirect', [ self::class, 'pas_de_front' ], 20 );
	}


	public static function entete_noindex(): void {
		if ( ! headers_sent() ) {
			header( 'X-Robots-Tag: noindex, nofollow', true );
		}
	}

	public static function robots(): string {
		return "User-agent: *\nDisallow: /\n";
	}


	public static function pas_de_front(): void {
		if ( is_admin() || is_robots() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}
		wp_redirect( SitePublic::url(), 302, 'Pose Parquet administration' );
		exit;
	}
}
