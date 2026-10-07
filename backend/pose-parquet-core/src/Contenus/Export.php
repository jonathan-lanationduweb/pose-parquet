<?php
/**
 * Ce que le site public reçoit de WordPress : `GET /pose-parquet/v1/contenus`.
 *
 *   WordPress (édition)  →  cet export (JSON)  →  _generator/wordpress.js
 *                        →  instantané data/wordpress/contenus.json
 *                        →  build du site, design inchangé  →  déploiement
 *
 * Le site reste STATIQUE : il n'appelle jamais WordPress au chargement d'une
 * page. Le générateur tire cet export avant de construire. Si WordPress est
 * indisponible, le site publié ne bouge pas.
 *
 * Public et en lecture seule : n'y figure que ce qui est publié — donc déjà
 * destiné à être lu par tout le monde. Aucun brouillon, aucun projet, aucune
 * donnée personnelle, aucun identifiant d'utilisateur.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

use PoseParquet\Core\Maintenance\Reglages as Maintenance;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Export {

	public const VERSION = 1;

	public static function route( string $namespace ): void {
		register_rest_route(
			$namespace,
			'/contenus',
			[
				'methods'             => 'GET',
				'callback'            => [ self::class, 'repondre' ],
				'permission_callback' => '__return_true',
			]
		);
	}

	public static function repondre(): \WP_REST_Response {
		$reponse = new \WP_REST_Response( self::donnees(), 200 );
		$reponse->header( 'Cache-Control', 'no-store' );
		return $reponse;
	}

	/** @return array<string,mixed> */
	public static function donnees(): array {
		return [
			'version'      => self::VERSION,
			'genere'       => gmdate( 'c' ),
			'maintenance'  => Maintenance::pour_export(),
			'guides'       => array_map( [ self::class, 'article' ], self::publies( Types::GUIDE ) ),
			'tutoriels'    => array_map( [ self::class, 'article' ], self::publies( Types::TUTORIEL ) ),
			'inspirations' => array_values( array_filter( array_map( [ self::class, 'inspiration' ], self::publies( Types::INSPIRATION ) ) ) ),
			'pages'        => array_map( [ self::class, 'page' ], self::publies( Types::PAGE ) ),
			// « Mon site » : identité, en-tête, pied de page, liens commerciaux.
			'site'         => \PoseParquet\Core\Site\MonSite::pour_export(),
		];
	}

	/** @return \WP_Post[] */
	private static function publies( string $type ): array {
		return get_posts(
			[
				'post_type'      => $type,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => [ 'menu_order' => 'ASC', 'date' => 'DESC' ],
				'no_found_rows'  => true,
			]
		);
	}

	private static function meta( \WP_Post $p, string $cle ): string {
		return (string) get_post_meta( $p->ID, $cle, true );
	}

	/** @return array<mixed>|null */
	private static function json( \WP_Post $p, string $cle ): ?array {
		$d = json_decode( self::meta( $p, $cle ), true );
		return is_array( $d ) ? $d : null;
	}

	/** @return array<string,mixed>|null */
	public static function image( int $id ): ?array {
		if ( $id <= 0 || ! wp_attachment_is_image( $id ) ) {
			return null;
		}
		$fichier = get_attached_file( $id );
		if ( ! $fichier || ! file_exists( $fichier ) ) {
			return null;
		}
		$meta    = wp_get_attachment_metadata( $id );
		$url     = (string) wp_get_attachment_url( $id );
		$base    = trailingslashit( dirname( $url ) );
		$tailles = [];
		foreach ( (array) ( $meta['sizes'] ?? [] ) as $t ) {
			if ( ! empty( $t['file'] ) && ( $t['mime-type'] ?? '' ) !== 'image/webp' ) {
				$tailles[] = [ 'url' => $base . $t['file'], 'largeur' => (int) $t['width'], 'hauteur' => (int) $t['height'] ];
			}
		}
		$tailles[] = [ 'url' => $url, 'largeur' => (int) ( $meta['width'] ?? 0 ), 'hauteur' => (int) ( $meta['height'] ?? 0 ) ];
		usort( $tailles, static fn( array $a, array $b ): int => $a['largeur'] <=> $b['largeur'] );

		return [
			'id'      => $id,
			// Image venue du dépôt à l'import : le site garde ses déclinaisons
			// optimisées d'origine (aucun octet ne change) tant qu'elle n'est
			// pas remplacée.
			'source'  => (string) get_post_meta( $id, '_pp_source_key', true ) ?: null,
			'url'     => $url,
			'largeur' => (int) ( $meta['width'] ?? 0 ),
			'hauteur' => (int) ( $meta['height'] ?? 0 ),
			'alt'     => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
			'credit'  => (string) get_post_meta( $id, '_pp_credit', true ),
			'tailles' => $tailles,
		];
	}

	/** @return array<string,mixed> */
	public static function article( \WP_Post $p ): array {
		$tax    = Types::taxonomie( $p->post_type );
		$termes = $tax ? get_the_terms( $p, $tax ) : [];
		$medias = [];
		$corps  = Html::medias( Html::corps( $p ), $medias );
		$out    = [
			'slug'        => $p->post_name,
			'titre'       => self::meta( $p, Champs::META_TITLE ),
			'h1'          => (string) $p->post_title, // titre BRUT : get_the_title() appliquerait la typographie de WordPress (apostrophes courbes…) et changerait le texte publié.
			'description' => self::meta( $p, Champs::META_DESCRIPTION ),
			'categorie'   => is_array( $termes ) && $termes ? $termes[0]->name : '',
			'date'        => mysql2date( 'Y-m-d', $p->post_date, false ),
			'resume'      => (string) $p->post_excerpt,
			'intro'       => self::meta( $p, Champs::INTRO ),
			'lecture'     => self::meta( $p, '_pp_lecture' ),
			'faq'         => self::json( $p, '_pp_faq' ),
			'corps'       => $corps,
			'corpsIntact' => Html::intact( $p ),
			'image'       => self::image( (int) get_post_thumbnail_id( $p ) ),
		];
		if ( $medias ) {
			$out['medias'] = array_values( $medias );
		}
		if ( $p->post_type === Types::GUIDE ) {
			$out['tags']    = self::json( $p, '_pp_tags' );
			$out['related'] = self::json( $p, '_pp_related' );
		} else {
			$out['duree']  = self::meta( $p, '_pp_duree' );
			$out['niveau'] = self::meta( $p, '_pp_niveau' );
			$out['outils'] = array_values( array_filter( explode( "\n", self::meta( $p, '_pp_outils' ) ) ) );
		}
		return $out;
	}

	/** @return array<string,mixed>|null une carte, ou null si elle est incomplète (pas de texte court). */
	public static function inspiration( \WP_Post $p ): ?array {
		$phrase = trim( self::meta( $p, '_pp_phrase' ) );
		if ( $phrase === '' ) {
			return null;
		}
		return [
			'id'           => (int) self::meta( $p, '_pp_pexels' ),
			'cle'          => $p->post_name,
			'titre'        => (string) $p->post_title,
			'phrase'       => $phrase,
			'piece'        => self::meta( $p, '_pp_piece' ),
			'motif'        => self::meta( $p, '_pp_motif' ),
			'motifLibelle' => self::meta( $p, '_pp_motif_libelle' ),
			'teinte'       => self::meta( $p, '_pp_teinte' ),
			'taille'       => self::meta( $p, '_pp_taille' ) ?: 'md',
			'studio'       => [
				'actif'        => self::meta( $p, '_pp_studio' ) === '1',
				'bibliotheque' => self::meta( $p, '_pp_bibliotheque' ) === '1',
				'scene'        => self::meta( $p, '_pp_scene' ),
				'parquet'      => self::meta( $p, '_pp_parquet' ),
				'motif'        => self::meta( $p, '_pp_studio_motif' ),
				'orientation'  => (int) self::meta( $p, '_pp_studio_orient' ),
			],
			'image'        => self::image( (int) get_post_thumbnail_id( $p ) ),
		];
	}

	/** @return array<string,mixed> */
	public static function page( \WP_Post $p ): array {
		$editable = self::meta( $p, '_pp_corps_editable' ) === '1';
		$medias   = [];
		$corps    = $editable ? Html::medias( Html::corps( $p ), $medias ) : null;
		$out      = [
			'cle'         => self::meta( $p, '_pp_cle' ),
			'adresse'     => self::meta( $p, '_pp_adresse' ),
			// Le titre de la liste est le NOM de la page (« À propos ») ; le titre
			// affiché sur le site est un champ à part.
			'h1'          => self::meta( $p, '_pp_textes' ) === '1' ? self::meta( $p, '_pp_h1' ) : null,
			'chapo'       => self::meta( $p, '_pp_textes' ) === '1' ? (string) $p->post_excerpt : null,
			'titre'       => self::meta( $p, Champs::META_TITLE ),
			'description' => self::meta( $p, Champs::META_DESCRIPTION ),
			'corps'       => $corps,
			'corpsIntact' => $editable ? Html::intact( $p ) : true,
		];
		if ( $medias ) {
			$out['medias'] = array_values( $medias );
		}
		$schema = self::schema_page( $p );
		if ( $schema ) {
			$out['champs'] = Structure::pour_export( $schema, self::valeurs_page( $p, $schema ) );
		}
		return $out;
	}

	/** Le schéma des champs structurés d'une page (reçu du dépôt à l'import). */
	public static function schema_page( \WP_Post $p ): array {
		return Structure::schema( get_post_meta( $p->ID, '_pp_champs_def', true ) );
	}

	/** Les valeurs saisies, complétées des valeurs par défaut. */
	public static function valeurs_page( \WP_Post $p, array $schema ): array {
		$v = json_decode( (string) get_post_meta( $p->ID, '_pp_champs', true ), true );
		return array_merge( Structure::defauts( $schema ), is_array( $v ) ? $v : [] );
	}
}
