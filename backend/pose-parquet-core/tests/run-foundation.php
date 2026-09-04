<?php
/**
 * Tests de fondation — contre un WordPress réel, en ligne de commande.
 *
 *   php tests/run-foundation.php C:/chemin/vers/wordpress
 *
 * Ce ne sont pas des tests unitaires isolés : la fondation, c'est précisément
 * ce qui touche WordPress (activation, dbDelta, rôles, REST). Les simuler ne
 * prouverait rien. Le script charge WordPress, active le plugin comme
 * l'écran d'extensions le ferait, puis vérifie des faits en base et via le
 * serveur REST interne. Il s'arrête au premier échec avec un code de sortie 1.
 *
 * Prérequis : WordPress installé, base joignable, plugin présent dans
 * wp-content/plugins/pose-parquet-core (copie ou lien).
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

$wp_root = $argv[1] ?? '';
if ( ! $wp_root || ! is_file( rtrim( $wp_root, '/\\' ) . '/wp-load.php' ) ) {
	fwrite( STDERR, "Usage : php tests/run-foundation.php <racine WordPress>\n" );
	exit( 2 );
}

// Contexte : une requête d'administration authentifiée en administrateur.
$_SERVER['HTTP_HOST']      = $_SERVER['HTTP_HOST'] ?? 'localhost';
$_SERVER['REQUEST_METHOD'] = 'GET';
define( 'WP_ADMIN', true );
require rtrim( $wp_root, '/\\' ) . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';

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

$plugin = 'pose-parquet-core/pose-parquet-core.php';
$admins = get_users( [ 'role' => 'administrator', 'number' => 1 ] );
if ( ! $admins ) {
	fwrite( STDERR, "Aucun administrateur : impossible de tester les droits.\n" );
	exit( 2 );
}
wp_set_current_user( $admins[0]->ID );

global $wpdb;

/* ------------------------------------------------------------------ */
$section( 'Chargement' );
$verifie( 'le plugin est présent dans wp-content/plugins', is_file( WP_PLUGIN_DIR . '/' . $plugin ) );

// Point de départ propre : si une exécution précédente l'a laissé actif, on le désactive.
if ( is_plugin_active( $plugin ) ) {
	deactivate_plugins( $plugin );
}

/* ------------------------------------------------------------------ */
$section( 'Activation' );
$resultat = activate_plugin( $plugin );
$verifie( 'activation sans erreur', ! is_wp_error( $resultat ), is_wp_error( $resultat ) ? $resultat->get_error_message() : '' );
$verifie( 'constantes de version définies', defined( 'POSE_PARQUET_VERSION' ) && defined( 'POSE_PARQUET_DB_VERSION' ) );
$verifie( 'aucun fatal : la classe Plugin est chargeable', class_exists( PoseParquet\Core\Plugin::class ) );
// `plugins_loaded` a déjà eu lieu quand ce script active le plugin : on
// démarre le plugin comme une requête suivante le ferait, sinon rien n'est
// branché sur les hooks et le REST paraîtrait absent à tort.
PoseParquet\Core\Plugin::boot();

/* ------------------------------------------------------------------ */
$section( 'Base de données' );
$tables = PoseParquet\Core\Database\Schema::tables();
foreach ( $tables as $logique => $nom ) {
	$verifie( "table $logique ($nom) existe", (bool) $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $nom ) ) );
	$verifie( "table $logique porte le préfixe du site (" . $wpdb->prefix . ')', str_starts_with( $nom, $wpdb->prefix ) && ! str_starts_with( $nom, 'wp_pp' ) || $wpdb->prefix === 'wp_' );
}
$colonnes = $wpdb->get_col( "DESCRIBE {$tables['projects']}", 0 ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
foreach ( [ 'reference', 'status', 'email', 'postal_code', 'surface', 'visualizer_config', 'consent_at', 'created_at', 'updated_at' ] as $col ) {
	$verifie( "pp_projects a la colonne $col", in_array( $col, $colonnes, true ) );
}
$index = $wpdb->get_results( "SHOW INDEX FROM {$tables['projects']}", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$noms_index = array_unique( array_column( $index, 'Key_name' ) );
$verifie( 'index unique sur reference', in_array( 'reference', $noms_index, true ) );
$verifie( 'index sur status', in_array( 'status', $noms_index, true ) );
$verifie( 'version de schéma enregistrée = ' . POSE_PARQUET_DB_VERSION, PoseParquet\Core\Database\Installer::installed_version() === POSE_PARQUET_DB_VERSION );
$verifie( 'date d’installation enregistrée', (bool) get_option( PoseParquet\Core\Database\Installer::OPTION_INSTALLED_AT ) );
$verifie( 'statut de schéma : toutes les tables présentes', ! in_array( false, PoseParquet\Core\Database\Schema::status(), true ) );

/* ------------------------------------------------------------------ */
$section( 'Réactivation idempotente' );
$avant = (int) $wpdb->get_var( 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()' );
$wpdb->insert( $tables['projects'], [ 'reference' => 'PP-TEST-000001', 'status' => 'new', 'created_at' => current_time( 'mysql', true ), 'updated_at' => current_time( 'mysql', true ) ] );
$ligne_id = (int) $wpdb->insert_id;
deactivate_plugins( $plugin );
$resultat = activate_plugin( $plugin );
$verifie( 'seconde activation sans erreur', ! is_wp_error( $resultat ) );
$apres = (int) $wpdb->get_var( 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()' );
$verifie( 'aucune table créée en double', $avant === $apres, "$avant → $apres" );
$survit = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$tables['projects']} WHERE id = %d", $ligne_id ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$verifie( 'les données survivent à la réactivation', $survit === 1 );
$verifie( 'version de schéma inchangée', PoseParquet\Core\Database\Installer::installed_version() === POSE_PARQUET_DB_VERSION );
$wpdb->delete( $tables['projects'], [ 'id' => $ligne_id ] );

/* ------------------------------------------------------------------ */
$section( 'Statuts' );
$statuts = PoseParquet\Core\Projects\Status::all();
$verifie( 'sept statuts définis', count( $statuts ) === 7, implode( ',', $statuts ) );
$verifie( 'statut par défaut = new', PoseParquet\Core\Projects\Status::DEFAULT === 'new' );
$verifie( 'libellé français de to_contact', PoseParquet\Core\Projects\Status::label( 'to_contact' ) === 'À contacter' );
$verifie( 'valeur inconnue rejetée', ! PoseParquet\Core\Projects\Status::is_valid( 'pending' ) );

/* ------------------------------------------------------------------ */
$section( 'Droits' );
$role = get_role( 'administrator' );
foreach ( PoseParquet\Core\Security\Capabilities::all() as $cap ) {
	$verifie( "administrateur possède $cap", $role && $role->has_cap( $cap ) );
}
$abonne = get_role( 'subscriber' );
$verifie( 'abonné ne possède pas pp_manage_settings', $abonne && ! $abonne->has_cap( 'pp_manage_settings' ) );

/* ------------------------------------------------------------------ */
$section( 'REST' );
do_action( 'rest_api_init' );
$serveur = rest_get_server();
$routes  = $serveur->get_routes();
$verifie( 'espace de noms pose-parquet/v1 enregistré', in_array( 'pose-parquet/v1', $serveur->get_namespaces(), true ) );
$verifie( 'route /pose-parquet/v1/health enregistrée', isset( $routes['/pose-parquet/v1/health'] ) );

wp_set_current_user( 0 ); // visiteur anonyme
$reponse = rest_do_request( new WP_REST_Request( 'GET', '/pose-parquet/v1/health' ) );
$corps   = $reponse->get_data();
$verifie( 'health répond 200 à un anonyme', $reponse->get_status() === 200, (string) $reponse->get_status() );
$verifie( 'health.status = ok', ( $corps['status'] ?? '' ) === 'ok' );
$verifie( 'health.pluginVersion = ' . POSE_PARQUET_VERSION, ( $corps['pluginVersion'] ?? '' ) === POSE_PARQUET_VERSION );
$verifie( 'health.databaseStatus.ready', ( $corps['databaseStatus']['ready'] ?? false ) === true );
$json = wp_json_encode( $corps );
$verifie( 'health n’expose ni préfixe de table ni chemin ni version WP', ! str_contains( $json, $wpdb->prefix ) && ! str_contains( $json, ABSPATH ) && ! str_contains( $json, get_bloginfo( 'version' ) ) );
$verifie( 'health envoie Cache-Control: no-store', ( $reponse->get_headers()['Cache-Control'] ?? '' ) === 'no-store' );
$reponse_post = rest_do_request( new WP_REST_Request( 'POST', '/pose-parquet/v1/health' ) );
$verifie( 'POST /health refusé (méthode)', in_array( $reponse_post->get_status(), [ 404, 405 ], true ), (string) $reponse_post->get_status() );
$reponse_404 = rest_do_request( new WP_REST_Request( 'GET', '/pose-parquet/v1/projects' ) );
$verifie( '/projects n’existe pas encore (lot 2)', $reponse_404->get_status() === 404 );

/* ------------------------------------------------------------------ */
$section( 'Journal' );
PoseParquet\Core\Support\Logger::warning( 'test', [ 'email' => 'x@y.z', 'id' => 42 ] );
$journal = defined( 'WP_DEBUG_LOG' ) && is_string( WP_DEBUG_LOG ) ? WP_DEBUG_LOG : WP_CONTENT_DIR . '/debug.log';
$contenu = is_file( $journal ) ? (string) file_get_contents( $journal ) : '';
$verifie( 'le journal ne contient jamais l’email passé en contexte', ! str_contains( $contenu, 'x@y.z' ) );

/* ------------------------------------------------------------------ */
$section( 'Désactivation non destructive' );
wp_set_current_user( $admins[0]->ID );
deactivate_plugins( $plugin );
$verifie( 'plugin désactivé', ! is_plugin_active( $plugin ) );
foreach ( $tables as $logique => $nom ) {
	$verifie( "table $logique toujours présente", (bool) $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $nom ) ) );
}
$verifie( 'option de version conservée', (int) get_option( 'pose_parquet_db_version' ) === POSE_PARQUET_DB_VERSION );
$verifie( 'droits conservés', get_role( 'administrator' )->has_cap( 'pp_view_projects' ) );

// On laisse le plugin actif pour l'exploration manuelle.
activate_plugin( $plugin );

echo "\n$reussis vérifications réussies, $echecs échec(s).\n";
exit( $echecs ? 1 : 0 );
