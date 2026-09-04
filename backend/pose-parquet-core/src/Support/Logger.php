<?php
/**
 * Journal applicatif minimal.
 *
 * Écrit dans le journal PHP via error_log(), donc dans debug.log quand
 * WP_DEBUG_LOG est actif, et nulle part sinon. Pas de fichier propre, pas de
 * table de logs : au stade de la fondation, ce serait de la machinerie sans
 * lecteur.
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
	private const CLES_PERSONNELLES = [ 'email', 'phone', 'first_name', 'last_name', 'message', 'ip' ];

	/** @param array<string,mixed> $contexte */
	public static function error( string $message, array $contexte = [] ): void {
		self::write( 'ERREUR', $message, $contexte );
	}

	/** @param array<string,mixed> $contexte */
	public static function warning( string $message, array $contexte = [] ): void {
		self::write( 'ALERTE', $message, $contexte );
	}

	/** @param array<string,mixed> $contexte */
	private static function write( string $niveau, string $message, array $contexte ): void {
		if ( ! ( defined( 'WP_DEBUG' ) && WP_DEBUG ) ) {
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
		foreach ( self::CLES_PERSONNELLES as $cle ) {
			unset( $contexte[ $cle ] );
		}
		return $contexte;
	}
}
