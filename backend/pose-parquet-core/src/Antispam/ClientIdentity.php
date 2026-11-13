<?php



declare(strict_types=1);

namespace PoseParquet\Core\Antispam;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class ClientIdentity {


	public static function resolve(): string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : '';



		$ip = (string) apply_filters( 'pose_parquet_client_ip', $ip );

		return self::hash( self::regrouper( $ip ) );
	}



	public static function regrouper( string $ip ): string {
		$ip = trim( $ip );
		if ( ! str_contains( $ip, ':' ) ) {
			return $ip;
		}
		$binaire = @inet_pton( $ip );
		if ( $binaire === false || strlen( $binaire ) !== 16 ) {
			return $ip;
		}

		if ( str_starts_with( $binaire, str_repeat( "\0", 10 ) . "\xff\xff" ) ) {
			return (string) inet_ntop( substr( $binaire, 12 ) );
		}
		return (string) inet_ntop( substr( $binaire, 0, 8 ) . str_repeat( "\0", 8 ) ) . '/64';
	}


	public static function hash( string $ip ): string {
		return substr( hash_hmac( 'sha256', trim( $ip ), wp_salt( 'auth' ) . '|pose-parquet-client' ), 0, 32 );
	}
}
