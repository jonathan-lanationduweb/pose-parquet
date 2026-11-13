<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

use PoseParquet\Core\Antispam\ClientIdentity;
use PoseParquet\Core\Antispam\FormToken;
use PoseParquet\Core\Antispam\Guard;
use PoseParquet\Core\Mail\Notifier;
use PoseParquet\Core\Mail\Queue;

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




		$jeton = is_array( $input ) ? ( $input['formToken'] ?? null ) : null;
		if ( ! FormToken::consume( $jeton ) ) {
			return [
				'ok'      => false,
				'status'  => 422,
				'code'    => Guard::CODE_TOKEN,
				'message' => Guard::MESSAGE_REJECTED,
				'fields'  => [ 'formToken' => 'Jeton de formulaire déjà utilisé : recharger le formulaire.' ],
			];
		}


		if ( is_array( $input ) ) {
			$input = array_diff_key( $input, array_flip( Guard::TECHNICAL_FIELDS ) );
		}

		$resultat = $this->service->create( $input );
		if ( ! $resultat['ok'] ) {


			FormToken::release( $jeton );
			if ( $resultat['code'] === Service::ERR_VALIDATION ) {
				return [ 'ok' => false, 'status' => 422, 'code' => 'validation_failed', 'message' => 'Certains champs sont invalides.', 'fields' => $resultat['fields'] ?? [] ];
			}
			return [ 'ok' => false, 'status' => 500, 'code' => 'storage_failed', 'message' => 'La demande n’a pas pu être enregistrée.', 'fields' => [] ];
		}


		$this->guard->count_creation( $client );



		$mails = Queue::enfiler( (int) $resultat['id'], $request_id, $this->notifier );

		return [ 'ok' => true, 'status' => 201, 'reference' => $resultat['reference'], 'id' => (int) $resultat['id'], 'mails' => $mails ];
	}
}
