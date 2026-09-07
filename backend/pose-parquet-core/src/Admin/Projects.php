<?php
/**
 * Écran « Pose Parquet → Demandes » : la liste et la fiche.
 *
 * Un seul point d'entrée, deux vues, choisies par la présence du paramètre
 * `project` dans l'URL. Cette classe lit la requête, appelle le dépôt, et
 * passe un modèle de vue au gabarit ; elle n'écrit rien — les écritures
 * passent par Admin\Actions, en POST.
 *
 * PAS de WP_List_Table. C'est une API interne de WordPress, dont l'intérêt est
 * de fournir gratuitement pagination, colonnes triables, actions groupées et
 * cases à cocher. Nous n'avons besoin d'aucune des trois dernières : un ordre
 * fixe (le plus récent d'abord), aucune action groupée dans cette version,
 * aucune sélection. Restait la pagination, que `paginate_links()` rend en une
 * ligne. Hériter d'une classe interne de quatre cents méthodes pour une table
 * de huit colonnes aurait coûté plus à maintenir que la table elle-même.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Projects\Status;
use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Projects {

	/** Slug de la page, qui est aussi celui du menu parent. */
	public const PAGE = 'pose-parquet';

	/**
	 * Aiguillage : fiche si `project` est présent et plausible, liste sinon.
	 *
	 * Le contrôle de droits est ici et non seulement dans `add_menu_page()` :
	 * la capability passée au menu masque l'entrée, elle n'interdit pas
	 * d'appeler `admin.php?page=pose-parquet` à la main. Sans ce test, l'URL
	 * directe suffirait à lire des données personnelles.
	 */
	public static function render(): void {
		if ( ! current_user_can( Capabilities::VIEW_PROJECTS ) ) {
			wp_die(
				esc_html__( 'Vous n’avez pas les droits nécessaires pour consulter les demandes.', 'pose-parquet-core' ),
				esc_html__( 'Accès refusé', 'pose-parquet-core' ),
				[ 'response' => 403 ]
			);
		}

		$id = isset( $_GET['project'] ) ? absint( wp_unslash( $_GET['project'] ) ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( $id > 0 ) {
			self::render_detail( $id );

			return;
		}

		self::render_list();
	}

	/* ================================================================== */
	/* Liste                                                              */
	/* ================================================================== */

	private static function render_list(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- lecture seule, aucun effet.
		$statut = isset( $_GET['status'] ) ? sanitize_key( wp_unslash( $_GET['status'] ) ) : '';
		$terme  = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '';
		$page   = isset( $_GET['paged'] ) ? max( 1, absint( wp_unslash( $_GET['paged'] ) ) ) : 1;
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		// Un statut inventé dans l'URL ne filtre rien plutôt que de ne rien rendre.
		if ( $statut !== '' && ! Status::is_valid( $statut ) ) {
			$statut = '';
		}
		$terme = mb_substr( trim( $terme ), 0, Repository::SEARCH_MAX );

		$repo   = new Repository();
		$args   = [ 'status' => $statut, 'search' => $terme ];
		$total  = $repo->count_search( $args );
		$pages  = (int) ceil( $total / Repository::PER_PAGE );

		/*
		 * Page demandée au-delà de la dernière : on ramène sur la dernière au
		 * lieu de rendre un tableau vide. Cela arrive tout seul quand on filtre
		 * depuis la page 4 vers un statut qui n'a qu'une page.
		 */
		if ( $pages > 0 && $page > $pages ) {
			$page = $pages;
		}

		$view = [
			'rows'     => $repo->search( $args + [ 'page' => $page ] ),
			'counts'   => $repo->counts_by_status( $args ),
			'total'    => $total,
			'page'     => $page,
			'pages'    => $pages,
			'per_page' => Repository::PER_PAGE,
			'status'   => $statut,
			'search'   => $terme,
			'statuses' => Status::labels(),
			'notice'   => Notices::pending(),
			'can_edit' => current_user_can( Capabilities::MANAGE_PROJECTS ),
		];

		require POSE_PARQUET_DIR . '/templates/admin-projects-list.php';
	}

	/* ================================================================== */
	/* Fiche                                                              */
	/* ================================================================== */

	private static function render_detail( int $id ): void {
		$repo    = new Repository();
		$project = $repo->find_by_id( $id );

		if ( $project === null ) {
			$view = [ 'notice' => Notices::pending() ];
			require POSE_PARQUET_DIR . '/templates/admin-projects-missing.php';

			return;
		}

		$view = [
			'project'  => $project,
			'history'  => $repo->history_of( $id ),
			'notes'    => $repo->notes_of( $id ),
			'statuses' => Status::labels(),
			'notice'   => Notices::pending(),
			'can_edit' => current_user_can( Capabilities::MANAGE_PROJECTS ),
			'note_max' => \PoseParquet\Core\Projects\Notes::MAX_LENGTH,
			'back_url' => View::list_url(),
			'visualizer' => self::visualizer_view( $project ),
			'acquisition' => self::acquisition_view( $project ),
		];

		require POSE_PARQUET_DIR . '/templates/admin-projects-detail.php';
	}

	/**
	 * La configuration du Visualiseur, en quatre lignes lisibles.
	 *
	 * Le JSON de `visualizer_config` n'est PAS montré : c'est un carnet du
	 * moteur de rendu, utile au front et illisible pour un gestionnaire. On en
	 * tire seulement l'information qui a du sens au téléphone — quelle pièce,
	 * quel parquet, quel motif, quelle orientation — et on dit s'il y a une
	 * configuration détaillée, sans la dérouler.
	 *
	 * @param array<string,mixed> $project
	 * @return array<string,string> vide si le visiteur n'a pas utilisé le Visualiseur
	 */
	private static function visualizer_view( array $project ): array {
		$lignes = [];

		/*
		 * « Scène » et non « Pièce » : la section Projet porte déjà un champ
		 * « Pièce », qui est le type de pièce déclaré par le visiteur (séjour,
		 * chambre…). Deux champs du même nom sur un même écran, avec deux sens
		 * différents, est le genre de détail qui fait douter de tout le reste.
		 */
		if ( (string) ( $project['scene_id'] ?? '' ) !== '' ) {
			$lignes[ __( 'Scène', 'pose-parquet-core' ) ] = (string) $project['scene_id'];
		}
		if ( (string) ( $project['product_id'] ?? '' ) !== '' ) {
			$lignes[ __( 'Produit', 'pose-parquet-core' ) ] = (string) $project['product_id'];
		}
		$motif = View::label( 'pattern', $project['pattern'] ?? '' );
		if ( $motif !== '' ) {
			$lignes[ __( 'Motif', 'pose-parquet-core' ) ] = $motif;
		}
		if ( $project['orientation'] !== null && $project['orientation'] !== '' ) {
			/* translators: %d : angle en degrés. */
			$lignes[ __( 'Orientation', 'pose-parquet-core' ) ] = sprintf( __( '%d°', 'pose-parquet-core' ), (int) $project['orientation'] );
		}

		return $lignes;
	}

	/**
	 * Provenance de la demande, si elle est connue.
	 *
	 * Section secondaire : utile pour savoir ce qui amène des demandes, jamais
	 * pour traiter celle-ci. Elle disparaît entièrement quand rien n'est connu.
	 *
	 * @param array<string,mixed> $project
	 * @return array<string,string>
	 */
	private static function acquisition_view( array $project ): array {
		/*
		 * « Média » et non « Support » : la section Projet porte déjà un champ
		 * « Support », qui est le support de pose (dalle, chape, carrelage).
		 * `utm_medium` désigne tout autre chose — le canal d'acquisition.
		 */
		$champs = [
			'source_url'   => __( 'Page d’origine', 'pose-parquet-core' ),
			'utm_source'   => __( 'Source', 'pose-parquet-core' ),
			'utm_medium'   => __( 'Média', 'pose-parquet-core' ),
			'utm_campaign' => __( 'Campagne', 'pose-parquet-core' ),
		];

		$lignes = [];
		foreach ( $champs as $colonne => $libelle ) {
			$valeur = (string) ( $project[ $colonne ] ?? '' );
			if ( $valeur !== '' ) {
				$lignes[ $libelle ] = $valeur;
			}
		}

		return $lignes;
	}
}
