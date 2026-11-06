<?php
/**
 * Journal applicatif minimal.
 *
 * Erreurs et alertes : journal PHP du serveur, même sans WP_DEBUG.
 * Traces INFO : débogage seulement. Aucun fichier sous la racine web.
 *
 * RÈGLE : aucune donnée personnelle dans le journal. Pas d'email, pas de
 * téléphone, pas de nom. On journalise des identifiants (id de demande,
 * référence, version, nom de table) et des messages techniques. Le contexte
 * passe par `nettoyer()`, qui retire les clés connues pour être personnelles —
 * filet, pas permission : la bonne pratique est de ne pas les passer.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Support;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Logger {

	/** Clés jamais journalisées, quel que soit l'appelant. */
	private const CLES_PERSONNELLES = [
		'email', 'phone', 'first_name', 'last_name', 'firstName', 'lastName', 'message', 'city', 'ip',
		// Un corps de requête entier contient tout ce qui précède : il ne passe pas non plus.
		'payload', 'body', 'input', 'data', 'fields',
		// Jeton, destinataires, adresse réseau : pas davantage.
		'formToken', 'token', 'to', 'reply_to', 'remote_addr', 'website',
		'password', 'authorization', 'cookie', 'secret', 'api_key',
	];

	/** @param array<string,mixed> $contexte */
	public static function error( string $message, array $contexte = [] ): void {
		self::write( 'ERREUR', $message, $contexte );
	}

	/** Trace d'exploitation (requête traitée, durée) : identifiants et nombres, rien de la personne. */
	public static function info( string $message, array $contexte = [] ): void {
		self::write( 'INFO', $message, $contexte );
	}

	/** @param array<string,mixed> $contexte */
	public static function warning( string $message, array $contexte = [] ): void {
		self::write( 'ALERTE', $message, $contexte );
	}

	/** @param array<string,mixed> $contexte */
	private static function write( string $niveau, string $message, array $contexte ): void {
		if ( $niveau === 'INFO' && ! ( defined( 'WP_DEBUG' ) && WP_DEBUG ) ) {
			return;
		}
		$ligne = sprintf( '[pose-parquet] %s %s', $niveau, $message );
		$propre = self::nettoyer( $contexte );
		if ( $propre ) {
			$ligne .= ' ' . wp_json_encode( $propre, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		}
		error_log( $ligne ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
	}

	/**
	 * @param array<string,mixed> $contexte
	 * @return array<string,mixed>
	 */
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
