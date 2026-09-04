<?php
/**
 * Après le COMMIT : les deux emails d'une demande, et la trace de leur sort.
 *
 * La base est la vérité, l'email une notification. Rien ici ne peut annuler
 * une demande : un envoi qui échoue laisse `failed` dans la colonne d'état et
 * une ligne de journal sans donnée personnelle, puis on passe au suivant.
 * L'interne et la confirmation sont indépendants — l'un peut échouer sans
 * empêcher l'autre. Appelé une fois, en séquence, par SubmissionService :
 * aucun hook, donc aucun risque de double envoi par double branchement.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Mail;

use PoseParquet\Core\Admin\Settings;
use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Support\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Notifier {

	public const STATUS_PENDING = 'pending';
	public const STATUS_SENT    = 'sent';
	public const STATUS_FAILED  = 'failed';
	public const STATUS_SKIPPED = 'skipped';

	public const TYPE_INTERNAL = 'internal';
	public const TYPE_VISITOR  = 'visitor';

	private Mailer $mailer;
	private Repository $repository;

	public function __construct( ?Mailer $mailer = null, ?Repository $repository = null ) {
		$this->mailer     = $mailer ?? new Mailer();
		$this->repository = $repository ?? new Repository();
	}

	/**
	 * Tente les deux envois pour une demande déjà validée en base.
	 *
	 * @return array{internal:string,visitor:string} états enregistrés
	 */
	public function notify( int $project_id, string $request_id ): array {
		$project = $this->repository->find_by_id( $project_id );
		if ( ! $project ) {
			Logger::error( 'Notification sans demande', [ 'request_id' => $request_id, 'project_id' => $project_id ] );
			return [ self::TYPE_INTERNAL => self::STATUS_FAILED, self::TYPE_VISITOR => self::STATUS_FAILED ];
		}

		$internal = $this->send_internal( $project, $request_id );
		$visitor  = $this->send_visitor( $project, $request_id );

		return [ self::TYPE_INTERNAL => $internal, self::TYPE_VISITOR => $visitor ];
	}

	/** @param array<string,mixed> $project */
	private function send_internal( array $project, string $request_id ): string {
		$to = Settings::notification_email();
		if ( ! is_email( $to ) ) {
			return $this->record( $project, self::TYPE_INTERNAL, self::STATUS_FAILED, $request_id, 'no_recipient' );
		}
		$ok = $this->mailer->send(
			$to,
			InternalNotification::subject( $project ),
			InternalNotification::body( $project ),
			(string) $project['email'] // Reply-To : répondre au prospect d'un clic ; le From reste celui du site.
		);

		return $this->record( $project, self::TYPE_INTERNAL, $ok ? self::STATUS_SENT : self::STATUS_FAILED, $request_id, $ok ? '' : 'wp_mail_false' );
	}

	/** @param array<string,mixed> $project */
	private function send_visitor( array $project, string $request_id ): string {
		if ( ! Settings::visitor_confirmation_enabled() ) {
			return $this->record( $project, self::TYPE_VISITOR, self::STATUS_SKIPPED, $request_id );
		}
		$to = (string) $project['email'];
		if ( ! is_email( $to ) ) {
			return $this->record( $project, self::TYPE_VISITOR, self::STATUS_FAILED, $request_id, 'no_recipient' );
		}
		$ok = $this->mailer->send( $to, VisitorConfirmation::subject(), VisitorConfirmation::body( $project ) );

		return $this->record( $project, self::TYPE_VISITOR, $ok ? self::STATUS_SENT : self::STATUS_FAILED, $request_id, $ok ? '' : 'wp_mail_false' );
	}

	/** Écrit l'état en base et, en cas d'échec, une ligne de journal sans rien de la personne. */
	private function record( array $project, string $type, string $status, string $request_id, string $error_code = '' ): string {
		$this->repository->set_mail_status( (int) $project['id'], $type, $status, $status === self::STATUS_SENT ? current_time( 'mysql', true ) : null );
		if ( $status === self::STATUS_FAILED ) {
			Logger::warning( 'Email non envoyé', [
				'request_id' => $request_id,
				'project_id' => (int) $project['id'],
				'mail_type'  => $type,
				'error_code' => $error_code,
			] );
		}
		return $status;
	}
}
