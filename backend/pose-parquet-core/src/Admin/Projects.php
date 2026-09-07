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
	 * ## Libellés plutôt qu'identifiants
	 *
	 * `scene_id` et `product_id` restent la vérité technique et ne bougent
	 * pas. Mais « sejour » et « chene-fume » ne se disent pas au téléphone :
	 * quand le front a joint le nom humain — « Séjour et salle à manger »,
	 * « Chêne Fumé » — c'est lui qu'on affiche, l'identifiant venant ensuite
	 * entre parenthèses pour qui en a besoin.
	 *
	 * Ces noms sont un INSTANTANÉ pris au moment de l'envoi, lu dans
	 * `visualizer_config`. Le plugin ne recopie pas le catalogue du front et
	 * n'a aucune table de correspondance : il ne saurait pas traduire un
	 * identifiant, et surtout il ne le saurait plus le jour où une référence
	 * est renommée. Une demande garde donc ce que le visiteur voyait, pas ce
	 * que le catalogue dit aujourd'hui.
	 *
	 * Les demandes antérieures à ce mécanisme n'ont pas de libellé : elles
	 * affichent leur identifiant, et rien n'est réécrit pour leur en inventer
	 * un.
	 *
	 * @param array<string,mixed> $project
	 * @return array<string,string> vide si le visiteur n'a pas utilisé le Visualiseur
	 */
	private static function visualizer_view( array $project ): array {
		$lignes  = [];
		$carnet  = self::visualizer_config( $project );
		$libelle = static function ( string $cle ) use ( $carnet ): string {
			$valeur = $carnet[ $cle ] ?? '';
			return is_string( $valeur ) ? trim( $valeur ) : '';
		};

		/*
		 * « Scène » et non « Pièce » : la section Projet porte déjà un champ
		 * « Pièce », qui est le type de pièce déclaré par le visiteur (séjour,
		 * chambre…). Deux champs du même nom sur un même écran, avec deux sens
		 * différents, est le genre de détail qui fait douter de tout le reste.
		 */
		$scene_id = (string) ( $project['scene_id'] ?? '' );
		if ( $scene_id !== '' ) {
			$lignes[ __( 'Scène', 'pose-parquet-core' ) ] = self::nom_ou_identifiant( $libelle( 'nomScene' ), $scene_id );
		}
		$product_id = (string) ( $project['product_id'] ?? '' );
		if ( $product_id !== '' ) {
			$lignes[ __( 'Produit', 'pose-parquet-core' ) ] = self::nom_ou_identifiant( $libelle( 'nom' ), $product_id );
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
	 * Le carnet `visualizer_config` d'une demande, décodé sans confiance.
	 *
	 * Un JSON illisible — tronqué par une migration, écrit par une version
	 * plus ancienne, saisi à la main en base — ne doit pas faire tomber la
	 * fiche. On rend un tableau vide et la fiche se replie sur les
	 * identifiants : une information manquante vaut mieux qu'un écran blanc.
	 *
	 * @param array<string,mixed> $project
	 * @return array<string,mixed>
	 */
	private static function visualizer_config( array $project ): array {
		$brut = (string) ( $project['visualizer_config'] ?? '' );
		if ( $brut === '' ) {
			return [];
		}

		$decode = json_decode( $brut, true );

		return is_array( $decode ) ? $decode : [];
	}

	/**
	 * Le nom humain s'il existe, l'identifiant sinon.
	 *
	 * Quand les deux sont là, l'identifiant suit entre parenthèses : il reste
	 * la clé qui permet de retrouver la scène ou la référence, et le masquer
	 * entièrement obligerait à ouvrir la base pour la lire. Il passe au second
	 * plan, il ne disparaît pas.
	 *
	 * Aucun échappement ici : la valeur rendue traverse `esc_html()` dans le
	 * gabarit, et échapper deux fois afficherait les entités en clair.
	 */
	private static function nom_ou_identifiant( string $nom, string $identifiant ): string {
		if ( $nom === '' ) {
			return $identifiant;
		}

		/* translators: 1 : nom lisible, 2 : identifiant technique. */
		return sprintf( __( '%1$s (%2$s)', 'pose-parquet-core' ), $nom, $identifiant );
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
