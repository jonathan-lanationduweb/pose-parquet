<?php
/**
 * Pot de miel : un champ que les humains ne voient pas et que les robots
 * remplissent.
 *
 * Le champ s'appelle `website`. L'API l'accepte (ce n'est pas un champ
 * inconnu) mais ne le stocke jamais ; s'il contient quoi que ce soit, la
 * soumission est refusée d'un code générique. Le front du lot 5 le rendra
 * invisible (hors écran, sans autocomplétion, `tabindex="-1"`).
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Antispam;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Honeypot {

	public const FIELD = 'website';

	/** Vrai si le champ est présent et non vide, quel que soit son type. */
	public static function is_triggered( array $input ): bool {
		if ( ! array_key_exists( self::FIELD, $input ) ) {
			return false;
		}
		$v = $input[ self::FIELD ];
		if ( $v === null || $v === '' || $v === false ) {
			return false;
		}
		return ! ( is_string( $v ) && trim( $v ) === '' );
	}
}
