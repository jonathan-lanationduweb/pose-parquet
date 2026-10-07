<?php
/**
 * Suite « Publier le site » (07/10/2026).
 *
 *   php tests/run-publication.php <racine WordPress>
 *
 * Ne lance AUCUNE vraie publication : le mode local n'est pas déclenché ici
 * (la recette Chrome le fait), le mode GitHub est joué contre des réponses
 * simulées (pre_http_request). Le journal, le verrou et la dernière
 * publication sont remis dans l'état trouvé.
 */

declare(strict_types=1);

require __DIR__ . '/support.php';
pp_test_bootstrap( $argv, 'php tests/run-publication.php <racine WordPress>' );
[ $verifie, $section, $bilan ] = pp_test_outils();

use PoseParquet\Core\Publication\Publication;
use PoseParquet\Core\Security\Capabilities;
use PoseParquet\Core\Security\Roles;

final class PpArretPub extends \Exception {}
final class PpRedirPub extends \Exception {
	public function __construct( public string $url ) {
		parent::__construct( 'redirection' );
	}
}
add_filter( 'wp_die_handler', static fn(): callable => static function ( $m ): void {
	throw new PpArretPub( is_wp_error( $m ) ? $m->get_error_message() : (string) $m );
}, 1 );
add_filter( 'wp_redirect', static function ( $url ) {
	throw new PpRedirPub( (string) $url );
}, 1 );
$appelle = static function ( callable $f ): string {
	try {
		$f();
	} catch ( PpRedirPub $r ) {
		parse_str( (string) parse_url( $r->url, PHP_URL_QUERY ), $a );
		return 'REDIR:' . (string) ( $a['pp-publication'] ?? '' );
	} catch ( PpArretPub $e ) {
		return 'DIE';
	}
	return 'AUCUNE';
};

$memoire_avant = get_option( Publication::OPTION, null );
$verrou_avant  = get_option( Publication::VERROU, null );
delete_option( Publication::VERROU );

$admins = get_users( [ 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ] );
$admin  = (int) $admins[0];

/* ------------------------------------------------------------------ */
$section( 'Droits et jeton' );
require_once ABSPATH . 'wp-admin/includes/user.php';
$gestionnaire = wp_insert_user( [ 'user_login' => 'pp_pubtest_' . wp_rand(), 'user_pass' => wp_generate_password(), 'role' => Roles::MANAGER, 'user_email' => 'pubtest' . wp_rand() . '@example.test' ] );
wp_set_current_user( (int) $gestionnaire );
$verifie( 'gestionnaire des projets : pas le droit de publier', ! current_user_can( Capabilities::MANAGE_SETTINGS ) );
$_POST = $_REQUEST = [ 'action' => Publication::ACTION, '_wpnonce' => wp_create_nonce( Publication::ACTION ) ];
$verifie( 'gestionnaire, même avec un jeton : refus (403)', $appelle( [ Publication::class, 'publier' ] ) === 'DIE' );
$verifie( 'aucun verrou posé par le refus', get_option( Publication::VERROU ) === false );
wp_set_current_user( $admin );
$_POST = $_REQUEST = [ 'action' => Publication::ACTION ];
$verifie( 'administrateur sans jeton : refus', $appelle( [ Publication::class, 'publier' ] ) === 'DIE' );
$_POST = $_REQUEST = [ 'action' => Publication::ACTION, '_wpnonce' => 'faux' ];
$verifie( 'administrateur, jeton faux : refus', $appelle( [ Publication::class, 'publier' ] ) === 'DIE' );
$verifie( 'toujours aucun verrou', get_option( Publication::VERROU ) === false );
$_POST = $_REQUEST = [];
wp_delete_user( (int) $gestionnaire );

/* ------------------------------------------------------------------ */
$section( 'Workflow fermé' );
$source = (string) file_get_contents( POSE_PARQUET_DIR . '/src/Publication/Publication.php' );
$verifie( 'le module ne lit ni $_POST, ni $_GET, ni $_REQUEST (aucun paramètre du navigateur)', ! preg_match( '/\$_(POST|GET|REQUEST)\b/', $source ) );
$verifie( 'commande construite de valeurs calculées, toutes échappées (escapeshellarg)', str_contains( $source, "array_map( 'escapeshellarg', [ \$node, \$script, '--etat', \$fichier, '--export', \$export ] )" ) );
$verifie( 'Node : constante ou emplacements fixes, jamais une saisie', str_contains( $source, "defined( 'POSE_PARQUET_NODE' )" ) );
$runner = (string) \PoseParquet\Core\Contenus\Apercu::dossier() . '/_generator/publier.js';
if ( is_file( $runner ) ) {
	$js = (string) file_get_contents( $runner );
	$verifie( 'script : fichier d’état nommé publication-etat.json, export …/pose-parquet/v1/contenus, sinon refus', str_contains( $js, "path.basename(fichierEtat) !== 'publication-etat.json'" ) && str_contains( $js, '\/pose-parquet\/v1\/contenus$' ) );
	$verifie( 'script : build en processus séparé avec délai maximal', str_contains( $js, 'timeout: DELAI_BUILD_MS' ) );
	$verifie( 'script : échec du build → instantané d’avant remis et site reconstruit', str_contains( $js, 'fs.writeFileSync(INSTANTANE, avant)' ) && str_contains( $js, 'const retour = construire();' ) );
}
$verifie( 'dossier d’état interdit au web (.htaccess)', str_contains( (string) file_get_contents( Publication::dossier_etat() . '/.htaccess' ), 'Require all denied' ) );

/* ------------------------------------------------------------------ */
$section( 'Concurrence' );
add_option( Publication::VERROU, [ 'debut' => time(), 'utilisateur' => $admin, 'mode' => 'local', 'maintenance' => false ], '', false );
$r = Publication::lancer( $admin );
$verifie( 'publication déjà en cours : seconde demande refusée', $r['code'] === 'en_cours', $r['code'] );
$verifie( 'état « en cours »', Publication::etat()['statut'] === 'en_cours' );
update_option( Publication::VERROU, [ 'debut' => time() - Publication::DELAI_MAX - 5, 'utilisateur' => $admin, 'mode' => 'local', 'maintenance' => false ], false );
// Le fichier d'état d'une vraie publication récente fermerait légitimement ce verrou : on l'écarte le temps du test.
$fichier_etat = Publication::fichier_etat();
$sauve        = is_file( $fichier_etat ) ? (string) file_get_contents( $fichier_etat ) : null;
@unlink( $fichier_etat ); // phpcs:ignore
Publication::synchroniser();
if ( $sauve !== null ) {
	file_put_contents( $fichier_etat, $sauve );
}
$journal = Publication::memoire()['journal'];
$verifie( 'publication muette au-delà de dix minutes : close en échec, verrou levé', get_option( Publication::VERROU ) === false && ( $journal[0]['resultat'] ?? '' ) === 'echec' );

/* ------------------------------------------------------------------ */
$section( 'Production : GitHub Actions (réponses simulées)' );
define( 'POSE_PARQUET_PUBLICATION', 'github' );
define( 'POSE_PARQUET_GITHUB_REPO', 'exemple/pose-parquet' );
define( 'POSE_PARQUET_GITHUB_TOKEN', 'jeton-de-test' );
$requetes = [];
$reponse_runs = null;
add_filter( 'pre_http_request', static function ( $pre, array $args, string $url ) use ( &$requetes, &$reponse_runs ) {
	if ( ! str_contains( $url, 'api.github.com' ) ) {
		return $pre;
	}
	$requetes[] = [ 'url' => $url, 'methode' => $args['method'] ?? 'GET', 'auth' => $args['headers']['Authorization'] ?? '', 'corps' => $args['body'] ?? '' ];
	if ( str_ends_with( $url, '/dispatches' ) ) {
		return [ 'headers' => [], 'body' => '', 'response' => [ 'code' => 204, 'message' => 'No Content' ], 'cookies' => [] ];
	}
	return [ 'headers' => [], 'body' => (string) wp_json_encode( $reponse_runs ), 'response' => [ 'code' => 200, 'message' => 'OK' ], 'cookies' => [] ];
}, 10, 3 );
$verifie( 'mode github choisi par la configuration serveur', Publication::mode() === 'github' );
$r = Publication::lancer( $admin );
$d = $requetes[0] ?? [];
$verifie( 'repository_dispatch envoyé (POST /repos/…/dispatches)', $r['code'] === 'lancee' && ( $d['methode'] ?? '' ) === 'POST' && str_ends_with( (string) ( $d['url'] ?? '' ), '/repos/exemple/pose-parquet/dispatches' ) );
$verifie( 'événement « wordpress-publish »', ( json_decode( (string) ( $d['corps'] ?? '' ), true )['event_type'] ?? '' ) === Publication::EVENEMENT_GITHUB );
$verifie( 'le jeton part du serveur, dans un en-tête', ( $d['auth'] ?? '' ) === 'Bearer jeton-de-test' );
ob_start();
Publication::panneau();
$html = (string) ob_get_clean();
$verifie( 'le jeton n’apparaît jamais dans la page', ! str_contains( $html, 'jeton-de-test' ) );
$reponse_runs = [ 'workflow_runs' => [ [ 'status' => 'in_progress', 'conclusion' => null, 'created_at' => gmdate( 'c' ), 'head_sha' => 'abc' ] ] ];
Publication::synchroniser();
$verifie( 'workflow en cours : publication toujours en cours', is_array( get_option( Publication::VERROU ) ) );
$reponse_runs = [ 'workflow_runs' => [ [ 'status' => 'completed', 'conclusion' => 'failure', 'created_at' => gmdate( 'c' ), 'head_sha' => 'abcdef1234567890' ] ] ];
Publication::synchroniser();
$j = Publication::memoire()['journal'][0] ?? [];
$verifie( 'workflow en échec : « Publication échouée », site en ligne non remplacé', ( $j['resultat'] ?? '' ) === 'echec' && str_contains( (string) $j['raison'], 'pas été remplacé' ) && get_option( Publication::VERROU ) === false );
Publication::lancer( $admin );
$reponse_runs = [ 'workflow_runs' => [ [ 'status' => 'completed', 'conclusion' => 'success', 'created_at' => gmdate( 'c' ), 'head_sha' => 'abcdef1234567890' ] ] ];
Publication::synchroniser();
$j = Publication::memoire()['journal'][0] ?? [];
$verifie( 'workflow réussi : journal (date, utilisateur, durée, empreinte), dernière publication', ( $j['resultat'] ?? '' ) === 'succes' && $j['empreinte'] === 'abcdef123456' && $j['utilisateur'] !== '—' && ( Publication::memoire()['derniere']['empreinte'] ?? '' ) === 'abcdef123456' );
$verifie( 'journal borné à 15 lignes', count( Publication::memoire()['journal'] ) <= 15 );
$verifie( 'journal : environnement « préproduction GitHub » (staging)', ( $j['environnement'] ?? '' ) === 'staging' );

// Signal accepté (204) mais aucun run : le workflow de la branche par défaut n'écoute pas repository_dispatch.
Publication::lancer( $admin );
$reponse_runs = [ 'workflow_runs' => [] ];
Publication::synchroniser();
$verifie( 'aucun run visible tout de suite : toujours en cours (pas de faux échec)', is_array( get_option( Publication::VERROU ) ) );
$v = get_option( Publication::VERROU );
$v['debut'] = time() - Publication::DELAI_DEMARRAGE_GITHUB - 5;
update_option( Publication::VERROU, $v, false );
Publication::synchroniser();
$j = Publication::memoire()['journal'][0] ?? [];
$verifie( 'aucun run après 3 minutes : échec explicite (branche par défaut sans déclencheur)', ( $j['resultat'] ?? '' ) === 'echec' && str_contains( (string) $j['raison'], 'branche par défaut' ) && get_option( Publication::VERROU ) === false );

/* ------------------------------------------------------------------ */
// Remise en état.
if ( $memoire_avant === null ) {
	delete_option( Publication::OPTION );
} else {
	update_option( Publication::OPTION, $memoire_avant, false );
}
delete_option( Publication::VERROU );
if ( is_array( $verrou_avant ) ) {
	add_option( Publication::VERROU, $verrou_avant, '', false );
}

exit( $bilan() );
