<?php
/**
 * CORS de l'espace pose-parquet/v1 : liste fermée d'origines, jamais `*`.
 *
 * Le front est un site statique servi depuis un autre domaine que WordPress ;
 * le navigateur exige donc que l'API déclare qui a le droit de l'appeler.
 * WordPress répond par défaut « l'origine qui demande » à tout le monde
 * (`rest_send_cors_headers`) — trop large pour une route qui écrit. Sur notre
 * espace, cette classe remplace cette réponse : origine reconnue → en-têtes
 * précis ; origine inconnue → aucun en-tête CORS, le navigateur bloque.
 *
 * CORS n'est pas une authentification : un curl ignore ces en-têtes. Il
 * empêche seulement qu'un site tiers fasse poster le navigateur d'un visiteur
 * à sa place. La protection de la route reste la validation, les bornes, et
 * plus tard l'anti-spam.
 *
 * Origines autorisées : la constante POSE_PARQUET_ALLOWED_ORIGINS (tableau)
 * dans wp-config.php si elle existe, sinon la liste ci-dessous ; puis le
 * filtre `pose_parquet_allowed_origins` pour un ajustement par code.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Rest;

use WP_REST_Request;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Cors {

	public const DEFAULT_ORIGINS = [
		'http://localhost:5180',
		'https://jonathan-lanationduweb.github.io',
		'https://pose-parquet.com',
		'https://www.pose-parquet.com',
	];

	public const ALLOWED_METHODS = 'POST, OPTIONS';
	public const ALLOWED_HEADERS = 'Content-Type';
	public const MAX_AGE         = 600;

	public static function register(): void {
		add_filter( 'rest_pre_serve_request', [ self::class, 'serve' ], 20, 4 );
	}

	/** @return string[] origines normalisées (schéma + hôte + port), sans doublon */
	public static function allowed_origins(): array {
		$origins = defined( 'POSE_PARQUET_ALLOWED_ORIGINS' ) && is_array( POSE_PARQUET_ALLOWED_ORIGINS )
			? POSE_PARQUET_ALLOWED_ORIGINS
			: self::DEFAULT_ORIGINS;
		$origins = apply_filters( 'pose_parquet_allowed_origins', $origins );

		$propres = [];
		foreach ( (array) $origins as $origin ) {
			$origin = is_string( $origin ) ? self::normalize( $origin ) : '';
			// Une étoile ne passe pas, même par le filtre.
			if ( $origin !== '' && $origin !== '*' ) {
				$propres[] = $origin;
			}
		}

		return array_values( array_unique( $propres ) );
	}

	public static function is_allowed( string $origin ): bool {
		$origin = self::normalize( $origin );
		return $origin !== '' && in_array( $origin, self::allowed_origins(), true );
	}

	/**
	 * Pose (ou retire) les en-têtes CORS juste avant l'envoi, pour notre espace seulement.
	 *
	 * @param bool             $served
	 * @param mixed            $result
	 * @param WP_REST_Request  $request
	 * @param mixed            $server
	 */
	public static function serve( $served, $result, $request, $server ): bool {
		if ( ! ( $request instanceof WP_REST_Request ) || ! self::concerns( $request->get_route() ) ) {
			return (bool) $served;
		}

		$origin = isset( $_SERVER['HTTP_ORIGIN'] ) ? (string) wp_unslash( $_SERVER['HTTP_ORIGIN'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput

		if ( ! headers_sent() ) {
			// On repart de zéro : WordPress a déjà pu écrire sa réponse permissive.
			header_remove( 'Access-Control-Allow-Origin' );
			header_remove( 'Access-Control-Allow-Credentials' );
			header_remove( 'Access-Control-Expose-Headers' );
			header( 'Vary: Origin', false );

			if ( $origin !== '' && self::is_allowed( $origin ) ) {
				header( 'Access-Control-Allow-Origin: ' . self::normalize( $origin ) );
				header( 'Access-Control-Allow-Methods: ' . self::ALLOWED_METHODS );
				header( 'Access-Control-Allow-Headers: ' . self::ALLOWED_HEADERS );
				header( 'Access-Control-Expose-Headers: X-Request-Id' );
				header( 'Access-Control-Max-Age: ' . self::MAX_AGE );
			}
		}

		return (bool) $served;
	}

	/** Vrai pour toute route de notre espace de noms. */
	public static function concerns( string $route ): bool {
		return str_starts_with( $route, '/' . Routes::NAMESPACE . '/' ) || $route === '/' . Routes::NAMESPACE;
	}

	/** Schéma + hôte + port, en minuscules, sans chemin ni barre finale. */
	public static function normalize( string $origin ): string {
		$origin = strtolower( trim( $origin ) );
		$parts  = wp_parse_url( $origin );
		if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			return '';
		}
		$port = isset( $parts['port'] ) ? ':' . (int) $parts['port'] : '';

		return $parts['scheme'] . '://' . $parts['host'] . $port;
	}
}
