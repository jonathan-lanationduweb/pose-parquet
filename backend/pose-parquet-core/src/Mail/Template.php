<?php
/**
 * Rendu des gabarits d'email : un fichier PHP dans templates/mail/, des
 * variables, une chaîne HTML en sortie.
 *
 * Les gabarits sont du HTML de courrier : tableau centré de largeur bornée,
 * police système, styles en ligne, aucun script, lisible en texte brut si le
 * client n'affiche pas le style. Toute valeur venant de l'utilisateur passe
 * par esc_html() dans le gabarit — c'est le gabarit qui échappe, au moment
 * d'écrire, pour qu'aucune valeur brute ne soit jamais dans le HTML.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Mail;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Template {

	/** Largeur du courrier, en pixels : lisible sur mobile, sobre sur bureau. */
	public const WIDTH = 560;

	/**
	 * @param string              $name  nom du gabarit sans extension (ex. `internal`)
	 * @param array<string,mixed> $vars  variables disponibles dans le gabarit
	 */
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

	/**
	 * Une ligne « libellé / valeur » de tableau, valeur échappée. Vide si la
	 * valeur est vide : on n'affiche pas ce qui n'a pas été renseigné.
	 */
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

	/** Un bloc titré contenant des lignes ; rien si aucune ligne. */
	public static function section( string $title, array $rows ): string {
		$rows = array_filter( $rows );
		if ( ! $rows ) {
			return '';
		}
		return '<h2 style="margin:24px 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#8a6d3b;">' . esc_html( $title ) . '</h2>'
			. '<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px;line-height:1.45;">' . implode( '', $rows ) . '</table>';
	}

	/** @param array<string,mixed> $vars */
	private static function capture( string $file, array $vars ): string {
		ob_start();
		( static function ( string $__file, array $__vars ): void {
			extract( $__vars, EXTR_SKIP ); // phpcs:ignore WordPress.PHP.DontExtract.extract_extract
			require $__file;
		} )( $file, $vars );

		return (string) ob_get_clean();
	}
}
