<?php
/**
 * Notification interne : « une demande vient d'arriver », avec ce qu'il faut
 * pour rappeler le prospect.
 *
 * Construite depuis la ligne en base (la vérité après COMMIT), jamais depuis
 * la requête. Le sujet ne porte que la référence ; le corps porte les
 * coordonnées, parce que c'est son rôle. Champs vides non affichés, aucun
 * JSON, aucune donnée technique.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Mail;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class InternalNotification {

	/** @param array<string,mixed> $project ligne de pp_projects */
	public static function subject( array $project ): string {
		return sprintf( 'Nouvelle demande Pose Parquet — %s', (string) $project['reference'] );
	}

	/** @param array<string,mixed> $project ligne de pp_projects */
	public static function body( array $project ): string {
		$p = static fn( string $k ): string => isset( $project[ $k ] ) ? (string) $project[ $k ] : '';

		$surface = $p( 'surface' ) !== '' ? rtrim( rtrim( number_format( (float) $p( 'surface' ), 2, ',', ' ' ), '0' ), ',' ) . ' m²' : '';

		$visualiseur = [];
		if ( $p( 'scene_id' ) || $p( 'product_id' ) || $p( 'pattern' ) || $project['orientation'] !== null ) {
			$visualiseur = [
				Template::row( 'Scène', $p( 'scene_id' ) ),
				Template::row( 'Produit', $p( 'product_id' ) ),
				Template::row( 'Motif', Labels::of( 'pattern', $p( 'pattern' ) ) ),
				Template::row( 'Orientation', $project['orientation'] !== null ? (string) (int) $project['orientation'] . '°' : '' ),
			];
		}

		$utm = array_filter( [ $p( 'utm_source' ), $p( 'utm_medium' ), $p( 'utm_campaign' ) ] );

		return Template::render( 'internal', [
			'title'     => 'Nouvelle demande Pose Parquet',
			'reference' => $p( 'reference' ),
			'sections'  => [
				Template::section( 'Client', [
					Template::row( 'Nom', trim( $p( 'first_name' ) . ' ' . $p( 'last_name' ) ) ),
					Template::row( 'Email', $p( 'email' ) ),
					Template::row( 'Téléphone', $p( 'phone' ) ),
				] ),
				Template::section( 'Projet', [
					Template::row( 'Région', $p( 'region' ) ),
					Template::row( 'Département', $p( 'department' ) ),
					Template::row( 'Ville', $p( 'city' ) ),
					Template::row( 'Logement', Labels::of( 'housing_type', $p( 'housing_type' ) ) ),
					Template::row( 'Pièce', Labels::of( 'room_type', $p( 'room_type' ) ) ),
					Template::row( 'Surface', $surface ),
					Template::row( 'Style', Labels::of( 'style', $p( 'style' ) ) ),
					Template::row( 'Parquet', Labels::of( 'parquet_type', $p( 'parquet_type' ) ) ),
					Template::row( 'Support', Labels::of( 'support_type', $p( 'support_type' ) ) ),
					Template::row( 'Pose', Labels::of( 'installation_type', $p( 'installation_type' ) ) ),
					Template::row( 'Délai', Labels::of( 'timeframe', $p( 'timeframe' ) ) ),
					Template::row( 'Message', $p( 'message' ) ),
				] ),
				Template::section( 'Configuration Visualiseur', $visualiseur ),
				Template::section( 'Source', [
					Template::row( 'Page d’origine', $p( 'source_url' ) ),
					Template::row( 'Campagne', implode( ' / ', $utm ) ),
					Template::row( 'Reçue le (UTC)', $p( 'created_at' ) ),
				] ),
			],
		] );
	}
}
