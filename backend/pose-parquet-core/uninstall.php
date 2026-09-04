<?php
/**
 * Désinstallation — prudente par défaut.
 *
 * Exécuté par WordPress quand l'utilisateur SUPPRIME le plugin (pas quand il le
 * désactive). On retire ce qui appartient au plugin et ne vaut rien sans lui :
 * les options et les droits. On NE SUPPRIME PAS les tables de demandes.
 *
 * Pourquoi : ces tables contiennent des demandes de vrais visiteurs. Une
 * suppression de plugin peut être une erreur de manipulation, une migration,
 * un remplacement par une nouvelle version installée autrement. Perdre les
 * données métier dans ces cas est irréversible ; les garder coûte quelques
 * kilo-octets. La suppression des tables se fera explicitement, un jour, par
 * une constante posée en connaissance de cause dans wp-config.php :
 *
 *     define( 'POSE_PARQUET_UNINSTALL_DROP_TABLES', true );
 *
 * Sans cette constante, les tables restent. Voir docs/backend/database.md.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

require_once __DIR__ . '/src/Security/Capabilities.php';
require_once __DIR__ . '/src/Database/Installer.php';
require_once __DIR__ . '/src/Database/Schema.php';

PoseParquet\Core\Security\Capabilities::remove_all();

delete_option( PoseParquet\Core\Database\Installer::OPTION_DB_VERSION );
delete_option( PoseParquet\Core\Database\Installer::OPTION_INSTALLED_AT );

if ( defined( 'POSE_PARQUET_UNINSTALL_DROP_TABLES' ) && POSE_PARQUET_UNINSTALL_DROP_TABLES === true ) {
	global $wpdb;
	foreach ( PoseParquet\Core\Database\Schema::tables() as $table ) {
		// Nom issu du préfixe du site et d'une constante du plugin : pas d'entrée utilisateur.
		$wpdb->query( "DROP TABLE IF EXISTS `{$table}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}
}
