<?php



declare(strict_types=1);

if ( PHP_SAPI !== 'cli' ) {

	http_response_code( 403 );
	exit( 1 );
}

$wp_root = $argv[1] ?? '';
$etat_seulement = in_array( '--etat', $argv, true );

if ( $wp_root === '' || ! is_file( rtrim( $wp_root, '/\\' ) . '/wp-load.php' ) ) {
	fwrite( STDERR, "Usage : php backend/tools/traiter-file-mail.php <racine WordPress> [--etat]\n" );
	exit( 2 );
}

define( 'WP_USE_THEMES', false );
require rtrim( $wp_root, '/\\' ) . '/wp-load.php';

use PoseParquet\Core\Mail\Queue;

if ( ! class_exists( Queue::class ) ) {
	fwrite( STDERR, "Le plugin pose-parquet-core n'est pas actif sur ce WordPress.\n" );
	exit( 3 );
}

$avant = Queue::etat();
printf(
	"File : %d événement(s) planifié(s), dont %d dû(s).%s\n",
    $avant['total'],
    $avant['dus'],
    $avant['prochain'] ? ' Prochain : ' . gmdate( 'Y-m-d H:i:s', $avant['prochain'] ) . ' UTC.' : ''
);

if ( $etat_seulement ) {
	exit( 0 );
}

$bilan = Queue::executer_echeances();
$apres = Queue::etat();

printf(
	"Traités : %d. Restants en file : %d.\n",
	$bilan['traites'],
	$apres['total']
);



$repo   = new PoseParquet\Core\Projects\Repository();
$counts = $repo->counts_by_mail_status();
foreach ( [ 'internal' => 'interne', 'visitor' => 'visiteur' ] as $type => $libelle ) {
	$parts = [];
	foreach ( [ 'pending', 'sent', 'failed', 'skipped' ] as $etat ) {
		$parts[] = $etat . '=' . (int) ( $counts[ $type ][ $etat ] ?? 0 );
	}
	printf( "  %-9s %s\n", $libelle, implode( ' ', $parts ) );
}

exit( 0 );
