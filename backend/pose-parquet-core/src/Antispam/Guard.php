<?php
/**
 * L'anti-spam, dans l'ordre : débit des tentatives, pot de miel, jeton.
 *
 * Rend null si la soumission peut continuer, sinon la réponse à donner
 * (statut HTTP, code, message, champs, Retry-After). Aucune décision ici ne
 * touche la base : ce qui est refusé n'a jamais existé.
 *
 * La limite de créations réussies n'est pas vérifiée ici mais juste avant
 * l'écriture (SubmissionService), parce qu'elle ne compte que ce qui a été
 * réellement créé.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Antispam;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Guard {

	public const CODE_RATE_LIMITED = 'rate_limited';
	public const CODE_REJECTED     = 'submission_rejected';
	public const CODE_TOKEN        = 'form_token_invalid';

	public const MESSAGE_RATE_LIMITED = 'Trop de demandes ont été envoyées. Veuillez réessayer plus tard.';
	public const MESSAGE_REJECTED     = 'La soumission n’a pas pu être acceptée.';

	/** Champs techniques acceptés par l'API et jamais stockés. */
	public const TECHNICAL_FIELDS = [ 'formToken', Honeypot::FIELD ];

	private RateLimiter $limiter;

	public function __construct( ?RateLimiter $limiter = null ) {
		$this->limiter = $limiter ?? new RateLimiter();
	}

	/**
	 * @param mixed $input corps décodé (peut ne pas être un tableau : on laisse alors la validation le dire)
	 * @return array{status:int,code:string,message:string,fields:array<string,string>,retry_after:int}|null
	 */
	public function inspect( mixed $input, string $client ): ?array {
		$attente = $this->limiter->retry_after( $client, RateLimiter::ATTEMPTS );
		if ( $attente > 0 ) {
			return self::refus( 429, self::CODE_RATE_LIMITED, self::MESSAGE_RATE_LIMITED, [], $attente );
		}
		$this->limiter->hit( $client, RateLimiter::ATTEMPTS );

		if ( ! is_array( $input ) ) {
			return null; // la validation métier refusera proprement
		}

		if ( Honeypot::is_triggered( $input ) ) {
			return self::refus( 422, self::CODE_REJECTED, self::MESSAGE_REJECTED );
		}

		$erreur = FormToken::verify( $input['formToken'] ?? null );
		if ( $erreur !== '' ) {
			$raisons = [
				FormToken::MISSING => 'Jeton de formulaire absent.',
				FormToken::INVALID => 'Jeton de formulaire invalide.',
				FormToken::EXPIRED => 'Jeton de formulaire expiré : recharger le formulaire.',
				FormToken::EARLY   => 'Soumission trop rapide : réessayer dans un instant.',
			];
			return self::refus( 422, self::CODE_TOKEN, self::MESSAGE_REJECTED, [ 'formToken' => $raisons[ $erreur ] ] );
		}

		return null;
	}

	/** Secondes à attendre avant qu'une nouvelle création soit admise, 0 sinon. */
	public function creation_retry_after( string $client ): int {
		return $this->limiter->retry_after( $client, RateLimiter::SUCCESSES );
	}

	public function count_creation( string $client ): void {
		$this->limiter->hit( $client, RateLimiter::SUCCESSES );
	}

	/**
	 * @param array<string,string> $fields
	 * @return array{status:int,code:string,message:string,fields:array<string,string>,retry_after:int}
	 */
	private static function refus( int $status, string $code, string $message, array $fields = [], int $retry_after = 0 ): array {
		return [ 'status' => $status, 'code' => $code, 'message' => $message, 'fields' => $fields, 'retry_after' => $retry_after ];
	}
}
