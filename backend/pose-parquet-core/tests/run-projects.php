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

use PoseParquet\Core\Admin\Settings;
use PoseParquet\Core\Antispam\ClientIdentity;
use PoseParquet\Core\Antispam\FormToken;
use PoseParquet\Core\Antispam\RateLimiter;
use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Mail\InternalNotification;
use PoseParquet\Core\Mail\VisitorConfirmation;
use PoseParquet\Core\Projects\Reference;
use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Rest\Cors;
use PoseParquet\Core\Security\Capabilities;

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
require_once ABSPATH . 'wp-admin/includes/template.php'; // do_settings_sections, submit_button

// Identité réseau de test et limites de débit très hautes : la section dédiée les abaisse.
$_SERVER['REMOTE_ADDR'] = '203.0.113.10';
$limites_test           = [ 'window' => 3600, 'attempts' => 100000, 'successes' => 100000 ];
add_filter( 'pose_parquet_rate_limits', static function () use ( &$limites_test ): array {
	return $limites_test;
} );

// Aucun vrai email : pre_wp_mail court-circuite wp_mail() et rend $mail_result.
$mails_envoyes = [];
$mail_result   = true; // bool, ou callable(int $index_dans_le_post): bool
$mail_index    = 0;
add_filter( 'pre_wp_mail', static function ( $null, array $atts ) use ( &$mails_envoyes, &$mail_result, &$mail_index ) {
	$mails_envoyes[] = $atts;
	$r = is_callable( $mail_result ) ? $mail_result( $mail_index ) : $mail_result;
	$mail_index++;
	return (bool) $r;
}, 10, 2 );
// Closures et non fonctions fléchées : celles-ci figeraient le tableau à sa création.
$compte_mails = static function () use ( &$mails_envoyes ): int {
	return count( $mails_envoyes );
};
$dernier_mail = static function ( int $depuis_la_fin = 1 ) use ( &$mails_envoyes ): array {
	$m = $mails_envoyes[ count( $mails_envoyes ) - $depuis_la_fin ] ?? [];
	return [
		'to'      => (string) ( $m['to'] ?? '' ),
		'subject' => (string) ( $m['subject'] ?? '' ),
		'message' => (string) ( $m['message'] ?? '' ),
		'headers' => (array) ( $m['headers'] ?? [] ),
	];
};

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
$verifie( 'colonnes d’état des emails présentes (schéma 3)', isset( $par_nom['internal_mail_status'], $par_nom['internal_mail_sent_at'], $par_nom['visitor_mail_status'], $par_nom['visitor_mail_sent_at'] ) );
$verifie( 'défaut pending sur les états d’email', ( $par_nom['internal_mail_status']['Default'] ?? '' ) === 'pending' && ( $par_nom['visitor_mail_status']['Default'] ?? '' ) === 'pending' );
$verifie( 'adresse de réception configurée par défaut (admin_email)', Settings::is_configured() && Settings::notification_email() === get_option( 'admin_email' ) );
$verifie( 'confirmation visiteur activée par défaut', Settings::visitor_confirmation_enabled() );
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

/* Emails du POST valide : deux tentatives, l'interne puis la confirmation. */
$verifie( 'exactement deux emails tentés (interne + visiteur)', $compte_mails() === 2, (string) $compte_mails() );
$interne = $dernier_mail( 2 );
$visiteur = $dernier_mail( 1 );
$verifie( 'interne : destinataire = adresse de réception', ( $interne['to'] ?? '' ) === Settings::notification_email() );
$verifie( 'interne : sujet « Nouvelle demande Pose Parquet — <référence> »', ( $interne['subject'] ?? '' ) === 'Nouvelle demande Pose Parquet — ' . $corps['reference'] );
$verifie( 'interne : ni email ni téléphone dans le sujet', ! str_contains( $interne['subject'] ?? '', '@' ) && ! str_contains( $interne['subject'] ?? '', '06 12' ) );
$verifie( 'interne : Reply-To = email du visiteur', (bool) array_filter( (array) ( $interne['headers'] ?? [] ), static fn( $h ): bool => $h === 'Reply-To: test.automatique@example.com' ) );
$verifie( 'interne : aucun From forcé', ! array_filter( (array) ( $interne['headers'] ?? [] ), static fn( $h ): bool => stripos( (string) $h, 'From:' ) === 0 ) );
$verifie( 'interne : Content-Type HTML UTF-8', in_array( 'Content-Type: text/html; charset=UTF-8', (array) ( $interne['headers'] ?? [] ), true ) );
$verifie( 'interne : corps contient référence, nom, email, téléphone, « Bâton rompu », « Bretagne »', str_contains( $interne['message'] ?? '', $corps['reference'] ) && str_contains( $interne['message'], 'Test Automatique' ) && str_contains( $interne['message'], 'test.automatique@example.com' ) && str_contains( $interne['message'], '06 12 34 56 78' ) && str_contains( $interne['message'], 'Bâton rompu' ) && str_contains( $interne['message'], 'Bretagne' ) );
$verifie( 'interne : bloc Visualiseur présent (scène, motif, 45°)', str_contains( $interne['message'], 'Configuration Visualiseur' ) && str_contains( $interne['message'], '45°' ) );
$verifie( 'interne : aucun JSON brut ni champ technique', ! str_contains( $interne['message'], '{"zoom"' ) && ! str_contains( $interne['message'], 'visualizer_config' ) && ! str_contains( $interne['message'], 'formToken' ) );
$verifie( 'interne : aucun <script>, aucune balise active', ! preg_match( '/<script|onerror=|javascript:/i', $interne['message'] ) );
$verifie( 'visiteur : destinataire = email du visiteur', ( $visiteur['to'] ?? '' ) === 'test.automatique@example.com' );
$verifie( 'visiteur : sujet « Votre demande Pose Parquet a bien été reçue »', ( $visiteur['subject'] ?? '' ) === 'Votre demande Pose Parquet a bien été reçue' );
$verifie( 'visiteur : corps contient prénom et référence', str_contains( $visiteur['message'] ?? '', 'Bonjour Test' ) && str_contains( $visiteur['message'], $corps['reference'] ) );
$verifie( 'visiteur : résumé court (Séjour, 32 m²)', str_contains( $visiteur['message'], 'Séjour' ) && str_contains( $visiteur['message'], '32 m²' ) );
$verifie( 'visiteur : pas de Reply-To vers lui-même, pas de prix, pas de délai promis', ! array_filter( (array) ( $visiteur['headers'] ?? [] ), static fn( $h ): bool => stripos( (string) $h, 'Reply-To' ) === 0 ) && ! preg_match( '/€|\b\d+ ?jours\b|48 ?h/i', $visiteur['message'] ) );

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
	$verifie( 'internal_mail_status = sent, sent_at posé', $ligne['internal_mail_status'] === 'sent' && ! empty( $ligne['internal_mail_sent_at'] ) );
	$verifie( 'visitor_mail_status = sent, sent_at posé', $ligne['visitor_mail_status'] === 'sent' && ! empty( $ligne['visitor_mail_sent_at'] ) );

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
$mails_avant_refus = $compte_mails();

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
$verifie( 'aucun email tenté pour un refus (2 créations × 2 emails seulement)', $compte_mails() === $mails_avant_refus + 4, (string) ( $compte_mails() - $mails_avant_refus ) );

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
$section( 'Migration 1 → ' . POSE_PARQUET_DB_VERSION . ' avec données' );
// On remet la table dans l'état du schéma 1 : reference NOT NULL, ni style ni états d'email.
$wpdb->query( "ALTER TABLE {$tables['projects']} DROP COLUMN style, DROP COLUMN internal_mail_status, DROP COLUMN internal_mail_sent_at, DROP COLUMN visitor_mail_status, DROP COLUMN visitor_mail_sent_at" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
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
$verifie( 'version enregistrée = ' . POSE_PARQUET_DB_VERSION, Installer::installed_version() === POSE_PARQUET_DB_VERSION );
$verifie( 'colonne style ajoutée', isset( $par_nom['style'] ) && str_starts_with( $par_nom['style']['Type'], 'varchar(40)' ) );
$verifie( 'colonnes d’état des emails ajoutées', isset( $par_nom['internal_mail_status'], $par_nom['visitor_mail_sent_at'] ) );
$verifie( 'reference redevenue nullable', ( $par_nom['reference']['Null'] ?? '' ) === 'YES' );
$verifie( 'index unique reference conservé', (bool) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = %s AND index_name = 'reference' AND non_unique = 0", $tables['projects'] ) ) );
$verifie( 'nombre de lignes inchangé', $nb_lignes() === $total );
$mig = $repo->find_by_id( $id_mig );
$verifie( 'ligne pré-migration intacte (référence, prénom)', $mig && $mig['reference'] === 'PP-TEST-MIG001' && $mig['first_name'] === 'Migr' && $mig['style'] === '' );
$verifie( 'ancienne ligne : états d’email = pending (aucun envoi n’a eu lieu)', $mig && $mig['internal_mail_status'] === 'pending' && $mig['visitor_mail_status'] === 'pending' && $mig['internal_mail_sent_at'] === null );
Installer::maybe_upgrade();
$verifie( 'seconde exécution sans effet ni erreur', Installer::installed_version() === POSE_PARQUET_DB_VERSION && $wpdb->last_error === '' );

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
foreach ( [ 'POST', 'PUT', 'DELETE' ] as $m ) {
	$r = rest_do_request( new WP_REST_Request( $m, '/pose-parquet/v1/form-token' ) );
	$verifie( "$m /form-token → 404", $r->get_status() === 404, (string) $r->get_status() );
}

/* ------------------------------------------------------------------ */
$section( 'Route form-token' );
$r = rest_do_request( new WP_REST_Request( 'GET', '/pose-parquet/v1/form-token' ) );
$d = $r->get_data();
$verifie( 'GET /form-token → 200 anonyme', $r->get_status() === 200 );
$verifie( 'jeton présent et vérifiable', is_string( $d['token'] ?? null ) && FormToken::verify( $d['token'], time() + 10 ) === '' );
$verifie( 'minAge = 2, expiresIn = 7200 (valeurs centralisées)', ( $d['minAge'] ?? 0 ) === FormToken::MIN_AGE && ( $d['expiresIn'] ?? 0 ) === FormToken::MAX_AGE && FormToken::MIN_AGE === 2 && FormToken::MAX_AGE === 7200 );
$verifie( 'Cache-Control: no-store', ( $r->get_headers()['Cache-Control'] ?? '' ) === 'no-store' );
$verifie( 'réponse minuscule (< 300 octets) et sans secret', strlen( (string) wp_json_encode( $d ) ) < 300 && ! str_contains( (string) wp_json_encode( $d ), wp_salt( 'nonce' ) ) );
$verifie( 'deux jetons successifs différents (nonce)', $d['token'] !== rest_do_request( new WP_REST_Request( 'GET', '/pose-parquet/v1/form-token' ) )->get_data()['token'] );

/* ------------------------------------------------------------------ */
$section( 'Jeton temporel' );
$verifie( 'jeton émis il y a 10 s : valide', FormToken::verify( FormToken::issue( time() - 10 ) ) === '' );
$verifie( 'jeton émis à l’instant : trop jeune (early)', FormToken::verify( FormToken::issue() ) === FormToken::EARLY );
$verifie( 'jeton émis il y a 1 s : trop jeune', FormToken::verify( FormToken::issue( time() - 1 ) ) === FormToken::EARLY );
$verifie( 'jeton émis il y a 2 s : valide (âge minimum inclus)', FormToken::verify( FormToken::issue( time() - 2 ) ) === '' );
$verifie( 'jeton de 7 199 s : valide', FormToken::verify( FormToken::issue( time() - 7199 ) ) === '' );
$verifie( 'jeton de 7 201 s : expiré', FormToken::verify( FormToken::issue( time() - 7201 ) ) === FormToken::EXPIRED );
$jeton = FormToken::issue( time() - 10 );
$parts = explode( '.', $jeton );
$parts[3] = strrev( $parts[3] );
$verifie( 'signature modifiée : invalide', FormToken::verify( implode( '.', $parts ) ) === FormToken::INVALID );
$parts = explode( '.', $jeton );
$parts[1] = (string) ( (int) $parts[1] - 5000 );
$verifie( 'date modifiée sans re-signer : invalide', FormToken::verify( implode( '.', $parts ) ) === FormToken::INVALID );
$verifie( 'jeton tronqué : invalide', FormToken::verify( substr( $jeton, 0, -10 ) ) === FormToken::INVALID );
$verifie( 'ancienne version (v0) : invalide', FormToken::verify( 'v0' . substr( $jeton, 2 ) ) === FormToken::INVALID );
$verifie( 'absent / vide / non chaîne : missing ou invalide', FormToken::verify( null ) === FormToken::MISSING && FormToken::verify( '' ) === FormToken::MISSING && FormToken::verify( [ 'a' ] ) === FormToken::MISSING );
$verifie( 'jeton de 200 caractères : invalide sans travail', FormToken::verify( str_repeat( 'a', 200 ) ) === FormToken::INVALID );
$avant = $nb_lignes();
$r = $poster_json( pp_requete_valide( [ 'formToken' => FormToken::issue() ] ) );
$verifie( 'POST avec jeton trop jeune → 422 form_token_invalid, fields.formToken', $r->get_status() === 422 && ( $r->get_data()['code'] ?? '' ) === 'form_token_invalid' && isset( ( (array) $r->get_data()['fields'] )['formToken'] ), wp_json_encode( $r->get_data() ) );
$r = $poster_json( pp_requete_valide( [ 'formToken' => null ] ) );
$verifie( 'POST sans jeton → 422 form_token_invalid', $r->get_status() === 422 && ( $r->get_data()['code'] ?? '' ) === 'form_token_invalid' );
$r = $poster_json( pp_requete_valide( [ 'formToken' => FormToken::issue( time() - 9000 ) ] ) );
$verifie( 'POST avec jeton expiré → 422', $r->get_status() === 422 && str_contains( ( (array) $r->get_data()['fields'] )['formToken'] ?? '', 'expiré' ) );
$verifie( 'la réponse ne renvoie ni le jeton ni le secret', ! str_contains( (string) wp_json_encode( $r->get_data() ), substr( $jeton, 0, 20 ) ) && ! str_contains( (string) wp_json_encode( $r->get_data() ), wp_salt( 'nonce' ) ) );
$verifie( 'aucune ligne créée par les jetons refusés', $nb_lignes() === $avant );

/* ------------------------------------------------------------------ */
$section( 'Pot de miel' );
$avant = $nb_lignes();
$hist_avant = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['history']}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$mails_avant = $compte_mails();
$r = $poster_json( pp_requete_valide( [ 'website' => 'http://spam.example' ] ) );
$verifie( 'website rempli → 422 submission_rejected', $r->get_status() === 422 && ( $r->get_data()['code'] ?? '' ) === 'submission_rejected', wp_json_encode( $r->get_data() ) );
$verifie( 'message générique, sans « honeypot »', ! stripos( (string) wp_json_encode( $r->get_data() ), 'honeypot' ) && ! stripos( (string) wp_json_encode( $r->get_data() ), 'website' ) );
$r = $poster_json( pp_requete_valide( [ 'website' => ' x' ] ) );
$verifie( 'website « x » → 422', $r->get_status() === 422 );
$verifie( 'aucune ligne, aucun historique, aucun email', $nb_lignes() === $avant && (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['history']}" ) === $hist_avant && $compte_mails() === $mails_avant ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$r = $poster_json( pp_requete_valide( [ 'website' => '' ] ) );
$verifie( 'website vide → 201 (champ technique accepté, non « inconnu »)', $r->get_status() === 201, wp_json_encode( $r->get_data() ) );
if ( $r->get_status() === 201 ) {
	$l = $repo->find_by_reference( (string) $r->get_data()['reference'] );
	$crees[] = (int) $l['id'];
	$verifie( 'website et formToken absents de la ligne stockée', ! isset( $l['website'], $l['formToken'] ) && ! str_contains( (string) wp_json_encode( $l ), 'v1.' ) );
}

/* ------------------------------------------------------------------ */
$section( 'Limite de débit' );
$limiter = new RateLimiter();
$_SERVER['REMOTE_ADDR'] = '198.51.100.7';
$client_a = ClientIdentity::resolve();
$limiter->forget( $client_a );
$limites_test = [ 'window' => 3600, 'attempts' => 4, 'successes' => 2 ];
$verifie( 'limites lues via le filtre (4 tentatives, 2 créations)', RateLimiter::limits()['attempts'] === 4 && RateLimiter::limits()['successes'] === 2 );
$verifie( 'valeurs par défaut centralisées : 5 créations, 30 tentatives, 3600 s', RateLimiter::DEFAULT_SUCCESSES === 5 && RateLimiter::DEFAULT_ATTEMPTS === 30 && RateLimiter::DEFAULT_WINDOW === 3600 );
$r1 = $poster_json( pp_requete_valide() );
$r2 = $poster_json( pp_requete_valide() );
$verifie( 'sous la limite : 201, 201', $r1->get_status() === 201 && $r2->get_status() === 201 );
foreach ( [ $r1, $r2 ] as $rr ) {
	if ( $rr->get_status() === 201 ) {
		$crees[] = (int) $repo->find_by_reference( (string) $rr->get_data()['reference'] )['id'];
	}
}
$avant = $nb_lignes();
$r3 = $poster_json( pp_requete_valide() );
$verifie( '3e demande valide : 429 rate_limited (limite de créations)', $r3->get_status() === 429 && ( $r3->get_data()['code'] ?? '' ) === 'rate_limited', $r3->get_status() . ' ' . wp_json_encode( $r3->get_data() ) );
$verifie( '429 : Retry-After présent, entier positif ≤ fenêtre', ctype_digit( (string) ( $r3->get_headers()['Retry-After'] ?? '' ) ) && (int) $r3->get_headers()['Retry-After'] > 0 && (int) $r3->get_headers()['Retry-After'] <= 3600 );
$verifie( '429 : message attendu, aucun identifiant technique', ( $r3->get_data()['message'] ?? '' ) === 'Trop de demandes ont été envoyées. Veuillez réessayer plus tard.' && ! str_contains( (string) wp_json_encode( $r3->get_data() ), $client_a ) && ! str_contains( (string) wp_json_encode( $r3->get_data() ), '198.51' ) );
$verifie( 'aucune ligne créée à 429', $nb_lignes() === $avant );
$r4 = $poster_json( pp_requete_valide( [ 'email' => 'invalide' ] ) );
$verifie( '4e tentative (invalide) : 429 dès la limite de tentatives, avant la validation', $r4->get_status() === 429 && ( $r4->get_data()['code'] ?? '' ) === 'rate_limited' && empty( (array) $r4->get_data()['fields'] ), (string) $r4->get_status() );
$_SERVER['REMOTE_ADDR'] = '198.51.100.8';
$client_b = ClientIdentity::resolve();
$limiter->forget( $client_b );
$r5 = $poster_json( pp_requete_valide() );
$verifie( 'autre identité réseau : 201', $r5->get_status() === 201 );
if ( $r5->get_status() === 201 ) {
	$crees[] = (int) $repo->find_by_reference( (string) $r5->get_data()['reference'] )['id'];
}
$verifie( 'condensats distincts, 32 hex, sans l’adresse', $client_a !== $client_b && preg_match( '/^[a-f0-9]{32}$/', $client_a ) && ! str_contains( $client_a, '198' ) );
$verifie( 'même adresse → même condensat', ClientIdentity::hash( '198.51.100.7' ) === $client_a );
$cles = $wpdb->get_col( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '%transient%pp_rl_%'" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$verifie( 'transients nommés par condensat, jamais par adresse', count( $cles ) >= 2 && ! array_filter( $cles, static fn( string $k ): bool => str_contains( $k, '198.51' ) || str_contains( $k, '203.0' ) ) );
$valeurs = $wpdb->get_col( "SELECT option_value FROM {$wpdb->options} WHERE option_name LIKE '_transient_pp_rl_%'" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$verifie( 'transients sans donnée personnelle (compteur et date seulement)', ! array_filter( $valeurs, static fn( string $v ): bool => str_contains( $v, '@' ) || str_contains( $v, 'Test' ) || str_contains( $v, '198.51' ) ) );
$verifie( 'clé de transient : condensat seulement', $limiter->key( $client_a, RateLimiter::ATTEMPTS ) === 'pp_rl_a_' . $client_a );
add_filter( 'pose_parquet_client_ip', static fn(): string => '192.0.2.99' );
$verifie( 'filtre pose_parquet_client_ip (reverse proxy de confiance) pris en compte', ClientIdentity::resolve() === ClientIdentity::hash( '192.0.2.99' ) );
remove_all_filters( 'pose_parquet_client_ip' );
$verifie( 'X-Forwarded-For ignoré par défaut', ( static function () use ( $client_b ): bool {
	$_SERVER['HTTP_X_FORWARDED_FOR'] = '10.0.0.1';
	$id = ClientIdentity::resolve();
	unset( $_SERVER['HTTP_X_FORWARDED_FOR'] );
	return $id === $client_b;
} )() );
// Expiration de la fenêtre : 1 seconde, puis on attend.
$limites_test = [ 'window' => 1, 'attempts' => 1, 'successes' => 1 ];
$_SERVER['REMOTE_ADDR'] = '198.51.100.9';
$limiter->forget( ClientIdentity::resolve() );
$ra = $poster_json( pp_requete_valide() );
$rb = $poster_json( pp_requete_valide() );
sleep( 2 );
$rc = $poster_json( pp_requete_valide() );
$verifie( 'fenêtre expirée : 201 puis 429 puis, 2 s plus tard, 201', $ra->get_status() === 201 && $rb->get_status() === 429 && $rc->get_status() === 201, $ra->get_status() . '/' . $rb->get_status() . '/' . $rc->get_status() );
foreach ( [ $ra, $rc ] as $rr ) {
	if ( $rr->get_status() === 201 ) {
		$crees[] = (int) $repo->find_by_reference( (string) $rr->get_data()['reference'] )['id'];
	}
}
$limites_test = [ 'window' => 3600, 'attempts' => 100000, 'successes' => 100000 ];
$_SERVER['REMOTE_ADDR'] = '203.0.113.10';

/* ------------------------------------------------------------------ */
$section( 'Emails : échecs non destructifs' );
$mail_result = false; // wp_mail() rend false pour tout
$avant = $nb_lignes();
$hist_avant = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$tables['history']}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$r = $poster_json( pp_requete_valide( [ 'email' => 'echec.total@example.com' ] ) );
$verifie( 'deux emails en échec : POST → 201 quand même', $r->get_status() === 201 && isset( $r->get_data()['reference'] ), wp_json_encode( $r->get_data() ) );
$verifie( 'la réponse ne dit rien des emails', count( (array) $r->get_data() ) === 2 );
$l = $repo->find_by_reference( (string) ( $r->get_data()['reference'] ?? '' ) );
if ( $l ) {
	$crees[] = (int) $l['id'];
	$verifie( 'demande conservée, historique présent', $nb_lignes() === $avant + 1 && count( $repo->history_of( (int) $l['id'] ) ) === 1 );
	$verifie( 'internal_mail_status = failed, sent_at NULL', $l['internal_mail_status'] === 'failed' && $l['internal_mail_sent_at'] === null );
	$verifie( 'visitor_mail_status = failed, sent_at NULL', $l['visitor_mail_status'] === 'failed' && $l['visitor_mail_sent_at'] === null );
}
$verifie( 'la confirmation visiteur a été tentée malgré l’échec interne', $compte_mails() >= 2 && ( $dernier_mail( 1 )['to'] ?? '' ) === 'echec.total@example.com' );

$mail_index  = 0;
$mail_result = static fn( int $i ): bool => $i === 0; // interne OK, visiteur KO
$r = $poster_json( pp_requete_valide() );
$l = $r->get_status() === 201 ? $repo->find_by_reference( (string) $r->get_data()['reference'] ) : null;
if ( $l ) {
	$crees[] = (int) $l['id'];
}
$verifie( 'interne OK / visiteur KO : 201, sent / failed', $l && $l['internal_mail_status'] === 'sent' && $l['visitor_mail_status'] === 'failed' );

$mail_index  = 0;
$mail_result = static fn( int $i ): bool => $i === 1; // interne KO, visiteur OK
$r = $poster_json( pp_requete_valide() );
$l = $r->get_status() === 201 ? $repo->find_by_reference( (string) $r->get_data()['reference'] ) : null;
if ( $l ) {
	$crees[] = (int) $l['id'];
}
$verifie( 'interne KO / visiteur OK : 201, failed / sent', $l && $l['internal_mail_status'] === 'failed' && $l['visitor_mail_status'] === 'sent' );

$mail_result = true;
$contenu = is_file( $journal ) ? (string) file_get_contents( $journal ) : '';
$verifie( 'journal : « Email non envoyé » avec mail_type et error_code', str_contains( $contenu, 'Email non envoyé' ) && str_contains( $contenu, '"mail_type":"visitor"' ) && str_contains( $contenu, '"error_code":"wp_mail_false"' ) );
$verifie( 'journal : ni email, ni nom, ni corps de mail', ! str_contains( $contenu, 'echec.total' ) && ! str_contains( $contenu, 'Automatique' ) && ! str_contains( $contenu, 'Nouvelle demande Pose Parquet —' ) && ! str_contains( $contenu, '<table' ) );

/* Confirmation désactivée. */
Settings::update( [ Settings::KEY_VISITOR_CONFIRMATION => false ] );
$mails_avant = $compte_mails();
$r = $poster_json( pp_requete_valide() );
$l = $r->get_status() === 201 ? $repo->find_by_reference( (string) $r->get_data()['reference'] ) : null;
if ( $l ) {
	$crees[] = (int) $l['id'];
}
$verifie( 'confirmation désactivée : un seul email (interne), visitor_mail_status = skipped', $compte_mails() === $mails_avant + 1 && $l && $l['visitor_mail_status'] === 'skipped' && $l['internal_mail_status'] === 'sent' );
Settings::update( [ Settings::KEY_VISITOR_CONFIRMATION => true ] );

/* ------------------------------------------------------------------ */
$section( 'Emails : pas de doublon' );
$mails_avant = $compte_mails();
$r = $poster_json( pp_requete_valide() );
if ( $r->get_status() === 201 ) {
	$crees[] = (int) $repo->find_by_reference( (string) $r->get_data()['reference'] )['id'];
}
$verifie( 'un POST = exactement 2 appels à wp_mail', $compte_mails() === $mails_avant + 2, (string) ( $compte_mails() - $mails_avant ) );
$verifie( 'destinataires distincts (interne ≠ visiteur)', ( $dernier_mail( 2 )['to'] ?? '' ) !== ( $dernier_mail( 1 )['to'] ?? '' ) );
// Le plugin n'envoie pas sur événement : un hook enregistré deux fois enverrait deux fois.
$sources = array_map( 'file_get_contents', array_merge( glob( POSE_PARQUET_DIR . '/src/*/*.php' ) ?: [], [ POSE_PARQUET_DIR . '/src/Plugin.php' ] ) );
$verifie( 'aucun hook du plugin sur wp_mail / pre_wp_mail / phpmailer_init', ! preg_grep( "/add_(action|filter)\(\s*'(wp_mail|pre_wp_mail|phpmailer_init)/", $sources ) );
$verifie( 'un seul appel à wp_mail dans tout le plugin (Mail\\Mailer)', count( preg_grep( '/\bwp_mail\(/', $sources ) ) === 1 );

/* ------------------------------------------------------------------ */
$section( 'Gabarits' );
$base_row = $repo->find_by_id( (int) $crees[0] ) ?: [];
$row = array_merge( $base_row, [
	'first_name' => '<script>alert(1)</script>Élodie',
	'last_name'  => "D'Arc-Lefèvre",
	'city'       => '',
	'message'    => str_repeat( 'Phrase longue mais valide. ', 100 ) . "<img src=x onerror=alert(1)>",
	'scene_id'   => null,
	'product_id' => null,
	'pattern'    => null,
	'orientation' => null,
	'utm_source' => 'newsletter',
	'utm_medium' => '',
	'utm_campaign' => '',
] );
$html = InternalNotification::body( $row );
$verifie( 'HTML utilisateur échappé (« &lt;script&gt; »), jamais actif', str_contains( $html, '&lt;script&gt;' ) && ! str_contains( $html, '<script>' ) && ! str_contains( $html, '<img src=x' ) );
$verifie( 'accents et apostrophe rendus (Élodie, D&#039;Arc-Lefèvre)', str_contains( $html, 'Élodie' ) && str_contains( $html, 'D&#039;Arc-Lefèvre' ) );
$verifie( 'champ vide (ville) : ligne absente', ! str_contains( $html, 'Ville' ) );
$verifie( 'visualiseur absent : bloc absent', ! str_contains( $html, 'Configuration Visualiseur' ) );
$verifie( 'UTM : seul utm_source affiché, sans séparateur orphelin', str_contains( $html, 'newsletter' ) && ! str_contains( $html, 'newsletter /' ) );
$verifie( 'message long conservé', substr_count( $html, 'Phrase longue mais valide.' ) === 100 );
$verifie( 'gabarit : pas de <script>, largeur bornée, police système', ! preg_match( '/<script\b/i', $html ) && str_contains( $html, 'max-width:560px' ) && str_contains( $html, '-apple-system' ) );
$verifie( 'sujet interne sans email ni téléphone', ! str_contains( InternalNotification::subject( $row ), '@' ) );
$row_vis = array_merge( $row, [ 'scene_id' => 'sejour', 'pattern' => 'point-de-hongrie', 'orientation' => -45, 'product_id' => 'chene-1' ] );
$html_vis = InternalNotification::body( $row_vis );
$verifie( 'visualiseur présent : scène, « Point de Hongrie », -45°', str_contains( $html_vis, 'Configuration Visualiseur' ) && str_contains( $html_vis, 'Point de Hongrie' ) && str_contains( $html_vis, '-45°' ) );
$html_v = VisitorConfirmation::body( $row );
$verifie( 'confirmation : prénom échappé, référence, pas de balise active', str_contains( $html_v, '&lt;script&gt;alert(1)&lt;/script&gt;Élodie' ) && str_contains( $html_v, (string) $row['reference'] ) && ! str_contains( $html_v, '<script>' ) );
$verifie( 'confirmation : texte lisible sans style (Bonjour, Nous avons bien reçu, Pose Parquet)', str_contains( wp_strip_all_tags( $html_v ), 'Nous avons bien reçu votre demande' ) && str_contains( wp_strip_all_tags( $html_v ), 'Pose Parquet' ) );
$verifie( 'confirmation sans prénom : « Bonjour, »', str_contains( VisitorConfirmation::body( array_merge( $row, [ 'first_name' => '' ] ) ), 'Bonjour,' ) );

/* ------------------------------------------------------------------ */
$section( 'Réglages' );
$comptes = get_users( [ 'role' => 'administrator', 'number' => 1 ] );
wp_set_current_user( $comptes ? $comptes[0]->ID : 0 );
// Settings::register() n'est branché que sur une requête d'administration : ici on
// reproduit ce contexte, ce script n'étant pas WP_ADMIN.
Settings::register();
$defaut = Settings::notification_email();
$ok = Settings::update( [ Settings::KEY_NOTIFICATION_EMAIL => 'equipe@example.com' ] );
$verifie( 'administrateur : adresse de réception modifiée', Settings::notification_email() === 'equipe@example.com' );
$verifie( 'la nouvelle adresse est utilisée pour l’interne', ( static function () use ( $poster_json, $dernier_mail, $repo, &$crees ): bool {
	$r = $poster_json( pp_requete_valide() );
	if ( $r->get_status() === 201 ) {
		$crees[] = (int) $repo->find_by_reference( (string) $r->get_data()['reference'] )['id'];
	}
	return ( $dernier_mail( 2 )['to'] ?? '' ) === 'equipe@example.com';
} )() );
global $wp_settings_errors;
$wp_settings_errors = [];
$resultat = Settings::sanitize( [ Settings::KEY_NOTIFICATION_EMAIL => 'pas-un-email', Settings::KEY_VISITOR_CONFIRMATION => '1' ] );
$verifie( 'email invalide : ancienne adresse conservée', $resultat[ Settings::KEY_NOTIFICATION_EMAIL ] === 'equipe@example.com' );
$verifie( 'email invalide : erreur de réglage signalée', (bool) array_filter( get_settings_errors( Settings::OPTION ), static fn( array $e ): bool => $e['code'] === 'invalid_notification_email' ) );
$resultat = Settings::sanitize( [ Settings::KEY_NOTIFICATION_EMAIL => 'equipe@example.com' ] );
$verifie( 'case décochée (absente du POST) : confirmation désactivée', $resultat[ Settings::KEY_VISITOR_CONFIRMATION ] === false );
$resultat = Settings::sanitize( [ Settings::KEY_NOTIFICATION_EMAIL => ' Equipe@Example.com ', Settings::KEY_VISITOR_CONFIRMATION => '1' ] );
$verifie( 'case cochée : confirmation activée ; adresse nettoyée', $resultat[ Settings::KEY_VISITOR_CONFIRMATION ] === true && $resultat[ Settings::KEY_NOTIFICATION_EMAIL ] === 'Equipe@Example.com' );
$verifie( 'capability exigée par options.php = pp_manage_settings', apply_filters( 'option_page_capability_' . Settings::GROUP, 'manage_options' ) === Capabilities::MANAGE_SETTINGS );
$abonne = get_role( 'subscriber' );
$verifie( 'abonné : pas la capability → refusé par options.php', $abonne && ! $abonne->has_cap( Capabilities::MANAGE_SETTINGS ) );
$verifie( 'nonce invalide : refusé (wp_verify_nonce false sur l’action de la page)', ! wp_verify_nonce( 'bidon', Settings::GROUP . '-options' ) );
// Ce que `admin_init` déclenche pour nous, sans réveiller les en-têtes
// d'administration de WordPress (impossibles à poser depuis un script CLI).
Settings::register_settings();
ob_start();
Settings::render();
$page = (string) ob_get_clean();
// settings_fields() écrit ses attributs en guillemets simples : on compare sans en dépendre.
$page_nq = str_replace( "'", '"', $page );
$verifie( 'page Réglages : nonce, option_page, action options.php', str_contains( $page_nq, 'name="_wpnonce"' ) && str_contains( $page_nq, 'name="option_page" value="' . Settings::GROUP . '"' ) && str_contains( $page_nq, 'options.php' ) );
$verifie( 'page Réglages : deux champs et pas un de plus', str_contains( $page, 'name="pose_parquet_settings[notification_email]"' ) && str_contains( $page, 'name="pose_parquet_settings[visitor_confirmation]"' ) && substr_count( $page, '<input type="email"' ) === 1 && substr_count( $page, '<input type="checkbox"' ) === 1 && substr_count( $page_nq, 'name="pose_parquet_settings[' ) === 2 );
$verifie( 'aucune adresse personnelle codée dans le plugin', ! preg_grep( '/@(gmail|lanationduweb|hotmail|outlook)\./i', array_map( 'file_get_contents', array_merge( glob( POSE_PARQUET_DIR . '/src/*/*.php' ) ?: [], glob( POSE_PARQUET_DIR . '/templates/*.php' ) ?: [] ) ) ) );
wp_set_current_user( 0 );
$verifie( 'visiteur anonyme : rendu de la page refusé', ! current_user_can( Capabilities::MANAGE_SETTINGS ) );
delete_option( Settings::OPTION );
$verifie( 'option supprimée → retour au défaut (admin_email)', Settings::notification_email() === $defaut );

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
// Compteurs de débit (ceux de ce script et ceux laissés par run-http.php) et réglages : remis à zéro.
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_pp_rl_%' OR option_name LIKE '_transient_timeout_pp_rl_%'" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
delete_option( Settings::OPTION );
$verifie( 'compteurs de débit effacés', (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE '%pp_rl_%'" ) === 0 ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

exit( $bilan() );
