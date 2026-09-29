<?php
/**
 * Vide la file des notifications, en ligne de commande.
 *
 *   php backend/tools/traiter-file-mail.php C:/wamp64/www/pose-parquet-dev
 *   php backend/tools/traiter-file-mail.php <racine> --etat     (ne fait rien)
 *
 * POURQUOI CE SCRIPT EXISTE. `DISABLE_WP_CRON` vaut `true` sur le WordPress
 * de développement, et on ne le réactive pas : une requête de visiteur qui
 * déclenche l'ordonnanceur, c'est exactement le couplage qu'on vient de
 * retirer du formulaire. Il faut donc un moyen de faire tourner la file à la
 * main, et le voici.
 *
 * Il n'ajoute aucune logique : il appelle `Queue::executer_echeances()`, la
 * même méthode que le bouton de l'administration. Les mêmes garanties
 * s'appliquent — un envoi déjà parti ne repart pas, un verrou empêche deux
 * exécutions simultanées.
 *
 * CE FICHIER NE FAIT PAS PARTIE DU PAQUET LIVRÉ. Il vit dans `backend/tools/`,
 * hors du dossier du plugin, et n'est donc jamais copié dans
 * `wp-content/plugins/`. En production, c'est un cron système qui appelle
 * wp-cron.php — voir docs/backend/production.md.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

if ( PHP_SAPI !== 'cli' ) {
	// Ce fichier n'est pas publié, mais une ceinture ne coûte rien.
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

/*
 * Le bilan par état, pour que le résultat se lise sans ouvrir
 * l'administration — c'est la première chose qu'on veut savoir après avoir
 * lancé la file.
 */
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
