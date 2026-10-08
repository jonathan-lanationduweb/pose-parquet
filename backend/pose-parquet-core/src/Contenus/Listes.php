<?php
/**
 * Les listes de contenus, comme la maquette : la liste de WordPress, avec les
 * colonnes Titre, Image, Catégorie, État, Date et un lien « Modifier ».
 *
 * Les filtres Tous / Publiés / Brouillons, la recherche, les actions groupées
 * et la pagination sont ceux de WordPress. On y ajoute un seul filtre :
 * « Image manquante », pour voir d'un coup d'œil les contenus incomplets.
 *
 * Pages du site : à la place de la date de création, l'adresse sur le site et
 * la date de dernière modification — ce qu'on cherche en ouvrant cette liste.
 * Vignettes et badges : composants du socle commun (adm-vignette, adm-badge).
 */

declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Listes {

	public const FILTRE_IMAGE = 'pp_image';

	public static function register(): void {
		foreach ( Types::all() as $type ) {
			add_filter( "manage_{$type}_posts_columns", [ self::class, 'colonnes' ] );
			add_action( "manage_{$type}_posts_custom_column", [ self::class, 'cellule' ], 10, 2 );
			add_filter( "views_edit-{$type}", [ self::class, 'vues' ] );
		}
		add_filter( 'post_row_actions', [ self::class, 'actions_de_ligne' ], 10, 2 );
		add_filter( 'post_row_actions', [ self::class, 'corbeille_en_dernier' ], 30, 2 );
		add_action( 'pre_get_posts', [ self::class, 'requete' ] );
		add_filter( 'display_post_states', [ self::class, 'sans_etat_en_titre' ], 10, 2 );
	}

	/** @param array<string,string> $colonnes */
	public static function colonnes( array $colonnes ): array {
		$type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		// L'image d'abord, puis le titre (et ses actions discrètes au survol).
		$out = [ 'cb' => $colonnes['cb'] ?? '<input type="checkbox" />' ];
		if ( Types::avec_couverture( $type ) ) {
			$out['pp_image'] = __( 'Image', 'pose-parquet-core' );
		}
		$out['title'] = __( 'Titre', 'pose-parquet-core' );
		if ( Types::taxonomie( $type ) ) {
			$out['pp_categorie'] = __( 'Catégorie', 'pose-parquet-core' );
		}
		// Un tutoriel : le temps, le niveau, le nombre d'outils.
		if ( $type === Types::TUTORIEL ) {
			$out['pp_duree']  = __( 'Temps', 'pose-parquet-core' );
			$out['pp_niveau'] = __( 'Niveau', 'pose-parquet-core' );
			$out['pp_outils'] = __( 'Outils', 'pose-parquet-core' );
		}
		// Une inspiration se lit d'un coup d'œil : pièce, motif, teinte, parquet, et le lien vers le Studio.
		if ( $type === Types::INSPIRATION ) {
			$out['pp_piece']   = __( 'Pièce', 'pose-parquet-core' );
			$out['pp_motif']   = __( 'Motif', 'pose-parquet-core' );
			$out['pp_teinte']  = __( 'Teinte', 'pose-parquet-core' );
			$out['pp_parquet'] = __( 'Parquet', 'pose-parquet-core' );
			$out['pp_studio']  = __( 'Studio', 'pose-parquet-core' );
		}
		$out['pp_etat'] = __( 'État', 'pose-parquet-core' );
		if ( $type === Types::PAGE ) {
			$out['pp_modifie'] = __( 'Modifiée le', 'pose-parquet-core' );
		} elseif ( $type !== Types::INSPIRATION ) {
			$out['pp_date'] = __( 'Date', 'pose-parquet-core' );
		}
		// Pages : « Modifier » en toutes lettres (on n'y crée rien, on modifie). Ailleurs, les actions de ligne suffisent.
		if ( $type === Types::PAGE ) {
			$out['pp_modifier'] = '<span class="screen-reader-text">' . esc_html__( 'Modifier', 'pose-parquet-core' ) . '</span>';
		}
		return $out;
	}

	public static function cellule( string $colonne, int $post_id ): void {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return;
		}
		switch ( $colonne ) {
			case 'pp_image':
				$etat = Images::etat( $post );
				if ( $etat === Images::OK ) {
					echo wp_get_attachment_image( (int) get_post_thumbnail_id( $post ), [ 104, 100 ], false, [ 'class' => 'adm-vignette', 'alt' => '' ] );
					echo '<span class="screen-reader-text">' . esc_html__( 'Image OK', 'pose-parquet-core' ) . '</span>';
				} else {
					$texte = $etat === Images::FICHIER_ABSENT ? __( 'Image introuvable', 'pose-parquet-core' ) : __( 'Image manquante', 'pose-parquet-core' );
					echo '<span class="adm-vignette adm-vignette--vide">' . esc_html( $texte ) . '</span>';
				}
				break;
			case 'pp_categorie':
				$tax    = Types::taxonomie( $post->post_type );
				$termes = $tax ? get_the_terms( $post, $tax ) : [];
				echo is_array( $termes ) && $termes ? esc_html( $termes[0]->name ) : '—';
				break;
			case 'pp_piece':
				$piece = (string) get_post_meta( $post_id, '_pp_piece', true );
				echo esc_html( Champs::PIECES[ $piece ] ?? '—' );
				break;
			case 'pp_duree':
				$duree = (string) get_post_meta( $post_id, '_pp_duree', true );
				echo esc_html( $duree !== '' ? $duree : '—' );
				break;
			case 'pp_niveau':
				$niveau = (string) get_post_meta( $post_id, '_pp_niveau', true );
				echo esc_html( Champs::NIVEAUX[ $niveau ] ?? ( $niveau !== '' ? $niveau : '—' ) );
				break;
			case 'pp_outils':
				$outils = array_filter( array_map( 'trim', preg_split( '/\R/', (string) get_post_meta( $post_id, '_pp_outils', true ) ) ?: [] ) );
				echo $outils ? esc_html( sprintf( /* translators: %d : nombre */ _n( '%d outil', '%d outils', count( $outils ), 'pose-parquet-core' ), count( $outils ) ) ) : '<span class="adm-discret">—</span>';
				break;
			case 'pp_motif':
				$libelle = (string) get_post_meta( $post_id, '_pp_motif_libelle', true );
				$motif   = (string) get_post_meta( $post_id, '_pp_motif', true );
				echo esc_html( $libelle !== '' ? $libelle : ( Champs::MOTIFS_FILTRE[ $motif ] ?? '—' ) );
				break;
			case 'pp_teinte':
				$teinte = (string) get_post_meta( $post_id, '_pp_teinte', true );
				echo esc_html( $teinte !== '' ? $teinte : '—' );
				break;
			case 'pp_parquet':
				$parquet = (string) get_post_meta( $post_id, '_pp_parquet', true );
				echo $parquet !== '' ? '<span class="adm-discret">' . esc_html( $parquet ) . '</span>' : '—';
				break;
			case 'pp_studio':
				// Le même lien que celui généré dans l'écran d'édition, ouvert sur le site public.
				$scene = (string) get_post_meta( $post_id, '_pp_scene', true );
				if ( get_post_meta( $post_id, '_pp_studio', true ) === '1' && $scene !== '' ) {
					$args = [ 'piece' => $scene ];
					foreach ( [ 'parquet' => '_pp_parquet', 'motif' => '_pp_studio_motif' ] as $cle => $meta ) {
						$valeur = (string) get_post_meta( $post_id, $meta, true );
						if ( $valeur !== '' ) {
							$args[ $cle ] = $valeur;
						}
					}
					echo '<a href="' . esc_url( \PoseParquet\Core\Admin\SitePublic::url() . 'outils/studio.html?' . http_build_query( $args ) ) . '" target="_blank" rel="noopener">' . esc_html__( 'Essayer', 'pose-parquet-core' ) . ' <span aria-hidden="true">↗</span></a>';
				} else {
					echo '<span class="adm-discret">—</span>';
				}
				break;
			case 'pp_etat':
				$etats = [
					'publish' => [ __( 'Publié', 'pose-parquet-core' ), 'ok' ],
					'draft'   => [ __( 'Brouillon', 'pose-parquet-core' ), 'neutre' ],
					'pending' => [ __( 'En attente', 'pose-parquet-core' ), 'attente' ],
					'future'  => [ __( 'Planifié', 'pose-parquet-core' ), 'attente' ],
					'private' => [ __( 'Privé', 'pose-parquet-core' ), 'neutre' ],
				];
				[ $libelle, $classe ] = $etats[ $post->post_status ] ?? [ $post->post_status, 'neutre' ];
				echo \PoseParquet\Core\Admin\Socle::badge( $libelle, $classe ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe.
				break;
			case 'pp_date':
				echo esc_html( date_i18n( 'j M Y', strtotime( $post->post_date ) ) );
				break;
			case 'pp_modifie':
				echo esc_html( date_i18n( 'j M Y à H:i', strtotime( $post->post_modified ) ) );
				break;
			case 'pp_adresse':
				$adresse = (string) get_post_meta( $post_id, '_pp_adresse', true );
				echo $adresse !== '' ? '<code>' . esc_html( $adresse ) . '</code>' : '—';
				break;
			case 'pp_modifier':
				if ( current_user_can( 'edit_post', $post_id ) ) {
					echo '<a href="' . esc_url( (string) get_edit_post_link( $post_id ) ) . '">' . esc_html__( 'Modifier', 'pose-parquet-core' ) . '</a>';
				}
				break;
		}
	}

	/** Le filtre « Image manquante », à la suite de Tous / Publiés / Brouillons. */
	public static function vues( array $vues ): array {
		$type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! Types::avec_couverture( $type ) ) {
			return $vues;
		}
		$n = count( Images::sans_image( $type ) );
		if ( $n === 0 ) {
			return $vues;
		}
		$actif = isset( $_GET[ self::FILTRE_IMAGE ] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$url   = add_query_arg( [ 'post_type' => $type, self::FILTRE_IMAGE => 'manquante' ], admin_url( 'edit.php' ) );
		$vues['pp_image'] = '<a href="' . esc_url( $url ) . '"' . ( $actif ? ' class="current" aria-current="page"' : '' ) . '>' . esc_html__( 'Image manquante', 'pose-parquet-core' ) . ' <span class="count">(' . (int) $n . ')</span></a>';
		return $vues;
	}

	public static function requete( \WP_Query $q ): void {
		if ( ! is_admin() || ! $q->is_main_query() ) {
			return;
		}
		$type = $q->get( 'post_type' );
		if ( ! is_string( $type ) || ! in_array( $type, Types::all(), true ) ) {
			return;
		}
		if ( $type === Types::PAGE && ! isset( $_GET['orderby'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			// Les pages dans l'ordre du site : Accueil d'abord.
			$q->set( 'orderby', [ 'menu_order' => 'ASC', 'title' => 'ASC' ] );
		}
		if ( isset( $_GET[ self::FILTRE_IMAGE ] ) && Types::avec_couverture( $type ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$ids = Images::sans_image( $type );
			$q->set( 'post__in', $ids ? $ids : [ 0 ] );
		}
	}

	/** Lignes : Modifier et Corbeille. Pas de « Modification rapide » ni d'aperçu (aucune page publique ici). */
	public static function actions_de_ligne( array $actions, \WP_Post $post ): array {
		if ( ! in_array( $post->post_type, Types::all(), true ) ) {
			return $actions;
		}
		unset( $actions['inline hide-if-no-js'], $actions['view'], $actions['preview'] );
		if ( $post->post_type === Types::PAGE ) {
			unset( $actions['trash'] );
		}
		return $actions;
	}

	/** La corbeille, seule action destructive, en dernier : Modifier · Aperçu · Dupliquer · Corbeille (après Apercu, priorité 20). */
	public static function corbeille_en_dernier( array $actions, \WP_Post $post ): array {
		if ( in_array( $post->post_type, Types::all(), true ) && isset( $actions['trash'] ) ) {
			$corbeille = $actions['trash'];
			unset( $actions['trash'] );
			$actions['trash'] = $corbeille;
		}
		return $actions;
	}

	/** L'état est dans sa colonne : pas de « — Brouillon » accolé au titre. */
	public static function sans_etat_en_titre( array $etats, \WP_Post $post ): array {
		return in_array( $post->post_type, Types::all(), true ) ? [] : $etats;
	}
}
