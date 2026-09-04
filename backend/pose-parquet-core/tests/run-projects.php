<?php
/**
 * Tests du lot 2 contre un WordPress réel : création de demande par l'API.
 *
 *   php tests/run-projects.php <racine WordPress>
 *
 * Couvre : POST valide (201, ligne, référence, historique, consent_at
 * serveur), refus 422 sans écriture, champs injectés, JSON illisible, corps
 * géant, service dégradé (503), migration 1 → 2 avec données conservées,
 * concurrence (références uniques sous plusieurs processus), méthodes
 * interdites, fonctions CORS, journal sans donnée personnelle. Nettoie ce
 * qu'il crée. Code de sortie 1 au premier échec.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

require __DIR__ . '/support.php';
$wp_root = pp_test_bootstrap( $argv, 'php tests/run-projects.php <racine WordPress>' );
[ $verifie, $section, $bilan ] = pp_test_outils();

use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Projects\Reference;
use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Rest\Cors;

global $wpdb;

$plugin = 'pose-parquet-core/pose-parquet-core.php';
if ( ! is_plugin_active( $plugin ) ) {
	$r = activate_plugin( $plugin );
	if ( is_wp_error( $r ) ) {
		fwrite( STDERR, 'Activation impossible : ' . $r->get_error_message() . "\n" );
		exit( 2 );
	}
}
PoseParquet\Core\Plugin::boot();
do_action( 'rest_api_init' );
wp_set_current_user( 0 ); // tout ce qui suit est un visiteur anonyme

$tables = Schema::tables();
$repo   = new Repository();
$crees  = []; // identifiants à supprimer en fin de script

$poster = static function ( string $corps, array $entetes = [] ): WP_REST_Response {
	$req = new WP_REST_Request( 'POST', '/pose-parquet/v1/projects' );
	$req->set_header( 'Content-Type', 'application/json' );
	foreach ( $entetes as $k => $v ) {
		$req->set_header( $k, $v );
	}
	$req->set_body( $corps );
	return rest_do_request( $req );
};
$poster_json = static fn( array $donnees ): WP_REST_Response => $poster( (string) wp_json_encode( $donnees ) );
$nb_lignes   = static fn(): int => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['projects']}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

/* ------------------------------------------------------------------ */
$section( 'Pré-requis' );
$verifie( 'schéma au niveau ' . POSE_PARQUET_DB_VERSION, Installer::installed_version() === POSE_PARQUET_DB_VERSION, (string) Installer::installed_version() );
$colonnes = $wpdb->get_results( "DESCRIBE {$tables['projects']}", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$par_nom  = array_column( $colonnes, null, 'Field' );
$verifie( 'colonne style présente', isset( $par_nom['style'] ) );
$verifie( 'colonne reference nullable', ( $par_nom['reference']['Null'] ?? '' ) === 'YES' );
$verifie( 'pp_projects est InnoDB (transactions)', $repo->supports_transactions() );
$verifie( 'aucune ligne sans référence avant les tests', (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['projects']} WHERE reference IS NULL" ) === 0 ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

/* ------------------------------------------------------------------ */
$section( 'POST valide' );
$avant   = $nb_lignes();
$t0      = time();
$reponse = $poster_json( pp_requete_valide( [ 'visualizer' => [ 'sceneId' => 'sejour', 'pattern' => 'baton-rompu', 'orientation' => 45, 'config' => [ 'zoom' => 1.2 ] ] ] ) );
$corps   = $reponse->get_data();
$verifie( 'statut 201', $reponse->get_status() === 201, wp_json_encode( $corps ) );
$verifie( 'success = true', ( $corps['success'] ?? false ) === true );
$verifie( 'référence au format PP-AAAA-NNNNNN', Reference::is_valid( (string) ( $corps['reference'] ?? '' ) ), (string) ( $corps['reference'] ?? '' ) );
$verifie( 'la réponse ne contient ni email ni id interne ni statut', ! isset( $corps['email'], $corps['id'], $corps['status'] ) && count( $corps ) === 2 );
$verifie( 'Cache-Control: no-store', ( $reponse->get_headers()['Cache-Control'] ?? '' ) === 'no-store' );
$verifie( 'X-Request-Id présent (16 hex)', (bool) preg_match( '/^[0-9a-f]{16}$/', $reponse->get_headers()['X-Request-Id'] ?? '' ) );
$verifie( 'une ligne de plus', $nb_lignes() === $avant + 1 );

$ligne = $repo->find_by_reference( (string) $corps['reference'] );
$verifie( 'ligne retrouvée par référence', $ligne !== null );
if ( $ligne ) {
	$crees[] = (int) $ligne['id'];
	$verifie( 'référence = PP-<année>-<id sur 6>', $ligne['reference'] === sprintf( 'PP-%s-%06d', current_time( 'Y', true ), (int) $ligne['id'] ), $ligne['reference'] );
	$verifie( 'statut forcé à new', $ligne['status'] === 'new' );
	$verifie( 'region = Bretagne', $ligne['region'] === 'Bretagne' );
	$verifie( 'department = 35', $ligne['department'] === '35' );
	$verifie( 'housing_type = appartement', $ligne['housing_type'] === 'appartement' );
	$verifie( 'installation_type = baton-rompu (champ « orientation » du formulaire)', $ligne['installation_type'] === 'baton-rompu' );
	$verifie( 'style = naturel-chene', $ligne['style'] === 'naturel-chene' );
	$verifie( 'surface = 32.00', (float) $ligne['surface'] === 32.0 );
	$verifie( 'email stocké', $ligne['email'] === 'test.automatique@example.com' );
	$verifie( 'source_url réduite au chemin', $ligne['source_url'] === '/projet/' );
	$verifie( 'postal_code vide (non collecté par le formulaire)', $ligne['postal_code'] === '' );
	$verifie( 'scene_id, pattern, orientation du visualiseur stockés', $ligne['scene_id'] === 'sejour' && $ligne['pattern'] === 'baton-rompu' && (int) $ligne['orientation'] === 45 );
	$verifie( 'visualizer_config stocké en JSON', json_decode( (string) $ligne['visualizer_config'], true ) === [ 'zoom' => 1.2 ] );
	$consent = strtotime( $ligne['consent_at'] . ' UTC' );
	$verifie( 'consent_at = heure serveur (UTC, ± 60 s)', $consent !== false && abs( $consent - $t0 ) <= 60, $ligne['consent_at'] );
	$verifie( 'created_at = consent_at', $ligne['created_at'] === $ligne['consent_at'] );
	$verifie( 'updated_at = created_at', $ligne['updated_at'] === $ligne['created_at'] );

	$historique = $repo->history_of( (int) $ligne['id'] );
	$verifie( 'un seul événement d’historique', count( $historique ) === 1, (string) count( $historique ) );
	$ev = $historique[0] ?? [];
	$verifie( 'historique : old_status NULL', array_key_exists( 'old_status', $ev ) && $ev['old_status'] === null );
	$verifie( 'historique : new_status = new', ( $ev['new_status'] ?? '' ) === 'new' );
	$verifie( 'historique : user_id = 0', (int) ( $ev['user_id'] ?? -1 ) === 0 );
	$verifie( 'historique : created_at = celui de la demande', ( $ev['created_at'] ?? '' ) === $ligne['created_at'] );
}

$reponse2 = $poster_json( pp_requete_valide( [ 'zone' => 'idf', 'region' => null, 'city' => null, 'style' => null, 'message' => null, 'sourceUrl' => null ] ) );
$verifie( 'POST minimal (obligatoires seuls, zone idf) → 201', $reponse2->get_status() === 201, wp_json_encode( $reponse2->get_data() ) );
$ligne2 = $repo->find_by_reference( (string) ( $reponse2->get_data()['reference'] ?? '' ) );
if ( $ligne2 ) {
	$crees[] = (int) $ligne2['id'];
	$verifie( 'region déduite = Île-de-France', $ligne2['region'] === 'Île-de-France' );
	$verifie( 'style vide, visualiseur NULL', $ligne2['style'] === '' && $ligne2['scene_id'] === null && $ligne2['visualizer_config'] === null );
	$verifie( 'références distinctes et croissantes', $ligne2['reference'] !== $ligne['reference'] && (int) $ligne2['id'] > (int) $ligne['id'] );
}

/* ------------------------------------------------------------------ */
$section( 'Refus sans écriture' );
$avant = $nb_lignes();
$hist_avant = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['history']}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

$r = $poster_json( pp_requete_valide( [ 'email' => 'pas-un-email' ] ) );
$d = $r->get_data();
$verifie( 'email invalide → 422', $r->get_status() === 422 );
$verifie( 'format d’erreur { code, message, fields }', ( $d['code'] ?? '' ) === 'validation_failed' && isset( $d['message'], $d['fields'] ) );
$verifie( 'fields.email renseigné', isset( ( (array) $d['fields'] )['email'] ) );

$r = $poster_json( pp_requete_valide( [ 'consent' => null ] ) );
$verifie( 'consentement absent → 422', $r->get_status() === 422 );
$r = $poster_json( pp_requete_valide( [ 'consent' => false ] ) );
$verifie( 'consentement false → 422', $r->get_status() === 422 );
$r = $poster_json( pp_requete_valide( [ 'surface' => 5000 ] ) );
$verifie( 'surface 5000 → 422', $r->get_status() === 422 );
$r = $poster_json( pp_requete_valide( [ 'roomType' => 'garage' ] ) );
$verifie( 'roomType hors liste → 422', $r->get_status() === 422 );
$r = $poster_json( pp_requete_valide( [ 'champInconnu' => 1 ] ) );
$verifie( 'champ inconnu → 422', $r->get_status() === 422 && isset( ( (array) $r->get_data()['fields'] )['champInconnu'] ) );

foreach ( [ 'status' => 'completed', 'reference' => 'PP-2026-999999', 'createdAt' => '2001-01-01 00:00:00', 'consentAt' => '2001-01-01 00:00:00', 'id' => 1 ] as $nom => $valeur ) {
	$r = $poster_json( pp_requete_valide( [ $nom => $valeur ] ) );
	$verifie( "$nom injecté → 422, champ nommé", $r->get_status() === 422 && isset( ( (array) $r->get_data()['fields'] )[ $nom ] ) );
}
$verifie( 'aucune référence PP-2026-999999 créée', $repo->find_by_reference( 'PP-2026-999999' ) === null );

// Un corps JSON illisible est intercepté par WordPress lui-même (rest_invalid_json)
// quand le Content-Type est application/json ; par le contrôleur (invalid_json) sinon.
$r = $poster( '{"zone": "idf", ' );
$verifie( 'JSON illisible (application/json) → 400', $r->get_status() === 400 && in_array( $r->get_data()['code'] ?? '', [ 'invalid_json', 'rest_invalid_json' ], true ), wp_json_encode( $r->get_data() ) );
$req_txt = new WP_REST_Request( 'POST', '/pose-parquet/v1/projects' );
$req_txt->set_header( 'Content-Type', 'text/plain' );
$req_txt->set_body( '{"zone": "idf", ' );
$r = rest_do_request( $req_txt );
$verifie( 'JSON illisible (text/plain) → 400 invalid_json du plugin', $r->get_status() === 400 && ( $r->get_data()['code'] ?? '' ) === 'invalid_json', wp_json_encode( $r->get_data() ) );
$r = $poster( '' );
$verifie( 'corps vide → 400', $r->get_status() === 400 );
$r = $poster( '"juste une chaîne"' );
$verifie( 'JSON scalaire → 422', $r->get_status() === 422 );
$r = $poster( '[1,2,3]' );
$verifie( 'JSON tableau → 422', $r->get_status() === 422 );
$r = $poster_json( pp_requete_valide( [ 'message' => str_repeat( 'x', 20000 ) ] ) );
$verifie( 'corps de 20 Ko → 413', $r->get_status() === 413, (string) $r->get_status() );
$r = $poster_json( pp_requete_valide( [ 'message' => str_repeat( 'x', 4001 ) ] ) );
$verifie( 'message de 4001 caractères → 422 (borne champ, sous la borne corps)', $r->get_status() === 422 );
$r = $poster_json( pp_requete_valide( [ 'firstName' => '<script>alert(1)</script>Jean' ] ) );
$verifie( 'HTML dans le prénom : accepté après nettoyage (201)', $r->get_status() === 201 );
if ( $r->get_status() === 201 ) {
	$l = $repo->find_by_reference( (string) $r->get_data()['reference'] );
	$crees[] = (int) $l['id'];
	$verifie( 'prénom stocké sans balise', $l['first_name'] === 'Jean', $l['first_name'] );
	$avant++;
}
$r = $poster_json( pp_requete_valide( [ 'lastName' => "'; DROP TABLE {$tables['projects']}; --" ] ) );
$verifie( 'nom « SQL » : 201 et table toujours là', $r->get_status() === 201 && (bool) $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $tables['projects'] ) ) );
if ( $r->get_status() === 201 ) {
	$l = $repo->find_by_reference( (string) $r->get_data()['reference'] );
	$crees[] = (int) $l['id'];
	$verifie( 'nom « SQL » stocké littéralement', str_contains( $l['last_name'], 'DROP TABLE' ) );
	$avant++;
}

$verifie( 'aucune ligne créée par les refus', $nb_lignes() === $avant, $nb_lignes() . ' vs ' . $avant );
$verifie( 'aucun historique orphelin créé par les refus', (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['history']}" ) === $hist_avant + 2 ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

/* ------------------------------------------------------------------ */
$section( 'Journal et réponses sans donnée personnelle' );
$journal = defined( 'WP_DEBUG_LOG' ) && is_string( WP_DEBUG_LOG ) ? WP_DEBUG_LOG : WP_CONTENT_DIR . '/debug.log';
$marque  = 'sentinelle' . wp_rand( 1000, 9999 );
$email   = $marque . '@example.com';
$r_ok    = $poster_json( pp_requete_valide( [ 'email' => $email, 'firstName' => 'Prenom' . $marque, 'phone' => '06 99 88 77 66' ] ) );
if ( $r_ok->get_status() === 201 ) {
	$crees[] = (int) $repo->find_by_reference( (string) $r_ok->get_data()['reference'] )['id'];
}
$r_ko    = $poster_json( pp_requete_valide( [ 'email' => $email, 'firstName' => 'Prenom' . $marque, 'surface' => 0 ] ) );
$contenu = is_file( $journal ) ? (string) file_get_contents( $journal ) : '';
$verifie( 'WP_DEBUG actif (sinon le test du journal ne prouve rien)', defined( 'WP_DEBUG' ) && WP_DEBUG );
$verifie( 'le journal ne contient ni l’email ni le prénom du test', ! str_contains( $contenu, $marque ) );
$verifie( 'le journal ne contient pas le téléphone du test', ! str_contains( $contenu, '06 99 88 77 66' ) );
$verifie( 'le journal contient une trace « Demande créée » avec project_id', str_contains( $contenu, 'Demande créée' ) && str_contains( $contenu, '"project_id"' ) );
$verifie( 'la réponse 422 ne renvoie pas l’email saisi', ! str_contains( (string) wp_json_encode( $r_ko->get_data() ), $marque ) );
$verifie( 'la réponse 422 ne contient ni SQL ni chemin', ! preg_match( '/SELECT|INSERT|wp-content|' . preg_quote( str_replace( '\\', '/', ABSPATH ), '/' ) . '/i', str_replace( '\\', '/', (string) wp_json_encode( $r_ko->get_data() ) ) ) );

/* ------------------------------------------------------------------ */
$section( 'Service dégradé' );
update_option( Installer::OPTION_DB_VERSION, 1 ); // schéma en retard : on n'écrit pas
$avant = $nb_lignes();
$r     = $poster_json( pp_requete_valide() );
$verifie( 'schéma en retard → 503 service_unavailable', $r->get_status() === 503 && ( $r->get_data()['code'] ?? '' ) === 'service_unavailable', (string) $r->get_status() );
$verifie( 'aucune ligne écrite en mode dégradé', $nb_lignes() === $avant );
update_option( Installer::OPTION_DB_VERSION, POSE_PARQUET_DB_VERSION );

/* ------------------------------------------------------------------ */
$section( 'Migration 1 → 2 avec données' );
// On remet la table dans l'état du schéma 1 : reference NOT NULL, pas de colonne style.
$wpdb->query( "ALTER TABLE {$tables['projects']} DROP COLUMN style" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$wpdb->query( "ALTER TABLE {$tables['projects']} MODIFY reference varchar(20) NOT NULL" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
update_option( Installer::OPTION_DB_VERSION, 1 );
$verifie( 'état v1 reproduit (style absent)', ! in_array( 'style', $wpdb->get_col( "DESCRIBE {$tables['projects']}", 0 ), true ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$now = current_time( 'mysql', true );
$wpdb->insert( $tables['projects'], [ 'reference' => 'PP-TEST-MIG001', 'status' => 'new', 'first_name' => 'Migr', 'created_at' => $now, 'updated_at' => $now ] );
$id_mig  = (int) $wpdb->insert_id;
$crees[] = $id_mig;
$total   = $nb_lignes();

Installer::maybe_upgrade();

$par_nom = array_column( $wpdb->get_results( "DESCRIBE {$tables['projects']}", ARRAY_A ), null, 'Field' ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$verifie( 'version enregistrée = 2', Installer::installed_version() === 2 );
$verifie( 'colonne style ajoutée', isset( $par_nom['style'] ) && str_starts_with( $par_nom['style']['Type'], 'varchar(40)' ) );
$verifie( 'reference redevenue nullable', ( $par_nom['reference']['Null'] ?? '' ) === 'YES' );
$verifie( 'index unique reference conservé', (bool) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = %s AND index_name = 'reference' AND non_unique = 0", $tables['projects'] ) ) );
$verifie( 'nombre de lignes inchangé', $nb_lignes() === $total );
$mig = $repo->find_by_id( $id_mig );
$verifie( 'ligne pré-migration intacte (référence, prénom)', $mig && $mig['reference'] === 'PP-TEST-MIG001' && $mig['first_name'] === 'Migr' && $mig['style'] === '' );
Installer::maybe_upgrade();
$verifie( 'seconde exécution sans effet ni erreur', Installer::installed_version() === 2 && $wpdb->last_error === '' );

/* ------------------------------------------------------------------ */
$section( 'Concurrence : références uniques' );
$ouvriers = 6;
$chacun   = 5;
$procs    = [];
$sorties  = [];
$worker   = __DIR__ . '/concurrency-worker.php';
for ( $i = 0; $i < $ouvriers; $i++ ) {
	$cmd   = [ PHP_BINARY, $worker, $wp_root, (string) $chacun ];
	$pipes = [];
	$p     = proc_open( $cmd, [ 1 => [ 'pipe', 'w' ], 2 => [ 'pipe', 'w' ] ], $pipes );
	if ( is_resource( $p ) ) {
		$procs[] = [ $p, $pipes ];
	}
}
$verifie( "$ouvriers processus lancés en parallèle", count( $procs ) === $ouvriers );
$erreurs = '';
foreach ( $procs as [ $p, $pipes ] ) {
	$sorties[] = stream_get_contents( $pipes[1] );
	$erreurs  .= stream_get_contents( $pipes[2] );
	fclose( $pipes[1] );
	fclose( $pipes[2] );
	proc_close( $p );
}
$refs = array_values( array_filter( array_map( 'trim', explode( "\n", implode( "\n", $sorties ) ) ) ) );
$verifie( "$ouvriers × $chacun références produites", count( $refs ) === $ouvriers * $chacun, count( $refs ) . ' — ' . substr( $erreurs, 0, 300 ) );
$verifie( 'aucun échec de création', ! array_filter( $refs, static fn( string $r ): bool => str_starts_with( $r, 'ECHEC' ) ) );
$verifie( 'toutes les références sont uniques', count( array_unique( $refs ) ) === count( $refs ) );
$verifie( 'toutes au bon format', ! array_filter( $refs, static fn( string $r ): bool => ! Reference::is_valid( $r ) ) );
$ids_conc = $wpdb->get_col( "SELECT id FROM {$tables['projects']} WHERE last_name LIKE 'Concurrence %'" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$verifie( 'chaque demande concurrente a exactement un événement d’historique', $ids_conc && (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['history']} WHERE project_id IN (" . implode( ',', array_map( 'intval', $ids_conc ) ) . ')' ) === count( $ids_conc ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$verifie( 'aucune ligne sans référence après la concurrence', (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['projects']} WHERE reference IS NULL" ) === 0 ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$crees = array_merge( $crees, array_map( 'intval', $ids_conc ) );

/* ------------------------------------------------------------------ */
$section( 'Méthodes' );
foreach ( [ 'GET', 'PUT', 'PATCH', 'DELETE' ] as $m ) {
	$r = rest_do_request( new WP_REST_Request( $m, '/pose-parquet/v1/projects' ) );
	$verifie( "$m /projects → 404 (pas de liste, pas de modification)", $r->get_status() === 404, (string) $r->get_status() );
}
$r = rest_do_request( new WP_REST_Request( 'GET', '/pose-parquet/v1/projects/1' ) );
$verifie( 'GET /projects/1 → 404', $r->get_status() === 404 );

/* ------------------------------------------------------------------ */
$section( 'CORS (fonctions)' );
foreach ( Cors::DEFAULT_ORIGINS as $o ) {
	$verifie( "origine $o autorisée", Cors::is_allowed( $o ) );
}
$verifie( 'barre finale tolérée', Cors::is_allowed( 'http://localhost:5180/' ) );
$verifie( 'casse du schéma/hôte tolérée', Cors::is_allowed( 'HTTP://LOCALHOST:5180' ) );
$verifie( 'autre port refusé', ! Cors::is_allowed( 'http://localhost:5181' ) );
$verifie( 'http au lieu de https refusé', ! Cors::is_allowed( 'http://pose-parquet.com' ) );
$verifie( 'sous-domaine inconnu refusé', ! Cors::is_allowed( 'https://evil.pose-parquet.com' ) );
$verifie( 'origine tierce refusée', ! Cors::is_allowed( 'https://example.org' ) );
$verifie( '« * » jamais autorisée', ! Cors::is_allowed( '*' ) && ! in_array( '*', Cors::allowed_origins(), true ) );
$verifie( 'chaîne vide / null refusées', ! Cors::is_allowed( '' ) && ! Cors::is_allowed( 'null' ) );
add_filter( 'pose_parquet_allowed_origins', static fn( array $o ): array => array_merge( $o, [ 'https://preprod.example.net', '*' ] ) );
$verifie( 'filtre : origine ajoutée reconnue', Cors::is_allowed( 'https://preprod.example.net' ) );
$verifie( 'filtre : « * » ignorée même ajoutée', ! in_array( '*', Cors::allowed_origins(), true ) );
remove_all_filters( 'pose_parquet_allowed_origins' );
$verifie( 'concerne /pose-parquet/v1/projects', Cors::concerns( '/pose-parquet/v1/projects' ) );
$verifie( 'ne concerne pas /wp/v2/posts', ! Cors::concerns( '/wp/v2/posts' ) );
$verifie( 'filtre rest_pre_serve_request branché', has_filter( 'rest_pre_serve_request', [ Cors::class, 'serve' ] ) === 20 );

/* ------------------------------------------------------------------ */
$section( 'Nettoyage' );
// Les demandes laissées par run-http.php (client sans base) sont reprises ici.
$crees = array_merge( $crees, array_map( 'intval', $wpdb->get_col( "SELECT id FROM {$tables['projects']} WHERE last_name = 'HttpTest'" ) ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$crees = array_unique( array_filter( $crees ) );
foreach ( $crees as $id ) {
	$wpdb->delete( $tables['history'], [ 'project_id' => $id ], [ '%d' ] );
	$wpdb->delete( $tables['projects'], [ 'id' => $id ], [ '%d' ] );
}
$verifie( count( $crees ) . ' lignes de test supprimées', true );

exit( $bilan() );
