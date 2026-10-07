<?php
/**
 * L'écran « Ajouter / Modifier » des contenus, tel que la maquette le montre.
 *
 *   colonne principale          colonne de droite
 *   ─────────────────           ─────────────────
 *   Titre                        Publication   (celle de WordPress)
 *   Image de couverture          Catégorie     (liste déroulante)
 *   Résumé                       Référencement (meta title, meta description, slug)
 *   Contenu (éditeur classique)
 *
 * Tout passe par les écrans de WordPress : le bouton Publier, les brouillons,
 * les révisions, la médiathèque. Ce module n'ajoute que des champs, et chaque
 * enregistrement est contrôlé : jeton (nonce), droit sur CE contenu, liste
 * fermée de champs, nettoyage par type (Champs::nettoyer).
 *
 * Présentation : les composants du socle commun (adm-champ, adm-image,
 * adm-bloc), comme l'édition d'Expert Parquet.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Edition {

	private const NONCE        = 'pp_contenu_nonce';
	private const NONCE_ACTION = 'pp_contenu_enregistrer';

	public static function register(): void {
		foreach ( Types::all() as $type ) {
			add_action( "add_meta_boxes_{$type}", [ self::class, 'boites' ] );
			add_action( "save_post_{$type}", [ self::class, 'enregistrer' ], 10, 2 );
		}
		add_action( 'edit_form_after_title', [ self::class, 'colonne_principale' ] );
		add_action( 'load-post.php', [ self::class, 'editeur_des_pages' ] );
		add_action( 'admin_notices', [ self::class, 'avertissements' ] );
		add_filter( 'enter_title_here', [ self::class, 'invite_titre' ], 10, 2 );
		add_filter( 'attachment_fields_to_edit', [ self::class, 'champ_credit' ], 10, 2 );
		add_filter( 'attachment_fields_to_save', [ self::class, 'enregistrer_credit' ], 10, 2 );
		add_filter( 'tiny_mce_before_init', [ self::class, 'base_des_images' ], 10, 2 );
		add_filter( 'wp_insert_post_data', [ self::class, 'corps_inchange' ], 10, 2 );
	}

	/**
	 * Un corps qu'on n'a pas touché reste tel quel.
	 *
	 * L'éditeur visuel réécrit TOUJOURS le HTML qu'il charge : il retire les
	 * paragraphes (wpautop), normalise les espaces, ajoute un « &nbsp; »
	 * initial. Enregistrer un guide pour changer son résumé suffisait donc à
	 * transformer son corps — et, publié, le site changeait sans que personne
	 * ne l'ait voulu. Le navigateur dit si le corps a été modifié
	 * (admin.js : TinyMCE `isDirty()`, ou le texte de l'onglet Code) ; s'il ne
	 * l'a pas été, le corps enregistré est remis tel qu'il était.
	 *
	 * @param array<string,mixed> $data    données « slashées » de wp_insert_post
	 * @param array<string,mixed> $postarr
	 */
	public static function corps_inchange( array $data, array $postarr ): array {
		$id = (int) ( $postarr['ID'] ?? 0 );
		if ( ! $id || empty( $_POST['pp_corps_inchange'] ) || ! in_array( (string) ( $data['post_type'] ?? '' ), Types::all(), true ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing -- jeton vérifié ci-dessous.
			return $data;
		}
		if ( ! isset( $_POST[ self::NONCE ] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::NONCE ] ) ), self::NONCE_ACTION ) || ! current_user_can( 'edit_post', $id ) ) {
			return $data;
		}
		$data['post_content'] = wp_slash( (string) get_post_field( 'post_content', $id, 'raw' ) );
		return $data;
	}

	/**
	 * Les illustrations des articles importés gardent leurs chemins du site
	 * (« ../assets/images/guide-x.jpg ») : c'est ce que le site publie, et le
	 * générateur les reprend tels quels. Dans l'éditeur, ce chemin relatif
	 * pointerait vers wp-admin et l'image serait cassée.
	 *
	 * On donne à l'éditeur la BASE du site public pour ce type de contenu
	 * (`document_base_url`) : il résout « ../assets/… » sur le vrai site et
	 * affiche l'image, sans réécrire le HTML enregistré (convert_urls désactivé)
	 * et sans copier un seul fichier dans la médiathèque. Les images ajoutées
	 * depuis la médiathèque ont une adresse absolue : la base ne les touche pas.
	 *
	 * @param array<string,mixed> $init
	 */
	public static function base_des_images( array $init, string $editeur_id = '' ): array {
		if ( $editeur_id !== 'content' ) {
			return $init;
		}
		$ecran   = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		$type    = $ecran ? (string) $ecran->post_type : '';
		$dossier = [
			Types::GUIDE       => 'guides/',
			Types::TUTORIEL    => 'tutoriels/',
			Types::INSPIRATION => 'inspirations/',
			Types::PAGE        => 'a-propos/',
		][ $type ] ?? null;
		if ( $dossier === null ) {
			return $init;
		}
		// Le dossier local du site s'il est réglé (route en lecture seule), sinon le site public.
		$init['document_base_url'] = Apercu::base() . $dossier;
		// Ne jamais réécrire les adresses existantes à l'enregistrement.
		$init['relative_urls']      = false;
		$init['remove_script_host'] = false;
		$init['convert_urls']       = false;
		// Les icônes des encadrés (callout) sont des SVG en ligne : l'éditeur ne les gardait pas.
		$init['extended_valid_elements'] = trim( ( (string) ( $init['extended_valid_elements'] ?? '' ) ) . ',svg[class|viewbox|viewBox|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|aria-hidden|width|height],path[d]', ',' );
		$init['valid_children']          = trim( ( (string) ( $init['valid_children'] ?? '' ) ) . ',+p[svg],+span[svg],+svg[path]', ',' );
		return $init;
	}

	private static function est_notre( ?\WP_Post $post ): bool {
		return $post instanceof \WP_Post && in_array( $post->post_type, Types::all(), true );
	}

	public static function invite_titre( string $texte, \WP_Post $post ): string {
		return self::est_notre( $post ) ? __( 'Titre', 'pose-parquet-core' ) : $texte;
	}

	/**
	 * Pages du site : seul « À propos » a un texte libre que le site sait
	 * placer (sa colonne de texte). Les autres pages ont une structure de
	 * sections écrite dans le code : on y modifie le titre, le chapô et le SEO,
	 * pas un corps qui ne serait affiché nulle part.
	 */
	public static function editeur_des_pages(): void {
		$id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$post = $id ? get_post( $id ) : null;
		if ( $post && $post->post_type === Types::PAGE && get_post_meta( $id, '_pp_corps_editable', true ) !== '1' ) {
			remove_post_type_support( Types::PAGE, 'editor' );
		}
	}

	/** Colonne de droite : on retire ce que la maquette ne montre pas, on ajoute Catégorie et SEO. */
	public static function boites( \WP_Post $post ): void {
		$type = $post->post_type;
		foreach ( [ 'postexcerpt', 'postimagediv', 'slugdiv', 'authordiv', 'commentstatusdiv', 'commentsdiv', 'trackbacksdiv', 'postcustom' ] as $boite ) {
			remove_meta_box( $boite, $type, 'normal' );
			remove_meta_box( $boite, $type, 'side' );
			remove_meta_box( $boite, $type, 'advanced' );
		}
		// Ordre de la maquette : Publication (WordPress), Catégorie, SEO — puis
		// les détails propres au type.
		if ( Types::taxonomie( $type ) ) {
			add_meta_box( 'pp_categorie', __( 'Catégorie', 'pose-parquet-core' ), [ self::class, 'boite_categorie' ], $type, 'side', 'default' );
		}
		if ( $type === Types::INSPIRATION ) {
			add_meta_box( 'pp_studio', __( 'Lien vers le Studio', 'pose-parquet-core' ), [ self::class, 'boite_studio' ], $type, 'side', 'default' );
		} else {
			add_meta_box( 'pp_seo', __( 'Référencement', 'pose-parquet-core' ), [ self::class, 'boite_seo' ], $type, 'side', 'default' );
		}
		$cote = array_filter( Champs::pour( $type ), static fn( array $d ): bool => ( $d['ui'] ?? '' ) === 'cote' );
		if ( $cote ) {
			add_meta_box( 'pp_details', __( 'Détails', 'pose-parquet-core' ), [ self::class, 'boite_details' ], $type, 'side', 'low' );
		}
	}

	/** Un champ de formulaire, d'après sa définition. Tout est échappé. */
	private static function champ( string $cle, array $def, string $valeur ): void {
		$id   = 'pp-' . trim( $cle, '_' );
		$name = 'pp_champ[' . $cle . ']';
		// Longueurs conseillées, comme le compteur du socle (titre 60, description 160).
		$conseil  = [ Champs::META_TITLE => 60, Champs::META_DESCRIPTION => 160 ][ $cle ] ?? 0;
		$compteur = $conseil ? ' data-adm-compteur="' . $conseil . '"' : '';
		$libelle  = [ Champs::META_TITLE => __( 'Titre SEO', 'pose-parquet-core' ), Champs::META_DESCRIPTION => __( 'Meta description', 'pose-parquet-core' ) ][ $cle ] ?? (string) ( $def['label'] ?? $cle );
		echo '<p class="adm-champ' . ( $def['type'] === 'bool' ? ' adm-champ--case' : '' ) . '"><label for="' . esc_attr( $id ) . '">' . esc_html( $libelle ) . '</label>';
		switch ( $def['type'] ) {
			case 'textarea':
			case 'lines':
				echo '<textarea id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" rows="' . ( $def['type'] === 'lines' ? 5 : 3 ) . '"' . ( ! empty( $def['max'] ) ? ' maxlength="' . (int) $def['max'] . '"' : '' ) . $compteur . '>' . esc_textarea( $valeur ) . '</textarea>';
				break;
			case 'select':
				echo '<select id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '"><option value="">—</option>';
				foreach ( (array) $def['options'] as $v => $l ) {
					echo '<option value="' . esc_attr( (string) $v ) . '"' . selected( $valeur, (string) $v, false ) . '>' . esc_html( (string) $l ) . '</option>';
				}
				echo '</select>';
				break;
			case 'bool':
				echo '<input type="hidden" name="' . esc_attr( $name ) . '" value="0" />';
				echo '<span class="adm-case"><input type="checkbox" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="1"' . checked( $valeur, '1', false ) . ' /></span>';
				break;
			default:
				echo '<input type="text" class="widefat" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( $valeur ) . '"' . ( ! empty( $def['max'] ) ? ' maxlength="' . (int) $def['max'] . '"' : '' ) . $compteur . ' />';
		}
		if ( ! empty( $def['aide'] ) ) {
			echo '<span class="description">' . esc_html( (string) $def['aide'] ) . '</span>';
		}
		echo '</p>';
	}

	private static function champs_de( \WP_Post $post, string $ui ): void {
		foreach ( Champs::pour( $post->post_type ) as $cle => $def ) {
			if ( ( $def['ui'] ?? '' ) === $ui ) {
				self::champ( $cle, $def, (string) get_post_meta( $post->ID, $cle, true ) );
			}
		}
	}

	/** Colonne principale, entre le titre et l'éditeur. */
	public static function colonne_principale( \WP_Post $post ): void {
		if ( ! self::est_notre( $post ) ) {
			return;
		}
		wp_nonce_field( self::NONCE_ACTION, self::NONCE );
		$type = $post->post_type;

		if ( $type === Types::PAGE ) {
			$adresse = (string) get_post_meta( $post->ID, '_pp_adresse', true );
			if ( $adresse !== '' ) {
				echo '<p class="adm-note">' . esc_html__( 'Adresse sur le site :', 'pose-parquet-core' ) . ' <code>' . esc_html( $adresse ) . '</code> — ' . esc_html__( 'fixe, la mise en page reste celle du site.', 'pose-parquet-core' ) . '</p>';
			}
		}

		if ( Types::avec_couverture( $type ) ) {
			$id_image = (int) get_post_thumbnail_id( $post );
			$src      = $id_image ? wp_get_attachment_image_url( $id_image, 'large' ) : '';
			$titre    = $type === Types::INSPIRATION ? __( 'Image', 'pose-parquet-core' ) : __( 'Image de couverture', 'pose-parquet-core' );
			// Bloc image du socle : en-tête (libellé + actions), aperçu 16/9.
			echo '<div class="adm-bloc adm-image" id="pp-image" data-pp-couverture>';
			echo '<div class="adm-image__entete"><h2 class="adm-bloc__titre">' . esc_html( $titre ) . '</h2><span class="adm-image__actions">';
			echo '<button type="button" class="adm-bouton adm-bouton--petit" data-pp-choisir><span class="dashicons dashicons-format-image" aria-hidden="true"></span><span data-pp-choisir-texte>' . esc_html( $src ? __( 'Remplacer l’image', 'pose-parquet-core' ) : __( 'Choisir une image', 'pose-parquet-core' ) ) . '</span></button>';
			echo '<button type="button" class="adm-bouton adm-bouton--petit adm-bouton--danger" data-pp-retirer' . ( $src ? '' : ' hidden' ) . '>' . esc_html__( 'Retirer', 'pose-parquet-core' ) . '</button>';
			echo '</span></div>';
			echo '<input type="hidden" name="pp_couverture" value="' . esc_attr( (string) $id_image ) . '" data-pp-couverture-id />';
			echo '<div class="adm-image__apercu" data-pp-couverture-apercu>';
			if ( $src ) {
				echo '<img src="' . esc_url( $src ) . '" alt="" />';
			} else {
				echo '<span class="adm-image__vide adm-image__vide--alerte">' . esc_html__( 'Image manquante', 'pose-parquet-core' ) . '</span>';
			}
			echo '</div></div>';
		}

		$textes = $type !== Types::PAGE || get_post_meta( $post->ID, '_pp_textes', true ) === '1';
		if ( ! $textes && ! Export::schema_page( $post ) ) {
			echo '<p class="adm-note">' . esc_html__( 'L’en-tête de cette page est composé par le site : seul son référencement se règle ici.', 'pose-parquet-core' ) . '</p>';
		}

		if ( $textes && $type === Types::PAGE ) {
			echo '<div class="adm-bloc">';
			self::champs_de( $post, 'principal' );
			echo '</div>';
		}

		if ( $textes && post_type_supports( $type, 'excerpt' ) ) {
			$libelle = $type === Types::PAGE ? __( 'Chapô', 'pose-parquet-core' ) : __( 'Résumé', 'pose-parquet-core' );
			echo '<div class="adm-bloc"><h2 class="adm-bloc__titre"><label for="excerpt">' . esc_html( $libelle ) . '</label></h2>';
			// Valeur BRUTE : `$post` est préparé dans le contexte « edit », où WordPress a
			// déjà échappé le résumé ; l'échapper encore doublait l'échappement à chaque
			// enregistrement (' → &#039; → &amp;#039;).
			echo '<textarea id="excerpt" name="excerpt" rows="3" class="adm-resume">' . esc_textarea( (string) get_post_field( 'post_excerpt', $post->ID, 'raw' ) ) . '</textarea></div>';
		}

		if ( $type === Types::INSPIRATION ) {
			echo '<div class="adm-bloc adm-deux-champs">';
			self::champs_de( $post, 'carte' );
			echo '</div>';
		}

		$principaux = array_filter( Champs::pour( $type ), static fn( array $d ): bool => ( $d['ui'] ?? '' ) === 'principal' );
		if ( $principaux && $type !== Types::PAGE ) {
			echo '<div class="adm-bloc">';
			self::champs_de( $post, 'principal' );
			echo '</div>';
		}

		if ( $type === Types::PAGE ) {
			$schema = Export::schema_page( $post );
			if ( $schema ) {
				$groupes = array_values( array_unique( array_column( $schema, 'groupe' ) ) );
				echo '<h2 class="adm-bloc__titre adm-contenu-titre">' . esc_html__( 'Contenu de la page', 'pose-parquet-core' ) . '</h2>';
				echo '<p class="adm-note">' . esc_html__( 'Les blocs de la page, dans leur ordre :', 'pose-parquet-core' ) . ' ' . esc_html( implode( ' · ', $groupes ) ) . '. ' . esc_html__( 'Des textes seulement : les sections, leur ordre et leur mise en page restent ceux du site.', 'pose-parquet-core' ) . '</p>';
				Structure::formulaire( $schema, Export::valeurs_page( $post, $schema ), 'pp_structure' );
			}
		}

		if ( post_type_supports( $type, 'editor' ) ) {
			echo '<h2 class="adm-bloc__titre adm-contenu-titre">' . esc_html__( 'Contenu', 'pose-parquet-core' ) . '</h2>';
		}
	}

	public static function boite_categorie( \WP_Post $post ): void {
		$tax = Types::taxonomie( $post->post_type );
		if ( ! $tax ) {
			return;
		}
		$actuels = wp_get_object_terms( $post->ID, $tax, [ 'fields' => 'ids' ] );
		$actuel  = is_array( $actuels ) && $actuels ? (int) $actuels[0] : 0;
		wp_dropdown_categories(
			[
				'taxonomy'          => $tax,
				'name'              => 'pp_categorie',
				'id'                => 'pp-categorie',
				'selected'          => $actuel,
				'hide_empty'        => false,
				'show_option_none'  => __( '— Choisir —', 'pose-parquet-core' ),
				'option_none_value' => '0',
				'class'             => 'widefat',
			]
		);
		echo '<p><a href="' . esc_url( admin_url( 'edit-tags.php?taxonomy=' . $tax . '&post_type=' . $post->post_type ) ) . '">' . esc_html__( 'Gérer les catégories', 'pose-parquet-core' ) . '</a></p>';
	}

	public static function boite_details( \WP_Post $post ): void {
		self::champs_de( $post, 'cote' );
	}

	public static function boite_seo( \WP_Post $post ): void {
		self::champs_de( $post, 'seo' );
		if ( $post->post_type === Types::PAGE ) {
			$adresse = (string) get_post_meta( $post->ID, '_pp_adresse', true );
			echo '<p class="adm-note">' . esc_html__( 'Adresse fixe :', 'pose-parquet-core' ) . ' <code>' . esc_html( $adresse !== '' ? $adresse : '—' ) . '</code></p>';
			return; // L'adresse d'une page du site est fixe.
		}
		echo '<p class="adm-champ"><label for="pp-slug">' . esc_html__( 'Slug', 'pose-parquet-core' ) . '</label>';
		echo '<input type="text" class="widefat" id="pp-slug" name="post_name" value="' . esc_attr( $post->post_name ) . '" />';
		echo '</p>';
		if ( $post->post_status === 'publish' ) {
			echo '<p class="adm-avertissement">' . esc_html__( 'Changer le slug d’un contenu publié change son adresse : les liens existants ne mèneront plus à lui.', 'pose-parquet-core' ) . '</p>';
		}
	}

	public static function boite_studio( \WP_Post $post ): void {
		self::champs_de( $post, 'studio' );
		$scene  = (string) get_post_meta( $post->ID, '_pp_scene', true );
		$produit = (string) get_post_meta( $post->ID, '_pp_parquet', true );
		if ( $scene !== '' ) {
			$args = [ 'piece' => $scene ];
			if ( $produit !== '' ) {
				$args['parquet'] = $produit;
			}
			$motif = (string) get_post_meta( $post->ID, '_pp_studio_motif', true );
			if ( $motif !== '' ) {
				$args['motif'] = $motif;
			}
			echo '<p class="adm-note">' . esc_html__( 'Lien généré :', 'pose-parquet-core' ) . ' <code>outils/studio.html?' . esc_html( http_build_query( $args ) ) . '</code></p>';
		}
	}

	/**
	 * Enregistrement : jeton, droit sur CE contenu, liste fermée, nettoyage.
	 * Rien d'autre que les champs déclarés dans Champs n'est lu.
	 */
	public static function enregistrer( int $post_id, \WP_Post $post ): void {
		if ( ! isset( $_POST[ self::NONCE ] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::NONCE ] ) ), self::NONCE_ACTION ) ) {
			return;
		}
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || wp_is_post_revision( $post_id ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$recu = isset( $_POST['pp_champ'] ) && is_array( $_POST['pp_champ'] ) ? wp_unslash( $_POST['pp_champ'] ) : []; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- nettoyé champ par champ ci-dessous.
		foreach ( Champs::pour( $post->post_type ) as $cle => $def ) {
			if ( ( $def['ui'] ?? 'cache' ) === 'cache' || ! array_key_exists( $cle, $recu ) ) {
				continue;
			}
			$valeur = Champs::nettoyer( $def, $recu[ $cle ] );
			update_post_meta( $post_id, $cle, wp_slash( $valeur ) );
		}

		// Champs structurés d'une page : schéma du dépôt, nettoyage champ par champ.
		if ( $post->post_type === Types::PAGE && isset( $_POST['pp_structure'] ) && is_array( $_POST['pp_structure'] ) ) {
			$schema = Export::schema_page( $post );
			if ( $schema ) {
				[ $valeurs, $refus ] = Structure::nettoyer( $schema, wp_unslash( $_POST['pp_structure'] ), Export::valeurs_page( $post, $schema ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Structure::nettoyer.
				update_post_meta( $post_id, '_pp_champs', wp_slash( (string) wp_json_encode( $valeurs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ) );
				if ( $refus ) {
					set_transient( 'pp_refus_' . get_current_user_id(), $refus, 5 * MINUTE_IN_SECONDS );
				}
			}
		}

		// Image : un identifiant de la médiathèque, et seulement une image.
		if ( Types::avec_couverture( $post->post_type ) && isset( $_POST['pp_couverture'] ) ) {
			$image = absint( $_POST['pp_couverture'] );
			if ( $image && wp_attachment_is_image( $image ) ) {
				set_post_thumbnail( $post_id, $image );
			} elseif ( $image === 0 ) {
				delete_post_thumbnail( $post_id );
			}
		}

		// Catégorie : un terme existant de la bonne taxonomie, ou aucune.
		$tax = Types::taxonomie( $post->post_type );
		if ( $tax && isset( $_POST['pp_categorie'] ) ) {
			$terme = absint( $_POST['pp_categorie'] );
			if ( $terme && term_exists( $terme, $tax ) ) {
				wp_set_object_terms( $post_id, [ $terme ], $tax, false );
			} elseif ( $terme === 0 ) {
				wp_set_object_terms( $post_id, [], $tax, false );
			}
		}
	}

	/**
	 * Avertissements, jamais bloquants : un contenu sans image se publie, mais
	 * on dit clairement ce que le site affichera.
	 */
	public static function avertissements(): void {
		$ecran = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $ecran || $ecran->base !== 'post' || ! in_array( $ecran->post_type, Types::all(), true ) ) {
			return;
		}
		global $post;
		if ( ! $post instanceof \WP_Post || $post->post_status === 'auto-draft' ) {
			return;
		}
		$refus = get_transient( 'pp_refus_' . get_current_user_id() );
		if ( is_array( $refus ) && $refus ) {
			delete_transient( 'pp_refus_' . get_current_user_id() );
			echo '<div class="notice notice-error"><p><strong>' . esc_html__( 'Valeurs refusées, l’ancienne valeur est conservée :', 'pose-parquet-core' ) . '</strong> ' . esc_html( implode( ' ; ', array_map( 'strval', $refus ) ) ) . '</p></div>';
		}
		$etat = Images::etat( $post );
		if ( $etat === Images::MANQUANTE ) {
			echo '<div class="notice notice-warning"><p><strong>' . esc_html__( 'Image manquante.', 'pose-parquet-core' ) . '</strong> ' . esc_html__( 'Ce contenu n’a pas d’image de couverture : sur le site, sa carte s’affichera sans photo. Vous pouvez publier quand même.', 'pose-parquet-core' ) . '</p></div>';
		} elseif ( $etat === Images::FICHIER_ABSENT ) {
			echo '<div class="notice notice-error"><p><strong>' . esc_html__( 'Image introuvable.', 'pose-parquet-core' ) . '</strong> ' . esc_html__( 'L’image choisie n’existe plus dans la médiathèque (fichier supprimé). Choisissez-en une autre.', 'pose-parquet-core' ) . '</p></div>';
		}
		if ( $post->post_type === Types::INSPIRATION && trim( (string) get_post_meta( $post->ID, '_pp_phrase', true ) ) === '' ) {
			echo '<div class="notice notice-warning"><p>' . esc_html__( 'Le texte court est vide : cette inspiration ne sera pas publiée sur le site tant qu’il manque.', 'pose-parquet-core' ) . '</p></div>';
		}
	}

	/** Crédit photo, dans la fiche d'un média : il est affiché sur le site. */
	public static function champ_credit( array $champs, \WP_Post $piece ): array {
		if ( ! wp_attachment_is_image( $piece->ID ) || ! current_user_can( Capabilities::EDIT_CONTENTS ) ) {
			return $champs;
		}
		$champs['pp_credit'] = [
			'label' => __( 'Crédit photo', 'pose-parquet-core' ),
			'input' => 'text',
			'value' => (string) get_post_meta( $piece->ID, '_pp_credit', true ),
			'helps' => __( 'Nom du photographe, affiché sur le site.', 'pose-parquet-core' ),
		];
		return $champs;
	}

	public static function enregistrer_credit( array $piece, array $donnees ): array {
		if ( isset( $donnees['pp_credit'] ) && current_user_can( 'edit_post', (int) $piece['ID'] ) ) {
			update_post_meta( (int) $piece['ID'], '_pp_credit', sanitize_text_field( (string) $donnees['pp_credit'] ) );
		}
		return $piece;
	}
}
