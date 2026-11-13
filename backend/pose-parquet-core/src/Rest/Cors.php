<?php



declare(strict_types=1);

namespace PoseParquet\Core\Rest;

use WP_REST_Request;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Cors {

	public const DEFAULT_ORIGINS = [
		'https://jonathan-lanationduweb.github.io',
		'https://pose-parquet.com',
		'https://www.pose-parquet.com',
	];



	public const DEV_ORIGINS = [
		'http://localhost:5180',
		'http://127.0.0.1:5180',
	];


	public const ALLOWED_METHODS = 'GET, POST, OPTIONS';
	public const ALLOWED_HEADERS = 'Content-Type';
	public const MAX_AGE         = 600;

	public static function register(): void {
		add_filter( 'rest_pre_serve_request', [ self::class, 'serve' ], 20, 4 );
	}



	public static function defaults( ?string $environnement = null ): array {
		$environnement ??= function_exists( 'wp_get_environment_type' ) ? wp_get_environment_type() : 'production';

		return in_array( $environnement, [ 'local', 'development' ], true )
			? array_merge( self::DEV_ORIGINS, self::DEFAULT_ORIGINS )
			: self::DEFAULT_ORIGINS;
	}


	public static function allowed_origins(): array {
		$origins = defined( 'POSE_PARQUET_ALLOWED_ORIGINS' ) && is_array( POSE_PARQUET_ALLOWED_ORIGINS )
			? POSE_PARQUET_ALLOWED_ORIGINS
			: self::defaults();
		$origins = apply_filters( 'pose_parquet_allowed_origins', $origins );

		$propres = [];
		foreach ( (array) $origins as $origin ) {
			$origin = is_string( $origin ) ? self::normalize( $origin ) : '';

			if ( $origin !== '' && $origin !== '*' ) {
				$propres[] = $origin;
			}
		}

		return array_values( array_unique( $propres ) );
	}

	public static function is_allowed( string $origin ): bool {
		$origin = self::normalize( $origin );
		return $origin !== '' && in_array( $origin, self::allowed_origins(), true );
	}



	public static function serve( $served, $result, $request, $server ): bool {
		if ( ! ( $request instanceof WP_REST_Request ) || ! self::concerns( $request->get_route() ) ) {
			return (bool) $served;
		}

		$origin = isset( $_SERVER['HTTP_ORIGIN'] ) ? (string) wp_unslash( $_SERVER['HTTP_ORIGIN'] ) : '';

		if ( ! headers_sent() ) {

			header_remove( 'Access-Control-Allow-Origin' );
			header_remove( 'Access-Control-Allow-Credentials' );
			header_remove( 'Access-Control-Expose-Headers' );
			header( 'Vary: Origin', false );

			if ( $origin !== '' && self::is_allowed( $origin ) ) {
				header( 'Access-Control-Allow-Origin: ' . self::normalize( $origin ) );
				header( 'Access-Control-Allow-Methods: ' . self::ALLOWED_METHODS );
				header( 'Access-Control-Allow-Headers: ' . self::ALLOWED_HEADERS );
				header( 'Access-Control-Expose-Headers: X-Request-Id, Retry-After' );
				header( 'Access-Control-Max-Age: ' . self::MAX_AGE );
			}
		}

		return (bool) $served;
	}


	public static function concerns( string $route ): bool {
		return str_starts_with( $route, '/' . Routes::NAMESPACE . '/' ) || $route === '/' . Routes::NAMESPACE;
	}


	public static function normalize( string $origin ): string {
		$origin = strtolower( trim( $origin ) );
		$parts  = wp_parse_url( $origin );
		if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			return '';
		}
		$port = isset( $parts['port'] ) ? ':' . (int) $parts['port'] : '';

		return $parts['scheme'] . '://' . $parts['host'] . $port;
	}
}
