<?php
/**
 * Limite de débit par identité réseau, sur transients WordPress.
 *
 * Deux compteurs par client et par fenêtre glissante d'une heure :
 *
 *   attempts   toute requête POST /projects arrivée jusqu'à l'anti-spam,
 *              valide ou non — pour qu'une rafale de charges invalides ne
 *              soit pas gratuite ;
 *   successes  les demandes réellement créées.
 *
 * Stockage : un transient par compteur, nommé d'après le condensat du client
 * (jamais l'adresse), qui expire avec la fenêtre. Pas de table : pour cinq
 * demandes par heure, une table serait de la machinerie. Limite connue : un
 * transient n'est pas atomique — deux requêtes strictement simultanées
 * peuvent chacune lire n et écrire n+1. Une limite de 30 peut donc laisser
 * passer 31 ou 32 ; c'est acceptable pour un frein, pas pour une
 * comptabilité, et c'est documenté.
 *
 * Les valeurs par défaut vivent ici ; le filtre `pose_parquet_rate_limits`
 * les ajuste sans interface.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Antispam;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RateLimiter {

	public const ATTEMPTS  = 'attempts';
	public const SUCCESSES = 'successes';

	public const DEFAULT_WINDOW    = 3600;
	public const DEFAULT_ATTEMPTS  = 30;
	public const DEFAULT_SUCCESSES = 5;

	private const PREFIX = 'pp_rl_';

	/**
	 * @return array{window:int,attempts:int,successes:int}
	 */
	public static function limits(): array {
		$defaults = [
			'window'    => self::DEFAULT_WINDOW,
			'attempts'  => self::DEFAULT_ATTEMPTS,
			'successes' => self::DEFAULT_SUCCESSES,
		];
		/**
		 * Limites de débit de POST /projects.
		 *
		 * @param array{window:int,attempts:int,successes:int} $limits secondes, tentatives, créations
		 */
		$limits = (array) apply_filters( 'pose_parquet_rate_limits', $defaults );

		return [
			'window'    => max( 1, (int) ( $limits['window'] ?? $defaults['window'] ) ),
			'attempts'  => max( 1, (int) ( $limits['attempts'] ?? $defaults['attempts'] ) ),
			'successes' => max( 1, (int) ( $limits['successes'] ?? $defaults['successes'] ) ),
		];
	}

	/**
	 * Secondes à attendre si la limite est atteinte, 0 si le client peut passer.
	 */
	public function retry_after( string $client, string $kind ): int {
		$limits = self::limits();
		$max    = $kind === self::SUCCESSES ? $limits['successes'] : $limits['attempts'];
		$etat   = $this->read( $client, $kind );
		if ( $etat === null || $etat['count'] < $max ) {
			return 0;
		}

		return max( 1, $etat['start'] + $limits['window'] - time() );
	}

	/** Compte une unité pour ce client, en ouvrant la fenêtre si besoin. */
	public function hit( string $client, string $kind ): void {
		$limits = self::limits();
		$now    = time();
		$etat   = $this->read( $client, $kind );
		if ( $etat === null || $etat['start'] + $limits['window'] <= $now ) {
			$etat = [ 'count' => 0, 'start' => $now ];
		}
		$etat['count']++;
		$restant = max( 1, $etat['start'] + $limits['window'] - $now );
		set_transient( $this->key( $client, $kind ), $etat, $restant );
	}

	/** Oublie ce client (tests, ou levée manuelle). */
	public function forget( string $client ): void {
		delete_transient( $this->key( $client, self::ATTEMPTS ) );
		delete_transient( $this->key( $client, self::SUCCESSES ) );
	}

	/** Nom de clé, exposé pour les tests : condensat seulement, jamais d'adresse. */
	public function key( string $client, string $kind ): string {
		return self::PREFIX . ( $kind === self::SUCCESSES ? 's' : 'a' ) . '_' . substr( preg_replace( '/[^a-f0-9]/', '', $client ) ?? '', 0, 32 );
	}

	/** @return array{count:int,start:int}|null */
	private function read( string $client, string $kind ): ?array {
		$v = get_transient( $this->key( $client, $kind ) );
		if ( ! is_array( $v ) || ! isset( $v['count'], $v['start'] ) ) {
			return null;
		}
		return [ 'count' => (int) $v['count'], 'start' => (int) $v['start'] ];
	}
}
