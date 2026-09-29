<?php
/**
 * Le pipeline d'une soumission publique, dans l'ordre et rien que l'ordre.
 *
 *   identité réseau → limite de tentatives → pot de miel → jeton
 *   → limite de créations → réservation du jeton → validation + écriture
 *   (Service, transaction) → compteur de créations → mise en file (Queue).
 *
 * Tout ce qui précède l'écriture ne touche pas la base. Tout ce qui la suit
 * ne peut pas l'annuler : les emails sont MIS EN FILE après COMMIT, partent
 * plus tard, et leur échec n'est qu'un état enregistré. La réponse rend donc
 * `pending`, jamais `sent` : elle ne promet rien qu'elle ne sache. Et le
 * visiteur n'attend plus le SMTP — 4,3 s mesurées avant, le temps d'une
 * écriture après. Le contrôleur ne connaît que ce service ;
 * Service (validation + écriture) reste tel qu'au lot 2.
 *
 * OÙ LE JETON EST CONSOMMÉ, ET POURQUOI LÀ. La réservation doit précéder
 * l'écriture : après, deux requêtes simultanées portant le même jeton
 * auraient déjà créé deux demandes avant que l'une des deux ne s'aperçoive
 * de rien. Elle ne doit pas non plus être définitive trop tôt : un code
 * postal mal saisi rend un 422, et tuer le jeton à cet instant obligerait à
 * recharger le formulaire pour corriger un champ. D'où la règle retenue —
 * on réserve juste avant la création, et on relâche si la création n'a pas
 * eu lieu. Un jeton n'est donc perdu que lorsqu'une demande existe, ce qui
 * est exactement ce qu'on veut empêcher de répéter.
 *
 * @package PoseParquet\Core
 */

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

		// Le jeton a été vérifié par le Guard ; reste à s'assurer qu'il n'a pas
		// déjà servi. Le code de refus est celui du jeton, donc le front
		// applique sa reprise habituelle : un jeton neuf, un seul réessai.
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

		// Les champs techniques ne sont ni validés ni stockés : ils s'arrêtent ici.
		if ( is_array( $input ) ) {
			$input = array_diff_key( $input, array_flip( Guard::TECHNICAL_FIELDS ) );
		}

		$resultat = $this->service->create( $input );
		if ( ! $resultat['ok'] ) {
			// Aucune demande n'a été créée : le jeton redevient utilisable, sans
			// quoi corriger un champ refusé coûterait un rechargement de page.
			FormToken::release( $jeton );
			if ( $resultat['code'] === Service::ERR_VALIDATION ) {
				return [ 'ok' => false, 'status' => 422, 'code' => 'validation_failed', 'message' => 'Certains champs sont invalides.', 'fields' => $resultat['fields'] ?? [] ];
			}
			return [ 'ok' => false, 'status' => 500, 'code' => 'storage_failed', 'message' => 'La demande n’a pas pu être enregistrée.', 'fields' => [] ];
		}

		// À partir d'ici la demande existe : plus rien ne peut la défaire.
		$this->guard->count_creation( $client );

		/*
		 * Les emails sont MIS EN FILE, pas envoyés.
		 *
		 * Ils partaient ici même, en séquence, et le visiteur les attendait :
		 * 4,3 s mesurées côté serveur sur une soumission réelle, dont 4,2 s
		 * dans deux `wp_mail()` qui échouaient. La remise d'un email n'a rien
		 * à faire dans le chemin d'une requête — voir Mail\Queue.
		 *
		 * Les états rendus sont donc `pending`, et c'est exact : la réponse ne
		 * prétend pas qu'un email est parti.
		 */
		$mails = Queue::enfiler( (int) $resultat['id'], $request_id, $this->notifier );

		return [ 'ok' => true, 'status' => 201, 'reference' => $resultat['reference'], 'id' => (int) $resultat['id'], 'mails' => $mails ];
	}
}
