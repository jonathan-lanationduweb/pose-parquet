<?php
/**
 * Voir un contenu comme le site le montrera, avant de le publier — et voir
 * les illustrations du site dans l'éditeur, sans serveur de développement.
 *
 * 1. LES FICHIERS DU SITE, DEPUIS WORDPRESS.
 *    Les illustrations des articles importés gardent leurs chemins du site
 *    (« ../assets/images/x.jpg ») : c'est ce que le site publie. Pour que
 *    l'éditeur et l'aperçu les affichent, il leur faut une adresse de base où
 *    « ../assets/… » existe :
 *      - en local, le DOSSIER du site (Réglages → Site public) : WordPress en
 *        sert les fichiers publics par une route en lecture seule,
 *        /wp-json/pose-parquet/v1/site/assets/… — plus besoin de serve.js ;
 *      - sinon, le site public lui-même (https://pose-parquet.com/).
 *    Aucun fichier n'est copié, aucune adresse enregistrée n'est réécrite.
 *
 * 2. L'APERÇU PUBLIC D'UN GUIDE OU D'UN TUTORIEL.
 *    Le générateur publie la page d'article avec des repères à la place des
 *    textes (data/apercu/guide.tpl, tutoriel.tpl — voir build.js,
 *    buildGabaritsApercu). WordPress y place le contenu ENREGISTRÉ (brouillon
 *    compris), échappé, corps filtré, et sert la page à l'éditeur connecté
 *    seulement, en noindex. La mise en page reste celle du site.
 *
 * 3. DUPLIQUER COMME BROUILLON.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

use PoseParquet\Core\Admin\SitePublic;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Apercu {

	public const ACTION      = 'pp_apercu';
	public const DUPLIQUER   = 'pp_dupliquer';
	public const ROUTE       = '/site/(?P<chemin>assets/[A-Za-z0-9._/-]+)';
	private const TYPES_FICHIERS = [
		'jpg'   => 'image/jpeg',
		'jpeg'  => 'image/jpeg',
		'png'   => 'image/png',
		'webp'  => 'image/webp',
		'avif'  => 'image/avif',
		'gif'   => 'image/gif',
		'svg'   => 'image/svg+xml',
		'css'   => 'text/css; charset=utf-8',
		'js'    => 'text/javascript; charset=utf-8',
		'woff2' => 'font/woff2',
	];
	/** Les types de contenu qui ont une page d'article sur le site. */
	public const GABARITS = [ Types::GUIDE => 'guide', Types::TUTORIEL => 'tutoriel' ];

	public static function register(): void {
		add_action( 'admin_post_' . self::ACTION, [ self::class, 'afficher' ] );
		add_action( 'admin_post_' . self::DUPLIQUER, [ self::class, 'dupliquer' ] );
		add_action( 'post_submitbox_misc_actions', [ self::class, 'bouton' ] );
		add_filter( 'post_row_actions', [ self::class, 'actions_de_ligne' ], 20, 2 );
	}

	/* ------------------------------------------------------------ fichiers */

	public static function route( string $namespace ): void {
		register_rest_route(
			$namespace,
			self::ROUTE,
			[
				'methods'             => 'GET',
				'callback'            => [ self::class, 'fichier' ],
				// Les fichiers publics du site : ceux que pose-parquet.com sert à tout le monde.
				'permission_callback' => '__return_true',
			]
		);
	}

	/** Le dossier local du site, s'il est réglé et ressemble bien au site. */
	public static function dossier(): ?string {
		$d = SitePublic::dossier();
		if ( $d === '' ) {
			return null;
		}
		$reel = realpath( $d );
		return $reel && is_dir( $reel . '/assets' ) && is_file( $reel . '/index.html' ) ? $reel : null;
	}

	/** L'adresse où « assets/… » et « data/… » existent : la route locale, sinon le site public. */
	public static function base(): string {
		return self::dossier() ? rest_url( 'pose-parquet/v1/site/' ) : SitePublic::url();
	}

	/** Un fichier public du site, lu dans le dossier local. Rien d'autre que assets/, liste fermée d'extensions. */
	public static function fichier( \WP_REST_Request $r ): \WP_Error {
		$racine = self::dossier();
		$chemin = (string) $r['chemin'];
		$ext    = strtolower( pathinfo( $chemin, PATHINFO_EXTENSION ) );
		if ( ! $racine || str_contains( $chemin, '..' ) || ! isset( self::TYPES_FICHIERS[ $ext ] ) ) {
			return new \WP_Error( 'pp_introuvable', 'Introuvable.', [ 'status' => 404 ] );
		}
		$assets  = realpath( $racine . '/assets' );
		$fichier = realpath( $racine . '/' . $chemin );
		if ( ! $assets || ! $fichier || ! is_file( $fichier ) || ! str_starts_with( $fichier, $assets . DIRECTORY_SEPARATOR ) ) {
			return new \WP_Error( 'pp_introuvable', 'Introuvable.', [ 'status' => 404 ] );
		}
		header( 'Content-Type: ' . self::TYPES_FICHIERS[ $ext ] );
		header( 'Content-Length: ' . (string) filesize( $fichier ) );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Cache-Control: private, max-age=300' );
		header( 'Access-Control-Allow-Origin: *' );
		if ( $ext === 'svg' ) {
			// Un SVG servi depuis le domaine de WordPress ne doit rien exécuter.
			header( "Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:" );
		}
		readfile( $fichier ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile
		exit;
	}

	/* ------------------------------------------------------------ aperçu */

	public static function url( int $post_id ): string {
		return wp_nonce_url( admin_url( 'admin-post.php?action=' . self::ACTION . '&post=' . $post_id ), self::ACTION . '_' . $post_id );
	}

	/** Le gabarit d'article publié par le générateur. */
	private static function gabarit( string $nom ): ?string {
		$racine = self::dossier();
		if ( $racine && is_readable( $racine . '/data/apercu/' . $nom . '.tpl' ) ) {
			return (string) file_get_contents( $racine . '/data/apercu/' . $nom . '.tpl' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		}
		$r = wp_remote_get( SitePublic::url() . 'data/apercu/' . $nom . '.tpl', [ 'timeout' => 6 ] );
		return ! is_wp_error( $r ) && (int) wp_remote_retrieve_response_code( $r ) === 200 ? (string) wp_remote_retrieve_body( $r ) : null;
	}

	public static function afficher(): void {
		$id   = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- vérifié juste après.
		$post = $id ? get_post( $id ) : null;
		if ( ! $post || ! isset( self::GABARITS[ $post->post_type ] ) || ! current_user_can( 'edit_post', $id ) ) {
			wp_die( esc_html__( 'Aperçu indisponible.', 'pose-parquet-core' ), '', [ 'response' => 403 ] );
		}
		check_admin_referer( self::ACTION . '_' . $id );
		$html = self::gabarit( self::GABARITS[ $post->post_type ] );
		if ( $html === null ) {
			wp_die( esc_html__( 'Le gabarit d’aperçu du site est introuvable (data/apercu/). Vérifiez le dossier ou l’adresse du site public dans Réglages, puis reconstruisez le site.', 'pose-parquet-core' ), '', [ 'response' => 503 ] );
		}
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow' );
		header( 'Content-Type: text/html; charset=utf-8' );
		echo self::remplir( $html, $post ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- chaque valeur est échappée dans remplir().
		exit;
	}

	/** Les repères du gabarit, remplacés par le contenu enregistré. */
	public static function remplir( string $html, \WP_Post $post ): string {
		$meta  = static fn( string $cle ): string => (string) get_post_meta( $post->ID, $cle, true );
		$tax   = Types::taxonomie( $post->post_type );
		$terms = $tax ? get_the_terms( $post, $tax ) : [];
		$corps = Html::corps( $post );
		$mots  = count( preg_split( '/\s+/', trim( wp_strip_all_tags( $corps ) ) ) ?: [] );
		$image = (int) get_post_thumbnail_id( $post );
		$src   = $image ? (string) wp_get_attachment_image_url( $image, 'large' ) : '';
		$h1    = (string) $post->post_title;
		$niveau  = $meta( '_pp_niveau' );
		$duree   = $meta( '_pp_duree' );
		$outils  = array_filter( explode( "\n", $meta( '_pp_outils' ) ) );

		$html = strtr(
			$html,
			[
				'<li>Niveau %%PP_NIVEAU%%</li>' => $niveau !== '' ? '<li>Niveau ' . esc_html( $niveau ) . '</li>' : '',
				'<li>%%PP_DUREE%%</li>'         => $duree !== '' ? '<li>' . esc_html( $duree ) . '</li>' : '',
				'<li>%%PP_OUTILS%%</li>'        => implode( '', array_map( static fn( string $o ): string => '<li>' . esc_html( $o ) . '</li>', $outils ) ),
			]
		);
		$html = strtr(
			$html,
			[
				'%%PP_TITRE%%'       => esc_attr( $meta( Champs::META_TITLE ) ?: $h1 ),
				'%%PP_DESCRIPTION%%' => esc_attr( $meta( Champs::META_DESCRIPTION ) ),
				'%%PP_H1%%'          => esc_html( $h1 !== '' ? $h1 : __( '(sans titre)', 'pose-parquet-core' ) ),
				'%%PP_INTRO%%'       => esc_html( $meta( Champs::INTRO ) ),
				'%%PP_CATEGORIE%%'   => esc_html( is_array( $terms ) && $terms ? $terms[0]->name : '' ),
				'%%PP_LECTURE%%'     => esc_html( $meta( '_pp_lecture' ) ?: max( 1, (int) round( $mots / 200 ) ) . ' min' ),
				'%%PP_DATE_ISO%%'    => esc_attr( mysql2date( 'Y-m-d', $post->post_date, false ) ),
				// Date locale (un brouillon n'a pas de date GMT tant qu'il n'est pas publié).
				'%%PP_DATE%%'        => esc_html( mysql2date( 'j F Y', $post->post_date ) ),
				'%%PP_COUVERTURE%%'  => $src ? '<div class="article-cover"><img src="' . esc_url( $src ) . '" alt="" /></div>' : '',
				'%%PP_CORPS%%'       => $corps,
			]
		);
		$base     = self::base() . ( $post->post_type === Types::TUTORIEL ? 'tutoriels/' : 'guides/' );
		$bandeau  = '<div style="position:fixed;left:0;right:0;bottom:0;z-index:1000;padding:10px 16px;background:#46594A;color:#fff;font:600 13px/1.4 system-ui,sans-serif;text-align:center">'
			. esc_html( $post->post_status === 'publish' ? __( 'Aperçu de la version enregistrée — pas encore reconstruite sur le site public.', 'pose-parquet-core' ) : __( 'Aperçu — brouillon non publié, visible par vous seul.', 'pose-parquet-core' ) )
			. ( $src ? '' : ' · ' . esc_html__( 'Image de couverture manquante.', 'pose-parquet-core' ) )
			. '</div>';
		$html = (string) preg_replace( '/<head>/', '<head>' . "\n    " . '<base href="' . esc_url( $base ) . '" />', $html, 1 );
		$html = (string) preg_replace( '/<meta name="robots" content="[^"]*" \/>/', '<meta name="robots" content="noindex, nofollow" />', $html, 1 );
		return (string) preg_replace( '/(<body[^>]*>)/', '$1' . $bandeau, $html, 1 );
	}

	/** Dans la boîte « Publier » : l'aperçu, à côté de l'état. */
	public static function bouton( \WP_Post $post ): void {
		if ( ! isset( self::GABARITS[ $post->post_type ] ) || $post->post_status === 'auto-draft' ) {
			return;
		}
		echo '<div class="misc-pub-section"><a class="adm-bouton adm-bouton--petit" href="' . esc_url( self::url( $post->ID ) ) . '" target="_blank" rel="noopener"><span class="dashicons dashicons-visibility" aria-hidden="true"></span>' . esc_html__( 'Aperçu public', 'pose-parquet-core' ) . '</a>';
		echo '<span class="description adm-apercu-note">' . esc_html__( 'Montre la dernière version enregistrée.', 'pose-parquet-core' ) . '</span></div>';
	}

	/** Dans les listes : Aperçu et Dupliquer. */
	public static function actions_de_ligne( array $actions, \WP_Post $post ): array {
		if ( ! isset( self::GABARITS[ $post->post_type ] ) || ! current_user_can( 'edit_post', $post->ID ) ) {
			return $actions;
		}
		$actions['pp_apercu']    = '<a href="' . esc_url( self::url( $post->ID ) ) . '" target="_blank" rel="noopener">' . esc_html__( 'Aperçu', 'pose-parquet-core' ) . '</a>';
		$actions['pp_dupliquer'] = '<a href="' . esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=' . self::DUPLIQUER . '&post=' . $post->ID ), self::DUPLIQUER . '_' . $post->ID ) ) . '">' . esc_html__( 'Dupliquer', 'pose-parquet-core' ) . '</a>';
		return $actions;
	}

	/* ------------------------------------------------------------ duplication */

	/** Copie un guide ou un tutoriel en BROUILLON : textes, champs, image, catégorie. */
	public static function dupliquer(): void {
		$id   = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- vérifié juste après.
		$post = $id ? get_post( $id ) : null;
		$objet = $post ? get_post_type_object( $post->post_type ) : null;
		if ( ! $post || ! $objet || ! isset( self::GABARITS[ $post->post_type ] ) || ! current_user_can( 'edit_post', $id ) || ! current_user_can( $objet->cap->create_posts ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), '', [ 'response' => 403 ] );
		}
		check_admin_referer( self::DUPLIQUER . '_' . $id );
		$copie = wp_insert_post(
			wp_slash(
				[
					'post_type'    => $post->post_type,
					'post_status'  => 'draft',
					'post_title'   => $post->post_title . ' ' . __( '(copie)', 'pose-parquet-core' ),
					'post_excerpt' => $post->post_excerpt,
					'post_content' => $post->post_content,
					'menu_order'   => $post->menu_order,
				]
			),
			true
		);
		if ( is_wp_error( $copie ) ) {
			wp_die( esc_html( $copie->get_error_message() ) );
		}
		foreach ( Champs::pour( $post->post_type ) as $cle => $_ ) {
			$v = get_post_meta( $id, $cle, true );
			if ( $v !== '' ) {
				update_post_meta( (int) $copie, $cle, wp_slash( $v ) );
			}
		}
		$image = (int) get_post_thumbnail_id( $post );
		if ( $image ) {
			set_post_thumbnail( (int) $copie, $image );
		}
		$tax = Types::taxonomie( $post->post_type );
		if ( $tax ) {
			wp_set_object_terms( (int) $copie, wp_get_object_terms( $id, $tax, [ 'fields' => 'ids' ] ), $tax );
		}
		wp_safe_redirect( (string) get_edit_post_link( (int) $copie, 'url' ) );
		exit;
	}
}
