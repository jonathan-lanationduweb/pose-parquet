<?php
/**
 * Accusé de réception au visiteur : sa référence, un résumé d'une ligne,
 * pas de promesse de délai, pas de prix, pas de discours.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Mail;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class VisitorConfirmation {

	public static function subject(): string {
		return 'Votre demande Pose Parquet a bien été reçue';
	}

	/** @param array<string,mixed> $project ligne de pp_projects */
	public static function body( array $project ): string {
		$p = static fn( string $k ): string => isset( $project[ $k ] ) ? (string) $project[ $k ] : '';

		// Un résumé court : pièce, surface, pose — ce que la personne a dit, rien de plus.
		$morceaux = array_filter( [
			Labels::of( 'room_type', $p( 'room_type' ) ),
			$p( 'surface' ) !== '' ? rtrim( rtrim( number_format( (float) $p( 'surface' ), 2, ',', ' ' ), '0' ), ',' ) . ' m²' : '',
			$p( 'installation_type' ) !== '' && $p( 'installation_type' ) !== 'inconnu' ? 'pose ' . mb_strtolower( Labels::of( 'installation_type', $p( 'installation_type' ) ) ) : '',
			$p( 'department' ) !== '' ? 'département ' . $p( 'department' ) : '',
		] );

		return Template::render( 'visitor', [
			'title'      => 'Votre demande a bien été reçue',
			'first_name' => $p( 'first_name' ),
			'reference'  => $p( 'reference' ),
			'summary'    => implode( ', ', $morceaux ),
		] );
	}
}
