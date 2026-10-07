<?php
/**
 * Suite « contenus éditoriaux et maintenance » (06/10/2026).
 *
 *   php tests/run-contenus.php <racine WordPress>
 *
 * Ne crée rien de durable : les contenus de test sont supprimés à la fin, la
 * maintenance est remise dans l'état trouvé.
 */

declare(strict_types=1);

require __DIR__ . '/support.php';
pp_test_bootstrap( $argv, 'php tests/run-contenus.php <racine WordPress>' );
[ $verifie, $section, $bilan ] = pp_test_outils();

use PoseParquet\Core\Contenus\Champs;
use PoseParquet\Core\Contenus\Export;
use PoseParquet\Core\Contenus\Html;
use PoseParquet\Core\Contenus\Images;
use PoseParquet\Core\Contenus\Structure;
use PoseParquet\Core\Contenus\Types;
use PoseParquet\Core\Maintenance\Page;
use PoseParquet\Core\Maintenance\Reglages;
use PoseParquet\Core\Security\Capabilities;
use PoseParquet\Core\Security\Roles;

$admins = get_users( [ 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ] );
wp_set_current_user( (int) $admins[0] );

/* ------------------------------------------------------------------ */
$section( 'Types et droits' );
foreach ( Types::all() as $type ) {
	$o = get_post_type_object( $type );
	$verifie( "$type déclaré, sans page publique", $o !== null && ! $o->public && ! $o->publicly_queryable && $o->rewrite === false );
	$verifie( "$type : éditeur classique (pas de blocs)", ! use_block_editor_for_post_type( $type ) );
}
$verifie( 'pages du site : création interdite (seuls leurs textes se modifient)', get_post_type_object( Types::PAGE )->cap->create_posts === 'do_not_allow' );
$admin = get_role( 'administrator' );
$verifie( 'l’administrateur a tous les droits des contenus', array_reduce( Capabilities::CONTENTS, static fn( bool $ok, string $c ): bool => $ok && $admin->has_cap( $c ), true ) );
foreach ( [ 'editor', 'author', 'contributor', 'subscriber', Roles::MANAGER ] as $role ) {
	$r = get_role( $role );
	$verifie( "rôle « $role » : aucun droit sur les contenus", ! $r || ! $r->has_cap( Capabilities::EDIT_CONTENTS ) );
}

/* ------------------------------------------------------------------ */
$section( 'Menu (ordre de la maquette)' );
global $submenu, $menu;
$submenu = [];
$menu    = [];
\PoseParquet\Core\Admin\Menu::add_pages(); // hors contexte admin, les crochets du menu ne sont pas posés : on construit directement.
$libelles = array_map( static fn( array $e ): string => wp_strip_all_tags( $e[0] ), $submenu['pose-parquet-tableau'] ?? [] );
$verifie( 'Tableau de bord, Guides, Tutoriels, Inspirations, Pages, Images, Projets, Catalogue, Maintenance, Réglages', $libelles === [ 'Tableau de bord', 'Guides', 'Tutoriels', 'Inspirations', 'Pages', 'Images', 'Projets', 'Catalogue Premibel', 'Publication', 'Mon site', 'Maintenance', 'Réglages' ], implode( ', ', $libelles ) );
$verifie( 'Projets garde son adresse (page=pose-parquet)', in_array( 'pose-parquet', array_column( $submenu['pose-parquet-tableau'] ?? [], 2 ), true ) );
$verifie( 'État : page cachée sans parent (pas de remove_submenu_page, pas de 403)', ! in_array( 'pose-parquet-status', array_column( $submenu['pose-parquet-tableau'] ?? [], 2 ), true ) );
\PoseParquet\Core\Admin\Menu::ordonner();
$libelles = array_map( static fn( array $e ): string => trim( wp_strip_all_tags( $e[0] ) ), $submenu['pose-parquet-tableau'] ?? [] );
$attendu  = [ 'Tableau de bord', 'Contenu', 'Guides', 'Tutoriels', 'Inspirations', 'Pages', 'Images', 'Activité', 'Projets', 'Produits', 'Catalogue Premibel', 'Site', 'Publication', 'Mon site', 'Maintenance', 'Réglages' ];
$verifie( 'socle : rubriques Contenu / Activité / Produits / Site, comme Expert Parquet', $libelles === $attendu, implode( ', ', $libelles ) );
$verifie( 'socle : une rubrique n’est pas un lien (capability read, adresse vide)', ( $submenu['pose-parquet-tableau'][1][3] ?? null ) === '' && str_contains( (string) $submenu['pose-parquet-tableau'][1][0], 'adm-menu-section' ) );

/* ------------------------------------------------------------------ */
$section( 'Socle commun' );
$marque = \PoseParquet\Core\Admin\Socle::marque();
$verifie( 'marque : nom, logotype présent, accent sauge de la DA', $marque['nom'] === 'Pose Parquet' && is_file( POSE_PARQUET_DIR . '/assets/socle/logo-on-dark.png' ) && $marque['accent'] === '#46594A' );
$verifie( 'feuilles du socle présentes', is_file( POSE_PARQUET_DIR . '/assets/socle/admin-shell.css' ) && is_file( POSE_PARQUET_DIR . '/assets/socle/admin-composants.css' ) );
$verifie( 'badge échappé', \PoseParquet\Core\Admin\Socle::badge( '<b>x</b>', 'ok' ) === '<span class="adm-badge adm-badge--ok">&lt;b&gt;x&lt;/b&gt;</span>' );
ob_start();
\PoseParquet\Core\Maintenance\Reglages::panneau( true );
$panneau = (string) ob_get_clean();
$verifie( 'panneau maintenance : interrupteur confirmé, jeton, action dédiée', str_contains( $panneau, 'data-adm-confirmer' ) && str_contains( $panneau, 'value="pp_maintenance_basculer"' ) && str_contains( $panneau, '_wpnonce' ) );
\PoseParquet\Core\Maintenance\Reglages::register();
\PoseParquet\Core\Catalogue\Ecran::register();
$verifie( 'bascule : action admin-post dédiée déclarée', has_action( 'admin_post_pp_maintenance_basculer' ) !== false );
$verifie( 'catalogue : écran de consultation déclaré, action de relecture seulement', has_action( 'admin_post_pp_catalogue_actualiser' ) !== false && ! has_action( 'admin_post_pp_catalogue_modifier' ) );

/* ------------------------------------------------------------------ */
$section( 'Images dans l’éditeur' );
$init = \PoseParquet\Core\Contenus\Edition::base_des_images( [ 'x' => 1 ], 'excerpt' );
$verifie( 'autre éditeur : réglages inchangés', $init === [ 'x' => 1 ] );
require_once ABSPATH . 'wp-admin/includes/class-wp-screen.php';
require_once ABSPATH . 'wp-admin/includes/screen.php';
set_current_screen( 'edit-' . Types::GUIDE );
$init = \PoseParquet\Core\Contenus\Edition::base_des_images( [], 'content' );
$verifie( 'guide : base = fichiers du site (dossier local ou site public) + guides/, adresses jamais converties', ( $init['document_base_url'] ?? '' ) === \PoseParquet\Core\Contenus\Apercu::base() . 'guides/' && $init['convert_urls'] === false );
$verifie( 'dossier local réglé : la base est la route WordPress, pas le port 5180', ! \PoseParquet\Core\Contenus\Apercu::dossier() || ( str_starts_with( \PoseParquet\Core\Contenus\Apercu::base(), rest_url() ) && ! str_contains( \PoseParquet\Core\Contenus\Apercu::base(), ':5180' ) ) );
$medias = [];
$sortie = \PoseParquet\Core\Contenus\Html::medias( '<p><img src="../assets/images/guide-x.jpg" alt=""></p>', $medias );
$verifie( 'illustration importée : chemin conservé, aucune copie', $sortie === '<p><img src="../assets/images/guide-x.jpg" alt=""></p>' && $medias === [] );
$piece = (int) ( get_posts( [ 'post_type' => 'attachment', 'post_mime_type' => 'image', 'numberposts' => 1, 'fields' => 'ids' ] )[0] ?? 0 );
if ( $piece ) {
	$medias = [];
	$sortie = \PoseParquet\Core\Contenus\Html::medias( '<img src="' . esc_url( (string) wp_get_attachment_url( $piece ) ) . '" alt="">', $medias );
	$verifie( 'image de la médiathèque : réécrite en ../assets/images/wp-<id>.jpg et listée pour le pull', $sortie === '<img src="../assets/images/wp-' . $piece . '.jpg" alt="">' && isset( $medias[ $piece ] ) );
}

/* ------------------------------------------------------------------ */
$section( 'Champs : nettoyage' );
$verifie( 'texte : balises retirées', Champs::nettoyer( [ 'type' => 'text', 'max' => 50 ], '<b>Titre</b><script>x</script>' ) === 'Titre' );
$verifie( 'texte : borné', mb_strlen( Champs::nettoyer( [ 'type' => 'text', 'max' => 10 ], str_repeat( 'é', 30 ) ) ) === 10 );
$verifie( 'liste fermée : valeur inconnue refusée', Champs::nettoyer( [ 'type' => 'select', 'options' => Champs::PIECES ], 'garage' ) === '' );
$verifie( 'slug : normalisé', Champs::nettoyer( [ 'type' => 'slug', 'max' => 60 ], 'Chêne Naturel !' ) === 'chene-naturel' );
$verifie( 'json : rejeté s’il est invalide', Champs::nettoyer( [ 'type' => 'json' ], '{pas du json' ) === '' );

/* ------------------------------------------------------------------ */
$section( 'HTML transmis au site : liste fermée' );
$sale = '<p style="color:red" class="callout inventee" onclick="x()">Texte</p><script>alert(1)</script><aside class="callout callout--warning"><p>ok</p></aside><iframe src="x"></iframe><a href="javascript:alert(1)">lien</a><input type="text" name="x">';
$propre = Html::filtrer( $sale );
$verifie( 'style, onclick, script, iframe retirés', ! preg_match( '/style=|onclick|<script|<iframe/', $propre ), $propre );
$verifie( 'classe inventée retirée, classe du site gardée', str_contains( $propre, 'class="callout"' ) && ! str_contains( $propre, 'inventee' ) );
$verifie( 'composant encadré conservé', str_contains( $propre, '<aside class="callout callout--warning">' ) );
$verifie( 'lien javascript: neutralisé', ! str_contains( $propre, 'javascript:' ) );
$verifie( 'champ de saisie hors comparateur retiré', ! str_contains( $propre, '<input' ) );

/* ------------------------------------------------------------------ */
$section( 'Cycle d’un guide : brouillon, publication, image, export' );
$cat = wp_insert_term( 'Catégorie de test ' . wp_generate_password( 6, false ), Types::CAT_GUIDE );
$id  = wp_insert_post( wp_slash( [ 'post_type' => Types::GUIDE, 'post_title' => 'Guide de test', 'post_name' => 'guide-de-test-suite', 'post_status' => 'draft', 'post_content' => '<p>Corps</p>', 'post_excerpt' => 'Résumé' ] ), true );
$verifie( 'brouillon créé', is_int( $id ) && $id > 0 );
update_post_meta( $id, Champs::META_TITLE, 'Guide de test | Pose Parquet' );
wp_set_object_terms( $id, [ (int) $cat['term_id'] ], Types::CAT_GUIDE );
$export = Export::donnees();
$verifie( 'un brouillon n’est jamais exporté', ! in_array( 'guide-de-test-suite', array_column( $export['guides'], 'slug' ), true ) );
$verifie( 'sans image : « manquante »', Images::etat( get_post( $id ) ) === Images::MANQUANTE );
wp_update_post( [ 'ID' => $id, 'post_status' => 'publish' ] );
$export = Export::donnees();
$g      = array_values( array_filter( $export['guides'], static fn( array $x ): bool => $x['slug'] === 'guide-de-test-suite' ) )[0] ?? null;
$verifie( 'publié : exporté avec titre SEO, catégorie, résumé', $g && $g['titre'] === 'Guide de test | Pose Parquet' && str_starts_with( $g['categorie'], 'Catégorie de test' ) && $g['resume'] === 'Résumé' );
$verifie( 'corps modifié dans WordPress : mis en paragraphes et filtré', $g && str_contains( $g['corps'], '<p>Corps</p>' ) && $g['corpsIntact'] === false );
$verifie( 'image absente exportée comme null', $g && $g['image'] === null );
update_post_meta( $id, '_thumbnail_id', 99999999 );
$verifie( 'image supprimée de la médiathèque : « introuvable »', Images::etat( get_post( $id ) ) === Images::FICHIER_ABSENT );
$cles = [];
array_walk_recursive( $export, static function ( $v, $k ) use ( &$cles ) { $cles[] = (string) $k; } );
$verifie( 'export : aucune donnée personnelle ni identifiant d’auteur', ! array_intersect( $cles, [ 'email', 'phone', 'first_name', 'last_name', 'post_author', 'author' ] ) );
wp_delete_post( $id, true );
wp_delete_term( (int) $cat['term_id'], Types::CAT_GUIDE );

/* ------------------------------------------------------------------ */
$section( 'Maintenance' );
$avant = get_option( Reglages::OPTION, null );
update_option( Reglages::OPTION, [ 'actif' => true, 'titre' => 'T', 'message' => 'M', 'image' => 0, 'premibel' => true, 'allure' => false ] );
$verifie( 'activée : lue comme active', Reglages::actif() );
$verifie( 'export : état et liens', Reglages::pour_export()['actif'] === true && Reglages::pour_export()['liens'] === [ 'premibel' => true, 'allure' => false ] );
$verifie( 'un administrateur voit le vrai site', Page::peut_contourner() );
wp_set_current_user( 0 );
$verifie( 'un visiteur ne le voit pas', ! Page::peut_contourner() );
wp_set_current_user( (int) $admins[0] );
$verifie( 'interception sur template_redirect seulement (pas wp-admin, wp-login, REST, cron)', has_action( 'template_redirect', [ Page::class, 'intercepter' ] ) !== false );
ob_start();
Page::afficher( Reglages::lire(), false );
$html = (string) ob_get_clean();
$verifie( 'page : titre, message, un seul lien (Premibel), noindex', str_contains( $html, '<h1 class="pm__titre">T</h1>' ) && str_contains( $html, 'Découvrir Premibel' ) && ! str_contains( $html, 'Découvrir Allure' ) && str_contains( $html, 'noindex' ) );
$verifie( 'page : ni compte à rebours, ni formulaire, ni script', ! preg_match( '/<form|<script|countdown/i', $html ) );
if ( $avant === null ) {
	delete_option( Reglages::OPTION );
} else {
	update_option( Reglages::OPTION, $avant );
}

/* ------------------------------------------------------------------ */
$section( 'Champs structurés (pages, Mon site)' );
$schema = Structure::schema( [
	[ 'cle' => 'titre', 'groupe' => 'G', 'libelle' => 'Titre', 'type' => 'texte', 'max' => 10, 'defaut' => 'Défaut' ],
	[ 'cle' => 'texte', 'groupe' => 'G', 'libelle' => 'Texte', 'type' => 'riche', 'max' => 100, 'defaut' => '' ],
	[ 'cle' => 'url', 'groupe' => 'G', 'libelle' => 'Lien', 'type' => 'url', 'max' => 200, 'defaut' => 'https://exemple.test/' ],
	[ 'cle' => 'mail', 'groupe' => 'G', 'libelle' => 'Email', 'type' => 'email', 'max' => 100, 'defaut' => 'a@b.fr' ],
	[ 'cle' => 'oui', 'groupe' => 'G', 'libelle' => 'Afficher', 'type' => 'oui-non', 'defaut' => true ],
	[ 'cle' => 'x', 'type' => 'html' ],
	[ 'cle' => '<b>', 'type' => 'texte' ],
] );
$verifie( 'schéma : type inconnu et clé invalide écartés', count( $schema ) === 5 );
[ $v, $refus ] = Structure::nettoyer( $schema, [ 'titre' => '<b>Un titre bien trop long</b>', 'texte' => '**gras** <script>x</script><a href="x">y</a>', 'url' => 'javascript:alert(1)', 'mail' => 'pas-un-email', 'oui' => '0', 'intrus' => 'z' ], Structure::defauts( $schema ) );
$verifie( 'texte : balises retirées, borné', $v['titre'] === 'Un titre b' );
$verifie( 'riche : marques gardées, aucune balise', $v['texte'] === '**gras** y' || ( ! str_contains( $v['texte'], '<' ) && str_contains( $v['texte'], '**gras**' ) ), $v['texte'] );
$verifie( 'url javascript: refusée, ancienne valeur gardée', $v['url'] === 'https://exemple.test/' && count( $refus ) === 2 );
$verifie( 'email invalide refusé', $v['mail'] === 'a@b.fr' );
$verifie( 'oui-non', $v['oui'] === false );
$verifie( 'clé hors schéma ignorée', ! array_key_exists( 'intrus', $v ) );

$accueil = get_posts( [ 'post_type' => Types::PAGE, 'meta_key' => '_pp_cle', 'meta_value' => 'accueil', 'fields' => 'ids', 'posts_per_page' => 1 ] ); // phpcs:ignore
$a_propos = get_posts( [ 'post_type' => Types::PAGE, 'meta_key' => '_pp_cle', 'meta_value' => 'a-propos', 'fields' => 'ids', 'posts_per_page' => 1 ] ); // phpcs:ignore
$verifie( 'accueil : 21 champs importés (hero, passerelle, projet)', $accueil && count( Export::schema_page( get_post( (int) $accueil[0] ) ) ) === 21 );
$verifie( 'À propos : champs structurés, plus de corps libre', $a_propos && count( Export::schema_page( get_post( (int) $a_propos[0] ) ) ) === 20 && get_post_meta( (int) $a_propos[0], '_pp_corps_editable', true ) === '0' );
$export = Export::donnees();
$pages  = array_column( $export['pages'], null, 'cle' );
$verifie( 'export : champs des pages', isset( $pages['accueil']['champs']['hero_titre'], $pages['contact']['champs']['email_public'] ) );
$verifie( 'export : Mon site (identité, liens commerciaux)', is_array( $export['site'] ) && isset( $export['site']['nom'], $export['site']['premibel_url'] ) && array_key_exists( 'logo', $export['site'] ) );
$verifie( 'export : aucun HTML dans les champs', ! preg_match( '/<[a-z\/]/i', (string) wp_json_encode( [ $export['site'], array_column( $export['pages'], 'champs' ) ] ) ) );
$imp    = new \PoseParquet\Core\Contenus\Importer();
$avant  = get_post_meta( (int) $accueil[0], '_pp_champs', true );
$valeurs = json_decode( (string) $avant, true );
$valeurs['hero_eyebrow'] = 'Saisie conservée';
update_post_meta( (int) $accueil[0], '_pp_champs', wp_slash( (string) wp_json_encode( $valeurs, JSON_UNESCAPED_UNICODE ) ) );
$fichier = dirname( __DIR__, 3 ) . '/data/wordpress/import.json';
if ( is_readable( $fichier ) ) {
	$c = $imp->champs( json_decode( (string) file_get_contents( $fichier ), true ) );
	$apres = json_decode( (string) get_post_meta( (int) $accueil[0], '_pp_champs', true ), true );
	$verifie( 'import des champs rejouable : aucune saisie écrasée', $c['ajoutes'] === 0 && ( $apres['hero_eyebrow'] ?? '' ) === 'Saisie conservée' );
}
update_post_meta( (int) $accueil[0], '_pp_champs', wp_slash( (string) $avant ) );

/* ------------------------------------------------------------------ */
$section( 'Aperçu public, fichiers du site, duplication' );
$gabarit = '<html><head><meta name="robots" content="index, follow" /><title>%%PP_TITRE%%</title></head><body class="page"><h1>%%PP_H1%%</h1>%%PP_COUVERTURE%%<div>%%PP_CORPS%%</div><ul><li>Niveau %%PP_NIVEAU%%</li><li>%%PP_OUTILS%%</li></ul></body></html>';
$brouillon = wp_insert_post( [ 'post_type' => Types::TUTORIEL, 'post_status' => 'draft', 'post_title' => 'Titre <script>', 'post_content' => 'Corps du brouillon' ] );
update_post_meta( $brouillon, '_pp_outils', "Scie\nMètre" );
$html = \PoseParquet\Core\Contenus\Apercu::remplir( $gabarit, get_post( $brouillon ) );
$verifie( 'aperçu : titre échappé, corps, outils, niveau vide retiré', str_contains( $html, '<h1>Titre &lt;script&gt;</h1>' ) && str_contains( $html, 'Corps du brouillon' ) && str_contains( $html, '<li>Scie</li><li>Mètre</li>' ) && ! str_contains( $html, 'Niveau' ) && ! str_contains( $html, '%%PP_' ) );
$verifie( 'aperçu : noindex, base vers les fichiers du site, bandeau brouillon', str_contains( $html, 'noindex, nofollow' ) && str_contains( $html, '<base href="' ) && str_contains( $html, 'brouillon' ) );
$r = new WP_REST_Request( 'GET', '/pose-parquet/v1/site/assets/../wp-config.php' );
$r->set_url_params( [ 'chemin' => 'assets/../../wp-config.php' ] );
$res = \PoseParquet\Core\Contenus\Apercu::fichier( $r );
$verifie( 'fichiers du site : remontée de dossier refusée', $res instanceof WP_Error );
$r->set_url_params( [ 'chemin' => 'assets/images/x.php' ] );
$verifie( 'fichiers du site : extension hors liste refusée', \PoseParquet\Core\Contenus\Apercu::fichier( $r ) instanceof WP_Error );
wp_delete_post( $brouillon, true );

exit( $bilan() );
