<?php
/**
 * Messages d'administration après une action.
 *
 * Une action réussit ou échoue, puis redirige — voir Admin\Actions. Le message
 * doit survivre à cette redirection sans voyager dans l'URL sous forme de
 * texte : seul un CODE passe en paramètre, et il est traduit ici. Une URL ne
 * doit jamais porter la phrase affichée, sinon n'importe qui peut faire dire
 * n'importe quoi à l'administration en envoyant un lien.
 *
 * Les codes inconnus ne produisent aucun message plutôt qu'un message vide.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Admin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Notices {

	/** Nom du paramètre d'URL qui porte le code. */
	public const ARG = 'pp_notice';

	public const STATUS_UPDATED   = 'status_updated';
	public const STATUS_UNCHANGED = 'status_unchanged';
	public const STATUS_STALE     = 'status_stale';
	public const NOTE_ADDED       = 'note_added';
	public const NOTE_EMPTY       = 'note_empty';
	public const NOTE_TOO_LONG    = 'note_too_long';
	public const SAVE_FAILED      = 'save_failed';
	public const NOT_FOUND        = 'not_found';

	/**
	 * Code → [ type, message ]. Le type est celui des classes WordPress
	 * (`success`, `warning`, `error`) qui donnent la couleur et le rôle ARIA.
	 *
	 * @return array<string,array{0:string,1:string}>
	 */
	private static function messages(): array {
		return [
			self::STATUS_UPDATED   => [ 'success', __( 'Statut mis à jour.', 'pose-parquet-core' ) ],
			self::STATUS_UNCHANGED => [ 'info', __( 'Le statut était déjà celui-là : rien n’a changé.', 'pose-parquet-core' ) ],
			self::STATUS_STALE     => [ 'warning', __( 'Cette demande a été modifiée entre-temps. Rechargez la fiche.', 'pose-parquet-core' ) ],
			self::NOTE_ADDED       => [ 'success', __( 'Note ajoutée.', 'pose-parquet-core' ) ],
			self::NOTE_EMPTY       => [ 'error', __( 'La note est vide : rien n’a été enregistré.', 'pose-parquet-core' ) ],
			/* translators: %s : nombre maximal de caractères. */
			self::NOTE_TOO_LONG    => [ 'error', sprintf( __( 'La note dépasse %s caractères : rien n’a été enregistré.', 'pose-parquet-core' ), number_format_i18n( \PoseParquet\Core\Projects\Notes::MAX_LENGTH ) ) ],
			self::SAVE_FAILED      => [ 'error', __( 'Impossible d’enregistrer la modification.', 'pose-parquet-core' ) ],
			self::NOT_FOUND        => [ 'error', __( 'Cette demande n’existe pas ou n’existe plus.', 'pose-parquet-core' ) ],
		];
	}

	/**
	 * Le message à afficher, lu dans l'URL. Rend `null` s'il n'y en a pas.
	 *
	 * @return array{type:string,text:string}|null
	 */
	public static function pending(): ?array {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- lecture d'un code d'affichage, sans effet.
		$code = isset( $_GET[ self::ARG ] ) ? sanitize_key( wp_unslash( $_GET[ self::ARG ] ) ) : '';
		if ( $code === '' ) {
			return null;
		}

		$messages = self::messages();
		if ( ! isset( $messages[ $code ] ) ) {
			return null;
		}

		return [ 'type' => $messages[ $code ][0], 'text' => $messages[ $code ][1] ];
	}

	/** Affiche la notice, si l'écran en a une. */
	public static function output( ?array $notice ): void {
		if ( ! $notice ) {
			return;
		}
		printf(
			'<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>',
			esc_attr( $notice['type'] ),
			esc_html( $notice['text'] )
		);
	}
}
