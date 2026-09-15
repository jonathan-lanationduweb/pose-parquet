<?php
/**
 * Ce que l'on peut honnêtement dire de l'acheminement des emails.
 *
 * Le plugin n'envoie pas les emails : il appelle `wp_mail()`, et c'est
 * WordPress — ou un plugin de transport, ou l'hébergement — qui les remet.
 * Cette classe ne prétend donc jamais qu'un email « fonctionne ». Elle relève
 * des signaux, les nomme, et laisse voir ce qui manque.
 *
 * La distinction qui compte est entre « configuré » et « hérité ». L'adresse de
 * réception vaut par défaut `admin_email`, qui sur une installation locale est
 * une adresse de développement. Elle est syntaxiquement valide, donc
 * `is_email()` dit oui, donc l'ancienne page d'état disait « configurée » — et
 * une mise en production aurait envoyé les demandes des visiteurs à une adresse
 * inexistante sans qu'aucun écran ne s'en inquiète. Le point de cette classe
 * est d'empêcher exactement cela.
 *
 * Rien de secret n'en sort : ni mot de passe, ni clé, ni jeton. Le nom d'hôte
 * SMTP et son port sont rendus parce qu'ils servent au diagnostic et qu'ils ne
 * sont pas des secrets ; l'identifiant et le mot de passe ne le sont jamais.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Mail;

use PoseParquet\Core\Admin\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Diagnostics {

	/**
	 * Domaines et extensions que les RFC réservent à la documentation et aux
	 * tests. Aucun ne peut recevoir d'email, jamais, par construction : ils ne
	 * sont pas délégués dans le DNS public.
	 *
	 * @see RFC 2606 (.test, .example, .invalid, .localhost) et RFC 6761.
	 */
	private const RESERVED_TLDS    = [ 'test', 'example', 'invalid', 'localhost', 'local' ];
	private const RESERVED_DOMAINS = [ 'example.com', 'example.net', 'example.org' ];

	/**
	 * @return array{
	 *   recipient:string,
	 *   valid:bool,
	 *   explicit:bool,
	 *   deliverable:bool,
	 *   visitor_confirmation:bool,
	 *   transport_declared:bool,
	 *   transport_signals:string[],
	 *   production_ready:bool
	 * }
	 */
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
			/*
			 * « Prêt » veut dire : une adresse réellement choisie, réellement
			 * joignable, et un transport déclaré. Les trois, ou rien — deux sur
			 * trois donne un site qui accepte des demandes que personne ne lit.
			 */
			'production_ready'     => $explicit && $livrable && (bool) $signaux,
		];
	}

	/**
	 * L'adresse a-t-elle été choisie, ou seulement héritée de `admin_email` ?
	 *
	 * On regarde l'option brute, pas la valeur effective : c'est la seule
	 * manière de distinguer « quelqu'un a saisi cette adresse » de « personne
	 * n'a jamais ouvert cet écran ».
	 */
	public static function recipient_is_explicit(): bool {
		$stocke = get_option( Settings::OPTION, [] );
		if ( ! is_array( $stocke ) ) {
			return false;
		}
		$valeur = $stocke[ Settings::KEY_NOTIFICATION_EMAIL ] ?? '';

		return is_string( $valeur ) && $valeur !== '' && (bool) is_email( $valeur );
	}

	/** L'adresse appartient-elle à un domaine réservé, donc non joignable ? */
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

	/**
	 * Les signes qu'un transport est branché — sans affirmer qu'il marche.
	 *
	 * Un plugin SMTP se branche sur `phpmailer_init` ; un service d'API
	 * court-circuite `wp_mail()` par `pre_wp_mail`. Aucun des deux ne garantit
	 * une remise : seul un vrai message reçu la prouve, et ce test-là ne peut
	 * pas se faire depuis cette page.
	 *
	 * @return string[] libellés des signaux relevés, éventuellement vide
	 */
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
				/* translators: 1: nom d'hôte SMTP, 2: port */
				__( 'Constantes SMTP définies : hôte %1$s, port %2$s.', 'pose-parquet-core' ),
				(string) constant( 'SMTP_HOST' ),
				defined( 'SMTP_PORT' ) ? (string) constant( 'SMTP_PORT' ) : '?'
			);
		}

		$sendmail = (string) ini_get( 'sendmail_path' );
		if ( trim( $sendmail ) !== '' ) {
			// Le chemin exact n'apporte rien à qui lit la page, et c'est une
			// information sur le serveur : on dit qu'il existe, pas où il est.
			$signaux[] = __( 'PHP déclare un sendmail_path.', 'pose-parquet-core' );
		}

		return $signaux;
	}
}
