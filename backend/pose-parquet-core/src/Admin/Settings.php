<?php



declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Mail\Diagnostics;
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


				$diag   = Diagnostics::report();
				$actif  = (bool) ( $diag['production_ready'] ?? false );
				echo '<p class="adm-etat-ligne">' . esc_html__( 'État :', 'pose-parquet-core' ) . ' ' . Socle::badge( $actif ? __( 'Actif', 'pose-parquet-core' ) : __( 'À configurer', 'pose-parquet-core' ), $actif ? 'ok' : 'attente' ) . '</p>';
				echo '<p class="adm-carte__aide">' . esc_html__( 'Un email à l’équipe à chaque nouveau projet orienté.', 'pose-parquet-core' ) . '</p>';
			},
			self::PAGE
		);

		add_settings_field(
			self::KEY_NOTIFICATION_EMAIL,
			__( 'Adresse de réception', 'pose-parquet-core' ),
			static function (): void {
				printf(
					'<input type="email" class="regular-text" id="%1$s" name="%2$s[%1$s]" value="%3$s" required autocomplete="off" />',
					esc_attr( self::KEY_NOTIFICATION_EMAIL ),
					esc_attr( self::OPTION ),
					esc_attr( self::notification_email() )
				);



				$diagnostic = Diagnostics::report();
				if ( ! $diagnostic['deliverable'] ) {
					echo '<p class="adm-alerte-ligne adm-alerte-ligne--ko"><span class="dashicons dashicons-warning" aria-hidden="true"></span>' . esc_html( sprintf(   __( '%s est une adresse de test : aucun email réel ne sera remis.', 'pose-parquet-core' ), self::notification_email() ) ) . '</p>';
				} elseif ( ! $diagnostic['explicit'] ) {
					echo '<p class="adm-alerte-ligne"><span class="dashicons dashicons-info-outline" aria-hidden="true"></span>' . esc_html__( 'Adresse héritée du site : enregistrez pour la confirmer.', 'pose-parquet-core' ) . '</p>';
				}
			},
			self::PAGE,
			self::SECTION,
			[ 'label_for' => self::KEY_NOTIFICATION_EMAIL ]
		);

		add_settings_field(
			self::KEY_VISITOR_CONFIRMATION,
			__( 'Confirmation automatique', 'pose-parquet-core' ),
			static function (): void {
				printf(
					'<label><input type="checkbox" id="%1$s" name="%2$s[%1$s]" value="1" %3$s /> %4$s</label>',
					esc_attr( self::KEY_VISITOR_CONFIRMATION ),
					esc_attr( self::OPTION ),
					checked( self::visitor_confirmation_enabled(), true, false ),
					esc_html__( 'Envoyer un accusé de réception au visiteur', 'pose-parquet-core' )
				);
			},
			self::PAGE,
			self::SECTION,
			[ 'label_for' => self::KEY_VISITOR_CONFIRMATION ]
		);
	}



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


		$confirmation = ! empty( $input[ self::KEY_VISITOR_CONFIRMATION ] );

		return [
			self::KEY_NOTIFICATION_EMAIL  => $email,
			self::KEY_VISITOR_CONFIRMATION => $confirmation,
		];
	}


	public static function defaults(): array {
		return [
			self::KEY_NOTIFICATION_EMAIL  => (string) get_option( 'admin_email', '' ),


			self::KEY_VISITOR_CONFIRMATION => false,
		];
	}


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


	public static function is_configured(): bool {
		return (bool) is_email( self::notification_email() );
	}


	public static function update( array $values ): bool {
		return update_option( self::OPTION, self::sanitize( $values + self::all() ), false );
	}


	public static function render(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ) );
		}
		require POSE_PARQUET_DIR . '/templates/admin-settings.php';
	}
}
