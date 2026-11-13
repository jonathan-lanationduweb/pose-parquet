<?php



declare(strict_types=1);

namespace PoseParquet\Core\Antispam;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FormToken {

	public const VERSION = 'v1';


	public const MIN_AGE = 2;

	public const MAX_AGE = 7200;


	public const MISSING = 'missing';
	public const INVALID = 'invalid';
	public const EXPIRED = 'expired';
	public const EARLY   = 'early';
	public const USED    = 'used';


	private const CLAIM_PREFIX = 'pp_ft_';


	private const CLAIM_GROUP = 'pose_parquet_form_token';


	public static function issue( ?int $issued_at = null ): string {
		$issued_at = $issued_at ?? time();
		$nonce     = bin2hex( random_bytes( 8 ) );
		$prefix    = self::VERSION . '.' . $issued_at . '.' . $nonce;

		return $prefix . '.' . self::sign( $prefix );
	}



	public static function verify( mixed $token, ?int $now = null ): string {
		if ( ! is_string( $token ) || $token === '' ) {
			return self::MISSING;
		}
		if ( strlen( $token ) > 160 ) {
			return self::INVALID;
		}
		$parts = explode( '.', $token );
		if ( count( $parts ) !== 4 || $parts[0] !== self::VERSION || ! ctype_digit( $parts[1] ) || ! ctype_xdigit( $parts[2] ) ) {
			return self::INVALID;
		}
		[ $version, $issued_at, $nonce, $signature ] = $parts;
		$attendue = self::sign( $version . '.' . $issued_at . '.' . $nonce );
		if ( ! hash_equals( $attendue, $signature ) ) {
			return self::INVALID;
		}

		$now = $now ?? time();
		$age = $now - (int) $issued_at;
		if ( $age > self::MAX_AGE ) {
			return self::EXPIRED;
		}
		if ( $age < self::MIN_AGE ) {
			return self::EARLY;
		}

		return '';
	}



	public static function consume( mixed $token, ?int $now = null ): bool {
		$cle = self::claim_key( $token );
		if ( $cle === '' ) {
			return false;
		}
		$duree = self::remaining( $token, $now ?? time() );
		if ( $duree <= 0 ) {
			return false;
		}

		if ( wp_using_ext_object_cache() ) {
			return (bool) wp_cache_add( $cle, 1, self::CLAIM_GROUP, $duree );
		}



		global $wpdb;
		$verrou = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $cle ) );
		if ( (string) $verrou === '0' ) {
			return false;
		}

		try {
			if ( get_transient( $cle ) !== false ) {
				return false;
			}
			set_transient( $cle, 1, $duree );

			return true;
		} finally {
			if ( $verrou !== null ) {
				$wpdb->query( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $cle ) );
			}
		}
	}



	public static function release( mixed $token ): void {
		$cle = self::claim_key( $token );
		if ( $cle === '' ) {
			return;
		}

		if ( wp_using_ext_object_cache() ) {
			wp_cache_delete( $cle, self::CLAIM_GROUP );
			return;
		}
		delete_transient( $cle );
	}


	public static function is_consumed( mixed $token ): bool {
		$cle = self::claim_key( $token );
		if ( $cle === '' ) {
			return false;
		}

		return wp_using_ext_object_cache()
			? wp_cache_get( $cle, self::CLAIM_GROUP ) !== false
			: get_transient( $cle ) !== false;
	}



	private static function claim_key( mixed $token ): string {
		$parts = self::parts( $token );

		return $parts === null
			? ''
			: self::CLAIM_PREFIX . substr( hash_hmac( 'sha256', $parts['nonce'], self::secret() ), 0, 32 );
	}


	private static function remaining( mixed $token, int $now ): int {
		$parts = self::parts( $token );
		if ( $parts === null ) {
			return 0;
		}

		return max( 0, self::MAX_AGE - ( $now - $parts['issued_at'] ) );
	}



	private static function parts( mixed $token ): ?array {
		if ( ! is_string( $token ) || $token === '' || strlen( $token ) > 160 ) {
			return null;
		}
		$parts = explode( '.', $token );
		if ( count( $parts ) !== 4 || $parts[0] !== self::VERSION || ! ctype_digit( $parts[1] ) || ! ctype_xdigit( $parts[2] ) ) {
			return null;
		}

		return [ 'issued_at' => (int) $parts[1], 'nonce' => $parts[2] ];
	}

	private static function sign( string $prefix ): string {
		return hash_hmac( 'sha256', $prefix, self::secret() );
	}


	private static function secret(): string {
		return wp_salt( 'nonce' ) . '|pose-parquet-form-token';
	}
}
