<?php
/**
 * « Gestion du site » : le tableau de bord du module, dans le socle commun
 * (référence : la maquette du socle LNDW, EP_Admin_Contenu::gestion_du_site).
 *
 * Simple : une rangée de raccourcis (chaque partie du site, ce qu'elle
 * contient, l'action courante), les derniers contenus et projets, et en
 * colonne droite l'état du site (publication, maintenance, orientations,
 * catalogue). Pas de graphique, pas d'indicateur décoratif. L'attention ne
 * marque que ce qui demande une action (images manquantes). Chaque bloc ne
 * s'affiche qu'à qui a le droit d'y agir.
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
		$reglages = current_user_can( Capabilities::MANAGE_SETTINGS );
		if ( ! $contenus && ! $projets ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), esc_html__( 'Accès refusé', 'pose-parquet-core' ), [ 'response' => 403 ] );
		}
		$noms = [
			Types::GUIDE       => __( 'Guide', 'pose-parquet-core' ),
			Types::TUTORIEL    => __( 'Tutoriel', 'pose-parquet-core' ),
			Types::INSPIRATION => __( 'Inspiration', 'pose-parquet-core' ),
			Types::PAGE        => __( 'Page', 'pose-parquet-core' ),
		];
		$publies = [];
		$sans    = [];
		foreach ( $noms as $type => $_ ) {
			$publies[ $type ] = (int) ( wp_count_posts( $type )->publish ?? 0 );
			if ( Types::avec_couverture( $type ) ) {
				foreach ( Images::sans_image( $type ) as $id_sans ) {
					$sans[] = (int) $id_sans;
				}
			}
		}
		$repo = new Repository();

		echo '<div class="wrap adm-gestion pp-admin">';
		Socle::entete( __( 'Gestion du site', 'pose-parquet-core' ), __( 'Gérez les contenus, l’identité et la publication du site Pose Parquet depuis WordPress.', 'pose-parquet-core' ) );

		/*
		 * Les raccourcis : une carte par partie du site, avec ce qu'il y a et
		 * l'action la plus courante. C'est l'écran d'accueil, pas un relevé de
		 * statistiques (référence : « Gestion du site » du socle).
		 */
		$cartes = [];
		if ( $contenus ) {
			$liste    = static fn( string $type ): string => admin_url( 'edit.php?post_type=' . $type );
			$ajouter  = static fn( string $type ): string => admin_url( 'post-new.php?post_type=' . $type );
			$cartes[] = [ 'dashicons-media-document', __( 'Guides', 'pose-parquet-core' ), sprintf( _n( '%d guide publié', '%d guides publiés', $publies[ Types::GUIDE ], 'pose-parquet-core' ), $publies[ Types::GUIDE ] ), $liste( Types::GUIDE ), __( 'Ajouter', 'pose-parquet-core' ), $ajouter( Types::GUIDE ), false ];
			$cartes[] = [ 'dashicons-hammer', __( 'Tutoriels', 'pose-parquet-core' ), sprintf( _n( '%d tutoriel publié', '%d tutoriels publiés', $publies[ Types::TUTORIEL ], 'pose-parquet-core' ), $publies[ Types::TUTORIEL ] ), $liste( Types::TUTORIEL ), __( 'Ajouter', 'pose-parquet-core' ), $ajouter( Types::TUTORIEL ), false ];
			$cartes[] = [ 'dashicons-format-gallery', __( 'Inspirations', 'pose-parquet-core' ), sprintf( _n( '%d inspiration', '%d inspirations', $publies[ Types::INSPIRATION ], 'pose-parquet-core' ), $publies[ Types::INSPIRATION ] ), $liste( Types::INSPIRATION ), __( 'Ajouter', 'pose-parquet-core' ), $ajouter( Types::INSPIRATION ), false ];
			$cartes[] = [ 'dashicons-edit', __( 'Pages', 'pose-parquet-core' ), __( 'Accueil, À propos, Contact…', 'pose-parquet-core' ), $liste( Types::PAGE ), __( 'Modifier', 'pose-parquet-core' ), $liste( Types::PAGE ), false ];
			$n_sans   = count( $sans );
			$premier  = $n_sans ? (string) get_post_type( $sans[0] ) : '';
			$cartes[] = $n_sans
				? [ 'dashicons-format-image', __( 'Images', 'pose-parquet-core' ), sprintf( _n( '%d contenu sans image', '%d contenus sans image', $n_sans, 'pose-parquet-core' ), $n_sans ), admin_url( 'upload.php' ), __( 'Compléter', 'pose-parquet-core' ), add_query_arg( Listes::FILTRE_IMAGE, 'manquante', $liste( $premier ) ), true ]
				: [ 'dashicons-format-image', __( 'Images', 'pose-parquet-core' ), __( 'Toutes les couvertures en place', 'pose-parquet-core' ), admin_url( 'upload.php' ), __( 'Médiathèque', 'pose-parquet-core' ), admin_url( 'upload.php' ), false ];
		}
		if ( $reglages ) {
			$cartes[] = [ 'dashicons-admin-site-alt3', __( 'Mon site', 'pose-parquet-core' ), __( 'Logo, navigation, pied de page', 'pose-parquet-core' ), \PoseParquet\Core\Site\MonSite::url(), __( 'Configurer', 'pose-parquet-core' ), \PoseParquet\Core\Site\MonSite::url(), false ];
		}
		if ( $projets ) {
			$n_projets = $repo->count();
			$cartes[]  = [ 'dashicons-clipboard', __( 'Projets', 'pose-parquet-core' ), sprintf( _n( '%d projet orienté', '%d projets orientés', $n_projets, 'pose-parquet-core' ), $n_projets ), View::list_url(), __( 'Voir', 'pose-parquet-core' ), View::list_url(), false ];
		}
		echo '<nav class="adm-raccourcis" aria-label="' . esc_attr__( 'Raccourcis', 'pose-parquet-core' ) . '">';
		foreach ( $cartes as [ $icone, $titre, $ligne, $url, $action, $url_action, $attention ] ) {
			echo '<div class="adm-raccourci' . ( $attention ? ' adm-raccourci--attention' : '' ) . '">';
			echo '<span class="dashicons ' . esc_attr( $icone ) . ' adm-raccourci__icone" aria-hidden="true"></span>';
			echo '<a class="adm-raccourci__titre" href="' . esc_url( $url ) . '">' . esc_html( $titre ) . '</a>';
			echo '<span class="adm-raccourci__ligne">' . esc_html( $ligne ) . '</span>';
			echo '<a class="adm-raccourci__action" href="' . esc_url( $url_action ) . '">' . esc_html( $action ) . ' <span aria-hidden="true">→</span></a>';
			echo '</div>';
		}
		echo '</nav>';

		echo '<div class="adm-grille"><div>';
		if ( $contenus ) {
			// Ce qui manque d'abord, s'il manque quelque chose.
			if ( $sans ) {
				// Le nombre est déjà sur le raccourci « Images » : ici, la liste suffit.
				Socle::carte_ouvrir( __( 'À compléter', 'pose-parquet-core' ) );
				echo '<ul class="adm-sans-image">';
				foreach ( $sans as $id_sans ) {
					echo '<li><span>' . esc_html( get_the_title( $id_sans ) ) . ' <span class="adm-discret">· ' . esc_html( $noms[ (string) get_post_type( $id_sans ) ] ?? '' ) . '</span></span> <a href="' . esc_url( (string) get_edit_post_link( $id_sans ) ) . '#pp-image">' . esc_html__( 'Ajouter l’image', 'pose-parquet-core' ) . '</a></li>';
				}
				echo '</ul>';
				Socle::carte_fermer();
			}

			// Derniers contenus modifiés, tous types confondus.
			$derniers = get_posts(
				[
					'post_type'      => array_keys( $noms ),
					'post_status'    => [ 'publish', 'draft', 'pending', 'future' ],
					'orderby'        => 'modified',
					'order'          => 'DESC',
					'posts_per_page' => 6,
				]
			);
			Socle::carte_ouvrir( __( 'Derniers contenus', 'pose-parquet-core' ) );
			if ( ! $derniers ) {
				Socle::vide( __( 'Aucun contenu pour le moment.', 'pose-parquet-core' ), '', 'dashicons-media-document' );
			} else {
				echo '<div class="adm-defilement"><table class="adm-table adm-table--empilable adm-derniers"><thead><tr><th>' . esc_html__( 'Titre', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Type', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Statut', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Dernière modification', 'pose-parquet-core' ) . '</th></tr></thead><tbody>';
				foreach ( $derniers as $d ) {
					$vignette = Types::avec_couverture( $d->post_type ) && has_post_thumbnail( $d )
						? (string) get_the_post_thumbnail( $d, [ 80, 60 ], [ 'class' => 'adm-derniers__vignette', 'alt' => '' ] )
						: '<span class="adm-derniers__vignette adm-derniers__vignette--vide" aria-hidden="true"><span class="dashicons ' . ( Types::avec_couverture( $d->post_type ) ? 'dashicons-format-image' : 'dashicons-media-default' ) . '"></span></span>';
					$publie   = $d->post_status === 'publish';
					echo '<tr><th scope="row"><a class="adm-derniers__titre" href="' . esc_url( (string) get_edit_post_link( $d->ID ) ) . '">' . $vignette . '<span>' . esc_html( get_the_title( $d ) ) . '</span></a></th>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- vignette composée par WordPress ou ci-dessus.
					echo '<td data-label="' . esc_attr__( 'Type', 'pose-parquet-core' ) . '">' . esc_html( $noms[ $d->post_type ] ?? '' ) . '</td>';
					echo '<td data-label="' . esc_attr__( 'Statut', 'pose-parquet-core' ) . '">' . Socle::badge( $publie ? __( 'Publié', 'pose-parquet-core' ) : __( 'Brouillon', 'pose-parquet-core' ), $publie ? 'ok' : 'neutre' ) . '</td>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe.
					echo '<td data-label="' . esc_attr__( 'Modifié', 'pose-parquet-core' ) . '" class="adm-discret">' . esc_html( wp_date( 'j M Y à H:i', (int) get_post_modified_time( 'U', true, $d ) ) ) . '</td></tr>';
				}
				echo '</tbody></table></div>';
			}
			Socle::carte_fermer();
		}

		if ( $projets ) {
			Socle::carte_ouvrir( __( 'Projets récents', 'pose-parquet-core' ) );
			$recents = array_slice( $repo->search( [ 'page' => 1 ] ), 0, 5 );
			if ( ! $recents ) {
				Socle::vide( __( 'Aucun projet pour le moment.', 'pose-parquet-core' ), __( 'Les projets orientés depuis le site apparaîtront ici.', 'pose-parquet-core' ), 'dashicons-portfolio' );
			} else {
				$statuts = Status::labels();
				echo '<div class="adm-defilement"><table class="adm-table adm-table--empilable"><thead><tr><th>' . esc_html__( 'Référence', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Besoin', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Orientation', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Statut', 'pose-parquet-core' ) . '</th><th>' . esc_html__( 'Date', 'pose-parquet-core' ) . '</th></tr></thead><tbody>';
				foreach ( $recents as $p ) {
					// Comme la liste des projets : une demande sans destination (avant le schéma 4) affiche « — », pas « À qualifier ».
					$dest = (string) ( $p['lead_destination'] ?? '' );
					echo '<tr><th scope="row"><a class="adm-ref" href="' . esc_url( View::detail_url( (int) $p['id'] ) ) . '">' . esc_html( (string) $p['reference'] ) . '</a></th>';
					echo '<td data-label="' . esc_attr__( 'Besoin', 'pose-parquet-core' ) . '">' . esc_html( Labels::of( 'lead_need', (string) ( $p['lead_need'] ?? '' ) ) ?: '—' ) . '</td>';
					echo '<td data-label="' . esc_attr__( 'Orientation', 'pose-parquet-core' ) . '">' . esc_html( $dest !== '' ? Labels::of( 'lead_destination', $dest ) : '—' ) . '</td>';
					echo '<td data-label="' . esc_attr__( 'Statut', 'pose-parquet-core' ) . '"><span class="pp-status pp-status--' . esc_attr( (string) $p['status'] ) . '">' . esc_html( (string) ( $statuts[ (string) $p['status'] ] ?? $p['status'] ) ) . '</span></td>';
					echo '<td data-label="' . esc_attr__( 'Date', 'pose-parquet-core' ) . '" class="adm-discret">' . esc_html( mysql2date( 'j M Y', (string) $p['created_at'] ) ) . '</td></tr>';
				}
				echo '</tbody></table></div>';
			}
			Socle::carte_fermer( '<a href="' . esc_url( View::list_url() ) . '">' . esc_html__( 'Tous les projets →', 'pose-parquet-core' ) . '</a>' );
		}
		echo '</div><div>';

		if ( $reglages ) {
			\PoseParquet\Core\Publication\Publication::panneau();
			Maintenance::panneau( true );
		}
		if ( $projets ) {
			// Orientations : vers qui le site a envoyé les visiteurs (lead_destination). Quatre nombres, la liste filtrée en lien.
			$orientations = [
				'premibel'      => __( 'Premibel', 'pose-parquet-core' ),
				'allure_design' => __( 'Allure Design', 'pose-parquet-core' ),
				'mixed'         => __( 'Les deux', 'pose-parquet-core' ),
				'undetermined'  => __( 'À qualifier', 'pose-parquet-core' ),
			];
			echo '<div class="adm-panneau"><div class="adm-panneau__entete"><h2 class="adm-panneau__titre"><span class="dashicons dashicons-randomize" aria-hidden="true"></span>' . esc_html__( 'Orientations', 'pose-parquet-core' ) . '</h2></div><ul class="adm-compte">';
			foreach ( $orientations as $destination => $libelle ) {
				$n = $repo->count_search( [ 'destination' => $destination ] );
				echo '<li><a href="' . esc_url( View::list_url( [ 'destination' => $destination ] ) ) . '">' . esc_html( $libelle ) . '</a><span class="adm-compte__valeur' . ( $n ? '' : ' adm-compte__valeur--zero' ) . '">' . (int) $n . '</span></li>';
			}
			echo '</ul></div>';
		}
		if ( $contenus ) {
			$etat = Catalogue::lire();
			echo '<div class="adm-panneau"><div class="adm-panneau__entete"><h2 class="adm-panneau__titre"><span class="dashicons dashicons-products" aria-hidden="true"></span>' . esc_html__( 'Catalogue Premibel', 'pose-parquet-core' ) . '</h2></div>';
			if ( $etat['ok'] ) {
				$d = (array) $etat['donnees'];
				echo '<p class="adm-catalogue-resume"><strong>' . esc_html( number_format_i18n( (int) ( $d['produits'] ?? 0 ) ) ) . '</strong> ' . esc_html__( 'références', 'pose-parquet-core' ) . '</p>';
				echo '<p class="adm-catalogue-detail">' . esc_html(
					sprintf(
						/* translators: 1: visualisables, 2: rendu fidèle */
						__( '%1$s visualisables · %2$s fidèles', 'pose-parquet-core' ),
						number_format_i18n( (int) ( $d['visualisables'] ?? 0 ) ),
						number_format_i18n( (int) ( $d['statuts']['ready'] ?? 0 ) )
					)
				) . '</p>';
			} else {
				echo '<p class="adm-panneau__texte">' . esc_html__( 'État indisponible : le site public ne répond pas.', 'pose-parquet-core' ) . '</p>';
			}
			echo '<p class="adm-panneau__lien"><a href="' . esc_url( admin_url( 'admin.php?page=' . Catalogue::PAGE ) ) . '">' . esc_html__( 'Voir le catalogue →', 'pose-parquet-core' ) . '</a></p></div>';
		}
		echo '</div></div></div>';
	}
}
