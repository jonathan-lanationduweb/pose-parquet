<?php



declare(strict_types=1);

namespace PoseParquet\Core\Mail;

use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Support\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Queue {


	public const HOOK = 'pose_parquet_envoyer_notification';



	public const MAX_TENTATIVES = 4;



	private const DELAIS = [ 1 => 0, 2 => 300, 3 => 1800, 4 => 7200 ];



	public static function register(): void {
		add_action( self::HOOK, [ self::class, 'traiter' ], 10, 4 );
	}



	public static function enfiler( int $project_id, string $request_id, ?Notifier $notifier = null, ?Repository $repository = null ): array {
		$notifier   = $notifier ?? new Notifier();
		$repository = $repository ?? new Repository();
		$etats      = [];
		$projet     = $repository->find_by_id( $project_id ) ?: null;

		foreach ( Notifier::TYPES as $type ) {
			if ( ! $notifier->concerne( $type, $projet ) ) {

				$repository->set_mail_status( $project_id, $type, Notifier::STATUS_SKIPPED, null );
				$etats[ $type ] = Notifier::STATUS_SKIPPED;
				continue;
			}
			self::planifier( $project_id, $type, 1, $request_id );
			$etats[ $type ] = Notifier::STATUS_PENDING;
		}

		return $etats;
	}


	public static function planifier( int $project_id, string $type, int $tentative, string $request_id ): void {
		$delai = self::DELAIS[ $tentative ] ?? end( self::DELAIS );
		wp_schedule_single_event( time() + $delai, self::HOOK, [ $project_id, $type, $tentative, $request_id ] );
	}



	public static function traiter( int $project_id, string $type, int $tentative = 1, string $request_id = '' ): void {
		if ( ! in_array( $type, Notifier::TYPES, true ) ) {
			return;
		}

		global $wpdb;
		$cle    = 'pp_mail_' . $project_id . '_' . $type;
		$verrou = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $cle ) );
		if ( (string) $verrou === '0' ) {
			return;
		}

		try {
			$repository = new Repository();
			$project    = $repository->find_by_id( $project_id );
			if ( ! $project ) {
				Logger::error( 'Notification sans demande', [ 'request_id' => $request_id, 'project_id' => $project_id ] );
				return;
			}

			$etat = (string) ( $project[ $type . '_mail_status' ] ?? '' );
			if ( $etat === Notifier::STATUS_SENT || $etat === Notifier::STATUS_SKIPPED ) {
				return;
			}

			$notifier = new Notifier();
			if ( ! $notifier->concerne( $type, $project ) ) {
				$repository->set_mail_status( $project_id, $type, Notifier::STATUS_SKIPPED, null );
				return;
			}

			$resultat = $notifier->tenter( $project, $type );

			if ( $resultat['ok'] ) {
				$repository->set_mail_status( $project_id, $type, Notifier::STATUS_SENT, current_time( 'mysql', true ) );
				return;
			}

			$reste = $resultat['retryable'] && $tentative < self::MAX_TENTATIVES;
			if ( $reste ) {

				self::planifier( $project_id, $type, $tentative + 1, $request_id );
				Logger::warning( 'Email non envoyé, nouvelle tentative programmée', [
					'request_id' => $request_id,
					'project_id' => $project_id,
					'mail_type'  => $type,
					'error_code' => $resultat['code'],
					'tentative'  => $tentative,
					'sur'        => self::MAX_TENTATIVES,
				] );
				return;
			}

			$repository->set_mail_status( $project_id, $type, Notifier::STATUS_FAILED, null );
			Logger::warning( 'Email non envoyé', [
				'request_id' => $request_id,
				'project_id' => $project_id,
				'mail_type'  => $type,
				'error_code' => $resultat['code'],
				'tentative'  => $tentative,
				'definitif'  => true,
			] );
		} finally {
			if ( $verrou !== null ) {
				$wpdb->query( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $cle ) );
			}
		}
	}



	public static function executer_echeances( int $limite = 50 ): array {
		$maintenant = time();
		$traites    = 0;
		$restants   = 0;

		foreach ( (array) _get_cron_array() as $horodatage => $hooks ) {
			if ( ! isset( $hooks[ self::HOOK ] ) ) {
				continue;
			}
			foreach ( $hooks[ self::HOOK ] as $evenement ) {
				$args = array_values( (array) ( $evenement['args'] ?? [] ) );
				if ( $horodatage > $maintenant || $traites >= $limite ) {
					$restants++;
					continue;
				}


				wp_unschedule_event( $horodatage, self::HOOK, $args );
				self::traiter( ...array_pad( array_slice( $args, 0, 4 ), 4, '' ) );
				$traites++;
			}
		}

		return [ 'traites' => $traites, 'restants' => $restants ];
	}



	public static function etat(): array {
		$maintenant = time();
		$total      = 0;
		$dus        = 0;
		$prochain   = null;

		foreach ( (array) _get_cron_array() as $horodatage => $hooks ) {
			if ( ! isset( $hooks[ self::HOOK ] ) ) {
				continue;
			}
			$n      = count( $hooks[ self::HOOK ] );
			$total += $n;
			if ( $horodatage <= $maintenant ) {
				$dus += $n;
			}
			if ( $prochain === null || $horodatage < $prochain ) {
				$prochain = (int) $horodatage;
			}
		}

		return [ 'total' => $total, 'dus' => $dus, 'prochain' => $prochain ];
	}



	public static function purger(): void {
		if ( function_exists( 'wp_unschedule_hook' ) ) {
			wp_unschedule_hook( self::HOOK );
		}
	}
}
