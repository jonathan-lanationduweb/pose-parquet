<?php
/**
 * Statuts d'une demande — l'unique source de vérité.
 *
 * Valeur stockée en base à gauche, libellé d'administration à droite. Tout ce
 * qui a besoin d'un statut (schéma, REST, écrans, emails à venir) passe par
 * cette classe : une valeur écrite ailleurs en dur est un bug.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Status {

	public const NEW_       = 'new';
	public const TO_CONTACT = 'to_contact';
	public const CONTACTED  = 'contacted';
	public const QUALIFIED  = 'qualified';
	public const COMPLETED  = 'completed';
	public const LOST       = 'lost';
	public const SPAM       = 'spam';

	/** Statut d'une demande qui vient d'arriver. */
	public const DEFAULT = self::NEW_;

	/**
	 * Valeur → libellé, dans l'ordre d'affichage voulu en administration.
	 *
	 * @return array<string,string>
	 */
	public static function labels(): array {
		return [
			self::NEW_       => __( 'Nouveau', 'pose-parquet-core' ),
			self::TO_CONTACT => __( 'À contacter', 'pose-parquet-core' ),
			self::CONTACTED  => __( 'Contacté', 'pose-parquet-core' ),
			self::QUALIFIED  => __( 'Qualifié', 'pose-parquet-core' ),
			self::COMPLETED  => __( 'Terminé', 'pose-parquet-core' ),
			self::LOST       => __( 'Perdu', 'pose-parquet-core' ),
			self::SPAM       => __( 'Spam', 'pose-parquet-core' ),
		];
	}

	/** @return string[] */
	public static function all(): array {
		return array_keys( self::labels() );
	}

	public static function is_valid( string $status ): bool {
		return array_key_exists( $status, self::labels() );
	}

	public static function label( string $status ): string {
		return self::labels()[ $status ] ?? $status;
	}
}
