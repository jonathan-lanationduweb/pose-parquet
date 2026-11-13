<?php



declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Mail\Notifier;
use PoseParquet\Core\Projects\Fields;
use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Projects\Status;
use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Projects {


	public const PAGE = 'pose-parquet';



	public static function render(): void {
		if ( ! current_user_can( Capabilities::VIEW_PROJECTS ) ) {
			wp_die(
				esc_html__( 'Vous n’avez pas les droits nécessaires pour consulter les projets.', 'pose-parquet-core' ),
				esc_html__( 'Accès refusé', 'pose-parquet-core' ),
				[ 'response' => 403 ]
			);
		}

		$id = isset( $_GET['project'] ) ? absint( wp_unslash( $_GET['project'] ) ) : 0;

		if ( $id > 0 ) {
			self::render_detail( $id );

			return;
		}

		self::render_list();
	}





	private static function render_list(): void {

		$statut = isset( $_GET['status'] ) ? sanitize_key( wp_unslash( $_GET['status'] ) ) : '';
		$terme  = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '';
		$page   = isset( $_GET['paged'] ) ? max( 1, absint( wp_unslash( $_GET['paged'] ) ) ) : 1;

		$mail   = isset( $_GET['mail'] ) ? sanitize_key( wp_unslash( $_GET['mail'] ) ) : '';

		$dest   = isset( $_GET['destination'] ) ? sanitize_key( wp_unslash( $_GET['destination'] ) ) : '';

		if ( ! in_array( $dest, Fields::enum( 'leadDestination' ), true ) ) {
			$dest = '';
		}
		if ( ! in_array( $mail, [ Notifier::STATUS_FAILED, Notifier::STATUS_PENDING ], true ) ) {
			$mail = '';
		}


		if ( $statut !== '' && ! Status::is_valid( $statut ) ) {
			$statut = '';
		}
		$terme = mb_substr( trim( $terme ), 0, Repository::SEARCH_MAX );

		$repo   = new Repository();
		$args   = [ 'status' => $statut, 'search' => $terme, 'mail' => $mail, 'destination' => $dest ];
		$total  = $repo->count_search( $args );
		$pages  = (int) ceil( $total / Repository::PER_PAGE );



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
			'mail'     => $mail,
			'dest'     => $dest,
			'dests'    => Fields::enum( 'leadDestination' ),
			'statuses' => Status::labels(),
			'notice'   => Notices::pending(),
			'can_edit' => current_user_can( Capabilities::MANAGE_PROJECTS ),
		];

		require POSE_PARQUET_DIR . '/templates/admin-projects-list.php';
	}





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
			'lead_need'   => (string) ( $project['lead_need'] ?? '' ),
			'destination' => (string) ( $project['lead_destination'] ?? '' ),
			'destinations' => Fields::enum( 'leadDestination' ),
		];

		require POSE_PARQUET_DIR . '/templates/admin-projects-detail.php';
	}



	private static function visualizer_view( array $project ): array {
		$lignes  = [];
		$carnet  = self::visualizer_config( $project );
		$libelle = static function ( string $cle ) use ( $carnet ): string {
			$valeur = $carnet[ $cle ] ?? '';
			return is_string( $valeur ) ? trim( $valeur ) : '';
		};



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

			$lignes[ __( 'Orientation', 'pose-parquet-core' ) ] = sprintf( __( '%d°', 'pose-parquet-core' ), (int) $project['orientation'] );
		}

		return $lignes;
	}



	private static function visualizer_config( array $project ): array {
		$brut = (string) ( $project['visualizer_config'] ?? '' );
		if ( $brut === '' ) {
			return [];
		}

		$decode = json_decode( $brut, true );

		return is_array( $decode ) ? $decode : [];
	}



	private static function nom_ou_identifiant( string $nom, string $identifiant ): string {
		if ( $nom === '' ) {
			return $identifiant;
		}


		return sprintf( __( '%1$s (%2$s)', 'pose-parquet-core' ), $nom, $identifiant );
	}



	private static function acquisition_view( array $project ): array {


		$champs = [
			'entry_page'   => __( 'Page d’entrée', 'pose-parquet-core' ),
			'source_url'   => __( 'Page d’envoi', 'pose-parquet-core' ),
			'utm_source'   => __( 'Source', 'pose-parquet-core' ),
			'utm_medium'   => __( 'Média', 'pose-parquet-core' ),
			'utm_campaign' => __( 'Campagne', 'pose-parquet-core' ),
			'utm_content'  => __( 'Création', 'pose-parquet-core' ),
			'utm_term'     => __( 'Mot-clé', 'pose-parquet-core' ),
		];

		$lignes = [];



		$source = (string) ( $project['lead_source'] ?? '' );
		if ( $source !== '' ) {
			$lignes[ __( 'Origine', 'pose-parquet-core' ) ] = View::label( 'lead_source', $source );
		}

		foreach ( $champs as $colonne => $libelle ) {
			$valeur = (string) ( $project[ $colonne ] ?? '' );
			if ( $valeur !== '' ) {
				$lignes[ $libelle ] = $valeur;
			}
		}

		return $lignes;
	}
}
