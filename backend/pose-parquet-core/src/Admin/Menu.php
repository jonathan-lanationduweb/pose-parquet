<?php
/**
 * Menu d'administration.
 *
 *   Pose Parquet
 *   ├── Demandes     la liste et les fiches — c'est l'écran de travail
 *   ├── Réglages     l'adresse de réception, la confirmation visiteur
 *   └── État         ce que le plugin a réellement installé
 *
 * L'entrée parente EST « Demandes » : elle ouvre directement l'écran utile,
 * sans page d'accueil intermédiaire. Un tableau de bord séparé aurait répété
 * la liste avec moins d'informations ; les compteurs par statut qu'il aurait
 * portés sont là où ils servent, en filtres au-dessus du tableau.
 *
 * « État » descend en dernier et reste sur `pp_manage_settings` : c'est une
 * page de diagnostic technique, pas un écran de gestion. Un gestionnaire ne la
 * voit pas, et n'a rien à y faire.
 *
 * La capability de l'entrée parente est `pp_view_projects`, la plus basse des
 * trois : c'est elle qui décide si le menu apparaît. Chaque page revérifie la
 * sienne à l'affichage, parce qu'une capability de menu masque un lien sans
 * interdire l'URL.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Antispam\FormToken;
use PoseParquet\Core\Antispam\RateLimiter;
use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Projects\Status;
use PoseParquet\Core\Rest\Routes;
use PoseParquet\Core\Security\Capabilities;
use PoseParquet\Core\Security\Roles;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Menu {

	public const SLUG        = Projects::PAGE;
	public const STATUS_PAGE = 'pose-parquet-status';

	public static function register(): void {
		add_action( 'admin_menu', [ self::class, 'add_pages' ] );
		add_action( 'admin_enqueue_scripts', [ self::class, 'enqueue' ] );
	}

	public static function add_pages(): void {
		add_menu_page(
			__( 'Pose Parquet', 'pose-parquet-core' ),
			__( 'Pose Parquet', 'pose-parquet-core' ),
			Capabilities::VIEW_PROJECTS,
			self::SLUG,
			[ Projects::class, 'render' ],
			'dashicons-layout',
			58
		);
		// Le premier sous-menu reprend l'entrée parente, sinon WordPress en
		// fabrique un doublon nommé comme le menu.
		add_submenu_page(
			self::SLUG,
			__( 'Demandes', 'pose-parquet-core' ),
			__( 'Demandes', 'pose-parquet-core' ),
			Capabilities::VIEW_PROJECTS,
			self::SLUG,
			[ Projects::class, 'render' ]
		);
		add_submenu_page(
			self::SLUG,
			__( 'Réglages Pose Parquet', 'pose-parquet-core' ),
			__( 'Réglages', 'pose-parquet-core' ),
			Capabilities::MANAGE_SETTINGS,
			Settings::PAGE,
			[ Settings::class, 'render' ]
		);
		add_submenu_page(
			self::SLUG,
			__( 'État du plugin', 'pose-parquet-core' ),
			__( 'État', 'pose-parquet-core' ),
			Capabilities::MANAGE_SETTINGS,
			self::STATUS_PAGE,
			[ self::class, 'render_status' ]
		);
	}

	/**
	 * La feuille de style, et seulement sur nos écrans.
	 *
	 * Pas de fichier JavaScript : rien dans ces écrans n'en a besoin. Les
	 * formulaires sont des formulaires, les filtres sont des liens, la
	 * pagination est une liste de liens. Un script aurait été du poids et une
	 * surface d'erreur pour refaire ce que le navigateur fait déjà.
	 */
	public static function enqueue( string $hook ): void {
		$nos_ecrans = [
			'toplevel_page_' . self::SLUG,
			self::SLUG . '_page_' . Settings::PAGE,
			self::SLUG . '_page_' . self::STATUS_PAGE,
		];
		if ( ! in_array( $hook, $nos_ecrans, true ) ) {
			return;
		}

		wp_enqueue_style(
			'pose-parquet-admin',
			plugins_url( 'assets/admin.css', POSE_PARQUET_FILE ),
			[],
			POSE_PARQUET_VERSION
		);
	}

	/** Page « État » : les faits, lus en base au moment de l'affichage. */
	public static function render_status(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die(
				esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ),
				esc_html__( 'Accès refusé', 'pose-parquet-core' ),
				[ 'response' => 403 ]
			);
		}

		$role    = get_role( 'administrator' );
		$gestion = get_role( Roles::MANAGER );
		$repo    = new Repository();
		$state   = [
			'plugin_version'   => POSE_PARQUET_VERSION,
			'schema_expected'  => POSE_PARQUET_DB_VERSION,
			'schema_installed' => Installer::installed_version(),
			'installed_at'     => (string) get_option( Installer::OPTION_INSTALLED_AT, '' ),
			'tables'           => Schema::status(),
			'caps'             => array_map(
				static fn( string $cap ): bool => $role ? $role->has_cap( $cap ) : false,
				array_combine( Capabilities::all(), Capabilities::all() )
			),
			'manager_role'     => $gestion !== null,
			'manager_caps'     => $gestion
				? array_map(
					static fn( string $cap ): bool => $gestion->has_cap( $cap ),
					array_combine( array_keys( Roles::manager_caps() ), array_keys( Roles::manager_caps() ) )
				)
				: [],
			'statuses'         => Status::labels(),
			'health_url'       => rest_url( Routes::NAMESPACE . '/health' ),
			'projects_url'     => rest_url( Routes::NAMESPACE . '/projects' ),
			'projects_count'   => $repo->count(),
			'counts_by_status' => $repo->counts_by_status(),
			'projects_admin'   => View::list_url(),
			'form_token_url'   => rest_url( Routes::NAMESPACE . '/form-token' ),
			'settings_url'     => admin_url( 'admin.php?page=' . Settings::PAGE ),
			'mail_configured'  => Settings::is_configured(),
			'visitor_mail'     => Settings::visitor_confirmation_enabled(),
			'rate_limits'      => RateLimiter::limits(),
			'token_min_age'    => FormToken::MIN_AGE,
			'token_max_age'    => FormToken::MAX_AGE,
		];

		require POSE_PARQUET_DIR . '/templates/admin-status.php';
	}
}
