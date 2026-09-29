<?php
/**
 * Comment on envoie l'un des deux emails d'une demande. Rien d'autre.
 *
 * Cette classe ne décide ni du moment, ni du nombre de tentatives, ni de ce
 * qu'on écrit en base : c'est `Mail\Queue` qui en décide, parce que c'est lui
 * qui sait s'il reste une tentative après celle-ci. Ici on répond à une seule
 * question — cet envoi est-il parti, et sinon, cela vaut-il la peine de
 * réessayer ?
 *
 * LA DISTINCTION QUI COMPTE. `wp_mail()` qui rend `false` peut vouloir dire
 * « le SMTP n'a pas répondu » — un réessai a du sens — ou rien du tout. En
 * revanche, une adresse de notification absente ou invalide ne deviendra pas
 * valide en cinq minutes : réessayer huit fois n'ajouterait que du bruit dans
 * le journal. D'où `retryable`, rendu avec le code d'erreur.
 *
 * La base est la vérité, l'email une notification : aucun échec d'envoi ne
 * remet en cause une demande enregistrée.
 *
 * @package PoseParquet\Core
 */

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

	/** Les deux notifications d'une demande, dans l'ordre où elles comptent. */
	public const TYPES = [ self::TYPE_INTERNAL, self::TYPE_VISITOR ];

	private Mailer $mailer;

	public function __construct( ?Mailer $mailer = null ) {
		$this->mailer = $mailer ?? new Mailer();
	}

	/**
	 * Y a-t-il quelque chose à envoyer pour ce type ?
	 *
	 * La confirmation au visiteur peut être désactivée dans les réglages :
	 * ce n'est pas un échec, c'est un choix, et il se lit `skipped`.
	 */
	public function concerne( string $type ): bool {
		return $type !== self::TYPE_VISITOR || Settings::visitor_confirmation_enabled();
	}

	/**
	 * Tente un envoi. N'écrit rien en base, ne journalise rien.
	 *
	 * @param array<string,mixed> $project ligne de pp_projects
	 * @return array{ok:bool,code:string,retryable:bool}
	 */
	public function tenter( array $project, string $type ): array {
		if ( $type === self::TYPE_INTERNAL ) {
			$to = Settings::notification_email();
			if ( ! is_email( $to ) ) {
				// Aucune adresse configurée : le temps n'y changera rien.
				return [ 'ok' => false, 'code' => 'no_recipient', 'retryable' => false ];
			}
			$ok = $this->mailer->send(
				$to,
				InternalNotification::subject( $project ),
				InternalNotification::body( $project ),
				(string) $project['email'] // Reply-To : répondre au prospect d'un clic ; le From reste celui du site.
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
