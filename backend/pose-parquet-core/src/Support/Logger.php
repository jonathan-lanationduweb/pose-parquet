<?php



declare(strict_types=1);

namespace PoseParquet\Core\Support;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Logger {


	private const CLES_PERSONNELLES = [
		'email', 'phone', 'first_name', 'last_name', 'firstName', 'lastName', 'message', 'city', 'ip',

		'payload', 'body', 'input', 'data', 'fields',

		'formToken', 'token', 'to', 'reply_to', 'remote_addr', 'website',
		'password', 'authorization', 'cookie', 'secret', 'api_key',
	];


	public static function error( string $message, array $contexte = [] ): void {
		self::write( 'ERREUR', $message, $contexte );
	}


	public static function info( string $message, array $contexte = [] ): void {
		self::write( 'INFO', $message, $contexte );
	}


	public static function warning( string $message, array $contexte = [] ): void {
		self::write( 'ALERTE', $message, $contexte );
	}


	private static function write( string $niveau, string $message, array $contexte ): void {
		if ( $niveau === 'INFO' && ! ( defined( 'WP_DEBUG' ) && WP_DEBUG ) ) {
			return;
		}
		$ligne = sprintf( '[pose-parquet] %s %s', $niveau, $message );
		$propre = self::nettoyer( $contexte );
		if ( $propre ) {
			$ligne .= ' ' . wp_json_encode( $propre, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		}
		error_log( $ligne );
	}



	private static function nettoyer( array $contexte ): array {
		$interdites = array_map( 'strtolower', self::CLES_PERSONNELLES );
		foreach ( $contexte as $cle => $valeur ) {
			if ( in_array( strtolower( (string) $cle ), $interdites, true ) || is_object( $valeur ) ) {
				unset( $contexte[ $cle ] );
			} elseif ( is_array( $valeur ) ) {
				$contexte[ $cle ] = self::nettoyer( $valeur );
			}
		}
		return $contexte;
	}
}
