<?php



declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

require_once __DIR__ . '/src/Security/Capabilities.php';
require_once __DIR__ . '/src/Security/Roles.php';
require_once __DIR__ . '/src/Database/Installer.php';
require_once __DIR__ . '/src/Database/Schema.php';

PoseParquet\Core\Security\Capabilities::remove_all();


PoseParquet\Core\Security\Roles::remove();

delete_option( PoseParquet\Core\Database\Installer::OPTION_DB_VERSION );
delete_option( PoseParquet\Core\Database\Installer::OPTION_INSTALLED_AT );



delete_option( PoseParquet\Core\Security\Capabilities::OPTION_VERSION );

if ( defined( 'POSE_PARQUET_UNINSTALL_DROP_TABLES' ) && POSE_PARQUET_UNINSTALL_DROP_TABLES === true ) {
	global $wpdb;
	foreach ( PoseParquet\Core\Database\Schema::tables() as $table ) {

		$wpdb->query( "DROP TABLE IF EXISTS `{$table}`" );
	}
}
