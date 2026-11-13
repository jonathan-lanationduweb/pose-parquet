<?php



declare(strict_types=1);

namespace PoseParquet\Core\Mail;

use PoseParquet\Core\Admin\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Diagnostics {



	private const RESERVED_TLDS    = [ 'test', 'example', 'invalid', 'localhost', 'local' ];
	private const RESERVED_DOMAINS = [ 'example.com', 'example.net', 'example.org' ];



	public static function report(): array {
		$adresse  = Settings::notification_email();
		$valide   = (bool) is_email( $adresse );
		$explicit = self::recipient_is_explicit();
		$livrable = $valide && ! self::is_reserved( $adresse );
		$signaux  = self::transport_signals();

		return [
			'recipient'            => $adresse,
			'valid'                => $valide,
			'explicit'             => $explicit,
			'deliverable'          => $livrable,
			'visitor_confirmation' => Settings::visitor_confirmation_enabled(),
			'transport_declared'   => (bool) $signaux,
			'transport_signals'    => $signaux,


			'production_ready'     => $explicit && $livrable && (bool) $signaux,
		];
	}



	public static function recipient_is_explicit(): bool {
		$stocke = get_option( Settings::OPTION, [] );
		if ( ! is_array( $stocke ) ) {
			return false;
		}
		$valeur = $stocke[ Settings::KEY_NOTIFICATION_EMAIL ] ?? '';

		return is_string( $valeur ) && $valeur !== '' && (bool) is_email( $valeur );
	}


	public static function is_reserved( string $email ): bool {
		$arobase = strrpos( $email, '@' );
		if ( $arobase === false ) {
			return true;
		}
		$domaine = strtolower( substr( $email, $arobase + 1 ) );
		if ( in_array( $domaine, self::RESERVED_DOMAINS, true ) ) {
			return true;
		}
		$point = strrpos( $domaine, '.' );
		$tld   = $point === false ? $domaine : substr( $domaine, $point + 1 );

		return in_array( $tld, self::RESERVED_TLDS, true );
	}



	public static function transport_signals(): array {
		$signaux = [];

		if ( has_filter( 'pre_wp_mail' ) ) {
			$signaux[] = __( 'wp_mail() est intercepté par une extension (pre_wp_mail).', 'pose-parquet-core' );
		}
		if ( has_action( 'phpmailer_init' ) ) {
			$signaux[] = __( 'PHPMailer est configuré par une extension (phpmailer_init).', 'pose-parquet-core' );
		}
		if ( defined( 'SMTP_HOST' ) ) {
			$signaux[] = sprintf(

				__( 'Constantes SMTP définies : hôte %1$s, port %2$s.', 'pose-parquet-core' ),
				(string) constant( 'SMTP_HOST' ),
				defined( 'SMTP_PORT' ) ? (string) constant( 'SMTP_PORT' ) : '?'
			);
		}

		$sendmail = (string) ini_get( 'sendmail_path' );
		if ( trim( $sendmail ) !== '' ) {


			$signaux[] = __( 'PHP déclare un sendmail_path.', 'pose-parquet-core' );
		}

		return $signaux;
	}
}
