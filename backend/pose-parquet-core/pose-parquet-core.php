<?php
/**
 * Plugin Name:       Pose Parquet
 * Plugin URI:        https://pose-parquet.com/
 * Description:       Backend métier de pose-parquet.com : demandes de projet, administration, API REST. Le site public reste un front indépendant qui dialogue avec ce plugin par l'API REST.
 * Version:           0.7.0
 * Requires at least: 6.5
 * Requires PHP:      8.2
 * Author:            La Nation du Web
 * Text Domain:       pose-parquet-core
 * License:           Proprietary
 */

declare(strict_types=1);


if ( ! defined( 'ABSPATH' ) ) {
	exit;
}



define( 'POSE_PARQUET_VERSION', '0.7.0' );
define( 'POSE_PARQUET_DB_VERSION', 5 );
define( 'POSE_PARQUET_FILE', __FILE__ );
define( 'POSE_PARQUET_DIR', __DIR__ );



if ( version_compare( PHP_VERSION, '8.2', '<' ) ) {
	add_action(
		'admin_notices',
		static function (): void {
			echo '<div class="notice notice-error"><p>';
			echo esc_html(
				sprintf(

					__( 'Pose Parquet nécessite PHP 8.2 ou plus récent. Version détectée : %s. Le plugin ne s’est pas chargé.', 'pose-parquet-core' ),
					PHP_VERSION
				)
			);
			echo '</p></div>';
		}
	);
	return;
}



spl_autoload_register(
	static function ( string $class ): void {
		$prefix = 'PoseParquet\\Core\\';
		if ( strncmp( $class, $prefix, strlen( $prefix ) ) !== 0 ) {
			return;
		}
		$relative = substr( $class, strlen( $prefix ) );
		$file     = POSE_PARQUET_DIR . '/src/' . str_replace( '\\', '/', $relative ) . '.php';
		if ( is_readable( $file ) ) {
			require $file;
		}
	}
);



register_activation_hook( __FILE__, [ PoseParquet\Core\Database\Installer::class, 'activate' ] );
register_deactivation_hook( __FILE__, [ PoseParquet\Core\Plugin::class, 'deactivate' ] );

add_action( 'plugins_loaded', [ PoseParquet\Core\Plugin::class, 'boot' ] );
