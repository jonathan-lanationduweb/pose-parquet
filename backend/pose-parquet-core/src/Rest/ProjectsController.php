<?php
/**
 * POST /pose-parquet/v1/projects — dépôt public d'une demande.
 *
 * Contrôleur mince : il lit le corps, vérifie ce qui relève du transport
 * (JSON valide, taille raisonnable), délègue à Projects\SubmissionService
 * (anti-spam → validation → écriture → emails), et traduit le résultat en
 * HTTP. Il ne valide pas un champ métier lui-même.
 *
 * Réponses :
 *   201  { success: true, reference: "PP-2026-000123" }
 *   400  corps absent ou JSON illisible
 *   413  corps trop volumineux (avant même de le lire)
 *   415  Content-Type autre que application/json
 *   422  validation refusée — { code, message, fields: { champ: raison } } ;
 *        aussi submission_rejected (pot de miel) et form_token_invalid (jeton)
 *   429  rate_limited, avec Retry-After
 *   500  écriture impossible
 *   503  schéma de base absent ou en retard
 *
 * Toutes les erreurs ont la forme { code, message, fields } ; aucune ne
 * contient de SQL, de chemin, de trace ni de donnée saisie. La route est
 * publique (permission_callback → true) : l'authentification n'a pas de sens
 * pour un formulaire de contact, et CORS n'en est pas une (voir Cors).
 *
 * Pourquoi le Content-Type est exigé. Les en-têtes CORS sont une réponse :
 * ils n'empêchent aucune requête de partir, ils empêchent seulement le
 * navigateur d'en lire le résultat. Le navigateur ne demande la permission
 * AVANT d'envoyer — le préflight — que si la requête sort du cadre des
 * requêtes dites simples, et `text/plain` y reste. Un site tiers pouvait
 * donc poster ce JSON avec ce type depuis le navigateur d'un visiteur : la
 * réponse lui était illisible, mais la demande était créée, depuis l'adresse
 * du visiteur, et partait en courrier. Exiger `application/json` rend le
 * préflight obligatoire, et donne enfin à Cors le pouvoir qu'on lui prêtait.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Rest;

use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Projects\SubmissionService;
use PoseParquet\Core\Support\Logger;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class ProjectsController {

	/** Taille maximale du corps JSON, en octets : un formulaire tient dans bien moins. */
	public const MAX_BODY_BYTES = 16384;

	/** Le seul type de contenu accepté ; les paramètres (charset) sont ignorés. */
	public const MEDIA_TYPE = 'application/json';

	public static function permission(): bool {
		return true;
	}

	public static function create( WP_REST_Request $request ): WP_REST_Response {
		$request_id = self::request_id();
		$start      = microtime( true );

		if ( self::media_type( $request ) !== self::MEDIA_TYPE ) {
			return self::error(
				415,
				'unsupported_media_type',
				'Type de contenu non pris en charge : application/json attendu.',
				[],
				$request_id
			);
		}

		$body = (string) $request->get_body();
		if ( strlen( $body ) > self::MAX_BODY_BYTES ) {
			return self::error( 413, 'payload_too_large', 'Requête trop volumineuse.', [], $request_id );
		}
		if ( trim( $body ) === '' ) {
			return self::error( 400, 'empty_body', 'Corps de requête absent.', [], $request_id );
		}

		$input = json_decode( $body, true, 8 );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return self::error( 400, 'invalid_json', 'Corps de requête illisible : JSON attendu.', [], $request_id );
		}

		if ( ! self::schema_ready() ) {
			Logger::error( 'Schéma indisponible', [ 'request_id' => $request_id, 'route' => 'projects.create' ] );
			return self::error( 503, 'service_unavailable', 'Service momentanément indisponible.', [], $request_id );
		}

		$result = ( new SubmissionService() )->submit( $input, $request_id );

		if ( ! $result['ok'] ) {
			$response = self::error( $result['status'], $result['code'] ?? 'error', $result['message'] ?? 'Requête refusée.', $result['fields'] ?? [], $request_id );
			if ( ! empty( $result['retry_after'] ) ) {
				$response->header( 'Retry-After', (string) (int) $result['retry_after'] );
			}
			return $response;
		}

		Logger::info( 'Demande créée', [
			'request_id'  => $request_id,
			'route'       => 'projects.create',
			'project_id'  => $result['id'],
			'mails'       => $result['mails'] ?? [],
			'duration_ms' => (int) round( ( microtime( true ) - $start ) * 1000 ),
		] );

		$response = new WP_REST_Response( [ 'success' => true, 'reference' => $result['reference'] ], 201 );
		self::headers( $response, $request_id );

		return $response;
	}

	/**
	 * @param array<string,string> $fields
	 */
	private static function error( int $status, string $code, string $message, array $fields, string $request_id ): WP_REST_Response {
		$response = new WP_REST_Response( [ 'code' => $code, 'message' => $message, 'fields' => (object) $fields ], $status );
		self::headers( $response, $request_id );

		return $response;
	}

	private static function headers( WP_REST_Response $response, string $request_id ): void {
		$response->header( 'Cache-Control', 'no-store' );
		$response->header( 'X-Request-Id', $request_id );
	}

	/**
	 * Type de média de la requête, sans ses paramètres et en minuscules.
	 *
	 * `get_content_type()` a déjà séparé `charset=utf-8` de la valeur et l'a
	 * abaissée en casse : `application/json; charset=utf-8` rend donc bien
	 * `application/json`. Un en-tête absent rend `null`, donc une chaîne vide,
	 * donc un refus — ce qui est voulu : une requête sans type déclaré n'est
	 * pas une requête JSON.
	 */
	private static function media_type( WP_REST_Request $request ): string {
		$type = $request->get_content_type();

		return is_array( $type ) ? strtolower( trim( (string) ( $type['value'] ?? '' ) ) ) : '';
	}

	/** Tables présentes et schéma au niveau attendu : sinon on n'écrit pas. */
	private static function schema_ready(): bool {
		return ! in_array( false, Schema::status(), true )
			&& Installer::installed_version() >= POSE_PARQUET_DB_VERSION;
	}

	/** Identifiant opaque, corrélable dans le journal, sans rapport avec la personne. */
	private static function request_id(): string {
		return bin2hex( random_bytes( 8 ) );
	}
}
