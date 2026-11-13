<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

use PoseParquet\Core\Mail\Labels;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class LeadRouting {



	public static function en_idf( array $project ): bool {
		return Departements::est_idf( (string) ( $project['department'] ?? '' ) );
	}


	public static function region( array $project ): string {
		return Departements::region( (string) ( $project['department'] ?? '' ) );
	}



	public static function raison( array $project ): string {
		$besoin      = (string) ( $project['lead_need'] ?? '' );
		$destination = (string) ( $project['lead_destination'] ?? '' );

		if ( $besoin === '' && $destination === '' ) {
			return '';
		}

		$zone = self::en_idf( $project )
			? __( 'projet en Île-de-France', 'pose-parquet-core' )
			: __( 'projet hors Île-de-France', 'pose-parquet-core' );

		switch ( $besoin ) {
			case 'produit':
				return __( 'Recherche de parquet : un produit se livre, la zone ne limite rien.', 'pose-parquet-core' );

			case 'pose':
				return self::en_idf( $project )
					? __( 'Besoin de pose, projet en Île-de-France : dans la zone d’intervention d’Allure Design.', 'pose-parquet-core' )
					: __( 'Besoin de pose, projet hors Île-de-France : hors de la zone annoncée par Allure Design. À qualifier à la main.', 'pose-parquet-core' );

			case 'produit-pose':
				return self::en_idf( $project )
					? __( 'Parquet et pose, projet en Île-de-France : Premibel pour la référence, Allure Design pour le chantier.', 'pose-parquet-core' )
					: __( 'Parquet et pose, projet hors Île-de-France : la référence est servable, la pose ne l’est pas. Orienté produit, la pose reste à traiter.', 'pose-parquet-core' );

			case 'renovation':
				return self::en_idf( $project )
					? __( 'Rénovation ou aménagement, projet en Île-de-France : dans le périmètre d’Allure Design.', 'pose-parquet-core' )
					: __( 'Rénovation ou aménagement, projet hors Île-de-France : hors de la zone annoncée. À qualifier à la main.', 'pose-parquet-core' );

			case 'renseignement':
				return __( 'Le visiteur se renseigne : aucun chantier annoncé, rien à orienter pour l’instant.', 'pose-parquet-core' );

			case 'indetermine':
				return sprintf(

					__( 'Besoin non précisé (%s) : un appel vaudra mieux qu’une règle.', 'pose-parquet-core' ),
					$zone
				);

			default:
				return '';
		}
	}



	public static function corrigee( array $project ): bool {
		$auto = (string) ( $project['lead_destination_auto'] ?? '' );
		return $auto !== '' && $auto !== (string) ( $project['lead_destination'] ?? '' );
	}


	public static function libelle_auto( array $project ): string {
		return Labels::of( 'lead_destination', (string) ( $project['lead_destination_auto'] ?? '' ) );
	}
}
