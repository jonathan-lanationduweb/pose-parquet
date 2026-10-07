<?php
/**
 * Les contenus éditoriaux du site : guides, tutoriels, inspirations, pages.
 *
 * WordPress devient la source éditoriale ; le site public, lui, reste généré
 * par le dépôt (`_generator/`), qui lit ces contenus par l'export
 * `GET /pose-parquet/v1/contenus` (voir Contenus\Export). WordPress ne sert
 * donc AUCUNE page publique de ces types : `public => false`, pas de
 * réécriture d'adresse, pas d'archive. Il ne fait que les éditer.
 *
 * Écrans : ceux de WordPress, sans page builder. L'éditeur classique (TinyMCE
 * et « Ajouter un média ») plutôt que l'éditeur de blocs : la maquette validée
 * le montre, et un éditeur de blocs offrirait des mises en page que le site
 * public ne sait pas rendre. Le design reste celui du code.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Types {

	public const GUIDE       = 'pp_guide';
	public const TUTORIEL    = 'pp_tutoriel';
	public const INSPIRATION = 'pp_inspiration';
	public const PAGE        = 'pp_page';

	public const CAT_GUIDE    = 'pp_guide_categorie';
	public const CAT_TUTORIEL = 'pp_tutoriel_categorie';

	/** @return string[] */
	public static function all(): array {
		return [ self::GUIDE, self::TUTORIEL, self::INSPIRATION, self::PAGE ];
	}

	/** Types qui ont une image de couverture obligatoire « en principe » (avertissement, pas blocage). */
	public static function avec_couverture( string $type ): bool {
		return in_array( $type, [ self::GUIDE, self::TUTORIEL, self::INSPIRATION ], true );
	}

	public static function register(): void {
		add_action( 'init', [ self::class, 'register_types' ] );
		add_filter( 'use_block_editor_for_post_type', [ self::class, 'editeur_classique' ], 10, 2 );
	}

	public static function editeur_classique( bool $utiliser, string $type ): bool {
		return in_array( $type, self::all(), true ) ? false : $utiliser;
	}

	/**
	 * @param array<string,string> $l libellés propres au type
	 * @param string[]             $supports
	 */
	private static function args( array $l, array $supports, array $extra = [] ): array {
		return array_merge(
			[
				'labels'              => $l,
				'public'              => false,
				'show_ui'             => true,
				// Le menu est construit par Admin\Menu, dans l'ordre de la maquette.
				'show_in_menu'        => false,
				'show_in_admin_bar'   => false,
				'show_in_nav_menus'   => false,
				'show_in_rest'        => false,
				'exclude_from_search' => true,
				'publicly_queryable'  => false,
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
				'hierarchical'        => false,
				'supports'            => $supports,
				'capability_type'     => [ 'pp_contenu', 'pp_contenus' ],
				'map_meta_cap'        => true,
			],
			$extra
		);
	}

	public static function register_types(): void {
		register_post_type(
			self::GUIDE,
			self::args(
				[
					'name'               => __( 'Guides', 'pose-parquet-core' ),
					'singular_name'      => __( 'Guide', 'pose-parquet-core' ),
					'add_new'            => __( 'Ajouter un guide', 'pose-parquet-core' ),
					'add_new_item'       => __( 'Ajouter un guide', 'pose-parquet-core' ),
					'edit_item'          => __( 'Modifier le guide', 'pose-parquet-core' ),
					'new_item'           => __( 'Nouveau guide', 'pose-parquet-core' ),
					'search_items'       => __( 'Rechercher un guide', 'pose-parquet-core' ),
					'not_found'          => __( 'Aucun guide.', 'pose-parquet-core' ),
					'not_found_in_trash' => __( 'Aucun guide dans la corbeille.', 'pose-parquet-core' ),
					'all_items'          => __( 'Guides', 'pose-parquet-core' ),
					'item_published'     => __( 'Guide publié.', 'pose-parquet-core' ),
					'item_updated'       => __( 'Guide mis à jour.', 'pose-parquet-core' ),
				],
				[ 'title', 'editor', 'excerpt', 'thumbnail', 'revisions' ]
			)
		);

		register_post_type(
			self::TUTORIEL,
			self::args(
				[
					'name'               => __( 'Tutoriels', 'pose-parquet-core' ),
					'singular_name'      => __( 'Tutoriel', 'pose-parquet-core' ),
					'add_new'            => __( 'Ajouter un tutoriel', 'pose-parquet-core' ),
					'add_new_item'       => __( 'Ajouter un tutoriel', 'pose-parquet-core' ),
					'edit_item'          => __( 'Modifier le tutoriel', 'pose-parquet-core' ),
					'new_item'           => __( 'Nouveau tutoriel', 'pose-parquet-core' ),
					'search_items'       => __( 'Rechercher un tutoriel', 'pose-parquet-core' ),
					'not_found'          => __( 'Aucun tutoriel.', 'pose-parquet-core' ),
					'not_found_in_trash' => __( 'Aucun tutoriel dans la corbeille.', 'pose-parquet-core' ),
					'all_items'          => __( 'Tutoriels', 'pose-parquet-core' ),
				],
				[ 'title', 'editor', 'excerpt', 'thumbnail', 'revisions' ]
			)
		);

		register_post_type(
			self::INSPIRATION,
			self::args(
				[
					'name'               => __( 'Inspirations', 'pose-parquet-core' ),
					'singular_name'      => __( 'Inspiration', 'pose-parquet-core' ),
					'add_new'            => __( 'Ajouter une inspiration', 'pose-parquet-core' ),
					'add_new_item'       => __( 'Ajouter une inspiration', 'pose-parquet-core' ),
					'edit_item'          => __( 'Modifier l’inspiration', 'pose-parquet-core' ),
					'search_items'       => __( 'Rechercher une inspiration', 'pose-parquet-core' ),
					'not_found'          => __( 'Aucune inspiration.', 'pose-parquet-core' ),
					'not_found_in_trash' => __( 'Aucune inspiration dans la corbeille.', 'pose-parquet-core' ),
					'all_items'          => __( 'Inspirations', 'pose-parquet-core' ),
				],
				// Pas d'éditeur de contenu : une carte, pas un article.
				[ 'title', 'thumbnail' ]
			)
		);

		register_post_type(
			self::PAGE,
			self::args(
				[
					'name'               => __( 'Pages', 'pose-parquet-core' ),
					'singular_name'      => __( 'Page', 'pose-parquet-core' ),
					'add_new'            => __( 'Ajouter une page', 'pose-parquet-core' ),
					'add_new_item'       => __( 'Ajouter une page', 'pose-parquet-core' ),
					'edit_item'          => __( 'Modifier la page', 'pose-parquet-core' ),
					'search_items'       => __( 'Rechercher une page', 'pose-parquet-core' ),
					'not_found'          => __( 'Aucune page.', 'pose-parquet-core' ),
					'all_items'          => __( 'Pages', 'pose-parquet-core' ),
				],
				[ 'title', 'editor', 'excerpt', 'revisions' ],
				[
					/*
					 * Les pages du site sont celles que le code sait construire
					 * (accueil, à propos, contact…) : on modifie leurs textes,
					 * on n'en crée pas — une page ajoutée ici ne serait publiée
					 * nulle part. D'où « do_not_allow » pour la création.
					 */
					'capabilities' => [ 'create_posts' => 'do_not_allow' ],
				]
			)
		);

		$cat = static fn( string $nom, string $singulier ): array => [
			'labels'            => [
				'name'          => $nom,
				'singular_name' => $singulier,
				'search_items'  => __( 'Rechercher une catégorie', 'pose-parquet-core' ),
				'all_items'     => __( 'Toutes les catégories', 'pose-parquet-core' ),
				'edit_item'     => __( 'Modifier la catégorie', 'pose-parquet-core' ),
				'add_new_item'  => __( 'Ajouter une catégorie', 'pose-parquet-core' ),
			],
			'public'            => false,
			'show_ui'           => true,
			'show_in_menu'      => false,
			'show_in_rest'      => false,
			'show_admin_column' => false,
			'hierarchical'      => true,
			'rewrite'           => false,
			// La boîte de sélection est la nôtre (une liste déroulante, comme
			// dans la maquette), pas les cases à cocher de WordPress.
			'meta_box_cb'       => false,
			'capabilities'      => [
				'manage_terms' => Capabilities::EDIT_CONTENTS,
				'edit_terms'   => Capabilities::EDIT_CONTENTS,
				'delete_terms' => Capabilities::EDIT_CONTENTS,
				'assign_terms' => Capabilities::EDIT_CONTENTS,
			],
		];
		register_taxonomy( self::CAT_GUIDE, [ self::GUIDE ], $cat( __( 'Catégories de guides', 'pose-parquet-core' ), __( 'Catégorie', 'pose-parquet-core' ) ) );
		register_taxonomy( self::CAT_TUTORIEL, [ self::TUTORIEL ], $cat( __( 'Catégories de tutoriels', 'pose-parquet-core' ), __( 'Catégorie', 'pose-parquet-core' ) ) );

		foreach ( Champs::definitions() as $type => $champs ) {
			foreach ( $champs as $cle => $def ) {
				register_post_meta(
					$type,
					$cle,
					[
						'type'              => 'string',
						'single'            => true,
						'show_in_rest'      => false,
						'sanitize_callback' => static fn( $v ) => Champs::nettoyer( $def, $v ),
						'auth_callback'     => static fn(): bool => current_user_can( Capabilities::EDIT_CONTENTS ),
					]
				);
			}
		}
	}

	/** La taxonomie de catégorie d'un type, ou null. */
	public static function taxonomie( string $type ): ?string {
		return match ( $type ) {
			self::GUIDE    => self::CAT_GUIDE,
			self::TUTORIEL => self::CAT_TUTORIEL,
			default        => null,
		};
	}
}
