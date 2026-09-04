<?php
/**
 * Réglages du plugin — page « Pose Parquet → Réglages ».
 *
 * Une option, `pose_parquet_settings`, deux réglages, parce que ce lot n'en
 * a besoin que de deux : l'adresse qui reçoit les demandes, et l'envoi ou non
 * d'une confirmation au visiteur. Settings API WordPress : enregistrement,
 * section, champs, page d'options, nonce et capability gérés par options.php
 * — la capability requise est ramenée de `manage_options` à
 * `pp_manage_settings` par le filtre prévu à cet effet.
 *
 * Aucune adresse n'est écrite dans le code : la valeur par défaut est
 * l'adresse d'administration du site.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Settings {

	public const OPTION     = 'pose_parquet_settings';
	public const PAGE       = 'pose-parquet-settings';
	public const GROUP      = 'pose_parquet_settings';
	public const SECTION    = 'pose_parquet_emails';

	public const KEY_NOTIFICATION_EMAIL  = 'notification_email';
	public const KEY_VISITOR_CONFIRMATION = 'visitor_confirmation';

	public static function register(): void {
		add_action( 'admin_init', [ self::class, 'register_settings' ] );
		// options.php exige manage_options par défaut ; notre capability suffit.
		add_filter( 'option_page_capability_' . self::GROUP, static fn(): string => Capabilities::MANAGE_SETTINGS );
	}

	public static function register_settings(): void {
		register_setting( self::GROUP, self::OPTION, [
			'type'              => 'array',
			'sanitize_callback' => [ self::class, 'sanitize' ],
			'default'           => self::defaults(),
		] );

		add_settings_section(
			self::SECTION,
			__( 'Emails', 'pose-parquet-core' ),
			static function (): void {
				echo '<p>' . esc_html__( 'L’adresse qui reçoit chaque nouvelle demande, et l’accusé de réception envoyé au visiteur. L’expéditeur (From) reste celui configuré pour le site ou le transport SMTP.', 'pose-parquet-core' ) . '</p>';
			},
			self::PAGE
		);

		add_settings_field(
			self::KEY_NOTIFICATION_EMAIL,
			__( 'Adresse de réception des demandes', 'pose-parquet-core' ),
			static function (): void {
				printf(
					'<input type="email" class="regular-text" id="%1$s" name="%2$s[%1$s]" value="%3$s" required autocomplete="off" />',
					esc_attr( self::KEY_NOTIFICATION_EMAIL ),
					esc_attr( self::OPTION ),
					esc_attr( self::notification_email() )
				);
				echo '<p class="description">' . esc_html__( 'Par défaut : l’adresse d’administration du site.', 'pose-parquet-core' ) . '</p>';
			},
			self::PAGE,
			self::SECTION,
			[ 'label_for' => self::KEY_NOTIFICATION_EMAIL ]
		);

		add_settings_field(
			self::KEY_VISITOR_CONFIRMATION,
			__( 'Confirmation automatique au visiteur', 'pose-parquet-core' ),
			static function (): void {
				printf(
					'<label><input type="checkbox" id="%1$s" name="%2$s[%1$s]" value="1" %3$s /> %4$s</label>',
					esc_attr( self::KEY_VISITOR_CONFIRMATION ),
					esc_attr( self::OPTION ),
					checked( self::visitor_confirmation_enabled(), true, false ),
					esc_html__( 'activée', 'pose-parquet-core' )
				);
			},
			self::PAGE,
			self::SECTION,
			[ 'label_for' => self::KEY_VISITOR_CONFIRMATION ]
		);
	}

	/**
	 * Nettoie ce qui arrive du formulaire. Une adresse invalide n'est pas
	 * enregistrée : l'ancienne reste, et l'administrateur voit pourquoi.
	 *
	 * @param mixed $input
	 * @return array{notification_email:string,visitor_confirmation:bool}
	 */
	public static function sanitize( mixed $input ): array {
		$actuel = self::all();
		$input  = is_array( $input ) ? $input : [];

		$email = isset( $input[ self::KEY_NOTIFICATION_EMAIL ] ) && is_string( $input[ self::KEY_NOTIFICATION_EMAIL ] )
			? sanitize_email( trim( $input[ self::KEY_NOTIFICATION_EMAIL ] ) )
			: '';
		if ( $email === '' || ! is_email( $email ) ) {
			add_settings_error(
				self::OPTION,
				'invalid_notification_email',
				__( 'L’adresse de réception est invalide : l’ancienne adresse est conservée.', 'pose-parquet-core' )
			);
			$email = $actuel[ self::KEY_NOTIFICATION_EMAIL ];
		}

		// Case à cocher : absente du POST quand décochée.
		$confirmation = ! empty( $input[ self::KEY_VISITOR_CONFIRMATION ] );

		return [
			self::KEY_NOTIFICATION_EMAIL  => $email,
			self::KEY_VISITOR_CONFIRMATION => $confirmation,
		];
	}

	/** @return array{notification_email:string,visitor_confirmation:bool} */
	public static function defaults(): array {
		return [
			self::KEY_NOTIFICATION_EMAIL  => (string) get_option( 'admin_email', '' ),
			self::KEY_VISITOR_CONFIRMATION => true,
		];
	}

	/** @return array{notification_email:string,visitor_confirmation:bool} */
	public static function all(): array {
		$defaults = self::defaults();
		$stored   = get_option( self::OPTION, [] );
		$stored   = is_array( $stored ) ? $stored : [];
		$email    = isset( $stored[ self::KEY_NOTIFICATION_EMAIL ] ) && is_string( $stored[ self::KEY_NOTIFICATION_EMAIL ] ) && is_email( $stored[ self::KEY_NOTIFICATION_EMAIL ] )
			? $stored[ self::KEY_NOTIFICATION_EMAIL ]
			: $defaults[ self::KEY_NOTIFICATION_EMAIL ];

		return [
			self::KEY_NOTIFICATION_EMAIL  => $email,
			self::KEY_VISITOR_CONFIRMATION => array_key_exists( self::KEY_VISITOR_CONFIRMATION, $stored ) ? (bool) $stored[ self::KEY_VISITOR_CONFIRMATION ] : $defaults[ self::KEY_VISITOR_CONFIRMATION ],
		];
	}

	public static function notification_email(): string {
		return self::all()[ self::KEY_NOTIFICATION_EMAIL ];
	}

	public static function visitor_confirmation_enabled(): bool {
		return self::all()[ self::KEY_VISITOR_CONFIRMATION ];
	}

	/** Une adresse de réception valide existe-t-elle (réglée ou héritée du site) ? */
	public static function is_configured(): bool {
		return (bool) is_email( self::notification_email() );
	}

	/** Écriture directe (tests, scripts) : passe par le même nettoyage que le formulaire. */
	public static function update( array $values ): bool {
		return update_option( self::OPTION, self::sanitize( $values + self::all() ), false );
	}

	/** Page « Réglages ». */
	public static function render(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ) );
		}
		require POSE_PARQUET_DIR . '/templates/admin-settings.php';
	}
}
