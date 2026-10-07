<?php
/**
 * Les champs propres à chaque type de contenu, et comment on les nettoie.
 *
 * Une seule table pour trois usages : l'enregistrement des métadonnées
 * (Types), l'écran d'édition (Edition) et l'export vers le site (Export).
 * Un champ absent d'ici n'existe pas : rien d'autre n'est lu dans `$_POST`.
 *
 * Tous les champs sont du TEXTE. Aucun ne reçoit de HTML : le design vient du
 * code du site, pas de ce qu'on saisit ici. Seul le contenu principal (éditeur
 * classique) accepte du HTML, filtré à l'export par une liste fermée
 * (Contenus\Html).
 */

declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Champs {

	public const META_TITLE       = '_pp_meta_title';
	public const META_DESCRIPTION = '_pp_meta_description';
	public const INTRO            = '_pp_intro';

	/** Valeurs prévues par le site public (filtres de la page Inspiration). */
	public const PIECES = [
		'sejour'  => 'Séjour',
		'chambre' => 'Chambre',
		'cuisine' => 'Cuisine',
		'couloir' => 'Couloir et entrée',
	];
	public const MOTIFS_FILTRE = [
		'droite'      => 'Lames droites',
		'hongrie'     => 'Point de Hongrie',
		'baton-rompu' => 'Bâton rompu',
	];
	public const MOTIFS_STUDIO = [
		'lames'            => 'Lames',
		'point-de-hongrie' => 'Point de Hongrie',
		'baton-rompu'      => 'Bâton rompu',
	];
	public const ORIENTATIONS = [ '0' => '0°', '90' => '90°', '45' => '45°', '-45' => '−45°' ];
	public const TAILLES      = [ 'wide' => 'Large', 'md' => 'Moyenne', 'sm' => 'Petite' ];
	public const NIVEAUX      = [ 'Accessible' => 'Accessible', 'Intermédiaire' => 'Intermédiaire', 'Confirmé' => 'Confirmé' ];

	/**
	 * Définitions par type. `ui` : où le champ s'affiche (seo | cote | carte |
	 * cache). Les champs `cache` sont conservés tels qu'importés (FAQ, liens
	 * connexes…) : rien n'est perdu, mais ils ne s'éditent pas encore ici.
	 *
	 * @return array<string,array<string,array<string,mixed>>>
	 */
	public static function definitions(): array {
		$seo = [
			self::META_TITLE       => [ 'type' => 'text', 'max' => 160, 'label' => 'Meta title', 'ui' => 'seo' ],
			self::META_DESCRIPTION => [ 'type' => 'textarea', 'max' => 320, 'label' => 'Meta description', 'ui' => 'seo' ],
		];
		$technique = [
			'_pp_import_hash' => [ 'type' => 'hash', 'ui' => 'cache' ],
			'_pp_faq'         => [ 'type' => 'json', 'ui' => 'cache' ],
		];

		return [
			Types::GUIDE       => $seo + [
				self::INTRO       => [ 'type' => 'textarea', 'max' => 1500, 'label' => 'Introduction', 'ui' => 'principal', 'aide' => 'Le paragraphe d’ouverture de l’article, sous le titre.' ],
				'_pp_lecture'     => [ 'type' => 'text', 'max' => 20, 'label' => 'Temps de lecture', 'ui' => 'cote' ],
				'_pp_tags'        => [ 'type' => 'json', 'ui' => 'cache' ],
				'_pp_related'     => [ 'type' => 'json', 'ui' => 'cache' ],
			] + $technique,
			Types::TUTORIEL    => $seo + [
				self::INTRO       => [ 'type' => 'textarea', 'max' => 1500, 'label' => 'Introduction', 'ui' => 'principal', 'aide' => 'Le paragraphe d’ouverture du tutoriel, sous le titre.' ],
				'_pp_duree'       => [ 'type' => 'text', 'max' => 60, 'label' => 'Temps estimé', 'ui' => 'cote' ],
				'_pp_niveau'      => [ 'type' => 'select', 'options' => self::NIVEAUX, 'label' => 'Niveau', 'ui' => 'cote' ],
				'_pp_lecture'     => [ 'type' => 'text', 'max' => 20, 'label' => 'Temps de lecture', 'ui' => 'cote' ],
				'_pp_outils'      => [ 'type' => 'lines', 'max' => 2000, 'label' => 'Outils (un par ligne)', 'ui' => 'principal' ],
			] + $technique,
			Types::INSPIRATION => [
				'_pp_phrase'           => [ 'type' => 'textarea', 'max' => 220, 'label' => 'Texte court', 'ui' => 'carte', 'requis' => true ],
				'_pp_piece'            => [ 'type' => 'select', 'options' => self::PIECES, 'label' => 'Pièce', 'ui' => 'carte' ],
				'_pp_motif'            => [ 'type' => 'select', 'options' => self::MOTIFS_FILTRE, 'label' => 'Motif', 'ui' => 'carte' ],
				'_pp_motif_libelle'    => [ 'type' => 'text', 'max' => 60, 'label' => 'Libellé du motif', 'ui' => 'carte', 'aide' => 'Tel qu’il s’affiche sous le titre, ex. « Lames larges ».' ],
				'_pp_teinte'           => [ 'type' => 'text', 'max' => 60, 'label' => 'Teinte', 'ui' => 'carte', 'aide' => 'Ex. « chêne fumé ».' ],
				'_pp_parquet'          => [ 'type' => 'slug', 'max' => 60, 'label' => 'Parquet (identifiant)', 'ui' => 'studio', 'aide' => 'Le parquet ouvert dans le Studio, ex. chene-naturel.' ],
				'_pp_scene'            => [ 'type' => 'slug', 'max' => 60, 'label' => 'Pièce du Studio', 'ui' => 'studio', 'aide' => 'La pièce calibrée qui correspond à la photo, ex. sejour.' ],
				'_pp_studio_motif'     => [ 'type' => 'select', 'options' => self::MOTIFS_STUDIO, 'label' => 'Motif dans le Studio', 'ui' => 'studio' ],
				'_pp_studio_orient'    => [ 'type' => 'select', 'options' => self::ORIENTATIONS, 'label' => 'Orientation', 'ui' => 'studio' ],
				'_pp_studio'           => [ 'type' => 'bool', 'label' => 'Essayable dans le Studio', 'ui' => 'studio' ],
				'_pp_bibliotheque'     => [ 'type' => 'bool', 'label' => 'Visible dans la bibliothèque de pièces du Studio', 'ui' => 'studio' ],
				'_pp_taille'           => [ 'type' => 'select', 'options' => self::TAILLES, 'label' => 'Taille de la carte', 'ui' => 'cote' ],
				'_pp_pexels'           => [ 'type' => 'int', 'ui' => 'cache' ],
			],
			Types::PAGE        => $seo + [
				'_pp_h1'      => [ 'type' => 'text', 'max' => 140, 'label' => 'Titre affiché sur la page (H1)', 'ui' => 'principal' ],
				// L'accueil n'a ni H1 ni chapô modifiables : son en-tête est une composition.
				'_pp_textes'  => [ 'type' => 'bool', 'ui' => 'cache' ],
				'_pp_cle'     => [ 'type' => 'slug', 'max' => 40, 'ui' => 'cache' ],
				'_pp_adresse' => [ 'type' => 'text', 'max' => 120, 'ui' => 'cache' ],
				'_pp_corps_editable' => [ 'type' => 'bool', 'ui' => 'cache' ],
				// Champs structurés (Structure) : schéma reçu du dépôt, valeurs saisies.
				'_pp_champs_def'     => [ 'type' => 'json', 'ui' => 'cache' ],
				'_pp_champs'         => [ 'type' => 'json', 'ui' => 'cache' ],
				'_pp_import_hash'    => [ 'type' => 'hash', 'ui' => 'cache' ],
			],
		];
	}

	/** @return array<string,array<string,mixed>> */
	public static function pour( string $type ): array {
		return self::definitions()[ $type ] ?? [];
	}

	/**
	 * Nettoie une valeur selon sa définition. Ne lève jamais : une valeur
	 * invalide devient vide (ou la première option d'une liste).
	 *
	 * @param array<string,mixed> $def
	 */
	public static function nettoyer( array $def, mixed $valeur ): string {
		$valeur = is_scalar( $valeur ) ? (string) $valeur : '';
		$max    = (int) ( $def['max'] ?? 0 );
		$borne  = static fn( string $v ): string => $max > 0 ? mb_substr( $v, 0, $max ) : $v;

		switch ( $def['type'] ) {
			case 'text':
				return $borne( sanitize_text_field( $valeur ) );
			case 'textarea':
				return $borne( sanitize_textarea_field( $valeur ) );
			case 'lines':
				$lignes = array_filter( array_map( 'sanitize_text_field', preg_split( '/\R/', $valeur ) ?: [] ), static fn( string $l ): bool => $l !== '' );
				return $borne( implode( "\n", $lignes ) );
			case 'slug':
				return $borne( sanitize_title( $valeur ) );
			case 'select':
				return array_key_exists( $valeur, (array) $def['options'] ) ? $valeur : '';
			case 'bool':
				return $valeur === '1' ? '1' : '0';
			case 'int':
				return (string) absint( $valeur );
			case 'hash':
				return preg_match( '/^[a-f0-9]{32}$/', $valeur ) ? $valeur : '';
			case 'json':
				$d = json_decode( $valeur, true );
				return is_array( $d ) ? (string) wp_json_encode( $d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) : '';
			default:
				return '';
		}
	}
}
