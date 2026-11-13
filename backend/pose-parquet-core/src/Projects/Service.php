<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

use PoseParquet\Core\Support\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Service {

	public const ERR_VALIDATION = 'validation_failed';
	public const ERR_STORAGE    = 'storage_failed';

	private Repository $repository;

	public function __construct( ?Repository $repository = null ) {
		$this->repository = $repository ?? new Repository();
	}



	public function create( mixed $input ): array {
		$validation = Validator::validate( $input );
		if ( ! $validation['ok'] ) {
			return [ 'ok' => false, 'code' => self::ERR_VALIDATION, 'fields' => $validation['errors'] ];
		}

		$data = $validation['data'];
		$now  = current_time( 'mysql', true );
		$year = (int) current_time( 'Y', true );

		$repo          = $this->repository;
		$transactional = $repo->supports_transactions();
		if ( $transactional && ! $repo->begin() ) {
			Logger::error( 'Transaction impossible', [ 'route' => 'projects.create' ] );
			return [ 'ok' => false, 'code' => self::ERR_STORAGE ];
		}



		$id = $repo->insert_project( $data, ! empty( $data['consent'] ) ? $now : null, $now );
		if ( $id <= 0 ) {
			return $this->abandon( $transactional, 'Insertion refusée' );
		}

		$reference = Reference::build( $id, $year );
		if ( ! $repo->set_reference( $id, $reference ) ) {
			return $this->abandon( $transactional, 'Référence non posée', $id );
		}

		if ( ! $repo->insert_history( $id, null, Status::DEFAULT, 0, $now ) ) {
			return $this->abandon( $transactional, 'Historique non écrit', $id );
		}

		if ( $transactional && ! $repo->commit() ) {
			return $this->abandon( $transactional, 'Commit refusé', $id );
		}

		return [ 'ok' => true, 'reference' => $reference, 'id' => $id ];
	}


	private function abandon( bool $transactional, string $etape, int $id = 0 ): array {
		if ( $transactional ) {
			$this->repository->rollback();
		}

		Logger::error( 'Création de demande interrompue', [ 'route' => 'projects.create', 'step' => $etape, 'project_id' => $id ] );

		return [ 'ok' => false, 'code' => self::ERR_STORAGE ];
	}
}
