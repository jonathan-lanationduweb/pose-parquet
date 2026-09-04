<?php
/**
 * Ouvrier du test de concurrence : crée N demandes via Projects\Service et
 * imprime leurs références, une par ligne. Lancé en plusieurs exemplaires
 * simultanés par run-projects.php.
 *
 *   php tests/concurrency-worker.php <racine WordPress> <nombre>
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

require __DIR__ . '/support.php';
pp_test_bootstrap( $argv, 'php tests/concurrency-worker.php <racine WordPress> <nombre>' );

$n = max( 1, (int) ( $argv[2] ?? 1 ) );

// plugins_loaded a déjà eu lieu : on démarre le plugin comme une requête le ferait.
PoseParquet\Core\Plugin::boot();

$service = new PoseParquet\Core\Projects\Service();
for ( $i = 0; $i < $n; $i++ ) {
	$resultat = $service->create( pp_requete_valide( [ 'lastName' => 'Concurrence ' . getmypid() ] ) );
	echo $resultat['ok'] ? $resultat['reference'] : 'ECHEC:' . ( $resultat['code'] ?? '?' ), "\n";
}
