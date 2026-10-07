<?php
/**
 * Import des contenus du dépôt dans WordPress (migration, rejouable).
 *
 *   node _generator/exporter-wordpress.js
 *   php backend/pose-parquet-core/tools/importer-contenus.php <racine WordPress> data/wordpress/import.json
 *
 * En ligne de commande seulement. S'exécute en tant que premier
 * administrateur du site (il faut le droit de publier et de téléverser).
 */

if ( PHP_SAPI !== 'cli' ) {
	exit( 1 );
}
[ , $racine, $fichier ] = array_pad( $argv, 3, '' );
if ( ! $racine || ! $fichier || ! is_file( rtrim( $racine, '/\\' ) . '/wp-load.php' ) || ! is_readable( $fichier ) ) {
	fwrite( STDERR, "Usage : php tools/importer-contenus.php <racine WordPress> <import.json>\n" );
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
try {
	$compte = $import->importer( $donnees );
} catch ( Throwable $e ) {
	fwrite( STDERR, 'Import interrompu : ' . $e->getMessage() . "\n" );
	exit( 5 );
}
foreach ( $import->journal() as $ligne ) {
	echo $ligne, PHP_EOL;
}
printf( "Importé : %d guides, %d tutoriels, %d inspirations, %d pages, %d images nouvelles.\n", $compte['guides'], $compte['tutoriels'], $compte['inspirations'], $compte['pages'], $compte['images'] );
