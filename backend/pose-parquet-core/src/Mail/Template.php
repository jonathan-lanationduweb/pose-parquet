<?php



declare(strict_types=1);

namespace PoseParquet\Core\Mail;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Template {


	public const WIDTH = 560;



	public static function render( string $name, array $vars ): string {
		$file = POSE_PARQUET_DIR . '/templates/mail/' . basename( $name ) . '.php';
		if ( ! is_file( $file ) ) {
			return '';
		}
		$contenu = self::capture( $file, $vars );

		return self::capture( POSE_PARQUET_DIR . '/templates/mail/layout.php', [
			'title'   => (string) ( $vars['title'] ?? 'Pose Parquet' ),
			'content' => $contenu,
		] );
	}



	public static function row( string $label, ?string $value ): string {
		$value = trim( (string) $value );
		if ( $value === '' ) {
			return '';
		}
		return '<tr>'
			. '<td style="padding:6px 12px 6px 0;color:#6b6b6b;vertical-align:top;white-space:nowrap;">' . esc_html( $label ) . '</td>'
			. '<td style="padding:6px 0;color:#1d1d1d;vertical-align:top;">' . nl2br( esc_html( $value ) ) . '</td>'
			. '</tr>';
	}


	public static function section( string $title, array $rows ): string {
		$rows = array_filter( $rows );
		if ( ! $rows ) {
			return '';
		}
		return '<h2 style="margin:24px 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#8a6d3b;">' . esc_html( $title ) . '</h2>'
			. '<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px;line-height:1.45;">' . implode( '', $rows ) . '</table>';
	}


	private static function capture( string $file, array $vars ): string {
		ob_start();
		( static function ( string $__file, array $__vars ): void {
			extract( $__vars, EXTR_SKIP );
			require $__file;
		} )( $file, $vars );

		return (string) ob_get_clean();
	}
}
