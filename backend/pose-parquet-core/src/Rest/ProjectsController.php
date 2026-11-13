<?php



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


	public const MAX_BODY_BYTES = 16384;


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



	private static function error( int $status, string $code, string $message, array $fields, string $request_id ): WP_REST_Response {
		$response = new WP_REST_Response( [ 'code' => $code, 'message' => $message, 'fields' => (object) $fields ], $status );
		self::headers( $response, $request_id );

		return $response;
	}

	private static function headers( WP_REST_Response $response, string $request_id ): void {
		$response->header( 'Cache-Control', 'no-store' );
		$response->header( 'X-Request-Id', $request_id );
	}



	private static function media_type( WP_REST_Request $request ): string {
		$type = $request->get_content_type();

		return is_array( $type ) ? strtolower( trim( (string) ( $type['value'] ?? '' ) ) ) : '';
	}


	private static function schema_ready(): bool {
		return ! in_array( false, Schema::status(), true )
			&& Installer::installed_version() >= POSE_PARQUET_DB_VERSION;
	}


	private static function request_id(): string {
		return bin2hex( random_bytes( 8 ) );
	}
}
