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
/*
 * `region` est une sortie sans etre une entree.
 *
 * Elle n'est plus un champ recevable — le contrat l'a retiree — mais le
 * validateur la CALCULE depuis le departement et la place dans `data`, d'ou
 * elle part en base. C'est la seule cle de sortie qui ne corresponde pas a
 * une cle d'entree, et la nommer ici evite qu'une vraie cle inattendue passe
 * inapercue derriere un `array_diff` trop large.
 */
$sorties_attendues = array_merge( array_keys( Fields::ROOT ), [ 'region' ] );
$verifie( 'aucune clé inattendue en sortie', ! array_diff( array_keys( $v['data'] ), $sorties_attendues ), implode( ', ', array_diff( array_keys( $v['data'] ), $sorties_attendues ) ) );

$minimal = pp_requete_metier( [ 'city' => null, 'style' => null, 'message' => null, 'sourceUrl' => null ] );
$verifie( 'requête minimale (obligatoires seuls) acceptée', $accepte( $minimal ) );
/*
 * La region se deduit du departement, et ne s'envoie plus.
 *
 * Le contrat acceptait `zone` et `region` en plus du departement : trois
 * champs pour un fait, et `department=35` avec `region=Île-de-France` etait
 * une charge parfaitement recevable. Les deux ont disparu de la saisie comme
 * du contrat.
 */
$verifie( 'région déduite du département', ( $valide( pp_requete_metier( [ 'department' => '75' ] ) )['data']['region'] ?? '' ) === Fields::REGION_IDF_LABEL );
$verifie( 'région déduite hors IDF', ( $valide( pp_requete_metier( [ 'department' => '69' ] ) )['data']['region'] ?? '' ) === 'Auvergne-Rhône-Alpes' );
$verifie( 'une région envoyée est refusée', $refuse( pp_requete_metier( [ 'region' => 'Bretagne' ] ), 'region' ) );
$verifie( 'une zone envoyée est refusée', $refuse( pp_requete_metier( [ 'zone' => 'idf' ] ), 'zone' ) );

/*
 * LA CONTRADICTION, ET CE QU'IL EN RESTE.
 *
 * Une charge fabriquee qui annonce `department=35` et `region=Île-de-France`
 * est REFUSEE — la region n'est plus un champ. Et si l'on ne garde que le
 * departement, la region deduite est celle du departement, jamais celle qu'on
 * aurait voulu lui faire dire.
 */
$contradiction = $valide( pp_requete_metier( [ 'department' => '35', 'region' => Fields::REGION_IDF_LABEL ] ) );
$verifie( 'department=35 + region=Île-de-France : refusé', ! $contradiction['ok'] && isset( $contradiction['errors']['region'] ) );
$verifie( 'department=35 seul : région = Bretagne', ( $valide( pp_requete_metier( [ 'department' => '35' ] ) )['data']['region'] ?? '' ) === 'Bretagne' );
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
$verifie( 'département absent → erreur', $refuse( pp_requete_metier( [ 'department' => null ] ), 'department' ) );
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
		if ( ! $accepte( pp_requete_metier( [ $nom => $valeur ] ) ) ) {
			$verifie( "$nom = $valeur accepté", false );
		}
	}
}
$verifie( 'toutes les valeurs de chaque liste acceptées', true );
$verifie( 'casse du département : « 2a » normalisé, pas refusé', ( $valide( pp_requete_metier( [ 'department' => '2a' ] ) )['data']['department'] ?? '' ) === '2A' );

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
$section( 'Qualification commerciale' );

$verifie( 'origine acceptée', $accepte( pp_requete_metier( [ 'leadSource' => 'motif' ] ) ) );
/*
 * Les six besoins, un par un.
 *
 * Le vocabulaire s'est enrichi quand le perimetre d'Allure Design a ete
 * etabli : `projet` a laisse la place a `pose`, `produit-pose` et
 * `renovation`. Les verifier un par un plutot qu'en echantillon, parce
 * qu'une valeur oubliee dans la liste du serveur donne un 422 sur une
 * reponse parfaitement legitime du formulaire — cote visiteur ca ressemble
 * a une panne.
 */
foreach ( [ 'produit', 'pose', 'produit-pose', 'renovation', 'renseignement', 'indetermine' ] as $pp_b ) {
	$verifie( "besoin « {$pp_b} » accepté", $accepte( pp_requete_metier( [ 'leadNeed' => $pp_b ] ) ) );
}
$verifie( '« projet » n’est plus un besoin', $refuse( pp_requete_metier( [ 'leadNeed' => 'projet' ] ), 'leadNeed' ) );
$verifie( 'destination acceptée', $accepte( pp_requete_metier( [ 'leadDestination' => 'premibel' ] ) ) );

/*
 * Les trois listes sont fermées cote serveur aussi.
 *
 * Le front les respecte, mais le front n'est pas le juge : une charge
 * fabriquee a la main pourrait sinon inscrire n'importe quel mot dans la
 * colonne sur laquelle l'administration filtre, et le filtre ne le
 * retrouverait plus jamais.
 */
$verifie( 'origine inventée refusée', $refuse( pp_requete_metier( [ 'leadSource' => 'depuis-la-lune' ] ), 'leadSource' ) );
$verifie( 'besoin inventé refusé', $refuse( pp_requete_metier( [ 'leadNeed' => 'jacuzzi' ] ), 'leadNeed' ) );
$verifie( 'destination inventée refusée', $refuse( pp_requete_metier( [ 'leadDestination' => 'concurrent' ] ), 'leadDestination' ) );

/*
 * La page d'entree subit le meme traitement que sourceUrl : reduite a son
 * chemin. Une requete conservee ferait entrer en base les parametres d'une
 * page d'arrivee, donc potentiellement un jeton ou une adresse glissee dans
 * un lien de campagne.
 */
$verifie(
	'page d’entrée réduite à son chemin',
	( $valide( pp_requete_metier( [ 'entryPage' => 'https://pose-parquet.com/guides/x.html?token=secret#h' ] ) )['data']['entryPage'] ?? '' ) === '/guides/x.html'
);
$verifie( 'page d’entrée de 600 caractères refusée', $refuse( pp_requete_metier( [ 'entryPage' => '/' . str_repeat( 'p', 600 ) ] ), 'entryPage' ) );
$verifie( 'page d’entrée numérique → type', $refuse( pp_requete_metier( [ 'entryPage' => 42 ] ), 'entryPage' ) );

$verifie( 'utmContent nettoyé', ( $valide( pp_requete_metier( [ 'utmContent' => ' variante<b>b</b> ' ] ) )['data']['utmContent'] ?? '' ) === 'varianteb' );
$verifie( 'utmTerm accepté', ( $valide( pp_requete_metier( [ 'utmTerm' => 'parquet chêne' ] ) )['data']['utmTerm'] ?? '' ) === 'parquet chêne' );
$verifie( 'utmTerm de 200 caractères refusé', $refuse( pp_requete_metier( [ 'utmTerm' => str_repeat( 'x', 200 ) ] ), 'utmTerm' ) );

/* Aucun de ces champs n'est obligatoire : une demande sans eux passe. */
$verifie( 'qualification absente : demande valide', $accepte( pp_requete_metier() ) );
$verifie( 'aucune valeur par défaut inventée', ! isset( $valide( pp_requete_metier() )['data']['leadDestination'] ) );

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
$section( 'Visualiseur : libellés d’affichage (instantané)' );

/*
 * Les libellés vivent dans `config`, pas dans une colonne : ce sont des noms
 * lisibles, pas des identifiants, et le serveur ne les interprète pas. Il les
 * borne, les nettoie, et l’administration les échappe à l’affichage.
 */
$avec_libelles = [
	'sceneId'     => 'sejour',
	'productId'   => 'chene-fume',
	'pattern'     => 'point-de-hongrie',
	'orientation' => 90,
	'config'      => [
		'origine'  => 'studio',
		'scene'    => 'sejour',
		'nomScene' => 'Séjour et salle à manger',
		'produit'  => 'chene-fume',
		'nom'      => 'Chêne Fumé',
		'motif'    => 'point-de-hongrie',
		'angle'    => 90,
	],
];
$v = $valide( pp_requete_metier( [ 'visualizer' => $avec_libelles ] ) );
$verifie( 'objet avec libellés accepté', $v['ok'], wp_json_encode( $v['errors'] ) );
$verifie(
	'libellé de scène conservé',
	( $v['data']['visualizer']['config']['nomScene'] ?? '' ) === 'Séjour et salle à manger'
);
$verifie(
	'libellé de produit conservé',
	( $v['data']['visualizer']['config']['nom'] ?? '' ) === 'Chêne Fumé'
);
$verifie(
	'les identifiants restent dans leurs colonnes',
	( $v['data']['visualizer']['sceneId'] ?? '' ) === 'sejour'
		&& ( $v['data']['visualizer']['productId'] ?? '' ) === 'chene-fume'
);
$verifie(
	'un accent survit au nettoyage',
	mb_strpos( (string) wp_json_encode( $v['data']['visualizer']['config'] ), 'Chêne' ) !== false
		|| mb_strpos( (string) ( $v['data']['visualizer']['config']['nom'] ?? '' ), 'ê' ) !== false
);

$taille = strlen( (string) wp_json_encode( $v['data']['visualizer']['config'] ) );
$verifie( 'config avec libellés bien en dessous de 4 Ko (' . $taille . ' octets)', $taille < 1024, (string) $taille );

/* ------------------------------------------------------------------ */
$section( 'Visualiseur : libellés hostiles' );

$hostile = static function ( string $valeur ): array {
	return [ 'visualizer' => [ 'sceneId' => 'sejour', 'config' => [ 'nomScene' => $valeur ] ] ];
};

$cas_xss = [
	'balise script'      => '<script>alert(1)</script>Séjour',
	'img onerror'        => '<img src=x onerror=alert(1)>',
	'balise ouverte'     => 'Séjour <b>gras',
	'iframe'             => '<iframe src="//mal.example"></iframe>',
	'javascript: en URL' => '<a href="javascript:alert(1)">Séjour</a>',
	'guillemets'         => 'Séjour" onmouseover="alert(1)',
];
foreach ( $cas_xss as $nom => $charge ) {
	$r = $valide( pp_requete_metier( $hostile( $charge ) ) );
	$stocke = (string) ( $r['data']['visualizer']['config']['nomScene'] ?? '' );
	$verifie(
		'accepté puis nettoyé : ' . $nom,
		$r['ok'] && stripos( $stocke, '<script' ) === false && stripos( $stocke, '<img' ) === false
			&& stripos( $stocke, '<iframe' ) === false && stripos( $stocke, '<a ' ) === false,
		$stocke
	);
	$verifie(
		'plus aucune balise : ' . $nom,
		strip_tags( $stocke ) === $stocke,
		$stocke
	);
}

/*
 * `onerror=` sans balise autour reste du texte, et c’est normal : ce n’est
 * dangereux qu’en attribut. Ce qu’on exige, c’est qu’aucune balise ne
 * subsiste — le gabarit échappe ensuite ce texte avec esc_html().
 */
$r = $valide( pp_requete_metier( $hostile( '<img src=x onerror=alert(1)>' ) ) );
$verifie(
	'aucun chevron ne survit',
	strpos( (string) ( $r['data']['visualizer']['config']['nomScene'] ?? '' ), '<' ) === false
);

/* Une clé hostile est nettoyée elle aussi : une clé finit dans une page. */
$r = $valide( pp_requete_metier( [ 'visualizer' => [ 'sceneId' => 'sejour', 'config' => [ '<script>x</script>zoom' => 2 ] ] ] ) );
$cles = array_keys( (array) ( $r['data']['visualizer']['config'] ?? [] ) );
$verifie(
	'clé hostile nettoyée',
	$r['ok'] && ! in_array( '<script>x</script>zoom', $cles, true ),
	implode( ',', array_map( 'strval', $cles ) )
);

/* ------------------------------------------------------------------ */
$section( 'Visualiseur : bornes du carnet' );
$verifie(
	'libellé de 121 caractères refusé',
	$refuse( pp_requete_metier( [ 'visualizer' => [ 'config' => [ 'nom' => str_repeat( 'a', 121 ) ] ] ] ), 'visualizer.config' )
);
$verifie(
	'libellé de 120 caractères accepté',
	$valide( pp_requete_metier( [ 'visualizer' => [ 'config' => [ 'nom' => str_repeat( 'a', 120 ) ] ] ] ) )['ok']
);
$verifie(
	'nom de champ trop long refusé',
	$refuse( pp_requete_metier( [ 'visualizer' => [ 'config' => [ str_repeat( 'k', 121 ) => 'x' ] ] ] ), 'visualizer.config' )
);
$verifie(
	'carnet trop imbriqué refusé',
	$refuse( pp_requete_metier( [ 'visualizer' => [ 'config' => [ 'a' => [ 'b' => [ 'c' => [ 'd' => 1 ] ] ] ] ] ] ), 'visualizer.config' )
);
$verifie(
	'trois niveaux acceptés',
	$valide( pp_requete_metier( [ 'visualizer' => [ 'config' => [ 'a' => [ 'b' => [ 'c' => 1 ] ] ] ] ] ) )['ok']
);

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

// Usage unique : le nonce, jusqu'ici décoratif, est désormais consommé.
$j = FormToken::issue( time() - 10 );
$verifie( 'consume() : vrai la première fois, faux la seconde', FormToken::consume( $j ) === true && FormToken::consume( $j ) === false );
$verifie( 'is_consumed() reflète la réservation', FormToken::is_consumed( $j ) );
$verifie( 'un jeton voisin reste libre', ! FormToken::is_consumed( FormToken::issue( time() - 10 ) ) );
FormToken::release( $j );
$verifie( 'release() rouvre le jeton', ! FormToken::is_consumed( $j ) && FormToken::consume( $j ) === true );
$verifie( 'consume() refuse ce qui n’est pas un jeton', ! FormToken::consume( null ) && ! FormToken::consume( '' ) && ! FormToken::consume( 'v1.abc.def.ghi' ) && ! FormToken::consume( [ 'a' ] ) );
$verifie( 'consume() refuse un jeton expiré (plus rien à réserver)', ! FormToken::consume( FormToken::issue( time() - 7300 ) ) );
$verifie( 'la vérification de signature reste indépendante de la réservation', FormToken::verify( $j ) === '' );
FormToken::release( $j );

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
