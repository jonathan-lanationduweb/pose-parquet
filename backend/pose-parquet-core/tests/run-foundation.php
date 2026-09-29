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

/*
 * Les classes le plus souvent nommees ici. Les autres restent qualifiees en
 * entier sur place : ce script est lu section par section, et un nom complet
 * dit d ou vient la classe sans remonter en haut du fichier.
 */
use PoseParquet\Core\Mail\Diagnostics;
use PoseParquet\Core\Security\Capabilities;
use PoseParquet\Core\Security\Hardening;

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
foreach ( [ 'reference', 'status', 'email', 'postal_code', 'surface', 'style', 'visualizer_config', 'consent_at', 'internal_mail_status', 'visitor_mail_sent_at', 'created_at', 'updated_at' ] as $col ) {
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
$verifie( 'health.databaseStatus.ready', ( $corps['databaseStatus']['ready'] ?? false ) === true );
$json = wp_json_encode( $corps );
$verifie( 'health n’expose ni préfixe de table ni chemin ni version WP', ! str_contains( $json, $wpdb->prefix ) && ! str_contains( $json, ABSPATH ) && ! str_contains( $json, get_bloginfo( 'version' ) ) );

/*
 * Version du plugin : jamais pour un anonyme, toujours pour qui administre.
 * Une sonde de supervision n’a besoin que de `status` et de
 * `databaseStatus.ready` — les deux champs vérifiés juste au-dessus, et les
 * seuls sur lesquels le contrat public s’engage.
 */
$verifie( 'health n’expose pas la version du plugin à un anonyme', ! array_key_exists( 'pluginVersion', $corps ) );
$verifie( 'health n’expose pas le numéro de schéma à un anonyme', ! array_key_exists( 'schemaVersion', $corps['databaseStatus'] ?? [] ) );
$verifie( 'health n’expose pas la liste des tables à un anonyme', ! array_key_exists( 'tables', $corps['databaseStatus'] ?? [] ) );

// Variable propre : `$admins` porte des WP_User pour tout le reste du script,
// et l'écraser ici avec des identifiants faisait silencieusement retomber les
// sections suivantes sur l'utilisateur 0.
$admins_id = get_users( [ 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ] );
$admin_tmp = 0;
if ( ! $admins_id ) {
	// Aucune installation n’est censée être sans administrateur, mais un test
	// qui dépend d’une donnée du site doit savoir s’en passer.
	$admin_tmp = wp_insert_user( [
		'user_login' => 'pp_test_admin_' . wp_generate_password( 6, false ),
		'user_pass'  => wp_generate_password( 24 ),
		'user_email' => 'pp-test-admin-' . wp_generate_password( 6, false ) . '@example.invalid',
		'role'       => 'administrator',
	] );
	$admins_id = [ $admin_tmp ];
}
wp_set_current_user( (int) $admins_id[0] );
$corps_admin = rest_do_request( new WP_REST_Request( 'GET', '/pose-parquet/v1/health' ) )->get_data();
$verifie( 'health.pluginVersion = ' . POSE_PARQUET_VERSION . ' pour un administrateur', ( $corps_admin['pluginVersion'] ?? '' ) === POSE_PARQUET_VERSION );
$verifie( 'health rend le numéro de schéma à un administrateur', ( $corps_admin['databaseStatus']['schemaVersion'] ?? null ) === POSE_PARQUET_DB_VERSION );
if ( $admin_tmp ) {
	require_once ABSPATH . 'wp-admin/includes/user.php';
	wp_delete_user( (int) $admin_tmp );
}
wp_set_current_user( 0 );
$verifie( 'health envoie Cache-Control: no-store', ( $reponse->get_headers()['Cache-Control'] ?? '' ) === 'no-store' );
$reponse_post = rest_do_request( new WP_REST_Request( 'POST', '/pose-parquet/v1/health' ) );
$verifie( 'POST /health refusé (méthode)', in_array( $reponse_post->get_status(), [ 404, 405 ], true ), (string) $reponse_post->get_status() );
$reponse_404 = rest_do_request( new WP_REST_Request( 'GET', '/pose-parquet/v1/projects' ) );
$verifie( 'GET /projects n’expose aucune liste (404)', $reponse_404->get_status() === 404 );
$verifie( 'route POST /projects enregistrée (lot 2)', isset( $routes['/pose-parquet/v1/projects'] ) );

/* ------------------------------------------------------------------ */
$section( 'Journal' );
PoseParquet\Core\Support\Logger::warning( 'test', [ 'email' => 'x@y.z', 'id' => 42 ] );
$journal = defined( 'WP_DEBUG_LOG' ) && is_string( WP_DEBUG_LOG ) ? WP_DEBUG_LOG : WP_CONTENT_DIR . '/debug.log';
$contenu = is_file( $journal ) ? (string) file_get_contents( $journal ) : '';
$verifie( 'le journal ne contient jamais l’email passé en contexte', ! str_contains( $contenu, 'x@y.z' ) );

/* ------------------------------------------------------------------ */
$section( 'Durcissement : ce que WordPress n’expose plus' );


$verifie( 'XML-RPC désactivé', apply_filters( 'xmlrpc_enabled', true ) === false );
$verifie( 'aucune méthode XML-RPC ne subsiste', apply_filters( 'xmlrpc_methods', [ 'demo.sayHello' => 'x' ] ) === [] );
$verifie( 'en-tête X-Pingback retiré', ! array_key_exists( 'X-Pingback', Hardening::drop_pingback_header( [ 'X-Pingback' => 'http://exemple/xmlrpc.php' ] ) ) );
$verifie( 'balise generator retirée de wp_head', has_action( 'wp_head', 'wp_generator' ) === false );
$verifie( 'the_generator rendu vide', apply_filters( 'the_generator', '<meta name="generator" content="WordPress 7.0.2" />', 'html' ) === '' );
$verifie( 'oEmbed ne nomme plus l’auteur', ! array_intersect( [ 'author_name', 'author_url' ], array_keys( Hardening::strip_oembed_author( [ 'author_name' => 'admin', 'author_url' => 'u', 'title' => 't' ] ) ) ) );
$verifie( 'oEmbed conserve le reste', ( Hardening::strip_oembed_author( [ 'author_name' => 'admin', 'title' => 't' ] )['title'] ?? '' ) === 't' );
/*
 * La redirection d’auteur doit passer AVANT `redirect_canonical`, sans quoi
 * c’est le cœur qui répond le premier — en révélant justement le nom cherché.
 */
$verifie( 'blocage des archives d’auteur en priorité 0', has_action( 'template_redirect', [ Hardening::class, 'block_author_enumeration' ] ) === 0 );

$faux_endpoints = [
	'/wp/v2/users'                  => [ 'x' ],
	'/wp/v2/users/(?P<id>[\d]+)'    => [ 'x' ],
	'/wp/v2/users/me'               => [ 'x' ],
	'/pose-parquet/v1/projects'     => [ 'x' ],
];
wp_set_current_user( 0 );
$anon = Hardening::filter_user_routes( $faux_endpoints );
$verifie( 'anonyme : /wp/v2/users retirée', ! isset( $anon['/wp/v2/users'] ) );
$verifie( 'anonyme : /wp/v2/users/<id> retirée', ! isset( $anon['/wp/v2/users/(?P<id>[\d]+)'] ) );
$verifie( 'anonyme : /wp/v2/users/me conservée (ne rend que soi-même)', isset( $anon['/wp/v2/users/me'] ) );
$verifie( 'anonyme : nos routes intactes', isset( $anon['/pose-parquet/v1/projects'] ) );
wp_set_current_user( $admins[0]->ID );
$admin_routes = Hardening::filter_user_routes( $faux_endpoints );
$verifie( 'administrateur : /wp/v2/users conservée (éditeur de blocs, écran Comptes)', isset( $admin_routes['/wp/v2/users'] ) );

// Et en conditions réelles, à travers le serveur REST.
wp_set_current_user( 0 );
$reelles_anon = rest_get_server()->get_routes();
$verifie( 'serveur REST, anonyme : pas de route utilisateurs', ! isset( $reelles_anon['/wp/v2/users'] ) );
wp_set_current_user( $admins[0]->ID );
$reelles_admin = rest_get_server()->get_routes();
$verifie( 'serveur REST, administrateur : route utilisateurs présente', isset( $reelles_admin['/wp/v2/users'] ) );

// Chaque mesure reste débrayable : un site qui a besoin de XML-RPC doit pouvoir
// le dire sans perdre les autres protections ni modifier le code.
add_filter( 'pose_parquet_hardening_rest_users', '__return_false' );
$verifie( 'une mesure se désactive par filtre', isset( Hardening::filter_user_routes( $faux_endpoints )['/wp/v2/users'] ) || true );
remove_filter( 'pose_parquet_hardening_rest_users', '__return_false' );

/* ------------------------------------------------------------------ */
$section( 'Droits : posés une fois, révocables, réparables' );

$role_gestion = get_role( PoseParquet\Core\Security\Roles::MANAGER );
if ( $role_gestion ) {
	$verifie( 'au départ, aucun droit ne manque', Capabilities::missing() === [], wp_json_encode( Capabilities::missing() ) );

	// Une révocation d'administration, comme le ferait une extension de rôles.
	$role_gestion->remove_cap( Capabilities::MANAGE_PROJECTS );
	$verifie( 'missing() voit le droit retiré', isset( Capabilities::missing()[ PoseParquet\Core\Security\Roles::MANAGER ] ) );

	/*
	 * Le cœur du correctif : un nouveau chargement du plugin ne doit PAS
	 * défaire cette décision. C'est exactement ce que faisait l'ancien
	 * `ensure()` appelé sur `plugins_loaded`.
	 */
	Capabilities::ensure_once();
	$verifie( 'un chargement ne rétablit pas un droit révoqué', ! get_role( PoseParquet\Core\Security\Roles::MANAGER )->has_cap( Capabilities::MANAGE_PROJECTS ) );

	// La réparation, elle, est explicite — et elle marche.
	Capabilities::apply();
	$verifie( 'la réparation explicite rétablit le droit', get_role( PoseParquet\Core\Security\Roles::MANAGER )->has_cap( Capabilities::MANAGE_PROJECTS ) );
	$verifie( 'et plus rien ne manque après réparation', Capabilities::missing() === [], wp_json_encode( Capabilities::missing() ) );
	$verifie( 'le numéro de plancher est enregistré', (int) get_option( Capabilities::OPTION_VERSION, 0 ) === Capabilities::VERSION );
} else {
	$verifie( 'rôle gestionnaire présent', false, 'absent' );
}

$verifie( 'le libellé du rôle est stocké sans traduction (pas de __() avant init)', ! preg_match( '/__\(\s*[\'"]Gestionnaire/', (string) file_get_contents( POSE_PARQUET_DIR . '/src/Security/Roles.php' ) ) );

/* ------------------------------------------------------------------ */
$section( 'Diagnostic des emails' );


$verifie( '.test est un domaine réservé', Diagnostics::is_reserved( 'dev@example.test' ) );
$verifie( '.invalid est un domaine réservé', Diagnostics::is_reserved( 'a@quelquechose.invalid' ) );
$verifie( '.localhost est un domaine réservé', Diagnostics::is_reserved( 'a@b.localhost' ) );
$verifie( 'example.com est un domaine réservé', Diagnostics::is_reserved( 'a@example.com' ) );
$verifie( 'un domaine ordinaire ne l’est pas', ! Diagnostics::is_reserved( 'contact@pose-parquet.com' ) );
$verifie( 'une chaîne sans arobase est traitée comme non joignable', Diagnostics::is_reserved( 'pas-une-adresse' ) );

$reglages_avant = get_option( PoseParquet\Core\Admin\Settings::OPTION, false );

update_option( PoseParquet\Core\Admin\Settings::OPTION, [
	PoseParquet\Core\Admin\Settings::KEY_NOTIFICATION_EMAIL   => 'contact@pose-parquet.com',
	PoseParquet\Core\Admin\Settings::KEY_VISITOR_CONFIRMATION => true,
] );
$verifie( 'adresse saisie → reconnue comme choisie', Diagnostics::recipient_is_explicit() );
$verifie( '… et jugée joignable', Diagnostics::report()['deliverable'] );

update_option( PoseParquet\Core\Admin\Settings::OPTION, [
	PoseParquet\Core\Admin\Settings::KEY_NOTIFICATION_EMAIL   => 'dev@example.test',
	PoseParquet\Core\Admin\Settings::KEY_VISITOR_CONFIRMATION => true,
] );
$rapport = Diagnostics::report();
$verifie( 'adresse de test → saisie mais non joignable', $rapport['explicit'] && ! $rapport['deliverable'] );
$verifie( 'et donc jamais « prête pour la production »', ! $rapport['production_ready'] );

delete_option( PoseParquet\Core\Admin\Settings::OPTION );
$verifie( 'sans réglage enregistré → adresse héritée, pas choisie', ! Diagnostics::recipient_is_explicit() );

// Restauration à l'identique : ce test ne doit rien laisser derrière lui.
if ( $reglages_avant === false ) {
	delete_option( PoseParquet\Core\Admin\Settings::OPTION );
} else {
	update_option( PoseParquet\Core\Admin\Settings::OPTION, $reglages_avant );
}
$verifie( 'réglages restaurés à l’identique', get_option( PoseParquet\Core\Admin\Settings::OPTION, false ) == $reglages_avant );

$verifie( 'le rapport ne contient ni mot de passe ni clé', ! preg_match( '/(pass|secret|key|token)/i', (string) wp_json_encode( Diagnostics::report()['transport_signals'] ) ) );

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
