<?php
/**
 * Envoi d'un email : la seule classe qui appelle wp_mail().
 *
 * Aucun couplage à un fournisseur. Le transport (SMTP, Brevo, Mailgun…) se
 * règle au niveau de WordPress ou de l'hébergement, par un plugin ou un
 * `phpmailer_init` ; ce plugin ne le connaît pas. Le From n'est pas fixé ici
 * non plus : c'est l'adresse légitime du site ou du transport, et jamais
 * celle du visiteur — la réponse facile passe par Reply-To.
 *
 * wp_mail() ne lève pas d'exception : il rend false et déclenche
 * `wp_mail_failed`. On rend ce booléen tel quel ; l'appelant décide de ce
 * qu'il en fait (et pour une demande : rien qui touche la base).
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Mail;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Mailer {

	/**
	 * @param string   $to       destinataire, déjà validé par l'appelant
	 * @param string   $subject  sujet, sans donnée personnelle
	 * @param string   $html     corps HTML complet
	 * @param string   $reply_to adresse de réponse facultative (validée)
	 */
	public function send( string $to, string $subject, string $html, string $reply_to = '' ): bool {
		if ( ! is_email( $to ) ) {
			return false;
		}
		$headers = [ 'Content-Type: text/html; charset=UTF-8' ];
		if ( $reply_to !== '' && is_email( $reply_to ) ) {
			// is_email() exclut retours chariot et espaces : pas d'injection d'en-tête possible.
			$headers[] = 'Reply-To: ' . $reply_to;
		}

		// Sujet sur une ligne, sans HTML.
		$subject = trim( preg_replace( '/[\r\n]+/', ' ', wp_strip_all_tags( $subject ) ) ?? '' );

		return (bool) wp_mail( $to, $subject, $html, $headers );
	}
}
