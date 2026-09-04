<?php
/**
 * Le pipeline d'une soumission publique, dans l'ordre et rien que l'ordre.
 *
 *   identité réseau → limite de tentatives → pot de miel → jeton
 *   → limite de créations → validation + écriture (Service, transaction)
 *   → compteur de créations → emails (Notifier) → résultat.
 *
 * Tout ce qui précède l'écriture ne touche pas la base. Tout ce qui la suit
 * ne peut pas l'annuler : les emails partent après COMMIT et leur échec
 * n'est qu'un état enregistré. Le contrôleur ne connaît que ce service ;
 * Service (validation + écriture) reste tel qu'au lot 2.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Projects;

use PoseParquet\Core\Antispam\ClientIdentity;
use PoseParquet\Core\Antispam\Guard;
use PoseParquet\Core\Mail\Notifier;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class SubmissionService {

	private Guard $guard;
	private Service $service;
	private Notifier $notifier;

	public function __construct( ?Guard $guard = null, ?Service $service = null, ?Notifier $notifier = null ) {
		$this->guard    = $guard ?? new Guard();
		$this->service  = $service ?? new Service();
		$this->notifier = $notifier ?? new Notifier();
	}

	/**
	 * @param mixed $input corps JSON décodé
	 * @return array{ok:bool,status:int,code?:string,message?:string,fields?:array<string,string>,retry_after?:int,reference?:string,id?:int,mails?:array{internal:string,visitor:string}}
	 */
	public function submit( mixed $input, string $request_id ): array {
		$client = ClientIdentity::resolve();

		$refus = $this->guard->inspect( $input, $client );
		if ( $refus ) {
			return [ 'ok' => false ] + $refus;
		}

		$attente = $this->guard->creation_retry_after( $client );
		if ( $attente > 0 ) {
			return [ 'ok' => false, 'status' => 429, 'code' => Guard::CODE_RATE_LIMITED, 'message' => Guard::MESSAGE_RATE_LIMITED, 'fields' => [], 'retry_after' => $attente ];
		}

		// Les champs techniques ne sont ni validés ni stockés : ils s'arrêtent ici.
		if ( is_array( $input ) ) {
			$input = array_diff_key( $input, array_flip( Guard::TECHNICAL_FIELDS ) );
		}

		$resultat = $this->service->create( $input );
		if ( ! $resultat['ok'] ) {
			if ( $resultat['code'] === Service::ERR_VALIDATION ) {
				return [ 'ok' => false, 'status' => 422, 'code' => 'validation_failed', 'message' => 'Certains champs sont invalides.', 'fields' => $resultat['fields'] ?? [] ];
			}
			return [ 'ok' => false, 'status' => 500, 'code' => 'storage_failed', 'message' => 'La demande n’a pas pu être enregistrée.', 'fields' => [] ];
		}

		// À partir d'ici la demande existe : plus rien ne peut la défaire.
		$this->guard->count_creation( $client );
		$mails = $this->notifier->notify( (int) $resultat['id'], $request_id );

		return [ 'ok' => true, 'status' => 201, 'reference' => $resultat['reference'], 'id' => (int) $resultat['id'], 'mails' => $mails ];
	}
}
