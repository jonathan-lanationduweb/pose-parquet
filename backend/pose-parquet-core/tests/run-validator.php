<?php
/**
 * Tests du validateur, sans base de données.
 *
 *   php tests/run-validator.php <racine WordPress>
 *
 * WordPress est chargé pour ses fonctions (`is_email`, `sanitize_text_field`,
 * `wp_parse_url`) — c'est avec elles que le validateur travaille en production,
 * les remplacer par des doublures testerait autre chose. Aucune écriture,
 * aucune requête SQL : ce script peut tourner sur une base vide.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

require __DIR__ . '/support.php';
pp_test_bootstrap( $argv, 'php tests/run-validator.php <racine WordPress>' );
[ $verifie, $section, $bilan ] = pp_test_outils();

use PoseParquet\Core\Antispam\ClientIdentity;
use PoseParquet\Core\Antispam\FormToken;
use PoseParquet\Core\Antispam\Guard;
use PoseParquet\Core\Antispam\Honeypot;
use PoseParquet\Core\Projects\Fields;
use PoseParquet\Core\Projects\Reference;
use PoseParquet\Core\Projects\Validator;

$valide = static fn( array $r ): array => Validator::validate( $r );
$refuse = static function ( array $r, string $champ ) use ( $valide ): bool {
	$v = $valide( $r );
	return ! $v['ok'] && isset( $v['errors'][ $champ ] );
};
$accepte = static function ( array $r ) use ( $valide ): bool {
	return $valide( $r )['ok'];
};

/* ------------------------------------------------------------------ */
$section( 'Requête valide' );
$v = $valide( pp_requete_metier() );
$verifie( 'requête complète acceptée', $v['ok'], wp_json_encode( $v['errors'] ) );
$verifie( 'surface normalisée en entier', ( $v['data']['surface'] ?? null ) === 32 );
$verifie( 'consentement normalisé en booléen', ( $v['data']['consent'] ?? null ) === true );
$verifie( 'sourceUrl réduite au chemin', ( $v['data']['sourceUrl'] ?? '' ) === '/projet/' );
$verifie( 'aucune clé inattendue en sortie', ! array_diff( array_keys( $v['data'] ), array_keys( Fields::ROOT ) ) );

$minimal = pp_requete_metier( [ 'city' => null, 'style' => null, 'message' => null, 'sourceUrl' => null ] );
$verifie( 'requête minimale (obligatoires seuls) acceptée', $accepte( $minimal ) );
$verifie( 'zone idf sans région acceptée, région déduite', ( $valide( pp_requete_metier( [ 'zone' => 'idf', 'region' => null ] ) )['data']['region'] ?? '' ) === Fields::REGION_IDF_LABEL );
$verifie( 'zone idf avec région fournie : Île-de-France l’emporte', ( $valide( pp_requete_metier( [ 'zone' => 'idf' ] ) )['data']['region'] ?? '' ) === Fields::REGION_IDF_LABEL );
$verifie( 'surface chaîne numérique « 45 » acceptée', ( $valide( pp_requete_metier( [ 'surface' => '45' ] ) )['data']['surface'] ?? null ) === 45 );
$verifie( 'département 2a normalisé en 2A', ( $valide( pp_requete_metier( [ 'department' => '2a' ] ) )['data']['department'] ?? '' ) === '2A' );
$verifie( 'département 974 accepté', $accepte( pp_requete_metier( [ 'department' => '974' ] ) ) );
$verifie( 'domaine de l’email mis en minuscules', ( $valide( pp_requete_metier( [ 'email' => 'Jean@Example.COM' ] ) )['data']['email'] ?? '' ) === 'Jean@example.com' );

/* ------------------------------------------------------------------ */
$section( 'Corps invalide' );
$verifie( 'tableau JSON refusé', ! $valide( [ 1, 2 ] )['ok'] );
$verifie( 'chaîne refusée', ! Validator::validate( 'texte' )['ok'] );
$verifie( 'null refusé', ! Validator::validate( null )['ok'] );

/* ------------------------------------------------------------------ */
$section( 'Champs obligatoires' );
foreach ( Fields::ROOT as $nom => $obligatoire ) {
	if ( ! $obligatoire ) {
		continue;
	}
	$verifie( "$nom absent → erreur sur $nom", $refuse( pp_requete_metier( [ $nom => null ] ), $nom ) );
}
$verifie( 'chaîne vide = absent', $refuse( pp_requete_metier( [ 'firstName' => '   ' ] ), 'firstName' ) );
$verifie( 'zone autre sans région refusée', $refuse( pp_requete_metier( [ 'region' => null ] ), 'region' ) );
$v = $valide( pp_requete_metier( [ 'email' => null, 'phone' => null ] ) );
$verifie( 'plusieurs erreurs remontées ensemble', count( $v['errors'] ) === 2 );
$verifie( 'message d’absence distinct', str_contains( $v['errors']['email'] ?? '', 'absent' ) );

/* ------------------------------------------------------------------ */
$section( 'Types' );
$verifie( 'firstName numérique → type', str_contains( $valide( pp_requete_metier( [ 'firstName' => 12 ] ) )['errors']['firstName'] ?? '', 'Type' ) );
$verifie( 'surface texte → type', str_contains( $valide( pp_requete_metier( [ 'surface' => 'trente' ] ) )['errors']['surface'] ?? '', 'Type' ) );
$verifie( 'surface décimale 32.5 → type', $refuse( pp_requete_metier( [ 'surface' => 32.5 ] ), 'surface' ) );
$verifie( 'consent "oui" → type', str_contains( $valide( pp_requete_metier( [ 'consent' => 'oui' ] ) )['errors']['consent'] ?? '', 'Type' ) );
$verifie( 'housingType tableau → type', str_contains( $valide( pp_requete_metier( [ 'housingType' => [ 'maison' ] ] ) )['errors']['housingType'] ?? '', 'Type' ) );

/* ------------------------------------------------------------------ */
$section( 'Email' );
foreach ( [ 'pas-un-email', 'a@b', 'jean@@example.com', 'jean@exa mple.com', '<b>x</b>@example.com' ] as $mauvais ) {
	$verifie( "email « $mauvais » refusé", $refuse( pp_requete_metier( [ 'email' => $mauvais ] ), 'email' ) );
}
$v = $valide( pp_requete_metier( [ 'email' => 'secret.personne@example.com', 'phone' => 'x' ] ) );
$verifie( 'l’email n’apparaît dans aucun message d’erreur', ! str_contains( wp_json_encode( $v['errors'] ), 'secret.personne' ) );

/* ------------------------------------------------------------------ */
$section( 'Téléphone' );
foreach ( [ '06 12 34 56 78', '0612345678', '06.12.34.56.78', '06-12-34-56-78', '+33 6 12 34 56 78', '+33612345678', '01 23 45 67 89' ] as $bon ) {
	$verifie( "téléphone « $bon » accepté", $accepte( pp_requete_metier( [ 'phone' => $bon ] ) ) );
}
foreach ( [ '12345', 'abcdefghij', '00 12 34 56 78', '06 12 34 56', '06 12 34 56 78 90 12' ] as $mauvais ) {
	$verifie( "téléphone « $mauvais » refusé", $refuse( pp_requete_metier( [ 'phone' => $mauvais ] ), 'phone' ) );
}

/* ------------------------------------------------------------------ */
$section( 'Surface' );
$verifie( 'surface 0 refusée (hors plage)', str_contains( $valide( pp_requete_metier( [ 'surface' => 0 ] ) )['errors']['surface'] ?? '', 'plage' ) );
$verifie( 'surface 2001 refusée', $refuse( pp_requete_metier( [ 'surface' => 2001 ] ), 'surface' ) );
$verifie( 'surface -5 refusée', $refuse( pp_requete_metier( [ 'surface' => -5 ] ), 'surface' ) );
$verifie( 'surface 1 acceptée', $accepte( pp_requete_metier( [ 'surface' => 1 ] ) ) );
$verifie( 'surface 2000 acceptée', $accepte( pp_requete_metier( [ 'surface' => 2000 ] ) ) );

/* ------------------------------------------------------------------ */
$section( 'Listes fermées' );
foreach ( array_keys( Fields::ENUMS ) as $nom ) {
	$verifie( "$nom hors liste refusé", str_contains( $valide( pp_requete_metier( [ $nom => 'valeur-inventee' ] ) )['errors'][ $nom ] ?? '', 'liste' ) );
	foreach ( Fields::enum( $nom ) as $valeur ) {
		$extra = $nom === 'zone' && $valeur === 'idf' ? [ 'region' => null ] : [];
		if ( ! $accepte( pp_requete_metier( [ $nom => $valeur ] + $extra ) ) ) {
			$verifie( "$nom = $valeur accepté", false );
		}
	}
}
$verifie( 'toutes les valeurs de chaque liste acceptées', true );
$verifie( 'casse respectée (Bretagne ≠ bretagne)', $refuse( pp_requete_metier( [ 'region' => 'bretagne' ] ), 'region' ) );

/* ------------------------------------------------------------------ */
$section( 'Consentement' );
$verifie( 'consent false refusé', str_contains( $valide( pp_requete_metier( [ 'consent' => false ] ) )['errors']['consent'] ?? '', 'accepté' ) );
$verifie( 'consent absent refusé', $refuse( pp_requete_metier( [ 'consent' => null ] ), 'consent' ) );
$verifie( 'consent 1 (entier) refusé', $refuse( pp_requete_metier( [ 'consent' => 1 ] ), 'consent' ) );
$verifie( 'consentAt fourni par le client refusé', $refuse( pp_requete_metier( [ 'consentAt' => '2020-01-01 00:00:00' ] ), 'consentAt' ) );

/* ------------------------------------------------------------------ */
$section( 'Champs inconnus et réservés' );
$v = $valide( pp_requete_metier( [ 'couleurPreferee' => 'bleu' ] ) );
$verifie( 'champ inconnu refusé', ( $v['errors']['couleurPreferee'] ?? '' ) === 'Champ inconnu.' );
foreach ( [ 'status' => 'qualified', 'reference' => 'PP-2026-000001', 'createdAt' => '2020-01-01', 'id' => 7, 'created_at' => 'x', 'consent_at' => 'x' ] as $nom => $valeur ) {
	$verifie( "$nom fourni → refusé comme réservé", str_contains( $valide( pp_requete_metier( [ $nom => $valeur ] ) )['errors'][ $nom ] ?? '', 'réservé' ) );
}

/* ------------------------------------------------------------------ */
$section( 'Longueurs et HTML' );
$verifie( 'prénom de 101 caractères refusé', str_contains( $valide( pp_requete_metier( [ 'firstName' => str_repeat( 'a', 101 ) ] ) )['errors']['firstName'] ?? '', 'Longueur' ) );
$verifie( 'prénom de 100 caractères accepté', $accepte( pp_requete_metier( [ 'firstName' => str_repeat( 'a', 100 ) ] ) ) );
$verifie( 'message de 4001 caractères refusé', $refuse( pp_requete_metier( [ 'message' => str_repeat( 'm', 4001 ) ] ), 'message' ) );
$verifie( 'ville de 121 caractères refusée', $refuse( pp_requete_metier( [ 'city' => str_repeat( 'v', 121 ) ] ), 'city' ) );
$verifie( 'utmSource de 101 caractères refusé', $refuse( pp_requete_metier( [ 'utmSource' => str_repeat( 'u', 101 ) ] ), 'utmSource' ) );
$verifie( 'longueur comptée en caractères, pas en octets (100 « é » acceptés)', $accepte( pp_requete_metier( [ 'lastName' => str_repeat( 'é', 100 ) ] ) ) );
$v = $valide( pp_requete_metier( [ 'firstName' => '<script>alert(1)</script>Jean', 'lastName' => 'Du<b>pont</b>' ] ) );
$verifie( 'HTML retiré du prénom', $v['ok'] && ( $v['data']['firstName'] ?? '' ) === 'Jean', $v['data']['firstName'] ?? wp_json_encode( $v['errors'] ) );
$verifie( 'balises retirées du nom', ( $v['data']['lastName'] ?? '' ) === 'Dupont' );
$v = $valide( pp_requete_metier( [ 'message' => "Ligne 1\nLigne 2 <img src=x onerror=alert(1)>" ] ) );
$verifie( 'message : sauts de ligne gardés, balise retirée', $v['ok'] && str_contains( $v['data']['message'], "\n" ) && ! str_contains( $v['data']['message'], '<img' ) );
$v = $valide( pp_requete_metier( [ 'lastName' => "O'Neil; DROP TABLE ppdev_pp_projects; --" ] ) );
$verifie( 'texte « SQL » accepté tel quel (les requêtes sont préparées, pas filtrées)', $v['ok'] && str_contains( $v['data']['lastName'], 'DROP TABLE' ) );
$verifie( 'nom composé avec apostrophe et tiret conservé', ( $valide( pp_requete_metier( [ 'lastName' => "D'Arc-Lefèvre" ] ) )['data']['lastName'] ?? '' ) === "D'Arc-Lefèvre" );

/* ------------------------------------------------------------------ */
$section( 'sourceUrl et UTM' );
$verifie( 'URL absolue réduite à son chemin', ( $valide( pp_requete_metier( [ 'sourceUrl' => 'https://pose-parquet.com/projet/?email=x@y.z#frag' ] ) )['data']['sourceUrl'] ?? '' ) === '/projet/' );
$verifie( 'sourceUrl de 600 caractères refusée', $refuse( pp_requete_metier( [ 'sourceUrl' => '/' . str_repeat( 'p', 600 ) ] ), 'sourceUrl' ) );
$verifie( 'sourceUrl numérique → type', $refuse( pp_requete_metier( [ 'sourceUrl' => 42 ] ), 'sourceUrl' ) );
$verifie( 'utmCampaign nettoyé', ( $valide( pp_requete_metier( [ 'utmCampaign' => ' printemps<b>2026</b> ' ] ) )['data']['utmCampaign'] ?? '' ) === 'printemps2026' );

/* ------------------------------------------------------------------ */
$section( 'Visualiseur' );
$verifie( 'absent : accepté', ! isset( $valide( pp_requete_metier() )['data']['visualizer'] ) );
$vis = [ 'sceneId' => 'sejour', 'productId' => 'chene-naturel-1', 'pattern' => 'baton-rompu', 'orientation' => 45, 'config' => [ 'zoom' => 1.2, 'zones' => [ 1, 2 ] ] ];
$v   = $valide( pp_requete_metier( [ 'visualizer' => $vis ] ) );
$verifie( 'objet complet valide accepté', $v['ok'], wp_json_encode( $v['errors'] ) );
$verifie( 'config conservée telle quelle', ( $v['data']['visualizer']['config'] ?? null ) === $vis['config'] );
$verifie( 'visualizer tableau → type', $refuse( pp_requete_metier( [ 'visualizer' => [ 1 ] ] ), 'visualizer' ) );
$verifie( 'visualizer chaîne → type', $refuse( pp_requete_metier( [ 'visualizer' => 'sejour' ] ), 'visualizer' ) );
$verifie( 'clé inconnue dans visualizer refusée', $refuse( pp_requete_metier( [ 'visualizer' => [ 'foo' => 1 ] ] ), 'visualizer.foo' ) );
$verifie( 'pattern hors liste refusé', $refuse( pp_requete_metier( [ 'visualizer' => [ 'pattern' => 'damier' ] ] ), 'visualizer.pattern' ) );
$verifie( 'orientation 30 refusée', $refuse( pp_requete_metier( [ 'visualizer' => [ 'orientation' => 30 ] ] ), 'visualizer.orientation' ) );
$verifie( 'sceneId avec caractères interdits refusé', $refuse( pp_requete_metier( [ 'visualizer' => [ 'sceneId' => '../etc' ] ] ), 'visualizer.sceneId' ) );
$verifie( 'sceneId de 61 caractères refusé', $refuse( pp_requete_metier( [ 'visualizer' => [ 'sceneId' => str_repeat( 'a', 61 ) ] ] ), 'visualizer.sceneId' ) );
$verifie( 'config non objet refusée', $refuse( pp_requete_metier( [ 'visualizer' => [ 'config' => 'texte' ] ] ), 'visualizer.config' ) );
$verifie( 'config géante (> 4 Ko) refusée', $refuse( pp_requete_metier( [ 'visualizer' => [ 'config' => [ 'blob' => str_repeat( 'x', 5000 ) ] ] ] ), 'visualizer.config' ) );
$verifie( 'config base64 d’image refusée par la taille', $refuse( pp_requete_metier( [ 'visualizer' => [ 'config' => [ 'image' => 'data:image/png;base64,' . base64_encode( random_bytes( 6000 ) ) ] ] ] ), 'visualizer.config' ) );

/* ------------------------------------------------------------------ */
$section( 'Champs techniques (retirés avant le validateur)' );
$verifie( 'formToken et website sont les deux champs techniques', Guard::TECHNICAL_FIELDS === [ 'formToken', 'website' ] );
$verifie( 'aucun champ technique dans le contrat métier', ! array_intersect( Guard::TECHNICAL_FIELDS, array_keys( Fields::ROOT ) ) );
$verifie( 'aucun champ technique dans les colonnes', ! array_intersect( Guard::TECHNICAL_FIELDS, array_keys( Fields::COLUMNS ) ) );
// Le validateur ne les connaît pas : c'est SubmissionService qui les enlève avant de l'appeler.
$verifie( 'formToken vu par le validateur seul → champ inconnu', $refuse( pp_requete_metier( [ 'formToken' => 'x' ] ), 'formToken' ) );
$verifie( 'website vu par le validateur seul → champ inconnu', $refuse( pp_requete_metier( [ 'website' => 'x' ] ), 'website' ) );

/* ------------------------------------------------------------------ */
$section( 'Pot de miel (table de vérité)' );
$verifie( 'nom du champ documenté = website', Honeypot::FIELD === 'website' );
$verifie( 'champ absent : pas de déclenchement', ! Honeypot::is_triggered( [] ) );
$verifie( 'chaîne vide, espaces, null, false : pas de déclenchement', ! Honeypot::is_triggered( [ 'website' => '' ] ) && ! Honeypot::is_triggered( [ 'website' => '   ' ] ) && ! Honeypot::is_triggered( [ 'website' => null ] ) && ! Honeypot::is_triggered( [ 'website' => false ] ) );
$verifie( 'texte, URL, 0, tableau : déclenchement', Honeypot::is_triggered( [ 'website' => 'x' ] ) && Honeypot::is_triggered( [ 'website' => 'http://spam.example' ] ) && Honeypot::is_triggered( [ 'website' => 0 ] ) && Honeypot::is_triggered( [ 'website' => [ 'a' ] ] ) );

/* ------------------------------------------------------------------ */
$section( 'Jeton temporel (fonctions pures)' );
$verifie( 'forme v1.<date>.<nonce>.<signature>', (bool) preg_match( '/^v1\.\d{10}\.[0-9a-f]{16}\.[0-9a-f]{64}$/', FormToken::issue() ) );
$verifie( 'aller-retour : jeton de 10 s valide', FormToken::verify( FormToken::issue( time() - 10 ) ) === '' );
$verifie( 'âge minimum 2 s et validité 7200 s, centralisés dans FormToken', FormToken::MIN_AGE === 2 && FormToken::MAX_AGE === 7200 );
$verifie( 'trop jeune, expiré, signature fausse, absent : chacun son code', FormToken::verify( FormToken::issue() ) === FormToken::EARLY
	&& FormToken::verify( FormToken::issue( time() - 7201 ) ) === FormToken::EXPIRED
	&& FormToken::verify( FormToken::issue( time() - 10 ) . 'a' ) === FormToken::INVALID
	&& FormToken::verify( null ) === FormToken::MISSING );
$verifie( 'le jeton ne contient pas le secret', ! str_contains( FormToken::issue(), wp_salt( 'nonce' ) ) );
$verifie( 'deux jetons du même instant diffèrent (nonce aléatoire)', FormToken::issue( 1000 ) !== FormToken::issue( 1000 ) );

/* ------------------------------------------------------------------ */
$section( 'Identité réseau (fonction pure)' );
$verifie( 'condensat de 32 hexadécimaux', (bool) preg_match( '/^[a-f0-9]{32}$/', ClientIdentity::hash( '203.0.113.5' ) ) );
$verifie( 'stable pour une même adresse', ClientIdentity::hash( '203.0.113.5' ) === ClientIdentity::hash( ' 203.0.113.5 ' ) );
$verifie( 'différent d’une adresse à l’autre', ClientIdentity::hash( '203.0.113.5' ) !== ClientIdentity::hash( '203.0.113.6' ) );
$verifie( 'non réversible : l’adresse n’y apparaît pas', ! str_contains( ClientIdentity::hash( '203.0.113.5' ), '203' ) );

/* ------------------------------------------------------------------ */
$section( 'Référence' );
$verifie( 'id 123 en 2026 → PP-2026-000123', Reference::build( 123, 2026 ) === 'PP-2026-000123' );
$verifie( 'id 1 → PP-2026-000001', Reference::build( 1, 2026 ) === 'PP-2026-000001' );
$verifie( 'id 1234567 → sept chiffres, pas de troncature', Reference::build( 1234567, 2026 ) === 'PP-2026-1234567' );
$verifie( 'forme reconnue', Reference::is_valid( 'PP-2026-000123' ) && ! Reference::is_valid( 'PP-26-1' ) );

exit( $bilan() );
