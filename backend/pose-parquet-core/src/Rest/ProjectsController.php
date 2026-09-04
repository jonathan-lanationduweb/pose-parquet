<?php
/**
 * POST /pose-parquet/v1/projects — dépôt public d'une demande.
 *
 * Contrôleur mince : il lit le corps, vérifie ce qui relève du transport
 * (JSON valide, taille raisonnable), délègue à Projects\Service, et traduit le
 * résultat en HTTP. Il ne valide pas un champ métier lui-même.
 *
 * Réponses :
 *   201  { success: true, reference: "PP-2026-000123" }
 *   400  corps absent ou JSON illisible
 *   413  corps trop volumineux (avant même de le lire)
 *   422  validation refusée — { code, message, fields: { champ: raison } }
 *   500  écriture impossible
 *   503  schéma de base absent ou en retard
 *
 * Toutes les erreurs ont la forme { code, message, fields } ; aucune ne
 * contient de SQL, de chemin, de trace ni de donnée saisie. La route est
 * publique (permission_callback → true) : l'authentification n'a pas de sens
 * pour un formulaire de contact, et CORS n'en est pas une (voir Cors).
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Rest;

use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Projects\Service;
use PoseParquet\Core\Support\Logger;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class ProjectsController {

	/** Taille maximale du corps JSON, en octets : un formulaire tient dans bien moins. */
	public const MAX_BODY_BYTES = 16384;

	public static function permission(): bool {
		return true;
	}

	public static function create( WP_REST_Request $request ): WP_REST_Response {
		$request_id = self::request_id();
		$start      = microtime( true );

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

		$result = ( new Service() )->create( $input );

		if ( ! $result['ok'] ) {
			if ( $result['code'] === Service::ERR_VALIDATION ) {
				return self::error( 422, 'validation_failed', 'Certains champs sont invalides.', $result['fields'] ?? [], $request_id );
			}
			return self::error( 500, 'storage_failed', 'La demande n’a pas pu être enregistrée.', [], $request_id );
		}

		Logger::info( 'Demande créée', [
			'request_id'  => $request_id,
			'route'       => 'projects.create',
			'project_id'  => $result['id'],
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
