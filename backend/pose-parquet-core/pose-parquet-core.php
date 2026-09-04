<?php
/**
 * Plugin Name:       Pose Parquet
 * Plugin URI:        https://pose-parquet.com/
 * Description:       Backend métier de pose-parquet.com : demandes de projet, administration, API REST. Le site public reste un front indépendant qui dialogue avec ce plugin par l'API REST.
 * Version:           0.1.0
 * Requires at least: 6.5
 * Requires PHP:      8.2
 * Author:            La Nation du Web
 * Text Domain:       pose-parquet-core
 * License:           Proprietary
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

// Pas d'accès direct : ce fichier n'a de sens que chargé par WordPress.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/*
 * Versions.
 *
 * POSE_PARQUET_VERSION suit les livraisons du plugin. POSE_PARQUET_DB_VERSION
 * ne bouge que quand le schéma des tables change : c'est elle que l'installateur
 * compare à l'option stockée pour décider s'il doit faire évoluer la base. Les
 * deux sont volontairement distinctes — la plupart des versions du plugin ne
 * touchent pas au schéma.
 */
define( 'POSE_PARQUET_VERSION', '0.1.0' );
define( 'POSE_PARQUET_DB_VERSION', 1 );
define( 'POSE_PARQUET_FILE', __FILE__ );
define( 'POSE_PARQUET_DIR', __DIR__ );

/*
 * PHP trop ancien : on s'arrête AVANT de charger une seule classe. Une classe
 * écrite pour PHP 8.2 provoquerait une erreur de syntaxe fatale sur PHP 7,
 * et un plugin qui casse le site entier au lieu de se plaindre proprement
 * est pire qu'un plugin absent.
 */
if ( version_compare( PHP_VERSION, '8.2', '<' ) ) {
	add_action(
		'admin_notices',
		static function (): void {
			echo '<div class="notice notice-error"><p>';
			echo esc_html(
				sprintf(
					/* translators: %s: version PHP courante */
					__( 'Pose Parquet nécessite PHP 8.2 ou plus récent. Version détectée : %s. Le plugin ne s’est pas chargé.', 'pose-parquet-core' ),
					PHP_VERSION
				)
			);
			echo '</p></div>';
		}
	);
	return;
}

/*
 * Chargement des classes : un espace de noms, un dossier.
 *
 *   PoseParquet\Core\Database\Schema → src/Database/Schema.php
 *
 * Pas de Composer : le plugin n'a aucune dépendance externe, et un autoloader
 * de douze lignes se lit d'un coup d'œil là où un vendor/ cacherait l'évidence.
 */
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

/*
 * Activation et désactivation.
 *
 * L'activation installe (tables, droits, options) ; la désactivation ne détruit
 * RIEN — un plugin désactivé par erreur ne doit pas emporter les demandes des
 * visiteurs. La suppression des données est le rôle de uninstall.php, et même
 * là, elle est prudente.
 */
register_activation_hook( __FILE__, [ PoseParquet\Core\Database\Installer::class, 'activate' ] );
register_deactivation_hook( __FILE__, [ PoseParquet\Core\Plugin::class, 'deactivate' ] );

add_action( 'plugins_loaded', [ PoseParquet\Core\Plugin::class, 'boot' ] );
