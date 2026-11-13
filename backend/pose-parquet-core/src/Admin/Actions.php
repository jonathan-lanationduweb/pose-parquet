<?php



declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Mail\Queue;
use PoseParquet\Core\Mail\Labels;
use PoseParquet\Core\Projects\Fields;
use PoseParquet\Core\Projects\Notes;
use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Projects\StatusService;
use PoseParquet\Core\Security\Capabilities;
use PoseParquet\Core\Support\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Actions {

	public const UPDATE_STATUS = 'pp_update_status';
	public const ADD_NOTE      = 'pp_add_note';
	public const REPAIR_CAPS   = 'pp_repair_caps';
	public const RUN_MAIL_QUEUE = 'pp_run_mail_queue';
	public const UPDATE_DESTINATION = 'pp_update_destination';

	public static function register(): void {



		add_action( 'admin_post_' . self::UPDATE_STATUS, [ self::class, 'update_status' ] );
		add_action( 'admin_post_' . self::ADD_NOTE, [ self::class, 'add_note' ] );
		add_action( 'admin_post_' . self::REPAIR_CAPS, [ self::class, 'repair_caps' ] );
		add_action( 'admin_post_' . self::RUN_MAIL_QUEUE, [ self::class, 'run_mail_queue' ] );
		add_action( 'admin_post_' . self::UPDATE_DESTINATION, [ self::class, 'update_destination' ] );
	}



	public static function repair_caps(): void {
		self::require_can( Capabilities::MANAGE_SETTINGS );
		check_admin_referer( self::REPAIR_CAPS );

		$avant = Capabilities::missing();
		Capabilities::apply();

		Logger::info( 'droits réappliqués', [
			'user_id' => get_current_user_id(),
			'action'  => 'repair_caps',

			'missing' => array_map( 'count', $avant ),
		] );

		wp_safe_redirect(
			add_query_arg(
				Notices::ARG,
				Capabilities::missing() ? Notices::CAPS_INCOMPLETE : Notices::CAPS_REPAIRED,
				Menu::status_url()
			)
		);
		exit;
	}



	public static function run_mail_queue(): void {
		self::require_can( Capabilities::MANAGE_SETTINGS );
		check_admin_referer( self::RUN_MAIL_QUEUE );

		$bilan = Queue::executer_echeances();

		Logger::info( 'file des notifications traitée à la main', [
			'user_id'  => get_current_user_id(),
			'traites'  => $bilan['traites'],
			'restants' => $bilan['restants'],
		] );

		wp_safe_redirect(
			add_query_arg(
				[
					Notices::ARG   => $bilan['traites'] > 0 ? Notices::MAIL_QUEUE_RUN : Notices::MAIL_QUEUE_EMPTY,
					'pp_traites'   => $bilan['traites'],
					'pp_restants'  => $bilan['restants'],
				],
				Menu::status_url()
			)
		);
		exit;
	}


	public static function nonce_action( string $verb, int $project_id ): string {
		return $verb . '_' . $project_id;
	}

	public static function update_status(): void {
		$id = isset( $_POST['project_id'] ) ? absint( wp_unslash( $_POST['project_id'] ) ) : 0;

		self::require_can( Capabilities::MANAGE_PROJECTS );
		check_admin_referer( self::nonce_action( self::UPDATE_STATUS, $id ) );

		if ( $id === 0 ) {
			self::back( 0, Notices::NOT_FOUND );
		}

		$nouveau = isset( $_POST['new_status'] ) ? sanitize_key( wp_unslash( $_POST['new_status'] ) ) : '';
		$attendu = isset( $_POST['expected_status'] ) ? sanitize_key( wp_unslash( $_POST['expected_status'] ) ) : '';

		$resultat = StatusService::change( $id, $attendu, $nouveau );

		$codes = [
			StatusService::OK           => Notices::STATUS_UPDATED,
			StatusService::UNCHANGED    => Notices::STATUS_UNCHANGED,
			StatusService::STALE        => Notices::STATUS_STALE,
			StatusService::NOT_FOUND    => Notices::NOT_FOUND,
			StatusService::INVALID      => Notices::SAVE_FAILED,
			StatusService::WRITE_FAILED => Notices::SAVE_FAILED,
		];

		self::back( $id, $codes[ $resultat['code'] ] ?? Notices::SAVE_FAILED );
	}



	public static function update_destination(): void {
		$id = isset( $_POST['project_id'] ) ? absint( wp_unslash( $_POST['project_id'] ) ) : 0;

		self::require_can( Capabilities::MANAGE_PROJECTS );
		check_admin_referer( self::nonce_action( self::UPDATE_DESTINATION, $id ) );

		if ( $id === 0 ) {
			self::back( 0, Notices::NOT_FOUND );
		}

		$voulue = isset( $_POST['lead_destination'] ) ? sanitize_key( wp_unslash( $_POST['lead_destination'] ) ) : '';
		if ( ! in_array( $voulue, Fields::enum( 'leadDestination' ), true ) ) {
			self::back( $id, Notices::SAVE_FAILED );
		}

		$repo    = new Repository();
		$demande = $repo->find( $id );
		if ( ! $demande ) {
			self::back( $id, Notices::NOT_FOUND );
		}

		$avant = (string) ( $demande['lead_destination'] ?? '' );
		if ( $avant === $voulue ) {
			self::back( $id, Notices::DEST_UNCHANGED );
		}

		if ( ! $repo->update_destination( $id, $voulue, current_time( 'mysql' ) ) ) {
			self::back( $id, Notices::SAVE_FAILED );
		}


		$depuis = $avant === ''
			? __( 'non renseignée', 'pose-parquet-core' )
			: Labels::of( 'lead_destination', $avant );
		Notes::add(
			$id,
			sprintf(

				__( 'Destination modifiée : %1$s → %2$s.', 'pose-parquet-core' ),
				$depuis,
				Labels::of( 'lead_destination', $voulue )
			)
		);

		Logger::info( 'destination modifiée', [
			'project_id' => $id,
			'user_id'    => get_current_user_id(),
			'de'         => $avant,
			'vers'       => $voulue,
			'action'     => 'update_destination',
		] );

		self::back( $id, Notices::DEST_UPDATED );
	}

	public static function add_note(): void {
		$id = isset( $_POST['project_id'] ) ? absint( wp_unslash( $_POST['project_id'] ) ) : 0;

		self::require_can( Capabilities::MANAGE_PROJECTS );
		check_admin_referer( self::nonce_action( self::ADD_NOTE, $id ) );

		if ( $id === 0 ) {
			self::back( 0, Notices::NOT_FOUND );
		}



		$brut     = isset( $_POST['note'] ) ? (string) wp_unslash( $_POST['note'] ) : '';
		$resultat = Notes::add( $id, $brut );

		if ( $resultat['ok'] ) {
			Logger::info( 'note interne ajoutée', [
				'project_id' => $id,
				'user_id'    => get_current_user_id(),
				'action'     => 'add_note',
			] );
			self::back( $id, Notices::NOTE_ADDED );
		}

		$codes = [
			Notes::ERROR_EMPTY  => Notices::NOTE_EMPTY,
			Notes::ERROR_LONG   => Notices::NOTE_TOO_LONG,
			'project_not_found' => Notices::NOT_FOUND,
		];

		self::back( $id, $codes[ $resultat['error'] ] ?? Notices::SAVE_FAILED );
	}



	private static function require_can( string $cap ): void {
		if ( ! current_user_can( $cap ) ) {
			wp_die(
				esc_html__( 'Vous n’avez pas les droits nécessaires pour cette action.', 'pose-parquet-core' ),
				esc_html__( 'Accès refusé', 'pose-parquet-core' ),
				[ 'response' => 403 ]
			);
		}
	}



	private static function back( int $project_id, string $notice ): void {
		$url = $project_id > 0
			? View::detail_url( $project_id )
			: View::list_url();

		wp_safe_redirect( add_query_arg( Notices::ARG, $notice, $url ) );
		exit;
	}



	public static function current_status( int $project_id ): string {
		$row = ( new Repository() )->find_by_id( $project_id );

		return (string) ( $row['status'] ?? '' );
	}
}
