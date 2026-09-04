<?php
/**
 * Outils partagés par les scripts de test : chargement de WordPress, compteur
 * de vérifications, requête valide de référence.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

/** Charge WordPress depuis la racine passée en argument, ou sort en code 2. */
function pp_test_bootstrap( array $argv, string $usage ): string {
	$wp_root = rtrim( $argv[1] ?? '', '/\\' );
	if ( ! $wp_root || ! is_file( $wp_root . '/wp-load.php' ) ) {
		fwrite( STDERR, "Usage : $usage\n" );
		exit( 2 );
	}
	$_SERVER['HTTP_HOST']      = $_SERVER['HTTP_HOST'] ?? 'localhost';
	$_SERVER['REQUEST_METHOD'] = $_SERVER['REQUEST_METHOD'] ?? 'GET';
	require $wp_root . '/wp-load.php';
	require_once ABSPATH . 'wp-admin/includes/plugin.php';
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	return $wp_root;
}

/**
 * Rend [ $verifie, $section, $bilan ].
 *
 * @return array{0:callable,1:callable,2:callable}
 */
function pp_test_outils(): array {
	$echecs  = 0;
	$reussis = 0;
	$verifie = static function ( string $libelle, bool $ok, string $detail = '' ) use ( &$echecs, &$reussis ): void {
		if ( $ok ) {
			$reussis++;
			echo "  OK   $libelle\n";
		} else {
			$echecs++;
			echo "  KO   $libelle" . ( $detail ? " — $detail" : '' ) . "\n";
		}
	};
	$section = static function ( string $t ): void {
		echo "\n== $t ==\n";
	};
	$bilan = static function () use ( &$echecs, &$reussis ): int {
		echo "\n$reussis vérifications réussies, $echecs échec(s).\n";
		return $echecs ? 1 : 0;
	};

	return [ $verifie, $section, $bilan ];
}

/**
 * La requête que le formulaire réel produirait, une fois traduite en JSON API.
 * Tous les obligatoires, quelques facultatifs, aucun champ réservé.
 *
 * @return array<string,mixed>
 */
function pp_requete_valide( array $surcharge = [] ): array {
	return array_replace( [
		'zone'             => 'autre',
		'region'           => 'Bretagne',
		'department'       => '35',
		'city'             => 'Rennes',
		'housingType'      => 'appartement',
		'roomType'         => 'sejour',
		'surface'          => 32,
		'supportType'      => 'chape',
		'parquetType'      => 'contrecolle',
		'installationType' => 'baton-rompu',
		'style'            => 'naturel-chene',
		'timeframe'        => '1-3-mois',
		'firstName'        => 'Test',
		'lastName'         => 'Automatique',
		'email'            => 'test.automatique@example.com',
		'phone'            => '06 12 34 56 78',
		'message'          => 'Séjour de 32 m² à rénover.',
		'consent'          => true,
		'sourceUrl'        => '/projet/?parquet=Chene&motif=baton-rompu',
	], $surcharge );
}
