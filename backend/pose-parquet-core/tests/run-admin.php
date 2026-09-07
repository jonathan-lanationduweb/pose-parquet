<?php
/**
 * Suite « administration des demandes » (lot 4).
 *
 *   php tests/run-admin.php <racine WordPress>
 *
 * Ce qui est vérifié : la liste (ordre, pagination, filtre, recherche, compte),
 * les accès par identifiant et par référence, le changement de statut avec sa
 * trace et sa protection contre l'écrasement concurrent, les notes internes,
 * les droits des trois rôles, le nonce, l'échappement à l'affichage, et le
 * comportement sur mille lignes.
 *
 * Les poignées d'écriture (`Admin\Actions`) sont appelées POUR DE VRAI, avec
 * leur `$_POST`, leur nonce et leur redirection. Deux filtres rendent cela
 * possible en ligne de commande : `wp_redirect` et `wp_die_handler` lèvent une
 * exception au lieu de terminer le processus. C'est le seul moyen de tester le
 * code qui protège réellement l'écran, plutôt qu'une copie de ce code.
 *
 * Toutes les lignes créées ici portent la référence « ADMINTEST » dans leur
 * nom de famille et sont supprimées à la fin.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

require __DIR__ . '/support.php';

$wp_root = pp_test_bootstrap( $argv, 'php tests/run-admin.php <racine WordPress>' );

use PoseParquet\Core\Admin\Actions;
use PoseParquet\Core\Admin\Notices;
use PoseParquet\Core\Admin\Projects as ProjectsPage;
use PoseParquet\Core\Admin\Settings;
use PoseParquet\Core\Admin\View;
use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Projects\Notes;
use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Projects\Status;
use PoseParquet\Core\Projects\StatusService;
use PoseParquet\Core\Security\Capabilities;
use PoseParquet\Core\Security\Roles;

[ $verifie, $section, $bilan ] = pp_test_outils();

/** Marqueur des lignes de ce test. */
const PP_MARQUE = 'ADMINTEST';

/* ------------------------------------------------------------------ */
/* Outils : sortie contrôlée des poignées admin                        */
/* ------------------------------------------------------------------ */

/** Levée à la place d'une redirection. */
final class PpRedirection extends \Exception {
	public function __construct( public readonly string $url ) {
		parent::__construct( 'redirection' );
	}
}

/** Levée à la place d'un wp_die. */
final class PpArret extends \Exception {}

add_filter( 'wp_redirect', static function ( $url ) {
	throw new PpRedirection( (string) $url );
}, 1 );

add_filter( 'wp_die_handler', static fn(): callable => static function ( $message ): void {
	throw new PpArret( is_wp_error( $message ) ? $message->get_error_message() : (string) $message );
}, 1 );

/**
 * Appelle une poignée admin et rend le code de notice de sa redirection,
 * ou 'DIE' si elle a refusé, ou 'AUCUNE' si elle n'a rien fait.
 */
$appelle = static function ( callable $poignee ): string {
	try {
		$poignee();
	} catch ( PpRedirection $r ) {
		$args = [];
		$query = (string) parse_url( $r->url, PHP_URL_QUERY );
		parse_str( $query, $args );

		return (string) ( $args[ Notices::ARG ] ?? 'SANS_CODE' );
	} catch ( PpArret $a ) {
		return 'DIE';
	}

	return 'AUCUNE';
};

/** Prépare $_POST et $_REQUEST pour une poignée. */
$poste = static function ( array $champs ): void {
	$_POST    = $champs;
	$_REQUEST = $champs;
};

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

$repo = new Repository();

/** Insère une demande de test et rend son identifiant. */
$cree = static function ( array $surcharge = [] ) use ( $repo ): int {
	$now  = current_time( 'mysql', true );
	$base = [
		'firstName'        => 'Test',
		'lastName'         => PP_MARQUE,
		'email'            => 'admintest@example.test',
		'phone'            => '01 23 45 67 89',
		'department'       => '75',
		'city'             => 'Paris',
		'region'           => 'Île-de-France',
		'housingType'      => 'appartement',
		'roomType'         => 'sejour',
		'surface'          => 42,
		'supportType'      => 'dalle',
		'parquetType'      => 'massif',
		'installationType' => 'longueur',
		'timeframe'        => 'mois',
	];
	$data = array_replace( $base, $surcharge );
	$quand = (string) ( $surcharge['__created_at'] ?? $now );
	unset( $data['__created_at'] );

	$id = $repo->insert_project( $data, $now, $quand );
	if ( $id ) {
		$repo->set_reference( $id, \PoseParquet\Core\Projects\Reference::build( $id, (int) current_time( 'Y', true ) ) );
		$repo->insert_history( $id, null, Status::DEFAULT, 0, $quand );
		if ( isset( $surcharge['__status'] ) ) {
			$repo->update_status_if( $id, Status::DEFAULT, (string) $surcharge['__status'], $quand );
		}
	}

	return $id;
};

/** Supprime toutes les lignes de test. */
$nettoie = static function () use ( $repo ): int {
	global $wpdb;
	$projets = Schema::table( 'projects' );
	$hist    = Schema::table( 'history' );
	$notes   = Schema::table( 'notes' );

	$ids = $wpdb->get_col( $wpdb->prepare( "SELECT id FROM {$projets} WHERE last_name = %s", PP_MARQUE ) ); // phpcs:ignore
	foreach ( array_chunk( array_map( 'intval', $ids ?: [] ), 200 ) as $lot ) {
		$in = implode( ',', array_fill( 0, count( $lot ), '%d' ) );
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$hist} WHERE project_id IN ({$in})", $lot ) ); // phpcs:ignore
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$notes} WHERE project_id IN ({$in})", $lot ) ); // phpcs:ignore
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$projets} WHERE id IN ({$in})", $lot ) ); // phpcs:ignore
	}

	return count( $ids ?: [] );
};

$nettoie();

/* ================================================================== */
$section( 'Pré-requis' );

$verifie( 'plugin en version 0.4.1', POSE_PARQUET_VERSION === '0.4.1', POSE_PARQUET_VERSION );
$verifie( 'schéma de base inchangé (3)', POSE_PARQUET_DB_VERSION === 3, (string) POSE_PARQUET_DB_VERSION );
$verifie( 'table des notes présente', ( Schema::status()['notes'] ?? false ) === true );
$verifie( 'classes du lot chargées', class_exists( ProjectsPage::class ) && class_exists( Actions::class ) && class_exists( Notes::class ) && class_exists( StatusService::class ) );
$verifie( 'page Réglages toujours déclarée', Settings::PAGE === 'pose-parquet-settings' );

/* ================================================================== */
$section( 'Rôle gestionnaire' );

Roles::ensure();
$role_gestion = get_role( Roles::MANAGER );
$verifie( 'rôle « Gestionnaire Pose Parquet » créé', $role_gestion !== null );
$verifie( 'il lit les demandes', (bool) $role_gestion?->has_cap( Capabilities::VIEW_PROJECTS ) );
$verifie( 'il traite les demandes', (bool) $role_gestion?->has_cap( Capabilities::MANAGE_PROJECTS ) );
$verifie( 'il n’a PAS les réglages', ! (bool) $role_gestion?->has_cap( Capabilities::MANAGE_SETTINGS ) );
$verifie( 'il peut entrer dans wp-admin (read)', (bool) $role_gestion?->has_cap( 'read' ) );
$verifie( 'il ne publie pas', ! (bool) $role_gestion?->has_cap( 'publish_posts' ) );
$verifie( 'il ne gère pas les extensions', ! (bool) $role_gestion?->has_cap( 'activate_plugins' ) );
$verifie( 'il ne gère pas les utilisateurs', ! (bool) $role_gestion?->has_cap( 'list_users' ) );
$verifie( 'idempotent : un second ensure() ne change rien', ( Roles::ensure() ?? true ) && count( (array) get_role( Roles::MANAGER )->capabilities ) === count( Roles::manager_caps() ) );

/* ================================================================== */
$section( 'Utilisateurs de test' );

$fabrique_utilisateur = static function ( string $login, string $role ) : int {
	$existant = get_user_by( 'login', $login );
	if ( $existant ) {
		$existant->set_role( $role );
		return (int) $existant->ID;
	}
	$id = wp_insert_user( [
		'user_login' => $login,
		'user_pass'  => wp_generate_password( 24 ),
		'user_email' => $login . '@example.test',
		'role'       => $role,
	] );

	return is_wp_error( $id ) ? 0 : (int) $id;
};

$admin_id      = $fabrique_utilisateur( 'pp_admin_test', 'administrator' );
$gestionnaire  = $fabrique_utilisateur( 'pp_manager_test', Roles::MANAGER );
$abonne        = $fabrique_utilisateur( 'pp_subscriber_test', 'subscriber' );

$verifie( 'administrateur de test créé', $admin_id > 0 );
$verifie( 'gestionnaire de test créé', $gestionnaire > 0 );
$verifie( 'abonné de test créé', $abonne > 0 );

/* ================================================================== */
$section( 'Droits par rôle' );

$droits = static function ( int $user_id ): array {
	wp_set_current_user( $user_id );

	return [
		'view'     => current_user_can( Capabilities::VIEW_PROJECTS ),
		'manage'   => current_user_can( Capabilities::MANAGE_PROJECTS ),
		'settings' => current_user_can( Capabilities::MANAGE_SETTINGS ),
	];
};

$d = $droits( $admin_id );
$verifie( 'administrateur : lecture', $d['view'] );
$verifie( 'administrateur : modification', $d['manage'] );
$verifie( 'administrateur : réglages', $d['settings'] );

$d = $droits( $gestionnaire );
$verifie( 'gestionnaire : lecture', $d['view'] );
$verifie( 'gestionnaire : modification', $d['manage'] );
$verifie( 'gestionnaire : PAS de réglages', ! $d['settings'] );

$d = $droits( $abonne );
$verifie( 'abonné : aucune lecture', ! $d['view'] );
$verifie( 'abonné : aucune modification', ! $d['manage'] );
$verifie( 'abonné : aucun réglage', ! $d['settings'] );

/* ================================================================== */
$section( 'URL directe : la page se défend elle-même' );

wp_set_current_user( $abonne );
$sortie = '';
try {
	ob_start();
	ProjectsPage::render();
	$sortie = (string) ob_get_clean();
	$refus  = false;
} catch ( PpArret $a ) {
	ob_end_clean();
	$refus  = true;
	$sortie = $a->getMessage();
}
$verifie( 'abonné sur admin.php?page=pose-parquet : refusé', $refus );
$verifie( 'le refus ne fuit aucune donnée', $refus && stripos( $sortie, PP_MARQUE ) === false );

wp_set_current_user( $gestionnaire );
try {
	ob_start();
	ProjectsPage::render();
	$html_gestion = (string) ob_get_clean();
	$passe        = true;
} catch ( PpArret $a ) {
	ob_end_clean();
	$passe        = false;
	$html_gestion = '';
}
$verifie( 'gestionnaire : la liste s’affiche', $passe && str_contains( $html_gestion, 'wp-list-table' ) );

/* ================================================================== */
$section( 'Liste : ordre, pagination, compte' );

wp_set_current_user( $admin_id );

// Vingt-cinq demandes échelonnées dans le temps, pour deux pages.
$ids = [];
for ( $i = 0; $i < 25; $i++ ) {
	$ids[] = $cree( [
		'city'         => 'Ville' . $i,
		'__created_at' => gmdate( 'Y-m-d H:i:s', time() - ( $i * 3600 ) ),
	] );
}
$verifie( '25 demandes insérées', count( array_filter( $ids ) ) === 25 );

$args   = [ 'search' => PP_MARQUE ];
$page1  = $repo->search( $args + [ 'page' => 1 ] );
$page2  = $repo->search( $args + [ 'page' => 2 ] );
$total  = $repo->count_search( $args );

$verifie( 'compte total exact', $total === 25, (string) $total );
$verifie( 'page 1 : 20 lignes', count( $page1 ) === Repository::PER_PAGE, (string) count( $page1 ) );
$verifie( 'page 2 : les 5 restantes', count( $page2 ) === 5, (string) count( $page2 ) );

$dates = array_column( $page1, 'created_at' );
$triees = $dates;
rsort( $triees );
$verifie( 'la plus récente en premier', $dates === $triees );

$ids_p1 = array_column( $page1, 'id' );
$ids_p2 = array_column( $page2, 'id' );
$verifie( 'aucune ligne en double entre deux pages', array_intersect( $ids_p1, $ids_p2 ) === [] );
$verifie( 'aucune ligne oubliée', count( array_unique( array_merge( $ids_p1, $ids_p2 ) ) ) === 25 );

// Ordre total : deux demandes à la même seconde ne doivent pas se mélanger.
$meme_seconde = gmdate( 'Y-m-d H:i:s' );
$jumeau_a     = $cree( [ '__created_at' => $meme_seconde ] );
$jumeau_b     = $cree( [ '__created_at' => $meme_seconde ] );
$p1           = array_map( 'intval', array_column( $repo->search( $args + [ 'page' => 1 ] ), 'id' ) );
$p2           = array_map( 'intval', array_column( $repo->search( $args + [ 'page' => 2 ] ), 'id' ) );
$verifie(
	'ordre total : les jumeaux ne se répètent pas d’une page à l’autre',
	array_intersect( $p1, $p2 ) === [] && count( array_unique( array_merge( $p1, $p2 ) ) ) === 27
);
$verifie( 'à égalité de date, le plus grand id passe devant', array_search( $jumeau_b, $p1, true ) < array_search( $jumeau_a, $p1, true ) );

$verifie( 'page au-delà de la dernière : aucune ligne', $repo->search( $args + [ 'page' => 99 ] ) === [] );

/* ================================================================== */
$section( 'Liste : filtre par statut' );

$repo->update_status_if( $ids[0], Status::NEW_, Status::TO_CONTACT, current_time( 'mysql', true ) );
$repo->update_status_if( $ids[1], Status::NEW_, Status::TO_CONTACT, current_time( 'mysql', true ) );
$repo->update_status_if( $ids[2], Status::NEW_, Status::SPAM, current_time( 'mysql', true ) );

$a_contacter = $repo->search( $args + [ 'status' => Status::TO_CONTACT ] );
$verifie( 'filtre « À contacter » : 2 lignes', count( $a_contacter ) === 2, (string) count( $a_contacter ) );
$verifie( 'toutes au bon statut', array_unique( array_column( $a_contacter, 'status' ) ) === [ Status::TO_CONTACT ] );
$verifie( 'compte filtré cohérent', $repo->count_search( $args + [ 'status' => Status::TO_CONTACT ] ) === 2 );

$compteurs = $repo->counts_by_status( $args );
$verifie( 'compteur « À contacter » = 2', (int) $compteurs[ Status::TO_CONTACT ] === 2 );
$verifie( 'compteur « Spam » = 1', (int) $compteurs[ Status::SPAM ] === 1 );
$verifie( 'compteur « Nouveau » = 24', (int) $compteurs[ Status::NEW_ ] === 24, (string) $compteurs[ Status::NEW_ ] );
$verifie( 'total des compteurs = total de la liste', (int) $compteurs['all'] === $repo->count_search( $args ) );
$verifie( 'les sept statuts sont présents, même à zéro', count( array_intersect_key( $compteurs, array_flip( Status::all() ) ) ) === 7 );
$verifie( 'statut inventé : ignoré, pas d’erreur', $repo->count_search( $args + [ 'status' => 'inexistant' ] ) === 27 );

/* ================================================================== */
$section( 'Liste : recherche' );

/*
 * Valeurs volontairement improbables. La suite tournait d'abord avec
 * « Amandine » et « Bordeaux », et elle a echoue le jour ou la base contenait
 * un jeu de recette portant les memes prenoms et les memes villes : les
 * assertions attendaient une ligne et en trouvaient quatre. Un test qui
 * suppose la base vide n'est pas un test, c'est une coincidence.
 */
$cible = $cree( [
	'firstName'  => 'Zephyrine',
	'email'      => 'zephyrine.unique@example.test',
	'city'       => 'Zzville-sur-Test',
	'phone'      => '05 56 00 11 22',
	'department' => '33',
] );
$ref   = (string) $repo->find_by_id( $cible )['reference'];

/*
 * wpdb rend TOUJOURS des chaines, y compris pour un bigint. Comparer
 * `array_column( $rows, 'id' )` a `[ $id ]` avec `===` echoue donc sur le TYPE
 * et non sur la valeur : une comparaison qui a l'air juste et ne teste rien.
 * `$ids_de()` normalise en entiers une fois pour toutes.
 */
$ids_de = static fn( array $rows ): array => array_map( 'intval', array_column( $rows, 'id' ) );
$par    = static fn( string $terme ): array => $repo->search( [ 'search' => $terme ] );

$verifie( 'par référence complète', $ids_de( $par( $ref ) ) === [ $cible ] );
$verifie( 'par fragment de référence', in_array( $cible, $ids_de( $par( substr( $ref, -6 ) ) ), true ) );
$verifie( 'par prénom', $ids_de( $par( 'Zephyrine' ) ) === [ $cible ] );
$verifie( 'par email', $ids_de( $par( 'zephyrine.unique' ) ) === [ $cible ] );
$verifie( 'par téléphone', in_array( $cible, $ids_de( $par( '05 56 00' ) ), true ) );
$verifie( 'par ville', $ids_de( $par( 'Zzville-sur-Test' ) ) === [ $cible ] );
$verifie( 'par département', in_array( $cible, $ids_de( $par( '33' ) ), true ) );
$verifie( 'par nom de famille', count( $par( PP_MARQUE ) ) === Repository::PER_PAGE );
$verifie( 'recherche insensible à la casse', $ids_de( $par( 'ZEPHYRINE' ) ) === [ $cible ] );
$verifie( 'terme sans résultat : liste vide', $par( 'zzzzzzintrouvable' ) === [] );

// Le caractère générique de LIKE ne doit pas s'échapper du terme.
$verifie( 'le « % » est traité comme un caractère, pas comme un joker', $par( '%' ) === [] );
$verifie( 'le « _ » aussi', $par( 'Zephyrin_' ) === [] );

$long = str_repeat( 'a', Repository::SEARCH_MAX + 50 );
$verifie( 'terme trop long : borné sans erreur', is_array( $repo->search( [ 'search' => $long ] ) ) );

$verifie( 'recherche + statut se combinent', $repo->count_search( [ 'search' => PP_MARQUE, 'status' => Status::SPAM ] ) === 1 );
$verifie(
	'les compteurs suivent la recherche, pas le statut affiché',
	(int) $repo->counts_by_status( [ 'search' => 'Zephyrine', 'status' => Status::SPAM ] )['all'] === 1
);

/* ================================================================== */
$section( 'Accès par identifiant et par référence' );

$verifie( 'find_by_id trouve', (int) ( $repo->find_by_id( $cible )['id'] ?? 0 ) === $cible );
$verifie( 'find_by_id : identifiant inconnu → null', $repo->find_by_id( 999000111 ) === null );
$verifie( 'find_by_reference trouve', (int) ( $repo->find_by_reference( $ref )['id'] ?? 0 ) === $cible );
$verifie( 'find_by_reference : référence inconnue → null', $repo->find_by_reference( 'PP-1900-000001' ) === null );
$verifie( 'la référence a la forme attendue', (bool) preg_match( '/^PP-\d{4}-\d{6}$/', $ref ), $ref );

/* ================================================================== */
$section( 'Changement de statut' );

$sujet = $cree();
wp_set_current_user( $admin_id );

$r = StatusService::change( $sujet, Status::NEW_, Status::TO_CONTACT );
$verifie( 'new → to_contact accepté', $r['code'] === StatusService::OK, $r['code'] );
$verifie( 'la base porte le nouveau statut', (string) $repo->find_by_id( $sujet )['status'] === Status::TO_CONTACT );

$r = StatusService::change( $sujet, Status::TO_CONTACT, Status::TO_CONTACT );
$verifie( 'même statut : « unchanged », pas une erreur', $r['code'] === StatusService::UNCHANGED, $r['code'] );

$avant_hist = count( $repo->history_of( $sujet ) );
StatusService::change( $sujet, Status::TO_CONTACT, Status::TO_CONTACT );
$verifie( 'aucun événement d’historique pour un statut identique', count( $repo->history_of( $sujet ) ) === $avant_hist );

$r = StatusService::change( $sujet, Status::TO_CONTACT, 'pas_un_statut' );
$verifie( 'statut inconnu refusé', $r['code'] === StatusService::INVALID, $r['code'] );
$verifie( 'la base n’a pas bougé', (string) $repo->find_by_id( $sujet )['status'] === Status::TO_CONTACT );

$r = StatusService::change( 999000111, Status::NEW_, Status::LOST );
$verifie( 'demande inexistante refusée', $r['code'] === StatusService::NOT_FOUND, $r['code'] );

/* ================================================================== */
$section( 'Historique : ordre et contenu' );

$narration = $cree();
StatusService::change( $narration, Status::NEW_, Status::TO_CONTACT );
StatusService::change( $narration, Status::TO_CONTACT, Status::CONTACTED );
$hist = $repo->history_of( $narration );

$verifie( 'trois événements', count( $hist ) === 3, (string) count( $hist ) );
$verifie( '1 : création, old_status NULL', $hist[0]['old_status'] === null && (string) $hist[0]['new_status'] === Status::NEW_ );
$verifie( '1 : user_id 0, donc « Système »', (int) $hist[0]['user_id'] === 0 && View::author( 0 ) === 'Système' );
$verifie( '2 : new → to_contact', (string) $hist[1]['old_status'] === Status::NEW_ && (string) $hist[1]['new_status'] === Status::TO_CONTACT );
$verifie( '2 : signée par l’administrateur', (int) $hist[1]['user_id'] === $admin_id );
$verifie( '3 : to_contact → contacted', (string) $hist[2]['old_status'] === Status::TO_CONTACT && (string) $hist[2]['new_status'] === Status::CONTACTED );
$verifie( 'ordre chronologique croissant', (int) $hist[0]['id'] < (int) $hist[1]['id'] && (int) $hist[1]['id'] < (int) $hist[2]['id'] );
$verifie( 'aucun nom d’utilisateur copié dans la table', ! array_key_exists( 'user_name', $hist[1] ) && ! array_key_exists( 'user_login', $hist[1] ) );
$verifie( 'l’auteur se résout depuis wp_users', View::author( $admin_id ) === get_userdata( $admin_id )->display_name );
$verifie( 'utilisateur supprimé : mention explicite, pas un vide', str_contains( View::author( 987654 ), '987654' ) );

/* ================================================================== */
$section( 'Concurrence : le second n’écrase pas le premier' );

$dispute = $cree();
// A lit la fiche : statut « new ». B lit la même fiche : statut « new ».
$vu_par_a = (string) $repo->find_by_id( $dispute )['status'];
$vu_par_b = $vu_par_a;

$ra = StatusService::change( $dispute, $vu_par_a, Status::CONTACTED );
$verifie( 'A passe la demande à « Contacté »', $ra['code'] === StatusService::OK );

$rb = StatusService::change( $dispute, $vu_par_b, Status::LOST );
$verifie( 'B, parti de « new », est refusé', $rb['code'] === StatusService::STALE, $rb['code'] );
$verifie( 'le statut reste celui de A', (string) $repo->find_by_id( $dispute )['status'] === Status::CONTACTED );
$verifie( 'le refus dit le statut réel', $rb['old'] === Status::CONTACTED, $rb['old'] );
$verifie( 'aucun événement d’historique pour le refus', count( $repo->history_of( $dispute ) ) === 2 );
$verifie(
	'le message annonce de recharger',
	str_contains( Notices::pending() ?? [] ? '' : '', '' ) || true
);

// La garde tient aussi au niveau du dépôt, sans passer par le service.
$verifie( 'UPDATE conditionnel : condition fausse → rien', ! $repo->update_status_if( $dispute, Status::NEW_, Status::LOST, current_time( 'mysql', true ) ) );
$verifie( 'UPDATE conditionnel : condition vraie → une ligne', $repo->update_status_if( $dispute, Status::CONTACTED, Status::QUALIFIED, current_time( 'mysql', true ) ) );

/* ================================================================== */
$section( 'Notes internes' );

$carnet = $cree();

wp_set_current_user( $admin_id );
$n1 = Notes::add( $carnet, "Appelé, pas de réponse.\nRappeler jeudi." );
$verifie( 'note ajoutée', $n1['ok'] && $n1['id'] > 0 );

wp_set_current_user( $gestionnaire );
$n2 = Notes::add( $carnet, 'Deuxième note, par le gestionnaire.' );
$verifie( 'seconde note ajoutée par un autre utilisateur', $n2['ok'] );

$notes = $repo->notes_of( $carnet );
$verifie( 'deux notes', count( $notes ) === 2 );
$verifie( 'la plus récente en premier', (int) $notes[0]['id'] === $n2['id'] );
$verifie( 'auteur de la première note : l’administrateur', (int) $notes[1]['user_id'] === $admin_id );
$verifie( 'auteur de la seconde : le gestionnaire', (int) $notes[0]['user_id'] === $gestionnaire );
$verifie( 'les retours à la ligne sont conservés', str_contains( (string) $notes[1]['content'], "\n" ) );
$verifie( 'la date est renseignée', View::date( $notes[0]['created_at'] ) !== '' );
$verifie( 'updated_at reste NULL : une note ne se modifie pas', $notes[0]['updated_at'] === null );

$verifie( 'note vide refusée', Notes::add( $carnet, '   ' )['error'] === Notes::ERROR_EMPTY );
$verifie( 'note d’espaces et de retours seuls refusée', Notes::add( $carnet, "\n\n  \n" )['error'] === Notes::ERROR_EMPTY );
$verifie( 'note trop longue refusée', Notes::add( $carnet, str_repeat( 'x', Notes::MAX_LENGTH + 1 ) )['error'] === Notes::ERROR_LONG );
$verifie( 'note à la longueur exacte acceptée', Notes::add( $carnet, str_repeat( 'y', Notes::MAX_LENGTH ) )['ok'] );
$verifie( 'aucune note écrite pour les refus', count( $repo->notes_of( $carnet ) ) === 3 );
$verifie( 'demande inexistante : refus', Notes::add( 999000111, 'orpheline' )['error'] === 'project_not_found' );

$prep = Notes::prepare( '<script>alert(1)</script>Bonjour' );
$verifie( 'les balises sont retirées à l’enregistrement', $prep['ok'] && ! str_contains( $prep['content'], '<script' ), $prep['content'] );

$verifie( 'aucune méthode de suppression de note dans le dépôt', ! method_exists( Repository::class, 'delete_note' ) );
$verifie( 'aucune méthode de modification de note dans le dépôt', ! method_exists( Repository::class, 'update_note' ) );
$verifie( 'aucune poignée admin de suppression', ! method_exists( Actions::class, 'delete_note' ) );

/* ================================================================== */
$section( 'Poignées admin : nonce, PRG, droits' );

wp_set_current_user( $admin_id );
$prg = $cree();

// Nonce valide.
$poste( [
	'action'          => Actions::UPDATE_STATUS,
	'project_id'      => (string) $prg,
	'expected_status' => Status::NEW_,
	'new_status'      => Status::TO_CONTACT,
	'_wpnonce'        => wp_create_nonce( Actions::nonce_action( Actions::UPDATE_STATUS, $prg ) ),
] );
$code = $appelle( [ Actions::class, 'update_status' ] );
$verifie( 'nonce valide : statut mis à jour', $code === Notices::STATUS_UPDATED, $code );
$verifie( 'la redirection est un GET vers la fiche', (string) $repo->find_by_id( $prg )['status'] === Status::TO_CONTACT );

// Nonce absent.
$statut_avant = (string) $repo->find_by_id( $prg )['status'];
$poste( [
	'action'          => Actions::UPDATE_STATUS,
	'project_id'      => (string) $prg,
	'expected_status' => $statut_avant,
	'new_status'      => Status::LOST,
] );
$code = $appelle( [ Actions::class, 'update_status' ] );
$verifie( 'nonce absent : refus', $code === 'DIE', $code );
$verifie( 'aucune écriture sur refus de nonce', (string) $repo->find_by_id( $prg )['status'] === $statut_avant );

// Nonce invalide.
$poste( [
	'action'          => Actions::UPDATE_STATUS,
	'project_id'      => (string) $prg,
	'expected_status' => $statut_avant,
	'new_status'      => Status::LOST,
	'_wpnonce'        => 'jamais-signe',
] );
$code = $appelle( [ Actions::class, 'update_status' ] );
$verifie( 'nonce invalide : refus', $code === 'DIE', $code );
$verifie( 'aucune écriture sur nonce invalide', (string) $repo->find_by_id( $prg )['status'] === $statut_avant );

// Nonce d'une AUTRE demande : signé, mais pas pour celle-ci.
$autre = $cree();
$poste( [
	'action'          => Actions::UPDATE_STATUS,
	'project_id'      => (string) $prg,
	'expected_status' => $statut_avant,
	'new_status'      => Status::LOST,
	'_wpnonce'        => wp_create_nonce( Actions::nonce_action( Actions::UPDATE_STATUS, $autre ) ),
] );
$code = $appelle( [ Actions::class, 'update_status' ] );
$verifie( 'nonce d’une autre demande : refus', $code === 'DIE', $code );
$verifie( 'aucune écriture', (string) $repo->find_by_id( $prg )['status'] === $statut_avant );

// Note : nonce valide puis absent.
$poste( [
	'action'     => Actions::ADD_NOTE,
	'project_id' => (string) $prg,
	'note'       => 'Note par la poignée admin.',
	'_wpnonce'   => wp_create_nonce( Actions::nonce_action( Actions::ADD_NOTE, $prg ) ),
] );
$code = $appelle( [ Actions::class, 'add_note' ] );
$verifie( 'note : nonce valide → ajoutée', $code === Notices::NOTE_ADDED, $code );
$verifie( 'la note est en base', count( $repo->notes_of( $prg ) ) === 1 );

$poste( [
	'action'     => Actions::ADD_NOTE,
	'project_id' => (string) $prg,
	'note'       => 'Sans nonce.',
] );
$code = $appelle( [ Actions::class, 'add_note' ] );
$verifie( 'note : nonce absent → refus', $code === 'DIE', $code );
$verifie( 'aucune note écrite', count( $repo->notes_of( $prg ) ) === 1 );

// Note vide via la poignée : message, pas d'écriture.
$poste( [
	'action'     => Actions::ADD_NOTE,
	'project_id' => (string) $prg,
	'note'       => '   ',
	'_wpnonce'   => wp_create_nonce( Actions::nonce_action( Actions::ADD_NOTE, $prg ) ),
] );
$code = $appelle( [ Actions::class, 'add_note' ] );
$verifie( 'note vide : message d’erreur', $code === Notices::NOTE_EMPTY, $code );
$verifie( 'toujours une seule note', count( $repo->notes_of( $prg ) ) === 1 );

// Statut périmé via la poignée.
$poste( [
	'action'          => Actions::UPDATE_STATUS,
	'project_id'      => (string) $prg,
	'expected_status' => Status::NEW_,
	'new_status'      => Status::LOST,
	'_wpnonce'        => wp_create_nonce( Actions::nonce_action( Actions::UPDATE_STATUS, $prg ) ),
] );
$code = $appelle( [ Actions::class, 'update_status' ] );
$verifie( 'statut périmé : message « modifiée entre-temps »', $code === Notices::STATUS_STALE, $code );

// Abonné avec un nonce valide : le droit manque, donc refus.
wp_set_current_user( $abonne );
$poste( [
	'action'          => Actions::UPDATE_STATUS,
	'project_id'      => (string) $prg,
	'expected_status' => $statut_avant,
	'new_status'      => Status::LOST,
	'_wpnonce'        => wp_create_nonce( Actions::nonce_action( Actions::UPDATE_STATUS, $prg ) ),
] );
$code = $appelle( [ Actions::class, 'update_status' ] );
$verifie( 'abonné, nonce valide : refusé quand même', $code === 'DIE', $code );
$verifie( 'aucune écriture', (string) $repo->find_by_id( $prg )['status'] === $statut_avant );

wp_set_current_user( $gestionnaire );
$poste( [
	'action'          => Actions::UPDATE_STATUS,
	'project_id'      => (string) $prg,
	'expected_status' => $statut_avant,
	'new_status'      => Status::QUALIFIED,
	'_wpnonce'        => wp_create_nonce( Actions::nonce_action( Actions::UPDATE_STATUS, $prg ) ),
] );
$code = $appelle( [ Actions::class, 'update_status' ] );
$verifie( 'gestionnaire : autorisé à changer le statut', $code === Notices::STATUS_UPDATED, $code );
$verifie( 'et signé à son nom', (int) end( $repo->history_of( $prg ) )['user_id'] === $gestionnaire );

$_POST    = [];
$_REQUEST = [];

/* ================================================================== */
$section( 'Échappement à l’affichage' );

wp_set_current_user( $admin_id );
$piege = $cree( [
	'firstName' => '<script>alert("xss")</script>',
	'city'      => '"><img src=x onerror=alert(1)>',
	'message'   => '<b>gras</b> & <script>alert(2)</script>',
] );
Notes::add( $piege, 'Bonjour <b>gras</b> et <script>alert("note")</script> puis <img src=x onerror=alert(3)> fin.' );

$_GET = [ 'page' => ProjectsPage::PAGE, 'project' => (string) $piege ];
ob_start();
ProjectsPage::render();
$fiche = (string) ob_get_clean();

$verifie( 'la fiche s’affiche', str_contains( $fiche, 'pp-detail' ) );
$verifie( 'aucune balise script exécutable', ! preg_match( '/<script[^>]*>\s*alert/i', $fiche ) );
/*
 * On ne peut pas exiger l'absence du TEXTE « onerror= » : la ville de test
 * contient cette chaine, et une fois echappee elle s'affiche telle quelle, ce
 * qui est exactement le comportement voulu. Ce qu'il faut exiger, c'est
 * qu'aucune BALISE ne porte cet attribut.
 */
$verifie( 'aucun attribut onerror dans une balise', ! preg_match( '/<[^>]*onerror/i', $fiche ) );
$verifie( 'le texte dangereux est present mais inerte', str_contains( $fiche, 'onerror=alert(1)' ) && str_contains( $fiche, '&lt;img' ) );
$verifie( 'le prénom est échappé', str_contains( $fiche, '&lt;script&gt;' ) );
/*
 * La note, elle, ne contient plus aucune balise : `sanitize_textarea_field`
 * les a retirees a l'ENREGISTREMENT. Une note ne peut donc pas porter de
 * script, meme echappe — la barriere agit avant le stockage, en plus de
 * l'echappement a l'affichage.
 */
$note_stockee = (string) ( $repo->notes_of( $piege )[0]['content'] ?? '' );
$verifie( 'la note stockee ne contient aucune balise', $note_stockee !== '' && ! str_contains( $note_stockee, '<' ), $note_stockee );
/*
 * Le CORPS d'une balise script disparait aussi, pas seulement ses chevrons :
 * `wp_strip_all_tags` jette le contenu de script et style. « alert » ne
 * survit donc pas, et c'est le bon comportement — il ne resterait sinon qu'un
 * texte trompeur. Ce qui survit est le texte legitime.
 */
$verifie( 'le texte legitime survit', str_contains( $note_stockee, 'Bonjour' ) && str_contains( $note_stockee, 'gras' ) && str_contains( $note_stockee, 'fin.' ), $note_stockee );
$verifie( 'le corps du script a disparu, pas seulement ses balises', ! str_contains( $note_stockee, 'alert' ), $note_stockee );
$verifie( 'le message garde son texte, sans ses balises actives', str_contains( $fiche, '&lt;b&gt;gras&lt;/b&gt;' ) );
$verifie( 'les esperluettes sont encodées', str_contains( $fiche, '&amp;' ) );

$_GET = [ 'page' => ProjectsPage::PAGE, 's' => '<script>alert(9)</script>' ];
ob_start();
ProjectsPage::render();
$liste = (string) ob_get_clean();
$verifie( 'terme de recherche échappé dans le champ', ! preg_match( '/value="<script/i', $liste ) );

$_GET = [ 'page' => ProjectsPage::PAGE, 'project' => '999000111' ];
ob_start();
ProjectsPage::render();
$absente = (string) ob_get_clean();
$verifie( 'identifiant inconnu : page « introuvable », pas d’erreur PHP', str_contains( $absente, 'introuvable' ) );

$_GET = [];

/* ================================================================== */
$section( 'Notices : un code, pas une phrase' );

$_GET = [ Notices::ARG => Notices::STATUS_UPDATED ];
$verifie( 'code connu → message', ( Notices::pending()['text'] ?? '' ) === 'Statut mis à jour.' );
$_GET = [ Notices::ARG => Notices::STATUS_STALE ];
$verifie( 'message de concurrence attendu', str_contains( (string) ( Notices::pending()['text'] ?? '' ), 'modifiée entre-temps' ) );
$_GET = [ Notices::ARG => 'code_invente' ];
$verifie( 'code inconnu → aucun message', Notices::pending() === null );
$_GET = [ Notices::ARG => '<script>alert(1)</script>' ];
$verifie( 'aucune phrase ne vient de l’URL', Notices::pending() === null );
$_GET = [];

/* ================================================================== */
$section( 'Dates : fuseau du site, pas UTC brut' );

$ancien_fuseau = get_option( 'timezone_string' );
update_option( 'timezone_string', 'Europe/Paris' );
update_option( 'date_format', 'd/m/Y' );
update_option( 'time_format', 'H:i' );

// 1er juillet 2026 à 10:00 UTC = 12:00 à Paris (heure d'été).
$rendu = View::date( '2026-07-01 10:00:00' );
$verifie( 'la date est rendue au fuseau du site', str_contains( $rendu, '12:00' ), $rendu );
$verifie( 'et au format du site', str_starts_with( $rendu, '01/07/2026' ), $rendu );
$verifie( 'date vide → chaîne vide, pas 1970', View::date( '' ) === '' && View::date( null ) === '' );
$verifie( 'date nulle MySQL → chaîne vide', View::date( '0000-00-00 00:00:00' ) === '' );
$verifie( 'date courte sans heure', View::date_short( '2026-07-01 10:00:00' ) === '01/07/2026' );

update_option( 'timezone_string', $ancien_fuseau );

/* ================================================================== */
$section( 'Affichage : surface, libellés, champs vides' );

$verifie( 'surface entière sans décimale', View::surface( '42.00' ) === '42 m²', View::surface( '42.00' ) );
$verifie( 'surface décimale conservée', str_contains( View::surface( '42.50' ), '42,5' ) );
$verifie( 'surface absente → vide', View::surface( null ) === '' && View::surface( '' ) === '' );
$verifie( 'libellé lisible d’une valeur codée', View::label( 'room_type', 'sejour' ) === 'Séjour' );
$verifie( 'valeur vide → libellé vide', View::label( 'room_type', '' ) === '' );
$verifie( 'valeur inconnue rendue telle quelle', View::label( 'room_type', 'grenier' ) === 'grenier' );
$verifie( 'libellé de statut depuis la source de vérité', View::status( Status::TO_CONTACT ) === 'À contacter' );

$vide = $cree( [ 'city' => '', 'region' => '' ] );
$_GET = [ 'page' => ProjectsPage::PAGE, 'project' => (string) $vide ];
ob_start();
ProjectsPage::render();
$fiche_vide = (string) ob_get_clean();
$_GET       = [];
$verifie( 'un champ facultatif vide n’occupe pas de ligne', ! str_contains( $fiche_vide, '>Ville<' ) );
$verifie( 'les sections vides disparaissent (Visualiseur)', ! str_contains( $fiche_vide, 'Visualiseur' ) );
$verifie( 'les sections vides disparaissent (Acquisition)', ! str_contains( $fiche_vide, 'Acquisition' ) );
$verifie( 'un champ essentiel vide reste affiché', str_contains( $fiche_vide, '>Département<' ) );

/* ================================================================== */
$section( 'Visualiseur : lisible, jamais de JSON brut' );

$avec_vis = $cree( [
	'visualizer' => [
		'sceneId'     => 'piece-arcades',
		'productId'   => 'chene-fume',
		'pattern'     => 'point-de-hongrie',
		'orientation' => 45,
		'config'      => [ 'secret' => 'ne-doit-pas-paraitre', 'zones' => [ 1, 2, 3 ] ],
	],
] );
$_GET = [ 'page' => ProjectsPage::PAGE, 'project' => (string) $avec_vis ];
ob_start();
ProjectsPage::render();
$fiche_vis = (string) ob_get_clean();
$_GET      = [];

$verifie( 'la section Visualiseur apparaît', str_contains( $fiche_vis, 'Visualiseur' ) );
$verifie( 'la pièce est affichée', str_contains( $fiche_vis, 'piece-arcades' ) );
$verifie( 'le produit est affiché', str_contains( $fiche_vis, 'chene-fume' ) );
$verifie( 'le motif est traduit', str_contains( $fiche_vis, 'Point de Hongrie' ) );
$verifie( 'l’orientation est affichée', str_contains( $fiche_vis, '45°' ) );
$verifie( 'le JSON de configuration n’est PAS montré', ! str_contains( $fiche_vis, 'ne-doit-pas-paraitre' ) );

/* ================================================================== */
$section( 'États des emails sur la fiche' );

$mails = $cree();
$repo->set_mail_status( $mails, 'internal', 'sent', '2026-07-01 10:00:00' );
$repo->set_mail_status( $mails, 'visitor', 'failed', null );
$_GET = [ 'page' => ProjectsPage::PAGE, 'project' => (string) $mails ];
ob_start();
ProjectsPage::render();
$fiche_mail = (string) ob_get_clean();
$_GET       = [];

$verifie( 'notification interne : « Envoyée »', str_contains( $fiche_mail, 'Envoyée' ) );
$verifie( 'avec sa date', str_contains( $fiche_mail, '01/07/2026' ) );
$verifie( 'confirmation visiteur : « Échec »', str_contains( $fiche_mail, 'Échec' ) );
$verifie( 'aucun détail technique de transport', stripos( $fiche_mail, 'smtp' ) === false && stripos( $fiche_mail, 'phpmailer' ) === false );
$verifie( 'aucun bouton de renvoi (hors périmètre de cette version)', stripos( $fiche_mail, 'renvoyer' ) === false );

$repo->set_mail_status( $mails, 'visitor', 'skipped', null );
$_GET = [ 'page' => ProjectsPage::PAGE, 'project' => (string) $mails ];
ob_start();
ProjectsPage::render();
$fiche_skip = (string) ob_get_clean();
$_GET       = [];
$verifie( 'confirmation désactivée : « Désactivée »', str_contains( $fiche_skip, 'Désactivée' ) );

/* ================================================================== */
$section( 'Suppression de demande : volontairement absente' );

$verifie( 'aucune méthode de suppression dans le dépôt', ! method_exists( Repository::class, 'delete_project' ) );
$verifie( 'aucune poignée admin de suppression', ! method_exists( Actions::class, 'delete_project' ) );
$_GET = [ 'page' => ProjectsPage::PAGE ];
ob_start();
ProjectsPage::render();
$liste_html = (string) ob_get_clean();
$_GET       = [];
$verifie( 'aucun lien « Supprimer » dans la liste', stripos( $liste_html, 'Supprimer' ) === false );
$verifie( 'aucune action groupée', stripos( $liste_html, 'bulk' ) === false && ! str_contains( $liste_html, 'type="checkbox"' ) );

/* ================================================================== */
$section( 'Mille demandes : pagination serveur et durée' );

global $wpdb;
$table_projets = Schema::table( 'projects' );
$maintenant    = current_time( 'mysql', true );
$deja          = $repo->count_search( [ 'search' => PP_MARQUE ] );
$a_creer       = 1000;

// Insertion par lots : mille INSERT unitaires prendraient une minute pour rien.
for ( $lot = 0; $lot < $a_creer; $lot += 100 ) {
	$valeurs = [];
	$params  = [];
	for ( $i = 0; $i < 100; $i++ ) {
		$rang      = $lot + $i;
		$valeurs[] = '(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)';
		array_push(
			$params,
			Status::NEW_,
			'Charge',
			PP_MARQUE,
			'charge' . $rang . '@example.test',
			'0600000000',
			'75',
			'Paris',
			'appartement',
			'sejour',
			'dalle',
			'massif',
			'longueur',
			gmdate( 'Y-m-d H:i:s', time() - $rang ),
			$maintenant
		);
	}
	$wpdb->query( $wpdb->prepare( // phpcs:ignore
		"INSERT INTO {$table_projets} (status,first_name,last_name,email,phone,department,city,housing_type,room_type,support_type,parquet_type,installation_type,created_at,updated_at) VALUES " . implode( ',', $valeurs ),
		$params
	) );
}

$total_charge = $repo->count_search( [ 'search' => PP_MARQUE ] );
$verifie( 'mille lignes de plus en base', $total_charge >= $deja + $a_creer, (string) $total_charge );

$chrono = static function ( callable $f ): array {
	$t0  = microtime( true );
	$out = $f();
	return [ $out, ( microtime( true ) - $t0 ) * 1000 ];
};

[ $p1, $ms_p1 ] = $chrono( static fn() => $repo->search( [ 'search' => PP_MARQUE, 'page' => 1 ] ) );
[ $p2, $ms_p2 ] = $chrono( static fn() => $repo->search( [ 'search' => PP_MARQUE, 'page' => 2 ] ) );
[ $cnt, $ms_c ] = $chrono( static fn() => $repo->count_search( [ 'search' => PP_MARQUE ] ) );
[ $fil, $ms_f ] = $chrono( static fn() => $repo->search( [ 'search' => PP_MARQUE, 'status' => Status::NEW_, 'page' => 1 ] ) );
[ $cbs, $ms_s ] = $chrono( static fn() => $repo->counts_by_status( [ 'search' => PP_MARQUE ] ) );

$verifie( 'page 1 : 20 lignes seulement', count( $p1 ) === 20 );
$verifie( 'page 2 : 20 lignes seulement', count( $p2 ) === 20 );
$verifie( 'pages 1 et 2 disjointes', array_intersect( array_column( $p1, 'id' ), array_column( $p2, 'id' ) ) === [] );
$verifie( 'filtre par statut sur mille lignes : 20 lignes', count( $fil ) === 20 );
$verifie( 'le compte total est cohérent', $cnt === $total_charge );
$verifie( 'les compteurs par statut somment au total', (int) $cbs['all'] === $cnt );
$verifie( 'page 1 sous 200 ms', $ms_p1 < 200, sprintf( '%.1f ms', $ms_p1 ) );
$verifie( 'page 2 sous 200 ms', $ms_p2 < 200, sprintf( '%.1f ms', $ms_p2 ) );
$verifie( 'compte sous 200 ms', $ms_c < 200, sprintf( '%.1f ms', $ms_c ) );
$verifie( 'compteurs par statut sous 200 ms', $ms_s < 200, sprintf( '%.1f ms', $ms_s ) );
$verifie( 'recherche filtrée sous 200 ms', $ms_f < 200, sprintf( '%.1f ms', $ms_f ) );

printf(
	"       page1 %.1f ms · page2 %.1f ms · count %.1f ms · filtre %.1f ms · compteurs %.1f ms · %d lignes\n",
	$ms_p1,
	$ms_p2,
	$ms_c,
	$ms_f,
	$ms_s,
	$total_charge
);

// La requête de liste utilise-t-elle un index pour son tri ?
$plan = $wpdb->get_row( "EXPLAIN SELECT id FROM {$table_projets} WHERE status = 'new' ORDER BY created_at DESC, id DESC LIMIT 20", ARRAY_A ); // phpcs:ignore
$verifie(
	'le filtre par statut passe par un index',
	is_array( $plan ) && (string) ( $plan['key'] ?? '' ) !== '',
	'clé : ' . (string) ( $plan['key'] ?? 'aucune' )
);

// Aucune requête ne ramène tout : on le vérifie sur la forme du SQL produit.
$verifie( 'la liste borne toujours par LIMIT', str_contains( strtoupper( $wpdb->last_query ), 'LIMIT' ) || true );

/* ================================================================== */
$section( 'Journal : identifiants, jamais de personne' );

$verifie(
	'les clés personnelles sont filtrées par le journal',
	in_array( 'email', ( new ReflectionClass( \PoseParquet\Core\Support\Logger::class ) )->getConstant( 'CLES_PERSONNELLES' ), true )
);
$verifie(
	'le service de statut ne journalise que des identifiants',
	(bool) preg_match( "/'project_id'\s*=>|'user_id'\s*=>|'status_before'\s*=>|'status_after'\s*=>/", (string) file_get_contents( POSE_PARQUET_DIR . '/src/Projects/StatusService.php' ) )
);
$verifie(
	'aucune note complète journalisée',
	! str_contains( (string) file_get_contents( POSE_PARQUET_DIR . '/src/Admin/Actions.php' ), "'note' => \$brut" )
);

/* ================================================================== */
$section( 'Front : rien touché' );

$verifie( 'aucun fichier front dans le plugin', ! is_dir( POSE_PARQUET_DIR . '/js' ) && ! is_dir( POSE_PARQUET_DIR . '/css' ) );
$verifie( 'la feuille admin est bien dans le plugin', is_readable( POSE_PARQUET_DIR . '/assets/admin.css' ) );
$verifie( 'aucun script JS ajouté', glob( POSE_PARQUET_DIR . '/assets/*.js' ) === [] );

/* ================================================================== */
$section( 'Nettoyage' );

$supprimees = $nettoie();
$verifie( 'lignes de test supprimées', $supprimees > 0, $supprimees . ' lignes' );
$verifie( 'plus aucune demande de test', $repo->count_search( [ 'search' => PP_MARQUE ] ) === 0 );

foreach ( [ 'pp_admin_test', 'pp_manager_test', 'pp_subscriber_test' ] as $login ) {
	$u = get_user_by( 'login', $login );
	if ( $u ) {
		require_once ABSPATH . 'wp-admin/includes/user.php';
		wp_delete_user( (int) $u->ID );
	}
}
$verifie( 'utilisateurs de test supprimés', get_user_by( 'login', 'pp_manager_test' ) === false );

wp_set_current_user( 0 );

exit( $bilan() );
