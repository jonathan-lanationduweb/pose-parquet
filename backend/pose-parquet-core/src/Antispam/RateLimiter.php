<?php



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



	public static function limits(): array {
		$defaults = [
			'window'    => self::DEFAULT_WINDOW,
			'attempts'  => self::DEFAULT_ATTEMPTS,
			'successes' => self::DEFAULT_SUCCESSES,
		];


		$limits = (array) apply_filters( 'pose_parquet_rate_limits', $defaults );

		return [
			'window'    => max( 1, (int) ( $limits['window'] ?? $defaults['window'] ) ),
			'attempts'  => max( 1, (int) ( $limits['attempts'] ?? $defaults['attempts'] ) ),
			'successes' => max( 1, (int) ( $limits['successes'] ?? $defaults['successes'] ) ),
		];
	}



	public function retry_after( string $client, string $kind ): int {
		$limits = self::limits();
		$max    = $kind === self::SUCCESSES ? $limits['successes'] : $limits['attempts'];
		$etat   = $this->read( $client, $kind );
		if ( $etat === null || $etat['count'] < $max ) {
			return 0;
		}

		return max( 1, $etat['start'] + $limits['window'] - time() );
	}


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


	public function forget( string $client ): void {
		delete_transient( $this->key( $client, self::ATTEMPTS ) );
		delete_transient( $this->key( $client, self::SUCCESSES ) );
	}


	public function key( string $client, string $kind ): string {
		return self::PREFIX . ( $kind === self::SUCCESSES ? 's' : 'a' ) . '_' . substr( preg_replace( '/[^a-f0-9]/', '', $client ) ?? '', 0, 32 );
	}


	private function read( string $client, string $kind ): ?array {
		$v = get_transient( $this->key( $client, $kind ) );
		if ( ! is_array( $v ) || ! isset( $v['count'], $v['start'] ) ) {
			return null;
		}
		return [ 'count' => (int) $v['count'], 'start' => (int) $v['start'] ];
	}
}
