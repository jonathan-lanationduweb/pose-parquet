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
 * USAGE UNIQUE. La signature seule ne disait rien du nombre d'emplois : un
 * jeton obtenu une fois valait deux heures de soumissions, autant de fois
 * qu'on voulait, depuis n'importe où. Le nonce aléatoire existait déjà dans
 * le jeton mais n'était jamais consommé — il l'est désormais : `consume()`
 * réserve son empreinte, une seconde réservation échoue. Ce qui est stocké
 * est un HMAC du nonce, jamais le jeton, et rien qui désigne une personne.
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
	public const USED    = 'used';

	/** Préfixe des clés de réservation. Ne contient ni jeton ni donnée personnelle. */
	private const CLAIM_PREFIX = 'pp_ft_';

	/** Groupe de cache dédié, pour ne pas se mêler aux transients du site. */
	private const CLAIM_GROUP = 'pose_parquet_form_token';

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

	/**
	 * Réserve un jeton pour une création. Rend false s'il l'était déjà.
	 *
	 * À n'appeler qu'après `verify()` : la réservation ne contrôle ni la
	 * signature ni l'âge, elle ne répond qu'à « ce nonce a-t-il déjà servi ».
	 *
	 * La durée de vie de la réservation est celle qu'il reste au jeton : une
	 * fois expiré, il est de toute façon refusé par `verify()`, et la clé
	 * disparaît d'elle-même. Rien à purger.
	 *
	 * ATOMICITÉ. Avec un cache objet externe (Redis, Memcached), `wp_cache_add`
	 * est atomique : deux requêtes simultanées, une seule gagne, garanti. Sans
	 * cache objet, la réservation est un `get_transient()` suivi d'un
	 * `set_transient()` — WordPress n'offre pas de « poser si absent » sur les
	 * transients, et deux requêtes tombant dans la même poignée de
	 * millisecondes peuvent donc passer toutes les deux. Cette fenêtre est
	 * assumée : elle ferme le rejeu, qui est le risque réel — un jeton qui
	 * alimente des heures de soumissions — sans ajouter d'infrastructure pour
	 * un cas qui demande une collision à la milliseconde près.
	 *
	 * @param mixed $token le jeton reçu du client
	 */
	public static function consume( mixed $token, ?int $now = null ): bool {
		$cle = self::claim_key( $token );
		if ( $cle === '' ) {
			return false;
		}
		$duree = self::remaining( $token, $now ?? time() );
		if ( $duree <= 0 ) {
			return false;
		}

		if ( wp_using_ext_object_cache() ) {
			return (bool) wp_cache_add( $cle, 1, self::CLAIM_GROUP, $duree );
		}

		/*
		 * Sans cache objet, lire puis écrire un transient laisse deux requêtes
		 * simultanées passer toutes les deux — mesuré, ce n'est pas une vue de
		 * l'esprit. MySQL fournit pourtant ce qui manque : un verrou nommé,
		 * pris sans attendre, et relâché quoi qu'il arrive. Aucune table,
		 * aucune extension, aucun service à installer.
		 *
		 * `GET_LOCK` rend 1 si le verrou est pris, 0 s'il est déjà tenu par
		 * une autre connexion — donc par une autre requête portant le même
		 * jeton, qu'il faut refuser. Il rend NULL si la fonction est
		 * indisponible (droits restreints chez certains hébergeurs) : on
		 * retombe alors sur la lecture-écriture simple, moins sûre mais jamais
		 * bloquante.
		 */
		global $wpdb;
		$verrou = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $cle ) );
		if ( (string) $verrou === '0' ) {
			return false;
		}

		try {
			if ( get_transient( $cle ) !== false ) {
				return false;
			}
			set_transient( $cle, 1, $duree );

			return true;
		} finally {
			if ( $verrou !== null ) {
				$wpdb->query( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $cle ) );
			}
		}
	}

	/**
	 * Rend un jeton réutilisable.
	 *
	 * Sert quand la réservation a été prise mais que la demande n'a finalement
	 * pas été créée — un champ invalide, une écriture impossible. Sans cela,
	 * une faute de frappe coûterait le jeton et obligerait à recharger le
	 * formulaire pour corriger un code postal.
	 *
	 * @param mixed $token
	 */
	public static function release( mixed $token ): void {
		$cle = self::claim_key( $token );
		if ( $cle === '' ) {
			return;
		}

		if ( wp_using_ext_object_cache() ) {
			wp_cache_delete( $cle, self::CLAIM_GROUP );
			return;
		}
		delete_transient( $cle );
	}

	/** Vrai si le jeton a déjà été réservé — lecture seule, sans réserver. */
	public static function is_consumed( mixed $token ): bool {
		$cle = self::claim_key( $token );
		if ( $cle === '' ) {
			return false;
		}

		return wp_using_ext_object_cache()
			? wp_cache_get( $cle, self::CLAIM_GROUP ) !== false
			: get_transient( $cle ) !== false;
	}

	/**
	 * Clé de réservation : un HMAC du nonce, tronqué.
	 *
	 * Le nonce seul suffirait à identifier le jeton, mais il voyage en clair ;
	 * passer par le secret du site évite qu'un accès en lecture à la table des
	 * options permette de savoir quels jetons ont servi. Rien de personnel
	 * n'entre dans cette clé — ni adresse, ni IP, ni champ du formulaire.
	 */
	private static function claim_key( mixed $token ): string {
		$parts = self::parts( $token );

		return $parts === null
			? ''
			: self::CLAIM_PREFIX . substr( hash_hmac( 'sha256', $parts['nonce'], self::secret() ), 0, 32 );
	}

	/** Secondes restant à vivre au jeton, 0 s'il est hors délai ou illisible. */
	private static function remaining( mixed $token, int $now ): int {
		$parts = self::parts( $token );
		if ( $parts === null ) {
			return 0;
		}

		return max( 0, self::MAX_AGE - ( $now - $parts['issued_at'] ) );
	}

	/**
	 * Découpe un jeton bien formé. Rend null sinon — sans vérifier la
	 * signature, qui relève de `verify()`.
	 *
	 * @return array{issued_at:int,nonce:string}|null
	 */
	private static function parts( mixed $token ): ?array {
		if ( ! is_string( $token ) || $token === '' || strlen( $token ) > 160 ) {
			return null;
		}
		$parts = explode( '.', $token );
		if ( count( $parts ) !== 4 || $parts[0] !== self::VERSION || ! ctype_digit( $parts[1] ) || ! ctype_xdigit( $parts[2] ) ) {
			return null;
		}

		return [ 'issued_at' => (int) $parts[1], 'nonce' => $parts[2] ];
	}

	private static function sign( string $prefix ): string {
		return hash_hmac( 'sha256', $prefix, self::secret() );
	}

	/** Secret dérivé des sels du site : jamais dans le jeton, jamais journalisé. */
	private static function secret(): string {
		return wp_salt( 'nonce' ) . '|pose-parquet-form-token';
	}
}
