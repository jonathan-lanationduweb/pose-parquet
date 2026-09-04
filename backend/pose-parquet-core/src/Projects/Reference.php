<?php
/**
 * Référence publique d'une demande : PP-AAAA-NNNNNN.
 *
 * AAAA est l'année serveur au moment de la création, NNNNNN l'identifiant
 * auto-incrémenté de la ligne, complété à six chiffres. Rien d'autre : pas de
 * compteur annuel, pas de verrou, pas de table de séquence. L'unicité est
 * celle de la clé primaire, garantie par MySQL, et rappelée par l'index unique
 * sur la colonne.
 *
 * L'identifiant 123 créé en 2026 donne PP-2026-000123. Au-delà de 999 999,
 * le nombre s'écrit simplement sur sept chiffres : la référence reste unique.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Reference {

	public const PREFIX = 'PP';

	public static function build( int $id, int $year ): string {
		return sprintf( '%s-%04d-%06d', self::PREFIX, $year, $id );
	}

	/** Vrai si la chaîne a la forme d'une référence produite ici. */
	public static function is_valid( string $reference ): bool {
		return (bool) preg_match( '/^PP-\d{4}-\d{6,}$/', $reference );
	}
}
