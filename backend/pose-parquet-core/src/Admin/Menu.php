<?php
/**
 * Menu d'administration.
 *
 * Aujourd'hui : une entrée « Pose Parquet » et une seule page, « État », qui
 * montre ce que la fondation a réellement installé. Ni « Tableau de bord » ni
 * « Demandes » ni « Réglages » : ces écrans arrivent avec les lots qui leur
 * donnent un contenu, et un menu qui promet un écran vide est un mensonge.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Projects\Status;
use PoseParquet\Core\Rest\Routes;
use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Menu {

	public const SLUG = 'pose-parquet';

	public static function register(): void {
		add_action( 'admin_menu', [ self::class, 'add_pages' ] );
	}

	public static function add_pages(): void {
		add_menu_page(
			__( 'Pose Parquet', 'pose-parquet-core' ),
			__( 'Pose Parquet', 'pose-parquet-core' ),
			Capabilities::MANAGE_SETTINGS,
			self::SLUG,
			[ self::class, 'render_status' ],
			'dashicons-layout',
			58
		);
		// Le premier sous-menu reprend l'entrée parente, sinon WordPress en
		// fabrique un doublon nommé comme le menu.
		add_submenu_page(
			self::SLUG,
			__( 'État du plugin', 'pose-parquet-core' ),
			__( 'État', 'pose-parquet-core' ),
			Capabilities::MANAGE_SETTINGS,
			self::SLUG,
			[ self::class, 'render_status' ]
		);
	}

	/** Page « État » : les faits, lus en base au moment de l'affichage. */
	public static function render_status(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ) );
		}

		$role  = get_role( 'administrator' );
		$state = [
			'plugin_version'   => POSE_PARQUET_VERSION,
			'schema_expected'  => POSE_PARQUET_DB_VERSION,
			'schema_installed' => Installer::installed_version(),
			'installed_at'     => (string) get_option( Installer::OPTION_INSTALLED_AT, '' ),
			'tables'           => Schema::status(),
			'caps'             => array_map(
				static fn( string $cap ): bool => $role ? $role->has_cap( $cap ) : false,
				array_combine( Capabilities::all(), Capabilities::all() )
			),
			'statuses'         => Status::labels(),
			'health_url'       => rest_url( Routes::NAMESPACE . '/health' ),
		];

		require POSE_PARQUET_DIR . '/templates/admin-status.php';
	}
}
