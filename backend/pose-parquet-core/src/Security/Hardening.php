<?php



declare(strict_types=1);

namespace PoseParquet\Core\Security;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Hardening {


	private const USER_ROUTES = [
		'/wp/v2/users',
		'/wp/v2/users/(?P<id>[\d]+)',
	];

	public static function register(): void {
		if ( self::active( 'rest_users' ) ) {
			add_filter( 'rest_endpoints', [ self::class, 'filter_user_routes' ] );
		}
		if ( self::active( 'author_archives' ) ) {


			add_action( 'template_redirect', [ self::class, 'block_author_enumeration' ], 0 );
		}
		if ( self::active( 'oembed_author' ) ) {
			add_filter( 'oembed_response_data', [ self::class, 'strip_oembed_author' ] );
		}
		if ( self::active( 'xmlrpc' ) ) {
			add_filter( 'xmlrpc_enabled', '__return_false' );
			add_filter( 'xmlrpc_methods', '__return_empty_array' );
			add_filter( 'wp_headers', [ self::class, 'drop_pingback_header' ] );
			remove_action( 'wp_head', 'rsd_link' );
		}
		if ( self::active( 'version_disclosure' ) ) {
			remove_action( 'wp_head', 'wp_generator' );
			add_filter( 'the_generator', '__return_empty_string' );
		}
	}



	private static function active( string $mesure ): bool {
		return (bool) apply_filters( 'pose_parquet_hardening_' . $mesure, true );
	}



	public static function filter_user_routes( array $endpoints ): array {
		if ( current_user_can( 'list_users' ) ) {
			return $endpoints;
		}
		foreach ( self::USER_ROUTES as $route ) {
			unset( $endpoints[ $route ] );
		}

		return $endpoints;
	}



	public static function block_author_enumeration(): void {
		if ( is_admin() || is_user_logged_in() ) {
			return;
		}

		$auteur = isset( $_GET['author'] ) ? sanitize_text_field( wp_unslash( $_GET['author'] ) ) : '';
		if ( $auteur === '' && ! is_author() ) {
			return;
		}
		wp_safe_redirect( home_url( '/' ), 301 );
		exit;
	}



	public static function strip_oembed_author( $data ) {
		if ( ! is_array( $data ) ) {
			return $data;
		}
		unset( $data['author_name'], $data['author_url'] );

		return $data;
	}



	public static function drop_pingback_header( $headers ) {
		if ( is_array( $headers ) ) {
			unset( $headers['X-Pingback'] );
		}

		return $headers;
	}
}
