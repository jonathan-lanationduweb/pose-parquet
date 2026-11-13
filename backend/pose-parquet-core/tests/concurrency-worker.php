<?php



declare(strict_types=1);

require __DIR__ . '/support.php';
pp_test_bootstrap( $argv, 'php tests/concurrency-worker.php <racine WordPress> <nombre>' );

$n = max( 1, (int) ( $argv[2] ?? 1 ) );


PoseParquet\Core\Plugin::boot();




$service = new PoseParquet\Core\Projects\Service();
for ( $i = 0; $i < $n; $i++ ) {
	$resultat = $service->create( pp_requete_metier( [ 'lastName' => 'Concurrence ' . getmypid() ] ) );
	echo $resultat['ok'] ? $resultat['reference'] : 'ECHEC:' . ( $resultat['code'] ?? '?' ), "\n";
}
