<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Departements {


	public const ILE_DE_FRANCE = 'Île-de-France';



	public const REGIONS = [
		'Auvergne-Rhône-Alpes'        => [ '01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74' ],
		'Bourgogne-Franche-Comté'     => [ '21', '25', '39', '58', '70', '71', '89', '90' ],
		'Bretagne'                    => [ '22', '29', '35', '56' ],
		'Centre-Val de Loire'         => [ '18', '28', '36', '37', '41', '45' ],
		'Corse'                       => [ '2A', '2B' ],
		'Grand Est'                   => [ '08', '10', '51', '52', '54', '55', '57', '67', '68', '88' ],
		'Hauts-de-France'             => [ '02', '59', '60', '62', '80' ],
		'Île-de-France'               => [ '75', '77', '78', '91', '92', '93', '94', '95' ],
		'Normandie'                   => [ '14', '27', '50', '61', '76' ],
		'Nouvelle-Aquitaine'          => [ '16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87' ],
		'Occitanie'                   => [ '09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82' ],
		'Pays de la Loire'            => [ '44', '49', '53', '72', '85' ],
		"Provence-Alpes-Côte d'Azur"  => [ '04', '05', '06', '13', '83', '84' ],
		'Outre-mer'                   => [ '971', '972', '973', '974', '976' ],
	];



	public static function normaliser( $valeur ): string {
		$brut = strtoupper( trim( (string) $valeur ) );
		if ( $brut === '' ) {
			return '';
		}
		if ( preg_match( '/^[1-9]$/', $brut ) ) {
			return '0' . $brut;
		}
		if ( preg_match( '/^2[AB]$/', $brut ) || preg_match( '/^\d{2,3}$/', $brut ) ) {
			return $brut;
		}
		return '';
	}


	private static function par_departement(): array {
		static $table = null;
		if ( $table === null ) {
			$table = [];
			foreach ( self::REGIONS as $region => $departements ) {
				foreach ( $departements as $departement ) {
					$table[ $departement ] = $region;
				}
			}
		}
		return $table;
	}



	public static function region( $valeur ): string {
		return self::par_departement()[ self::normaliser( $valeur ) ] ?? '';
	}



	public static function est_idf( $valeur ): bool {
		return self::region( $valeur ) === self::ILE_DE_FRANCE;
	}


	public static function connu( $valeur ): bool {
		return isset( self::par_departement()[ self::normaliser( $valeur ) ] );
	}


	public static function idf(): array {
		return self::REGIONS[ self::ILE_DE_FRANCE ];
	}
}
