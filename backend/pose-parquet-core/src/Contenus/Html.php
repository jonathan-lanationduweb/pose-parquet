<?php



declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Html {


	public const CLASSES = [
		'callout', 'callout--warning', 'callout--key', 'callout__label', 'text-muted',
		'link-arrow', 'steps', 'table-wrap', 'table-compare', 'grid', 'grid--2',
		'pattern-card', 'pattern-card__viz', 'ba', 'ba__layer', 'ba__layer--after',
		'ba__tag', 'ba__tag--before', 'ba__tag--after', 'ba__handle', 'ba__range',
	];


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

		$propre = (string) preg_replace_callback(
			'/\sclass="([^"]*)"/',
			static function ( array $m ): string {
				$gardees = array_values( array_intersect( preg_split( '/\s+/', trim( $m[1] ) ) ?: [], self::CLASSES ) );
				return $gardees ? ' class="' . esc_attr( implode( ' ', $gardees ) ) . '"' : '';
			},
			$propre
		);

		$propre = (string) preg_replace( '#<p>(?:\s|&nbsp;|\x{00A0})*</p>\s*#u', '', $propre );

		$propre = (string) preg_replace( '/<input(?![^>]*class="[^"]*ba__range)[^>]*>/', '', $propre );
		return self::attributs_data( $propre );
	}



	private static function attributs_data( string $html ): string {
		return (string) preg_replace_callback(
			'/\s(data-(?:pattern-thumb|mode|base|visualizer))(?:="([^"]*)")?/',
			static function ( array $m ): string {
				$valeur = html_entity_decode( $m[2] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8' );
				$ok = match ( $m[1] ) {
					'data-pattern-thumb' => (bool) preg_match( '/^[a-z0-9-]{1,40}$/', $valeur ),
					'data-mode'          => in_array( $valeur, [ 'compact', 'full', 'plan' ], true ),
					'data-base'          => (bool) preg_match( '#^(?:\.\./)*$#', $valeur ),
					'data-visualizer'    => $valeur === '',
					default              => false,
				};
				if ( ! $ok ) {
					return '';
				}
				return $valeur === '' && $m[1] === 'data-visualizer' ? ' data-visualizer' : ' ' . $m[1] . '="' . esc_attr( $valeur ) . '"';
			},
			$html
		);
	}



	public static function corps( \WP_Post $post ): string {
		$brut = (string) $post->post_content;
		$hash = (string) get_post_meta( $post->ID, '_pp_import_hash', true );
		if ( $hash !== '' && hash_equals( $hash, md5( $brut ) ) ) {
			return $brut;
		}
		return self::filtrer( wpautop( $brut ) );
	}



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
