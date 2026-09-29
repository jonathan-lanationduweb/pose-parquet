<?php
/**
 * Réduction de la surface exposée par WordPress lui-même.
 *
 * Ce plugin est le backend d'un seul site, et ce site n'a ni auteurs publics,
 * ni client XML-RPC, ni flux de publication : tout ce que WordPress expose sur
 * ces sujets est donc du renseignement offert sans contrepartie. L'audit du
 * 14/09/2026 l'a mesuré — `/wp-json/wp/v2/users` rendait
 * `{"id":1,"name":"admin"}`, soit la moitié des identifiants d'administration.
 *
 * Ce que ce module N'EST PAS : un mécanisme d'authentification. Cacher un nom
 * de compte ne protège pas un mot de passe faible ; cela retire simplement la
 * liste des cibles à qui la demande. La protection réelle reste le mot de
 * passe, la limitation de tentatives et le transport HTTPS.
 *
 * Chaque mesure est indépendante et désactivable par filtre :
 *
 *     add_filter( 'pose_parquet_hardening_xmlrpc', '__return_false' );
 *
 * Un site qui aurait réellement besoin de XML-RPC (application mobile,
 * Jetpack) le rétablit sans toucher au code, et sans perdre les autres
 * mesures.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Security;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Hardening {

	/** Routes d'énumération à retirer aux requêtes sans droit de lister. */
	private const USER_ROUTES = [
		'/wp/v2/users',
		'/wp/v2/users/(?P<id>[\d]+)',
	];

	public static function register(): void {
		if ( self::active( 'rest_users' ) ) {
			add_filter( 'rest_endpoints', [ self::class, 'filter_user_routes' ] );
		}
		if ( self::active( 'author_archives' ) ) {
			/*
			 * Priorité 0, et ce n'est pas de la prudence : `redirect_canonical`
			 * est branché sur le même crochet à la priorité 10, et il est
			 * enregistré par le cœur avant `plugins_loaded`. À égalité de
			 * priorité il passerait donc le premier — et c'est précisément lui
			 * qui transforme `?author=1` en `/author/admin/`, c'est-à-dire qui
			 * révèle le nom recherché. Il faut passer avant lui, pas après.
			 */
			add_action( 'template_redirect', [ self::class, 'block_author_enumeration' ], 0 );
		}
		if ( self::active( 'oembed_author' ) ) {
			add_filter( 'oembed_response_data', [ self::class, 'strip_oembed_author' ] );
		}
		if ( self::active( 'xmlrpc' ) ) {
			add_filter( 'xmlrpc_enabled', '__return_false' );
			add_filter( 'xmlrpc_methods', '__return_empty_array' );
			add_filter( 'wp_headers', [ self::class, 'drop_pingback_header' ] );
			remove_action( 'wp_head', 'rsd_link' );
		}
		if ( self::active( 'version_disclosure' ) ) {
			remove_action( 'wp_head', 'wp_generator' );
			add_filter( 'the_generator', '__return_empty_string' );
		}
	}

	/**
	 * Une mesure est-elle active ? Vraie par défaut, débrayable par filtre.
	 */
	private static function active( string $mesure ): bool {
		return (bool) apply_filters( 'pose_parquet_hardening_' . $mesure, true );
	}

	/**
	 * Retire les routes utilisateurs à qui n'a pas le droit de lister.
	 *
	 * `unset` plutôt qu'un `permission_callback` durci : une route absente ne
	 * figure pas non plus dans l'index `/wp-json/`, qui est lui-même une carte
	 * de ce qu'il y a à attaquer. Un administrateur — donc l'éditeur de blocs,
	 * l'écran des utilisateurs, et tout ce qui s'appuie sur l'API — les
	 * conserve intactes : `list_users` est exactement le droit que WordPress
	 * exige déjà pour lister les comptes.
	 *
	 * `/wp/v2/users/me` n'est pas touchée : elle ne rend que le compte de
	 * l'appelant, et refuse déjà les anonymes.
	 *
	 * @param array<string,mixed> $endpoints
	 * @return array<string,mixed>
	 */
	public static function filter_user_routes( array $endpoints ): array {
		if ( current_user_can( 'list_users' ) ) {
			return $endpoints;
		}
		foreach ( self::USER_ROUTES as $route ) {
			unset( $endpoints[ $route ] );
		}

		return $endpoints;
	}

	/**
	 * `?author=1` révèle le `user_nicename` par la redirection qu'il déclenche.
	 *
	 * Le site public n'a pas d'archive d'auteur — il n'a pas d'articles. La
	 * requête est donc renvoyée vers l'accueil, en 301, comme n'importe quelle
	 * URL qui n'existe pas dans ce site.
	 */
	public static function block_author_enumeration(): void {
		if ( is_admin() || is_user_logged_in() ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- lecture d'un paramètre public, sans effet.
		$auteur = isset( $_GET['author'] ) ? sanitize_text_field( wp_unslash( $_GET['author'] ) ) : '';
		if ( $auteur === '' && ! is_author() ) {
			return;
		}
		wp_safe_redirect( home_url( '/' ), 301 );
		exit;
	}

	/**
	 * oEmbed rend `author_name` et `author_url` : la même information par une
	 * autre porte. On retire les deux clés plutôt que de les vider, pour ne pas
	 * laisser croire à un auteur nommé « ».
	 *
	 * @param array<string,mixed>|mixed $data
	 * @return array<string,mixed>|mixed
	 */
	public static function strip_oembed_author( $data ) {
		if ( ! is_array( $data ) ) {
			return $data;
		}
		unset( $data['author_name'], $data['author_url'] );

		return $data;
	}

	/**
	 * L'en-tête `X-Pingback` annonce xmlrpc.php à chaque page servie. Il n'a
	 * plus d'objet une fois XML-RPC désactivé.
	 *
	 * @param array<string,string>|mixed $headers
	 * @return array<string,string>|mixed
	 */
	public static function drop_pingback_header( $headers ) {
		if ( is_array( $headers ) ) {
			unset( $headers['X-Pingback'] );
		}

		return $headers;
	}
}
