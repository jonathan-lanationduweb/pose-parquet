<?php



declare(strict_types=1);

namespace PoseParquet\Core\Mail;

use PoseParquet\Core\Projects\LeadRouting;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class InternalNotification {


	public static function subject( array $project ): string {
		return sprintf( 'Nouvelle demande Pose Parquet — %s', (string) $project['reference'] );
	}


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

		$utm = array_filter( [ $p( 'utm_source' ), $p( 'utm_medium' ), $p( 'utm_campaign' ), $p( 'utm_content' ), $p( 'utm_term' ) ] );



		$orientation = [];
		if ( $p( 'lead_source' ) || $p( 'lead_need' ) || $p( 'lead_destination' ) ) {


			$orientation = [
				Template::row( 'Origine', Labels::of( 'lead_source', $p( 'lead_source' ) ) ),
				Template::row( 'Besoin', Labels::of( 'lead_need', $p( 'lead_need' ) ) ),
				Template::row( 'Destination recommandée', Labels::of( 'lead_destination', $p( 'lead_destination' ) ) ),


				Template::row( 'Zone', LeadRouting::en_idf( $project ) ? 'Paris / Île-de-France' : 'Hors zone Allure Design' ),
				Template::row( 'Surface', $surface ),
				Template::row( 'Parquet', $p( 'product_id' ) ),
				Template::row( 'Motif', Labels::of( 'pattern', $p( 'pattern' ) ) ),
			];



			$raison = LeadRouting::raison( $project );
			if ( $raison !== '' ) {
				$orientation[] = Template::row( 'Pourquoi', $raison );
			}
		}

		return Template::render( 'internal', [
			'title'     => 'Nouvelle demande Pose Parquet',
			'reference' => $p( 'reference' ),
			'sections'  => [
				Template::section( 'Orientation', $orientation ),
				Template::section( 'Client', [
					Template::row( 'Nom', trim( $p( 'first_name' ) . ' ' . $p( 'last_name' ) ) ),
					Template::row( 'Email', $p( 'email' ) ),
					Template::row( 'Téléphone', $p( 'phone' ) ),
				] ),
				Template::section( 'Projet', [


					Template::row( 'Département', $p( 'department' ) ),
					Template::row( 'Région', LeadRouting::region( $project ) ),
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


					Template::row( 'Page d’entrée', $p( 'entry_page' ) ),
					Template::row( 'Page d’envoi', $p( 'source_url' ) ),
					Template::row( 'Campagne', implode( ' / ', $utm ) ),
					Template::row( 'Reçue le (UTC)', $p( 'created_at' ) ),
				] ),
			],
		] );
	}
}
