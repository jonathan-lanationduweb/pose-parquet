<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

use PoseParquet\Core\Admin\SitePublic;
use PoseParquet\Core\Contenus\Apercu;
use PoseParquet\Core\Maintenance\Reglages as Maintenance;
use PoseParquet\Core\Site\MonSite;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Liens {

	private const CACHE = 'pp_catalogue_produits';


	private static ?array $produits = null;



	public static function produits(): array {
		if ( self::$produits !== null ) {
			return self::$produits;
		}
		$cache = get_transient( self::CACHE );
		if ( is_array( $cache ) ) {
			return self::$produits = $cache;
		}
		$corps = '';
		$local = Apercu::dossier();
		if ( $local && is_readable( $local . '/data/products.premibel.json' ) ) {
			$corps = (string) file_get_contents( $local . '/data/products.premibel.json' );
		} else {
			$r = \PoseParquet\Core\Admin\SitePublic::lire( SitePublic::url() . 'data/products.premibel.json', [ 'timeout' => 6 ] );
			if ( ! is_wp_error( $r ) && (int) wp_remote_retrieve_response_code( $r ) === 200 ) {
				$corps = (string) wp_remote_retrieve_body( $r );
			}
		}
		$d   = json_decode( $corps, true );
		$out = [];
		foreach ( (array) ( $d['produits'] ?? [] ) as $p ) {
			if ( ! is_array( $p ) || empty( $p['id'] ) ) {
				continue;
			}
			$url = (string) ( $p['productUrl'] ?? '' );
			$out[ (string) $p['id'] ] = [
				'nom' => sanitize_text_field( (string) ( $p['name'] ?? $p['id'] ) ),
				'url' => self::sur_premibel( $url ) ? $url : '',
			];
		}
		if ( $out ) {
			set_transient( self::CACHE, $out, HOUR_IN_SECONDS );
		}
		return self::$produits = $out;
	}

	private static function sur_premibel( string $url ): bool {
		$hote = (string) wp_parse_url( $url, PHP_URL_HOST );
		return str_starts_with( $url, 'https://' ) && ( $hote === 'premibel.fr' || str_ends_with( $hote, '.premibel.fr' ) );
	}


	public static function produit( array $row ): string {
		$id = (string) ( $row['product_id'] ?? '' );
		if ( $id === '' ) {
			return '';
		}
		return self::produits()[ $id ]['nom'] ?? $id;
	}



	public static function de( array $row ): array {
		$destination = (string) ( $row['lead_destination'] ?? '' );
		$liens       = [];
		if ( in_array( $destination, [ 'premibel', 'mixed' ], true ) ) {
			$fiche = self::produits()[ (string) ( $row['product_id'] ?? '' ) ]['url'] ?? '';
			$site  = MonSite::valeurs();
			$liens[] = $fiche !== ''
				? [ 'cible' => 'premibel', 'libelle' => __( 'Voir le produit chez Premibel', 'pose-parquet-core' ), 'url' => $fiche ]
				: [ 'cible' => 'premibel', 'libelle' => __( 'Voir les parquets Premibel', 'pose-parquet-core' ), 'url' => (string) ( $site['premibel_url'] ?? '' ) ?: Maintenance::PREMIBEL_URL ];
		}

		if ( in_array( $destination, [ 'allure_design', 'mixed' ], true ) && LeadRouting::en_idf( $row ) ) {
			$liens[] = [ 'cible' => 'allure_design', 'libelle' => __( 'Continuer avec Allure Design', 'pose-parquet-core' ), 'url' => Maintenance::ALLURE_URL ];
		}
		return $liens;
	}
}
