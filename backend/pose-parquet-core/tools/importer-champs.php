<?php
/**
 * Import des CHAMPS STRUCTURÉS (pages) et de « Mon site », sans rien écraser.
 *
 *   node _generator/exporter-wordpress.js
 *   php backend/pose-parquet-core/tools/importer-champs.php <racine WordPress> data/wordpress/import.json
 *
 * Les schémas sont remplacés (ils viennent du code du site) ; une valeur déjà
 * saisie dans WordPress est conservée ; seules les clés nouvelles reçoivent la
 * valeur par défaut. Les contenus (guides, corps, images…) ne sont pas touchés.
 *
 * En ligne de commande seulement. S'exécute en tant que premier
 * administrateur du site (il faut le droit de publier et de téléverser).
 */

if ( PHP_SAPI !== 'cli' ) {
	exit( 1 );
}
[ , $racine, $fichier ] = array_pad( $argv, 3, '' );
if ( ! $racine || ! $fichier || ! is_file( rtrim( $racine, '/\\' ) . '/wp-load.php' ) || ! is_readable( $fichier ) ) {
	fwrite( STDERR, "Usage : php tools/importer-champs.php <racine WordPress> <import.json>\n" );
	exit( 2 );
}
define( 'WP_USE_THEMES', false );
$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
require rtrim( $racine, '/\\' ) . '/wp-load.php';

$admins = get_users( [ 'role' => 'administrator', 'number' => 1, 'orderby' => 'ID', 'fields' => 'ID' ] );
if ( ! $admins ) {
	fwrite( STDERR, "Aucun administrateur.\n" );
	exit( 3 );
}
wp_set_current_user( (int) $admins[0] );

$donnees = json_decode( (string) file_get_contents( $fichier ), true );
if ( ! is_array( $donnees ) || (int) ( $donnees['version'] ?? 0 ) !== 1 ) {
	fwrite( STDERR, "Fichier d'import illisible ou de version inconnue.\n" );
	exit( 4 );
}

$import = new PoseParquet\Core\Contenus\Importer();
$compte = $import->champs( $donnees );
foreach ( $import->journal() as $ligne ) {
	echo $ligne, PHP_EOL;
}
printf( "Champs : %d pages, %d réglages « Mon site », %d valeurs nouvelles (aucune saisie écrasée).\n", $compte['pages'], $compte['site'], $compte['ajoutes'] );
