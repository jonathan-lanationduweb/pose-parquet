<?php
/**
 * Suite « Sites partenaires » : surveillance de Premibel et Allure Design.
 *
 *   php tests/run-partenaires.php <racine WordPress>
 *
 * Aucune requête réelle : les réponses des partenaires sont simulées
 * (pre_http_request). L'état enregistré et les réglages Mon site sont remis
 * tels qu'ils étaient.
 */

declare(strict_types=1);

require __DIR__ . '/support.php';
pp_test_bootstrap( $argv, 'php tests/run-partenaires.php <racine WordPress>' );
[ $verifie, $section, $bilan ] = pp_test_outils();

use PoseParquet\Core\Partenaires\Surveillance;
use PoseParquet\Core\Site\MonSite;

$etat_avant   = get_option( Surveillance::OPTION, null );
$monsite_avant = get_option( MonSite::OPTION, null );

/* Réponses simulées : une file par hôte, et l'adresse effectivement demandée. */
$reponses  = [];
$demandees = [];
add_filter(
	'pre_http_request',
	static function ( $pre, $args, $url ) use ( &$reponses, &$demandees ) {
		$hote        = (string) wp_parse_url( $url, PHP_URL_HOST );
		$demandees[] = $url;
		foreach ( $reponses as $domaine => $file ) {
			if ( str_ends_with( $hote, $domaine ) && $file ) {
				return array_shift( $reponses[ $domaine ] );
			}
		}
		return [ 'response' => [ 'code' => 200, 'message' => 'OK' ], 'body' => '<html><title>Accueil</title></html>', 'headers' => [], 'cookies' => [] ];
	},
	10,
	3
);
$page = static fn( int $code, string $corps = '<html><head><title>Accueil</title></head><body>ok</body></html>' ): array => [ 'response' => [ 'code' => $code, 'message' => '' ], 'body' => $corps, 'headers' => [], 'cookies' => [] ];

/* ------------------------------------------------------------------ */
$section( 'Diagnostic d’une réponse' );
$verifie( 'page normale : disponible', Surveillance::diagnostic( $page( 200 ) ) === null );
$verifie( 'le mot « maintenance » dans le texte ne suffit pas', Surveillance::diagnostic( $page( 200, '<title>Entretien du parquet</title><p>La maintenance d’un parquet huilé…</p>' ) ) === null );
$verifie( 'injoignable', is_string( Surveillance::diagnostic( new WP_Error( 'http_request_failed', 'cURL error 28' ) ) ) );
$verifie( 'HTTP 503', is_string( Surveillance::diagnostic( $page( 503 ) ) ) );
$verifie( 'HTTP 500', is_string( Surveillance::diagnostic( $page( 500 ) ) ) );
$verifie( 'HTTP 404', is_string( Surveillance::diagnostic( $page( 404 ) ) ) );
$verifie( 'titre « Site en maintenance »', is_string( Surveillance::diagnostic( $page( 200, '<title>Site en maintenance</title>' ) ) ) );
$verifie( 'WooCommerce « coming soon »', is_string( Surveillance::diagnostic( $page( 200, '<body class="woocommerce-coming-soon">' ) ) ) );
$verifie( 'WordPress en mise à jour', is_string( Surveillance::diagnostic( $page( 200, 'Briefly unavailable for scheduled maintenance. Check back in a minute.' ) ) ) );
$verifie( 'phrase « boutique en maintenance »', is_string( Surveillance::diagnostic( $page( 200, '<p>Notre boutique est actuellement en maintenance.</p>' ) ) ) );

/* ------------------------------------------------------------------ */
$section( 'Deux échecs pour retirer, un succès pour revenir' );
delete_option( Surveillance::OPTION );
$verifie( 'état inconnu : disponible (ouvert par défaut)', Surveillance::disponible( 'premibel' ) && Surveillance::disponible( 'allure' ) );
$reponses = [ 'premibel.fr' => [ $page( 503 ) ] ];
Surveillance::verifier();
$verifie( '1er échec : toujours proposé', Surveillance::disponible( 'premibel' ) && (int) Surveillance::etat_brut()['premibel']['echecs'] === 1 );
$reponses = [ 'premibel.fr' => [ $page( 503 ) ] ];
Surveillance::verifier();
$verifie( '2e échec : retiré', ! Surveillance::disponible( 'premibel' ) );
$verifie( 'Allure n’est pas touché', Surveillance::disponible( 'allure' ) );
$verifie( 'la raison est notée', str_contains( (string) Surveillance::etat_brut()['premibel']['raison'], '503' ) );
$reponses = [];
Surveillance::verifier();
$verifie( 'un succès : de retour', Surveillance::disponible( 'premibel' ) && (int) Surveillance::etat_brut()['premibel']['echecs'] === 0 );

/* ------------------------------------------------------------------ */
$section( 'Réponse publique' );
$reponses = [ 'allure-design.com' => [ $page( 200, '<title>Maintenance</title>' ), $page( 200, '<title>Maintenance</title>' ) ] ];
Surveillance::verifier();
Surveillance::verifier();
$r = Surveillance::repondre();
$d = $r->get_data();
$verifie( 'allure : false, premibel : true', $d['allure'] === false && $d['premibel'] === true );
$verifie( 'ni raison ni adresse exposées', array_keys( $d ) === [ 'verifie', 'premibel', 'allure' ] );
$verifie( 'mise en cache courte', ( $r->get_headers()['Cache-Control'] ?? '' ) === 'public, max-age=60' );
$routes = rest_get_server()->get_routes();
$verifie( 'route GET publique enregistrée', isset( $routes['/pose-parquet/v1/partenaires'] ) );
$req = new WP_REST_Request( 'POST', '/pose-parquet/v1/partenaires' );
$verifie( 'POST refusé', rest_get_server()->dispatch( $req )->get_status() >= 400 );

/* ------------------------------------------------------------------ */
$section( 'Adresses contrôlées : domaine officiel seulement' );
$v = MonSite::valeurs();
update_option( MonSite::OPTION, array_merge( is_array( $monsite_avant ) ? $monsite_avant : [], [ 'premibel_url' => 'https://evil.example.com/premibel.fr', 'allure_url' => 'http://www.allure-design.com/' ] ), false );
$verifie( 'autre domaine → adresse par défaut', Surveillance::adresse( 'premibel' ) === 'https://www.premibel.fr/' );
$verifie( 'http (non chiffré) → adresse par défaut', Surveillance::adresse( 'allure' ) === 'https://www.allure-design.com/' );
update_option( MonSite::OPTION, array_merge( is_array( $monsite_avant ) ? $monsite_avant : [], [ 'premibel_url' => 'https://www.premibel.fr/parquet/' ] ), false );
$verifie( 'sous-page officielle acceptée', Surveillance::adresse( 'premibel' ) === 'https://www.premibel.fr/parquet/' );
update_option( MonSite::OPTION, array_merge( is_array( $monsite_avant ) ? $monsite_avant : [], [ 'allure_afficher' => false ] ), false );
$demandees = [];
$reponses  = [];
Surveillance::verifier();
$verifie( 'partenaire masqué dans Mon site : non contrôlé', ! array_filter( $demandees, static fn( $u ) => str_contains( $u, 'allure-design.com' ) ) && ! empty( Surveillance::etat_brut()['allure']['ignore'] ) );

/* ------------------------------------------------------------------ */
$section( 'Planification' );
Surveillance::planifier();
$verifie( 'contrôle planifié', (bool) wp_next_scheduled( Surveillance::HOOK ) );
$verifie( 'intervalle de 15 minutes déclaré', ( wp_get_schedules()[ Surveillance::INTERVALLE ]['interval'] ?? 0 ) === 900 );

/* Remise en état. */
if ( $monsite_avant === null ) {
	delete_option( MonSite::OPTION );
} else {
	update_option( MonSite::OPTION, $monsite_avant, false );
}
if ( $etat_avant === null ) {
	delete_option( Surveillance::OPTION );
} else {
	update_option( Surveillance::OPTION, $etat_avant, false );
}
$verifie( 'réglages remis en état', get_option( MonSite::OPTION, null ) === $monsite_avant );

$bilan();
