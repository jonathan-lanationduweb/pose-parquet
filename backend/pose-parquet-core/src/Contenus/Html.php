<?php
/**
 * Le HTML qu'un contenu peut transmettre au site : une liste FERMÉE.
 *
 * L'éditeur classique laisse saisir n'importe quel HTML (onglet « Texte ») ;
 * le site, lui, ne doit recevoir que ce que ses gabarits savent mettre en
 * forme. Pas d'attribut `style`, pas de script, pas de classe inventée : une
 * classe inconnue est retirée, parce qu'elle serait soit inopérante, soit une
 * façon de détourner la mise en page.
 *
 * Les balises et classes admises sont exactement celles des composants des
 * articles du site (_generator/ui.js : encadrés, étapes, figures, tableaux,
 * avant/après, lien fléché) et des balises de texte courantes.
 *
 * Ce filtre s'applique au contenu MODIFIÉ dans WordPress. Un contenu importé
 * et non retouché est rendu tel quel : il vient du dépôt, et le refiltrer
 * changerait des octets sans rien protéger.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Html {

	/** Classes reconnues par la feuille de style du site. */
	public const CLASSES = [
		'callout', 'callout--warning', 'callout--key', 'callout__label', 'text-muted',
		'link-arrow', 'steps', 'table-wrap', 'table-compare', 'grid', 'grid--2',
		'pattern-card', 'pattern-card__viz', 'ba', 'ba__layer', 'ba__layer--after',
		'ba__tag', 'ba__tag--before', 'ba__tag--after', 'ba__handle', 'ba__range',
	];

	/** @return array<string,array<string,bool>> */
	public static function autorise(): array {
		$c = [ 'class' => true ];
		return [
			'p'          => $c,
			'h2'         => [ 'id' => true ],
			'h3'         => [ 'id' => true ],
			'strong'     => [],
			'em'         => [],
			'b'          => [],
			'i'          => [],
			'br'         => [],
			'ul'         => [],
			'ol'         => $c,
			'li'         => [],
			'blockquote' => [],
			'a'          => [ 'href' => true, 'rel' => true, 'class' => true ],
			'aside'      => $c,
			'figure'     => [],
			'figcaption' => [],
			'img'        => [ 'src' => true, 'alt' => true, 'width' => true, 'height' => true, 'loading' => true, 'decoding' => true ],
			'table'      => $c,
			'thead'      => [],
			'tbody'      => [],
			'tr'         => [],
			'th'         => [ 'scope' => true ],
			'td'         => [],
			'div'        => [ 'class' => true, 'data-visualizer' => true, 'data-mode' => true, 'data-base' => true, 'data-pattern-thumb' => true ],
			'span'       => [ 'class' => true, 'aria-hidden' => true ],
			'input'      => [ 'class' => true, 'type' => true, 'min' => true, 'max' => true, 'value' => true, 'aria-label' => true ],
			'svg'        => [ 'viewbox' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'stroke-linecap' => true, 'stroke-linejoin' => true, 'aria-hidden' => true ],
			'path'       => [ 'd' => true ],
		];
	}

	public static function filtrer( string $html ): string {
		$propre = wp_kses( $html, self::autorise(), [ 'http', 'https', 'mailto' ] );
		// Classes : seules celles du site passent.
		$propre = (string) preg_replace_callback(
			'/\sclass="([^"]*)"/',
			static function ( array $m ): string {
				$gardees = array_values( array_intersect( preg_split( '/\s+/', trim( $m[1] ) ) ?: [], self::CLASSES ) );
				return $gardees ? ' class="' . esc_attr( implode( ' ', $gardees ) ) . '"' : '';
			},
			$propre
		);
		// Paragraphes vides laissés par l'éditeur visuel (« <p>&nbsp;</p> ») : rien à publier.
		$propre = (string) preg_replace( '#<p>(?:\s|&nbsp;|\x{00A0})*</p>\s*#u', '', $propre );
		// Un champ de saisie n'a sa place que dans le comparateur avant/après.
		$propre = (string) preg_replace( '/<input(?![^>]*class="[^"]*ba__range)[^>]*>/', '', $propre );
		return $propre;
	}

	/**
	 * Le corps à transmettre : tel quel s'il n'a pas été retouché depuis
	 * l'import, sinon mis en paragraphes (l'éditeur classique enregistre des
	 * lignes vides, pas des <p>) puis filtré.
	 */
	public static function corps( \WP_Post $post ): string {
		$brut = (string) $post->post_content;
		$hash = (string) get_post_meta( $post->ID, '_pp_import_hash', true );
		if ( $hash !== '' && hash_equals( $hash, md5( $brut ) ) ) {
			return $brut;
		}
		return self::filtrer( wpautop( $brut ) );
	}

	/**
	 * Images de la médiathèque insérées dans le corps (bouton « Ajouter un
	 * média ») : leur adresse est celle de WordPress, que le site public ne
	 * sert pas. On la remplace par le fichier que `wordpress.js pull` rapatrie
	 * (`assets/images/wp-<id>.jpg`, chemin relatif comme les illustrations
	 * importées), et on liste ces images pour qu'il les télécharge.
	 *
	 * Les illustrations importées du dépôt (« ../assets/images/… ») ne sont
	 * pas concernées : elles restent telles quelles, sans copie.
	 *
	 * @param array<int,array<string,mixed>> $medias complété des images trouvées
	 */
	public static function medias( string $html, array &$medias ): string {
		$base = trailingslashit( (string) wp_get_upload_dir()['baseurl'] );
		$base = (string) preg_replace( '#^https?:#', '', $base );
		return (string) preg_replace_callback(
			'/(<img\b[^>]*\ssrc=")([^"]+)(")/i',
			static function ( array $m ) use ( $base, &$medias ): string {
				$src = html_entity_decode( $m[2] );
				if ( ! str_starts_with( (string) preg_replace( '#^https?:#', '', $src ), $base ) ) {
					return $m[0];
				}
				$id = attachment_url_to_postid( $src );
				if ( ! $id ) {
					// Une taille intermédiaire (photo-1024x683.jpg) : on remonte à l'original.
					$id = attachment_url_to_postid( (string) preg_replace( '/-\d+x\d+(?=\.\w+$)/', '', $src ) );
				}
				$image = $id ? Export::image( $id ) : null;
				if ( ! $image ) {
					return $m[0];
				}
				$medias[ $id ] = $image;
				return $m[1] . '../assets/images/wp-' . $id . '.jpg' . $m[3];
			},
			$html
		);
	}

	public static function intact( \WP_Post $post ): bool {
		$hash = (string) get_post_meta( $post->ID, '_pp_import_hash', true );
		return $hash !== '' && hash_equals( $hash, md5( (string) $post->post_content ) );
	}
}
