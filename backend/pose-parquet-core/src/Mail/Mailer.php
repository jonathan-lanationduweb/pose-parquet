<?php



declare(strict_types=1);

namespace PoseParquet\Core\Mail;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Mailer {



	public function send( string $to, string $subject, string $html, string $reply_to = '' ): bool {
		if ( ! is_email( $to ) ) {
			return false;
		}
		$headers = [ 'Content-Type: text/html; charset=UTF-8' ];
		if ( $reply_to !== '' && is_email( $reply_to ) ) {

			$headers[] = 'Reply-To: ' . $reply_to;
		}


		$subject = trim( preg_replace( '/[\r\n]+/', ' ', wp_strip_all_tags( $subject ) ) ?? '' );

		return (bool) wp_mail( $to, $subject, $html, $headers );
	}
}
