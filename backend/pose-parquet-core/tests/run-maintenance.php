<?php
/**
 * Suite « Maintenance : aller ET retour » (08/10/2026).
 *
 *   php tests/run-maintenance.php <racine WordPress>
 *
 * Le bug d'origine : la maintenance activée puis désactivée, le site public
 * ne revenait pas. Cette suite couvre le RETOUR (true → false), pas seulement
 * l'activation :
 *
 *   1. réglage, export, écart avec le site publié, libellés (sans publier) ;
 *   2. deux VRAIES publications locales, par le moteur existant
 *      (Publication::lancer) : ON publié → site en maintenance, puis OFF
 *      publié → site normal (pages sans porte, maintenance.json à false,
 *      maintenance.html qui renvoie vers l'accueil).
 *
 * La partie 2 ne tourne que si le site part d'un état propre (maintenance
 * désactivée, rien à publier) : elle le laisse exactement ainsi. Le réglage et
 * le journal des publications sont remis dans l'état trouvé.
 */

declare(strict_types=1);

require __DIR__ . '/support.php';
pp_test_bootstrap( $argv, 'php tests/run-maintenance.php <racine WordPress>' );
[ $verifie, $section, $bilan ] = pp_test_outils();

use PoseParquet\Core\Contenus\Apercu;
use PoseParquet\Core\Contenus\Export;
use PoseParquet\Core\Maintenance\Reglages;
use PoseParquet\Core\Publication\Publication;

final class PpRedirMaint extends \Exception {}
add_filter( 'wp_redirect', static function ( $url ) {
	throw new PpRedirMaint( (string) $url );
}, 1 );
$appelle = static function ( callable $f ): void {
	try {
		$f();
	} catch ( PpRedirMaint $r ) {
		return;
	}
};

$admins = get_users( [ 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ] );
wp_set_current_user( (int) $admins[0] );

$reglage_avant = get_option( Reglages::OPTION, null );
$memoire_avant = get_option( Publication::OPTION, null );
$publie_reel   = Publication::maintenance_publiee();

$basculer = static function () use ( $appelle ): void {
	$_POST = $_REQUEST = [ 'action' => Reglages::BASCULER, '_wpnonce' => wp_create_nonce( Reglages::BASCULER ) ];
	$appelle( [ Reglages::class, 'basculer' ] );
	$_POST = $_REQUEST = [];
};
// Le formulaire « Contenu de la page », tel que le navigateur l'envoie : sans aucun champ d'état.
$enregistrer = static function () use ( $appelle ): void {
	$m     = Reglages::lire();
	$_POST = $_REQUEST = [ 'action' => Reglages::ACTION, '_wpnonce' => wp_create_nonce( Reglages::ACTION ), 'pp_titre' => $m['titre'], 'pp_message' => $m['message'], 'pp_image' => (string) $m['image'], 'pp_premibel' => '1', 'pp_allure' => '1' ];
	$appelle( [ Reglages::class, 'enregistrer' ] );
	$_POST = $_REQUEST = [];
};
$export_actif = static fn(): bool => (bool) ( Export::donnees()['maintenance']['actif'] ?? null );
$panneau      = static function (): string {
	ob_start();
	Reglages::panneau();
	return (string) ob_get_clean();
};
// Ce que le site a publié, simulé dans le cache de l'instantané publié (aucun fichier touché).
$simuler_publie = static function ( bool $actif ): void {
	$d = Publication::export_courant();
	$d['maintenance']['actif'] = $actif;
	set_transient( 'pp_publication_publie', $d, 2 * MINUTE_IN_SECONDS ); // Publication::CACHE_PUB (privée)
};

/* ------------------------------------------------------------------ */
$section( 'Réglage et export : false → true → false' );
update_option( Reglages::OPTION, array_merge( Reglages::lire(), [ 'actif' => false ] ), false );
$simuler_publie( false );
$verifie( 'départ : réglage false, export false', ! Reglages::actif() && ! $export_actif() );
$verifie( 'départ : « Site en ligne »', Reglages::etat_public() === 'en_ligne' );

$basculer();
$verifie( 'activation : réglage true', Reglages::actif() === true );
$verifie( 'activation : export true', $export_actif() === true );
$enregistrer();
$verifie( 'Enregistrer après activation : reste true', Reglages::actif() === true );
$verifie( 'non publiée : « Maintenance à publier »', Reglages::etat_public() === 'maintenance_a_publier' );
$c = array_values( array_filter( Publication::changements(), static fn( $x ) => $x['type'] === 'maintenance' ) );
$verifie( 'Publication : « Activation de la maintenance »', ( $c[0]['libelle'] ?? '' ) === 'Activation de la maintenance' );
$html = $panneau();
$verifie( 'panneau : configuration « Maintenance activée », site public « Maintenance à publier », bouton Publier', str_contains( $html, 'Maintenance activée' ) && str_contains( $html, 'Maintenance à publier' ) && str_contains( $html, 'Publier le site' ) );

$simuler_publie( true );
$verifie( 'publiée : « Site en maintenance », plus de bouton Publier', Reglages::etat_public() === 'en_maintenance' && ! str_contains( $panneau(), 'Publier le site' ) );

$basculer();
$verifie( 'désactivation : réglage false', Reglages::actif() === false );
$verifie( 'désactivation : export false', $export_actif() === false );
$enregistrer();
wp_cache_flush();
$verifie( 'Enregistrer après désactivation : OFF reste OFF (relu en base)', Reglages::actif() === false );
$verifie( 'non publiée : « Réactivation à publier »', Reglages::etat_public() === 'reactivation_a_publier' );
$c = array_values( array_filter( Publication::changements(), static fn( $x ) => $x['type'] === 'maintenance' ) );
$verifie( 'Publication : « Désactivation de la maintenance »', ( $c[0]['libelle'] ?? '' ) === 'Désactivation de la maintenance' );
$html = $panneau();
$verifie( 'panneau : « Maintenance désactivée » + « Réactivation à publier » + bouton Publier', str_contains( $html, 'Maintenance désactivée' ) && str_contains( $html, 'Réactivation à publier' ) && str_contains( $html, 'Publier le site' ) );
$verifie( 'panneau : jamais « ouvert à tous » tant que le site public est en maintenance', ! str_contains( $html, 'ouvert à tous' ) && str_contains( $html, 'encore en maintenance' ) );

$simuler_publie( false );
$verifie( 'retour publié : « Site en ligne »', Reglages::etat_public() === 'en_ligne' && str_contains( $panneau(), 'Site en ligne' ) );
Publication::oublier_cache();

// Réglage remis tel qu'il était.
if ( $reglage_avant === null ) {
	delete_option( Reglages::OPTION );
} else {
	update_option( Reglages::OPTION, $reglage_avant, false );
}

/* ------------------------------------------------------------------ */
$section( 'Vraies publications : ON publié, puis OFF publié → site normal' );
$racine  = (string) Apercu::dossier();
$propre  = ! Reglages::actif() && $publie_reel === false && Publication::mode() === 'local' && ! get_option( Publication::VERROU ) && ! Publication::changements();
if ( ! $propre ) {
	echo "  (sautée : il faut partir d'un site local à jour, maintenance désactivée)\n";
} else {
	$publier = static function () use ( $racine ): array {
		$r = Publication::lancer( get_current_user_id() );
		for ( $i = 0; $i < 300 && get_option( Publication::VERROU ); $i++ ) {
			usleep( 500000 );
			wp_cache_flush();
			Publication::synchroniser();
		}
		wp_cache_flush();
		Publication::oublier_cache();
		$j = Publication::memoire()['journal'][0] ?? [];
		return [
			'lancee'      => $r['code'] === 'lancee',
			'succes'      => ( $j['resultat'] ?? '' ) === 'succes',
			'raison'      => (string) ( $j['raison'] ?? '' ),
			'json'        => json_decode( (string) file_get_contents( $racine . '/assets/maintenance.json' ), true ),
			'instantane'  => (bool) ( json_decode( (string) file_get_contents( $racine . '/data/wordpress/contenus.json' ), true )['maintenance']['actif'] ?? null ),
			'accueil'     => (string) file_get_contents( $racine . '/index.html' ),
			'guide'       => (string) file_get_contents( $racine . '/guides/index.html' ),
			'maintenance' => (string) file_get_contents( $racine . '/maintenance.html' ),
		];
	};

	update_option( Reglages::OPTION, array_merge( Reglages::lire(), [ 'actif' => true ] ), false );
	$on = $publier();
	$verifie( 'ON : publication réussie', $on['lancee'] && $on['succes'], $on['raison'] );
	$verifie( 'ON : instantané true, maintenance.json true', $on['instantane'] === true && ( $on['json']['actif'] ?? null ) === true );
	$verifie( 'ON : les pages renvoient vers maintenance.html', str_contains( $on['accueil'], "location.replace('maintenance.html')" ) && str_contains( $on['guide'], "location.replace('../maintenance.html')" ) );
	$verifie( 'ON : Site en maintenance', Reglages::etat_public() === 'en_maintenance' );

	update_option( Reglages::OPTION, array_merge( Reglages::lire(), [ 'actif' => false ] ), false );
	$verifie( 'OFF enregistré : Réactivation à publier', Reglages::etat_public() === 'reactivation_a_publier' );
	$off = $publier();
	$verifie( 'OFF : publication réussie', $off['lancee'] && $off['succes'], $off['raison'] );
	$verifie( 'OFF : instantané false, maintenance.json false', $off['instantane'] === false && ( $off['json']['actif'] ?? null ) === false );
	$verifie( 'OFF : plus aucune page ne renvoie vers la maintenance', ! str_contains( $off['accueil'], 'maintenance.html' ) && ! str_contains( $off['guide'], 'maintenance.html' ) );
	$verifie( 'OFF : maintenance.html renvoie vers l’accueil (visiteur resté dessus)', str_contains( $off['maintenance'], "location.replace('./')" ) );
	$verifie( 'OFF : Site en ligne, rien à publier', Reglages::etat_public() === 'en_ligne' && ! Publication::changements() );
}

// Journal remis tel qu'il était (les deux publications de test n'y restent pas).
if ( $memoire_avant !== null ) {
	update_option( Publication::OPTION, $memoire_avant, false );
}
if ( $reglage_avant !== null ) {
	update_option( Reglages::OPTION, $reglage_avant, false );
}
Publication::oublier_cache();

exit( $bilan() );
