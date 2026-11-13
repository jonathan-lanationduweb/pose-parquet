<?php



declare(strict_types=1);

namespace PoseParquet\Core\Admin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Notices {


	public const ARG = 'pp_notice';

	public const STATUS_UPDATED   = 'status_updated';
	public const STATUS_UNCHANGED = 'status_unchanged';
	public const STATUS_STALE     = 'status_stale';
	public const NOTE_ADDED       = 'note_added';
	public const NOTE_EMPTY       = 'note_empty';
	public const NOTE_TOO_LONG    = 'note_too_long';
	public const SAVE_FAILED      = 'save_failed';
	public const NOT_FOUND        = 'not_found';
	public const CAPS_REPAIRED    = 'caps_repaired';
	public const MAIL_QUEUE_RUN   = 'mail_queue_run';
	public const MAIL_QUEUE_EMPTY = 'mail_queue_empty';
	public const DEST_UPDATED     = 'dest_updated';
	public const DEST_UNCHANGED   = 'dest_unchanged';
	public const CAPS_INCOMPLETE  = 'caps_incomplete';



	private static function messages(): array {
		return [
			self::STATUS_UPDATED   => [ 'success', __( 'Statut mis à jour.', 'pose-parquet-core' ) ],
			self::STATUS_UNCHANGED => [ 'info', __( 'Le statut était déjà celui-là : rien n’a changé.', 'pose-parquet-core' ) ],
			self::STATUS_STALE     => [ 'warning', __( 'Ce projet a été modifié entre-temps. Rechargez la fiche.', 'pose-parquet-core' ) ],
			self::NOTE_ADDED       => [ 'success', __( 'Note ajoutée.', 'pose-parquet-core' ) ],
			self::NOTE_EMPTY       => [ 'error', __( 'La note est vide : rien n’a été enregistré.', 'pose-parquet-core' ) ],

			self::NOTE_TOO_LONG    => [ 'error', sprintf( __( 'La note dépasse %s caractères : rien n’a été enregistré.', 'pose-parquet-core' ), number_format_i18n( \PoseParquet\Core\Projects\Notes::MAX_LENGTH ) ) ],
			self::SAVE_FAILED      => [ 'error', __( 'Impossible d’enregistrer la modification.', 'pose-parquet-core' ) ],
			self::NOT_FOUND        => [ 'error', __( 'Ce projet n’existe pas ou n’existe plus.', 'pose-parquet-core' ) ],
			self::CAPS_REPAIRED    => [ 'success', __( 'Les droits du plugin ont été réappliqués.', 'pose-parquet-core' ) ],

			self::MAIL_QUEUE_RUN   => [ 'success', sprintf( __( 'File des notifications : %1$s envoi(s) traité(s), %2$s en attente.', 'pose-parquet-core' ), number_format_i18n( self::compteur( 'pp_traites' ) ), number_format_i18n( self::compteur( 'pp_restants' ) ) ) ],
			self::MAIL_QUEUE_EMPTY => [ 'info', __( 'Aucun envoi n’était dû : la file est à jour.', 'pose-parquet-core' ) ],
			self::DEST_UPDATED     => [ 'success', __( 'Destination mise à jour. Une note interne en garde la trace.', 'pose-parquet-core' ) ],
			self::DEST_UNCHANGED   => [ 'info', __( 'La destination était déjà celle-là : rien n’a changé.', 'pose-parquet-core' ) ],
			self::CAPS_INCOMPLETE  => [ 'error', __( 'Des droits manquent encore après la réparation : le rôle concerné a peut-être été supprimé par une autre extension.', 'pose-parquet-core' ) ],
		];
	}



	private static function compteur( string $cle ): int {

		return isset( $_GET[ $cle ] ) ? max( 0, absint( wp_unslash( $_GET[ $cle ] ) ) ) : 0;
	}



	public static function pending(): ?array {

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
