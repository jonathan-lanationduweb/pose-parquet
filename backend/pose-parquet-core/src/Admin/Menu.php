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
use PoseParquet\Core\Contenus\Types;
use PoseParquet\Core\Maintenance\Reglages as Maintenance;
use PoseParquet\Core\Catalogue\Ecran as Catalogue;
use PoseParquet\Core\Site\MonSite;
use PoseParquet\Core\Publication\Publication;
use PoseParquet\Core\Antispam\RateLimiter;
use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Mail\Diagnostics;
use PoseParquet\Core\Mail\Notifier;
use PoseParquet\Core\Mail\Queue;
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

	/** URL de la page « État ». Une seule définition, pour une seule page. */
	public static function status_url(): string {
		return admin_url( 'admin.php?page=' . self::STATUS_PAGE );
	}

	public static function register(): void {
		add_action( 'admin_menu', [ self::class, 'add_pages' ] );
		// Après tous les autres : composer l'ordre final, rubriques et icônes.
		add_action( 'admin_menu', [ self::class, 'ordonner' ], 999 );
		add_action( 'admin_menu', [ self::class, 'epurer' ], 999 );
		add_action( 'admin_enqueue_scripts', [ self::class, 'enqueue' ] );
		add_filter( 'parent_file', [ self::class, 'parent' ] );
		add_filter( 'submenu_file', [ self::class, 'sous_menu' ] );
	}

	/**
	 * Le menu du module, dans le SOCLE commun (référence : Expert Parquet,
	 * EP_Admin_Contenu::ordonner) — même place, mêmes rubriques, icônes :
	 *
	 *   Pose Parquet                 (position 3, sous le tableau de bord WordPress)
	 *   ├── Tableau de bord
	 *   ├── CONTENU      Guides, Tutoriels, Inspirations, Pages, Images
	 *   ├── ACTIVITÉ     Projets
	 *   ├── PRODUITS     Catalogue Premibel
	 *   └── SITE         Mon site, Maintenance, Publication, Réglages   (État : depuis Réglages)
	 *
	 * Les Images sont rangées dans « Contenu », comme les Médias d'Expert
	 * Parquet : une rubrique pour une seule entrée multiplierait les niveaux.
	 * Chaque entrée garde son propre droit : un gestionnaire des projets ne
	 * voit ni les contenus, ni le catalogue, ni la maintenance, ni les réglages.
	 */
	public static function add_pages(): void {
		add_menu_page(
			__( 'Pose Parquet', 'pose-parquet-core' ),
			__( 'Pose Parquet', 'pose-parquet-core' ),
			Capabilities::VIEW_PROJECTS,
			Tableau::PAGE,
			[ Tableau::class, 'render' ],
			'dashicons-admin-home',
			3
		);
		add_submenu_page( Tableau::PAGE, __( 'Tableau de bord', 'pose-parquet-core' ), __( 'Tableau de bord', 'pose-parquet-core' ), Capabilities::VIEW_PROJECTS, Tableau::PAGE, [ Tableau::class, 'render' ] );
		foreach ( [
			Types::GUIDE       => __( 'Guides', 'pose-parquet-core' ),
			Types::TUTORIEL    => __( 'Tutoriels', 'pose-parquet-core' ),
			Types::INSPIRATION => __( 'Inspirations', 'pose-parquet-core' ),
			Types::PAGE        => __( 'Pages', 'pose-parquet-core' ),
		] as $type => $libelle ) {
			add_submenu_page( Tableau::PAGE, $libelle, $libelle, Capabilities::EDIT_CONTENTS, 'edit.php?post_type=' . $type );
		}
		add_submenu_page( Tableau::PAGE, __( 'Images', 'pose-parquet-core' ), __( 'Images', 'pose-parquet-core' ), 'upload_files', 'upload.php' );
		add_submenu_page( Tableau::PAGE, __( 'Projets', 'pose-parquet-core' ), __( 'Projets', 'pose-parquet-core' ), Capabilities::VIEW_PROJECTS, self::SLUG, [ Projects::class, 'render' ] );
		add_submenu_page( Tableau::PAGE, __( 'Catalogue Premibel', 'pose-parquet-core' ), __( 'Catalogue Premibel', 'pose-parquet-core' ), Capabilities::EDIT_CONTENTS, Catalogue::PAGE, [ Catalogue::class, 'render' ] );
		add_submenu_page( Tableau::PAGE, __( 'Mon site', 'pose-parquet-core' ), __( 'Mon site', 'pose-parquet-core' ), Capabilities::MANAGE_SETTINGS, MonSite::PAGE, [ MonSite::class, 'render' ] );
		add_submenu_page( Tableau::PAGE, __( 'Mode maintenance', 'pose-parquet-core' ), __( 'Maintenance', 'pose-parquet-core' ), Capabilities::MANAGE_SETTINGS, Maintenance::PAGE, [ Maintenance::class, 'render' ] );
		add_submenu_page( Tableau::PAGE, __( 'Publication du site', 'pose-parquet-core' ), __( 'Publication', 'pose-parquet-core' ), Capabilities::MANAGE_SETTINGS, Publication::PAGE, [ Publication::class, 'render' ] );
		add_submenu_page( Tableau::PAGE, __( 'Réglages Pose Parquet', 'pose-parquet-core' ), __( 'Réglages', 'pose-parquet-core' ), Capabilities::MANAGE_SETTINGS, Settings::PAGE, [ Settings::class, 'render' ] );
		/*
		 * « État » (diagnostic technique) : accessible — lien depuis Réglages —
		 * mais absent du menu, la maquette ne le montre pas.
		 *
		 * Page SANS parent (''), la manière prévue par WordPress pour une page
		 * cachée. La version précédente l'inscrivait sous « Pose Parquet » puis
		 * la retirait du menu (remove_submenu_page) : WordPress recalculait
		 * alors son nom interne sans parent (admin_page_…), qui ne
		 * correspondait plus à celui inscrit (pose-parquet_page_…), et
		 * refusait l'accès même à un administrateur — 403 « Sorry, you are not
		 * allowed to access this page » relevé le 06/10/2026.
		 */
		$etat = add_submenu_page( '', __( 'État du plugin', 'pose-parquet-core' ), __( 'État', 'pose-parquet-core' ), Capabilities::MANAGE_SETTINGS, self::STATUS_PAGE, [ self::class, 'render_status' ] );
		// Une page cachée ne reçoit pas son titre du menu : sans lui, <title>
		// est vide et WordPress appelle strip_tags( null ) (avis « Deprecated »).
		if ( $etat ) {
			add_action(
				'load-' . $etat,
				static function (): void {
					global $title;
					$title = __( 'État du plugin', 'pose-parquet-core' ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
				}
			);
		}
	}

	/**
	 * Ordre final du sous-menu, avec rubriques et icônes. On compose à partir
	 * de ce que WordPress a réellement inscrit (et donc de ce que l'utilisateur
	 * a le droit de voir) : aucune entrée inventée, aucune capacité devinée.
	 * Les entrées ne sont jamais RETIRÉES ici (pas de remove_submenu_page) :
	 * une page cachée se déclare sans parent — voir « État ».
	 */
	public static function ordonner(): void {
		global $submenu;
		$tb = Tableau::PAGE;
		if ( empty( $submenu[ $tb ] ) ) {
			return;
		}
		$existe = [];
		foreach ( $submenu[ $tb ] as $entree ) {
			$existe[ $entree[2] ] = $entree;
		}
		$avec = static fn( string $slug, string $icone ): ?array => isset( $existe[ $slug ] ) ? Socle::icone( $existe[ $slug ], $icone ) : null;
		$liste = static fn( string $type ): string => 'edit.php?post_type=' . $type;
		$rubrique = static fn( string $nom, array $entrees ): array => array_filter( $entrees ) ? array_merge( [ Socle::section( $nom ) ], array_values( array_filter( $entrees ) ) ) : [];

		$ordre = array_merge(
			array_filter( [ $avec( $tb, 'dashicons-dashboard' ) ] ),
			$rubrique( 'Contenu', [
				$avec( $liste( Types::GUIDE ), 'dashicons-media-document' ),
				$avec( $liste( Types::TUTORIEL ), 'dashicons-hammer' ),
				$avec( $liste( Types::INSPIRATION ), 'dashicons-format-gallery' ),
				$avec( $liste( Types::PAGE ), 'dashicons-edit' ),
				$avec( 'upload.php', 'dashicons-format-image' ),
			] ),
			$rubrique( 'Activité', [ $avec( self::SLUG, 'dashicons-clipboard' ) ] ),
			$rubrique( 'Produits', [ $avec( Catalogue::PAGE, 'dashicons-products' ) ] ),
			$rubrique( 'Site', [
				$avec( MonSite::PAGE, 'dashicons-admin-site-alt3' ),
				$avec( Maintenance::PAGE, 'dashicons-admin-tools' ),
				$avec( Publication::PAGE, 'dashicons-upload' ),
				$avec( Settings::PAGE, 'dashicons-admin-generic' ),
			] )
		);
		$submenu[ $tb ] = array_values( $ordre ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
	}

	/**
	 * Comme Expert Parquet (EP_Security::epurer_menu) : les menus natifs dont
	 * ce site n'a pas l'usage (Articles, Commentaires) ou qui sont rangés sous
	 * le module (Médias → Images) disparaissent de la colonne. Un seul chemin.
	 * Retirer un menu n'ouvre ni ne ferme aucun accès : chaque écran vérifie
	 * lui-même ses droits. Les pages natives de WordPress (Pages) ne sont pas
	 * celles du site : elles sortent aussi du menu.
	 */
	public static function epurer(): void {
		global $submenu;
		foreach ( [ 'edit.php', 'edit.php?post_type=page', 'edit-comments.php', 'upload.php' ] as $page ) {
			remove_menu_page( $page );
			unset( $submenu[ $page ] );
		}
	}

	/** Les écrans de contenus (listes, édition, catégories) s'ouvrent sous « Pose Parquet ». */
	public static function parent( ?string $parent ): ?string {
		global $typenow, $taxnow, $plugin_page;
		if ( $plugin_page === self::STATUS_PAGE ) {
			return Tableau::PAGE; // « État » s'ouvre sous Pose Parquet → Réglages.
		}
		global $pagenow;
		if ( in_array( (string) $typenow, Types::all(), true ) || in_array( (string) $taxnow, [ Types::CAT_GUIDE, Types::CAT_TUTORIEL ], true ) ) {
			return Tableau::PAGE;
		}
		// La médiathèque est rangée sous le module : le menu reste ouvert.
		if ( in_array( (string) $pagenow, [ 'upload.php', 'media-new.php' ], true ) ) {
			return Tableau::PAGE;
		}
		return $parent;
	}

	public static function sous_menu( ?string $fichier ): ?string {
		global $typenow, $plugin_page;
		if ( $plugin_page === self::STATUS_PAGE ) {
			return Settings::PAGE;
		}
		global $pagenow;
		if ( in_array( (string) $typenow, Types::all(), true ) ) {
			return 'edit.php?post_type=' . $typenow;
		}
		if ( in_array( (string) $pagenow, [ 'upload.php', 'media-new.php' ], true ) ) {
			return 'upload.php';
		}
		return $fichier;
	}

	/**
	 * Feuille de style et script de sélection d'image, sur nos écrans seulement.
	 *
	 * Le seul JavaScript : ouvrir la médiathèque de WordPress pour choisir une
	 * image (couverture, fond de maintenance). Tout le reste est du formulaire.
	 */
	public static function enqueue( string $hook ): void {
		$ecran     = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		$contenu   = $ecran && in_array( (string) $ecran->post_type, Types::all(), true );
		$module    = str_contains( $hook, 'pose-parquet' );
		if ( ! $contenu && ! $module ) {
			return;
		}
		// Feuille propre aux écrans Projets / État (antérieure au socle) ; les
		// composants communs viennent du socle (Admin\Socle).
		wp_enqueue_style( 'pose-parquet-admin', plugins_url( 'assets/admin.css', POSE_PARQUET_FILE ), [ 'pp-socle-shell' ], (string) filemtime( POSE_PARQUET_DIR . '/assets/admin.css' ) );
		$avec_media = ( $contenu && $ecran->base === 'post' ) || str_contains( $hook, Maintenance::PAGE ) || str_contains( $hook, MonSite::PAGE );
		if ( $contenu || $module ) {
			if ( $avec_media ) {
				wp_enqueue_media();
			}
			wp_enqueue_script( 'pose-parquet-admin', plugins_url( 'assets/admin.js', POSE_PARQUET_FILE ), $avec_media ? [ 'media-editor' ] : [], (string) filemtime( POSE_PARQUET_DIR . '/assets/admin.js' ), true );
			wp_localize_script(
				'pose-parquet-admin',
				'ppAdmin',
				[
					'choisir'   => __( 'Choisir une image', 'pose-parquet-core' ),
					'remplacer' => __( 'Remplacer l’image', 'pose-parquet-core' ),
					'utiliser'  => __( 'Utiliser cette image', 'pose-parquet-core' ),
					'manquante' => __( 'Image manquante', 'pose-parquet-core' ),
					'recherche' => $ecran && $ecran->post_type ? ( get_post_type_object( (string) $ecran->post_type )->labels->search_items ?? '' ) . '…' : '',
				]
			);
		}
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
			// Le détail honnête de l'acheminement : adresse choisie ou héritée,
			// domaine réellement joignable, transport déclaré ou non.
			'mail'             => Diagnostics::report(),
			'mail_counts'      => $repo->counts_by_mail_status(),
			// L'état de la file : ce qui attend, et si l'ordonnanceur tourne.
			// Une file qui grossit sans se vider est le symptôme qu'on veut
			// voir avant qu'un lead ne soit perdu, pas après.
			'mail_queue'       => Queue::etat(),
			'wp_cron_disabled' => defined( 'DISABLE_WP_CRON' ) && DISABLE_WP_CRON,
			'queue_action'     => Actions::RUN_MAIL_QUEUE,
			'mail_failed_url'  => add_query_arg( 'mail', Notifier::STATUS_FAILED, View::list_url() ),
			'mail_pending_url' => add_query_arg( 'mail', Notifier::STATUS_PENDING, View::list_url() ),
			'caps_missing'     => Capabilities::missing(),
			'repair_url'       => admin_url( 'admin-post.php' ),
			'repair_action'    => Actions::REPAIR_CAPS,
			'rate_limits'      => RateLimiter::limits(),
			'token_min_age'    => FormToken::MIN_AGE,
			'token_max_age'    => FormToken::MAX_AGE,
		];

		require POSE_PARQUET_DIR . '/templates/admin-status.php';
	}
}
