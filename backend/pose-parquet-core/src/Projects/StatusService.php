<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

use PoseParquet\Core\Support\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class StatusService {

	public const OK               = 'ok';
	public const UNCHANGED        = 'unchanged';
	public const STALE            = 'stale';
	public const INVALID          = 'invalid_status';
	public const NOT_FOUND        = 'not_found';
	public const WRITE_FAILED     = 'write_failed';



	public static function change( int $project_id, string $expected_old, string $new_status ): array {
		$echec = static fn( string $code ): array => [ 'code' => $code, 'old' => $expected_old, 'new' => $new_status ];

		if ( ! Status::is_valid( $new_status ) || ! Status::is_valid( $expected_old ) ) {
			return $echec( self::INVALID );
		}

		$repo = new Repository();
		$row  = $repo->find_by_id( $project_id );
		if ( $row === null ) {
			return $echec( self::NOT_FOUND );
		}

		$actuel = (string) $row['status'];



		if ( $actuel !== $expected_old ) {
			return [ 'code' => self::STALE, 'old' => $actuel, 'new' => $new_status ];
		}



		if ( $actuel === $new_status ) {
			return [ 'code' => self::UNCHANGED, 'old' => $actuel, 'new' => $new_status ];
		}

		$now           = current_time( 'mysql', true );
		$user_id       = get_current_user_id();
		$transactionne = $repo->supports_transactions();

		if ( $transactionne ) {
			$repo->begin();
		}

		if ( ! $repo->update_status_if( $project_id, $expected_old, $new_status, $now ) ) {
			if ( $transactionne ) {
				$repo->rollback();
			}


			return [ 'code' => self::STALE, 'old' => (string) ( $repo->find_by_id( $project_id )['status'] ?? $actuel ), 'new' => $new_status ];
		}

		if ( ! $repo->insert_history( $project_id, $actuel, $new_status, $user_id, $now ) ) {
			if ( $transactionne ) {
				$repo->rollback();
				Logger::error( 'historique impossible, changement de statut annulé', [
					'project_id' => $project_id,
					'user_id'    => $user_id,
					'error_code' => self::WRITE_FAILED,
				] );

				return $echec( self::WRITE_FAILED );
			}


			Logger::error( 'statut changé sans trace d’historique (moteur non transactionnel)', [
				'project_id'    => $project_id,
				'user_id'       => $user_id,
				'status_before' => $actuel,
				'status_after'  => $new_status,
			] );
		}

		if ( $transactionne ) {
			$repo->commit();
		}

		Logger::info( 'statut de demande changé', [
			'project_id'    => $project_id,
			'user_id'       => $user_id,
			'status_before' => $actuel,
			'status_after'  => $new_status,
		] );

		return [ 'code' => self::OK, 'old' => $actuel, 'new' => $new_status ];
	}
}
