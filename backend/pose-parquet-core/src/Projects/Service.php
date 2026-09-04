<?php
/**
 * Création d'une demande : la seule séquence qui écrit une demande.
 *
 * valider → normaliser → insérer → référence → historique, sous une
 * transaction InnoDB. Si une étape échoue, rien n'est resté : pas de ligne
 * sans référence, pas de référence sans historique.
 *
 * Le service ne connaît ni HTTP ni JSON. Il rend un résultat typé que le
 * contrôleur traduit en réponse, et il est appelable tel quel depuis un test
 * ou un script CLI — c'est ainsi que la concurrence est éprouvée.
 *
 * @package PoseParquet\Core
 */

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

	/**
	 * @param mixed $input corps décodé de la requête
	 * @return array{ok:bool,reference?:string,id?:int,code?:string,fields?:array<string,string>}
	 */
	public function create( mixed $input ): array {
		$validation = Validator::validate( $input );
		if ( ! $validation['ok'] ) {
			return [ 'ok' => false, 'code' => self::ERR_VALIDATION, 'fields' => $validation['errors'] ];
		}

		$data = $validation['data'];
		$now  = current_time( 'mysql', true ); // UTC serveur — la seule horloge qui compte.
		$year = (int) current_time( 'Y', true );

		$repo          = $this->repository;
		$transactional = $repo->supports_transactions();
		if ( $transactional && ! $repo->begin() ) {
			Logger::error( 'Transaction impossible', [ 'route' => 'projects.create' ] );
			return [ 'ok' => false, 'code' => self::ERR_STORAGE ];
		}

		$id = $repo->insert_project( $data, $now, $now );
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

	/** @return array{ok:bool,code:string} */
	private function abandon( bool $transactional, string $etape, int $id = 0 ): array {
		if ( $transactional ) {
			$this->repository->rollback();
		}
		// Identifiant et étape : assez pour diagnostiquer, rien de la personne.
		Logger::error( 'Création de demande interrompue', [ 'route' => 'projects.create', 'step' => $etape, 'project_id' => $id ] );

		return [ 'ok' => false, 'code' => self::ERR_STORAGE ];
	}
}
