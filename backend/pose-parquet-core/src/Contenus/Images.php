<?php
/**
 * « Il manque des images » : l'état de l'image d'un contenu, en un mot.
 *
 * Trois états, lus au moment de l'affichage, jamais stockés :
 *   ok              une image de la médiathèque, fichier présent ;
 *   manquante       aucune image choisie ;
 *   fichier_absent  une image était choisie, mais elle a été supprimée de la
 *                   médiathèque ou son fichier n'est plus sur le disque.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Images {

	public const OK             = 'ok';
	public const MANQUANTE      = 'manquante';
	public const FICHIER_ABSENT = 'fichier_absent';
	public const SANS_OBJET     = 'sans_objet';

	public static function etat( \WP_Post $post ): string {
		if ( ! Types::avec_couverture( $post->post_type ) ) {
			return self::SANS_OBJET;
		}
		$id = (int) get_post_meta( $post->ID, '_thumbnail_id', true );
		if ( $id <= 0 ) {
			return self::MANQUANTE;
		}
		$piece = get_post( $id );
		if ( ! $piece || $piece->post_type !== 'attachment' ) {
			return self::FICHIER_ABSENT;
		}
		$fichier = get_attached_file( $id );
		return $fichier && file_exists( $fichier ) ? self::OK : self::FICHIER_ABSENT;
	}

	/**
	 * Identifiants des contenus d'un type sans image utilisable : pour le
	 * filtre « Image manquante » des listes et pour le tableau de bord.
	 *
	 * @return int[]
	 */
	public static function sans_image( string $type ): array {
		$ids = get_posts(
			[
				'post_type'      => $type,
				'post_status'    => [ 'publish', 'draft', 'pending', 'future', 'private' ],
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			]
		);
		return array_values(
			array_filter(
				array_map( 'intval', $ids ),
				static fn( int $id ): bool => in_array( self::etat( get_post( $id ) ), [ self::MANQUANTE, self::FICHIER_ABSENT ], true )
			)
		);
	}
}
