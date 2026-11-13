<?php



declare(strict_types=1);

namespace PoseParquet\Core\Mail;

use PoseParquet\Core\Admin\Settings;

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


	public const TYPES = [ self::TYPE_INTERNAL, self::TYPE_VISITOR ];

	private Mailer $mailer;

	public function __construct( ?Mailer $mailer = null ) {
		$this->mailer = $mailer ?? new Mailer();
	}



	public function concerne( string $type, ?array $project = null ): bool {
		if ( $type !== self::TYPE_VISITOR ) {
			return true;
		}


		if ( $project !== null && ! is_email( (string) ( $project['email'] ?? '' ) ) ) {
			return false;
		}
		return Settings::visitor_confirmation_enabled();
	}



	public function tenter( array $project, string $type ): array {
		if ( $type === self::TYPE_INTERNAL ) {
			$to = Settings::notification_email();
			if ( ! is_email( $to ) ) {

				return [ 'ok' => false, 'code' => 'no_recipient', 'retryable' => false ];
			}
			$ok = $this->mailer->send(
				$to,
				InternalNotification::subject( $project ),
				InternalNotification::body( $project ),
				(string) $project['email']
			);

			return [ 'ok' => $ok, 'code' => $ok ? '' : 'wp_mail_false', 'retryable' => ! $ok ];
		}

		$to = (string) $project['email'];
		if ( ! is_email( $to ) ) {
			return [ 'ok' => false, 'code' => 'no_recipient', 'retryable' => false ];
		}
		$ok = $this->mailer->send( $to, VisitorConfirmation::subject(), VisitorConfirmation::body( $project ) );

		return [ 'ok' => $ok, 'code' => $ok ? '' : 'wp_mail_false', 'retryable' => ! $ok ];
	}
}
