<?php
/**
 * Jeton temporel signé du formulaire.
 *
 * Le navigateur demande un jeton (GET /form-token), le garde, le renvoie
 * avec la soumission. Le serveur y lit l'heure d'émission — signée par lui,
 * donc non falsifiable — et refuse une soumission trop rapide (un robot qui
 * poste dans la seconde) ou trop tardive (un jeton conservé des heures).
 *
 * Forme : `v1.<issued_at>.<nonce>.<signature>`. La signature est un HMAC-SHA256
 * du préfixe avec un secret dérivé des sels WordPress ; le jeton ne contient
 * aucun secret et se vérifie sans rien stocker en base.
 *
 * Ce que ce jeton n'est PAS : un CAPTCHA. Un robot patient demande un jeton,
 * attend deux secondes, soumet. Il ralentit les scripts naïfs ; la limite de
 * débit et la validation font le reste, Turnstile pourra s'ajouter plus tard.
 *
 * Les durées vivent ici et nulle part ailleurs.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Antispam;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FormToken {

	public const VERSION = 'v1';

	/** Âge minimum d'un jeton à la soumission, en secondes : en dessous, c'est une machine. */
	public const MIN_AGE = 2;
	/** Durée de vie d'un jeton, en secondes (2 heures : le temps d'un formulaire laissé ouvert). */
	public const MAX_AGE = 7200;

	/** Codes de refus, exposés au client (jamais le contenu signé). */
	public const MISSING = 'missing';
	public const INVALID = 'invalid';
	public const EXPIRED = 'expired';
	public const EARLY   = 'early';

	/** Émet un jeton daté de maintenant (ou d'un instant donné, pour les tests). */
	public static function issue( ?int $issued_at = null ): string {
		$issued_at = $issued_at ?? time();
		$nonce     = bin2hex( random_bytes( 8 ) );
		$prefix    = self::VERSION . '.' . $issued_at . '.' . $nonce;

		return $prefix . '.' . self::sign( $prefix );
	}

	/**
	 * Vérifie un jeton. Rend '' s'il est bon, sinon un des codes ci-dessus.
	 */
	public static function verify( mixed $token, ?int $now = null ): string {
		if ( ! is_string( $token ) || $token === '' ) {
			return self::MISSING;
		}
		if ( strlen( $token ) > 160 ) {
			return self::INVALID;
		}
		$parts = explode( '.', $token );
		if ( count( $parts ) !== 4 || $parts[0] !== self::VERSION || ! ctype_digit( $parts[1] ) || ! ctype_xdigit( $parts[2] ) ) {
			return self::INVALID;
		}
		[ $version, $issued_at, $nonce, $signature ] = $parts;
		$attendue = self::sign( $version . '.' . $issued_at . '.' . $nonce );
		if ( ! hash_equals( $attendue, $signature ) ) {
			return self::INVALID;
		}

		$now = $now ?? time();
		$age = $now - (int) $issued_at;
		if ( $age > self::MAX_AGE ) {
			return self::EXPIRED;
		}
		if ( $age < self::MIN_AGE ) {
			return self::EARLY;
		}

		return '';
	}

	private static function sign( string $prefix ): string {
		return hash_hmac( 'sha256', $prefix, self::secret() );
	}

	/** Secret dérivé des sels du site : jamais dans le jeton, jamais journalisé. */
	private static function secret(): string {
		return wp_salt( 'nonce' ) . '|pose-parquet-form-token';
	}
}
