<?php
/**
 * « Tableau de bord » du module, dans le socle commun (référence : Expert
 * Parquet, EP_Admin_Tableau_Bord et EP_Admin_Contenu::gestion_du_site).
 *
 * Simple : des chiffres utiles (adm-chiffres), deux tableaux (contenus,
 * projets récents), et en colonne droite les panneaux du site (maintenance,
 * catalogue). Pas de graphique, pas d'indicateur décoratif. L'accent ne
 * marque que ce qui demande une action (images manquantes, maintenance
 * active). Chaque bloc ne s'affiche qu'à qui a le droit d'y agir.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Catalogue\Ecran as Catalogue;
use PoseParquet\Core\Contenus\Images;
use PoseParquet\Core\Contenus\Listes;
use PoseParquet\Core\Contenus\Types;
use PoseParquet\Core\Mail\Labels;
use PoseParquet\Core\Maintenance\Reglages as Maintenance;
use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Projects\Status;
use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Tableau {

	public const PAGE = 'pose-parquet-tableau';

	public static function render(): void {
		$contenus = current_user_can( Capabilities::EDIT_CONTENTS );
		$projets  = current_user_can( Capabilities::VIEW_PROJECTS );
		if ( ! $contenus && ! $projets ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), esc_html__( 'Accès refusé', 'pose-parquet-core' ), [ 'response' => 403 ] );
		}
		$types = [
			Types::GUIDE       => __( 'Guides', 'pose-parquet-core' ),
			Types::TUTORIEL    => __( 'Tutoriels', 'pose-parquet-core' ),
			Types::INSPIRATION => __( 'Inspirations', 'pose-parquet-core' ),
			Types::PAGE        => __( 'Pages', 'pose-parquet-core' ),
		];
		$publies = [];
		$manque  = [];
		foreach ( $types as $type => $_ ) {
			$publies[ $type ] = (int) ( wp_count_posts( $type )->publish ?? 0 );
			$manque[ $type ]  = Types::avec_couverture( $type ) ? count( Images::sans_image( $type ) ) : 0;
		}
		$total_manque = array_sum( $manque );
		$repo         = new Repository();

		echo '<div class="wrap">';
		Socle::entete( __( 'Tableau de bord', 'pose-parquet-core' ), __( 'Les contenus, les projets et l’état du site Pose Parquet.', 'pose-parquet-core' ) );

		echo '<div class="adm-chiffres">';
		if ( $contenus ) {
			Socle::chiffre( __( 'Guides publiés', 'pose-parquet-core' ), (string) $publies[ Types::GUIDE ], admin_url( 'edit.php?post_type=' . Types::GUIDE ), __( 'Gérer les guides', 'pose-parquet-core' ) );
			Socle::chiffre( __( 'Tutoriels', 'pose-parquet-core' ), (string) $publies[ Types::TUTORIEL ], admin_url( 'edit.php?post_type=' . Types::TUTORIEL ), __( 'Gérer les tutoriels', 'pose-parquet-core' ) );
			Socle::chiffre( __( 'Inspirations', 'pose-parquet-core' ), (string) $publies[ Types::INSPIRATION ], admin_url( 'edit.php?post_type=' . Types::INSPIRATION ), __( 'Gérer les inspirations', 'pose-parquet-core' ) );
			$premier_manque = (string) array_search( max( $manque ), $manque, true );
			Socle::chiffre(
				/* translators: %d : nombre de contenus */
				sprintf( _n( '%d contenu sans image', '%d contenus sans image', $total_manque, 'pose-parquet-core' ), $total_manque ),
				(string) $total_manque,
				$total_manque ? add_query_arg( Listes::FILTRE_IMAGE, 'manquante', admin_url( 'edit.php?post_type=' . $premier_manque ) ) : '',
				$total_manque ? __( 'Voir la liste filtrée', 'pose-parquet-core' ) : __( 'Toutes les images sont en place', 'pose-parquet-core' ),
				$total_manque > 0
			);
		}
		if ( $projets ) {
			Socle::chiffre( __( 'Projets / orientations', 'pose-parquet-core' ), (string) $repo->count(), View::list_url(), __( 'Voir les projets', 'pose-parquet-core' ) );
		}
		echo '</div>';

		echo '<div class="adm-grille"><div>';
		if ( $contenus ) {
			Socle::carte_ouvrir( __( 'Contenus', 'pose-parquet-core' ) );
			echo '<div class="adm-defilement"><table class="adm-table"><thead><tr><th>' . esc_html__( 'Contenu', 'pose-parquet-core' ) . '</th><th class="adm-nombre">' . esc_html__( 'Publiés', 'pose-parquet-core' ) . '</th><th class="adm-nombre">' . esc_html__( 'Brouillons', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Images', 'pose-parquet-core' ) . '</th></tr></thead><tbody>';
			foreach ( $types as $type => $libelle ) {
				$base = admin_url( 'edit.php?post_type=' . $type );
				echo '<tr><td><a href="' . esc_url( $base ) . '">' . esc_html( $libelle ) . '</a></td>';
				echo '<td class="adm-nombre">' . (int) $publies[ $type ] . '</td>';
				echo '<td class="adm-nombre">' . (int) ( wp_count_posts( $type )->draft ?? 0 ) . '</td><td>';
				if ( ! Types::avec_couverture( $type ) ) {
					echo '—';
				} elseif ( $manque[ $type ] ) {
					echo '<a href="' . esc_url( add_query_arg( Listes::FILTRE_IMAGE, 'manquante', $base ) ) . '">' . Socle::badge( sprintf( _n( '%d image manquante', '%d images manquantes', $manque[ $type ], 'pose-parquet-core' ), $manque[ $type ] ), 'ko' ) . '</a>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe.
				} else {
					echo Socle::badge( __( 'Image OK', 'pose-parquet-core' ), 'ok' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe.
				}
				echo '</td></tr>';
			}
			echo '</tbody></table></div>';
			// Les contenus sans image, un par un, avec l'accès direct à leur édition.
			$sans = [];
			foreach ( $types as $type => $_ ) {
				if ( Types::avec_couverture( $type ) ) {
					foreach ( Images::sans_image( $type ) as $id_sans ) {
						$sans[] = (int) $id_sans;
					}
				}
			}
			if ( $sans ) {
				echo '<h3 class="adm-carte__sous-titre">' . esc_html__( 'Contenus sans image', 'pose-parquet-core' ) . '</h3><ul class="adm-sans-image">';
				foreach ( $sans as $id_sans ) {
					echo '<li><span>' . esc_html( get_the_title( $id_sans ) ) . '</span> <a href="' . esc_url( (string) get_edit_post_link( $id_sans ) ) . '#pp-image">' . esc_html__( 'Ajouter l’image', 'pose-parquet-core' ) . '</a></li>';
				}
				echo '</ul>';
			}
			Socle::carte_fermer();
		}

		if ( $projets ) {
			/*
			 * Orientations : vers qui le site a envoyé les visiteurs, compté en
			 * base (lead_destination). Pas de graphique : quatre nombres et le
			 * lien vers la liste filtrée.
			 */
			$orientations = [
				'premibel'      => __( 'Orientés Premibel', 'pose-parquet-core' ),
				'allure_design' => __( 'Orientés Allure Design', 'pose-parquet-core' ),
				'mixed'         => __( 'Orientés vers les deux', 'pose-parquet-core' ),
				'undetermined'  => __( 'À qualifier', 'pose-parquet-core' ),
			];
			Socle::carte_ouvrir( __( 'Orientations', 'pose-parquet-core' ) );
			echo '<div class="adm-defilement"><table class="adm-table"><thead><tr><th>' . esc_html__( 'Destination', 'pose-parquet-core' ) . '</th><th class="adm-nombre">' . esc_html__( 'Projets', 'pose-parquet-core' ) . '</th></tr></thead><tbody>';
			foreach ( $orientations as $destination => $libelle ) {
				$n = $repo->count_search( [ 'destination' => $destination ] );
				echo '<tr><td><a href="' . esc_url( View::list_url( [ 'destination' => $destination ] ) ) . '">' . esc_html( $libelle ) . '</a></td><td class="adm-nombre">' . (int) $n . '</td></tr>';
			}
			echo '</tbody></table></div>';
			Socle::carte_fermer();

			Socle::carte_ouvrir( __( 'Projets récents', 'pose-parquet-core' ) );
			$recents = array_slice( $repo->search( [ 'page' => 1 ] ), 0, 5 );
			if ( ! $recents ) {
				echo '<p class="adm-vide">' . esc_html__( 'Aucun projet pour le moment.', 'pose-parquet-core' ) . '</p>';
			} else {
				$statuts = Status::labels();
				echo '<div class="adm-defilement"><table class="adm-table"><thead><tr><th>' . esc_html__( 'Date', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Référence', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Besoin', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Orientation', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Statut', 'pose-parquet-core' ) . '</th></tr></thead><tbody>';
				foreach ( $recents as $p ) {
					$dest = (string) ( $p['lead_destination'] ?? '' );
					echo '<tr><td>' . esc_html( mysql2date( 'j M Y', (string) $p['created_at'] ) ) . '</td>';
					echo '<td><a href="' . esc_url( View::detail_url( (int) $p['id'] ) ) . '">' . esc_html( (string) $p['reference'] ) . '</a></td>';
					echo '<td>' . esc_html( Labels::of( 'lead_need', (string) ( $p['lead_need'] ?? '' ) ) ?: '—' ) . '</td>';
					echo '<td>' . esc_html( $dest !== '' ? Labels::of( 'lead_destination', $dest ) : __( 'À qualifier', 'pose-parquet-core' ) ) . '</td>';
					echo '<td>' . Socle::badge( (string) ( $statuts[ (string) $p['status'] ] ?? $p['status'] ) ) . '</td></tr>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe.
				}
				echo '</tbody></table></div>';
			}
			Socle::carte_fermer( '<a href="' . esc_url( View::list_url() ) . '">' . esc_html__( 'Tous les projets', 'pose-parquet-core' ) . '</a>' );
		}
		echo '</div><div>';

		if ( current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			// Publier le site : l'état, la dernière publication, Prévisualiser / Publier.
			\PoseParquet\Core\Publication\Publication::panneau();
			Maintenance::panneau( true );
		}
		if ( $contenus ) {
			$etat = Catalogue::lire();
			echo '<div class="adm-panneau"><div class="adm-panneau__entete"><h2 class="adm-panneau__titre"><span class="dashicons dashicons-products" aria-hidden="true"></span>' . esc_html__( 'Catalogue Premibel', 'pose-parquet-core' ) . '</h2></div>';
			if ( $etat['ok'] ) {
				$d = (array) $etat['donnees'];
				Socle::etat(
					[
						[ __( 'Références', 'pose-parquet-core' ), number_format_i18n( (int) ( $d['produits'] ?? 0 ) ) ],
						[ __( 'Visualisables', 'pose-parquet-core' ), number_format_i18n( (int) ( $d['visualisables'] ?? 0 ) ) ],
						[ __( 'Rendu fidèle', 'pose-parquet-core' ), number_format_i18n( (int) ( $d['statuts']['ready'] ?? 0 ) ) ],
					]
				);
			} else {
				echo '<p class="adm-panneau__texte">' . esc_html__( 'État indisponible : le site public ne répond pas.', 'pose-parquet-core' ) . '</p>';
			}
			echo '<p class="adm-panneau__texte" style="margin:12px 0 0"><a href="' . esc_url( admin_url( 'admin.php?page=' . Catalogue::PAGE ) ) . '">' . esc_html__( 'Voir l’état du catalogue', 'pose-parquet-core' ) . '</a></p></div>';
		}
		echo '</div></div></div>';
	}
}
