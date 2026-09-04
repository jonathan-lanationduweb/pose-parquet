<?php
/**
 * Identité réseau d'un client, sous forme non réversible.
 *
 * Par défaut, seule REMOTE_ADDR compte : c'est la seule adresse que le
 * serveur constate lui-même. X-Forwarded-For, X-Real-IP, CF-Connecting-IP
 * sont des en-têtes que n'importe quel client direct peut écrire — s'y fier
 * sans reverse proxy de confiance revient à laisser le robot choisir son
 * identité. Le jour où WordPress sera derrière un proxy connu, le filtre
 * `pose_parquet_client_ip` permettra de lire l'en-tête adéquat, à cet
 * endroit et nulle part ailleurs.
 *
 * L'adresse n'est jamais conservée : elle passe dans un HMAC avec un sel du
 * site et seul le condensat circule (clés de transient, journal). Pas d'IP
 * en base, pas d'IP en log, pas d'IP dans un nom de clé.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Antispam;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class ClientIdentity {

	/** Condensat hexadécimal (32 caractères) de l'adresse du client courant. */
	public static function resolve(): string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput

		/**
		 * Adresse du client à retenir pour la limite de débit.
		 *
		 * À n'utiliser que derrière un reverse proxy de confiance, pour lire
		 * l'en-tête qu'il pose. Voir docs/backend/antispam.md.
		 *
		 * @param string $ip REMOTE_ADDR
		 */
		$ip = (string) apply_filters( 'pose_parquet_client_ip', $ip );

		return self::hash( $ip );
	}

	/** Le même condensat pour la même adresse tant que les sels du site ne changent pas. */
	public static function hash( string $ip ): string {
		return substr( hash_hmac( 'sha256', trim( $ip ), wp_salt( 'auth' ) . '|pose-parquet-client' ), 0, 32 );
	}
}
