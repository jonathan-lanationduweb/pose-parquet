<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Notes {


	public const MAX_LENGTH = 5000;

	public const ERROR_EMPTY = 'note_empty';
	public const ERROR_LONG  = 'note_too_long';



	public static function prepare( string $raw ): array {
		$content = sanitize_textarea_field( $raw );

		$content = trim( $content );

		if ( $content === '' ) {
			return [ 'ok' => false, 'content' => '', 'error' => self::ERROR_EMPTY ];
		}
		if ( mb_strlen( $content ) > self::MAX_LENGTH ) {
			return [ 'ok' => false, 'content' => '', 'error' => self::ERROR_LONG ];
		}

		return [ 'ok' => true, 'content' => $content, 'error' => '' ];
	}



	public static function add( int $project_id, string $raw ): array {
		$prepared = self::prepare( $raw );
		if ( ! $prepared['ok'] ) {
			return [ 'ok' => false, 'id' => 0, 'error' => $prepared['error'] ];
		}

		$repo = new Repository();
		if ( $repo->find_by_id( $project_id ) === null ) {
			return [ 'ok' => false, 'id' => 0, 'error' => 'project_not_found' ];
		}

		$id = $repo->insert_note(
			$project_id,
			get_current_user_id(),
			$prepared['content'],
			current_time( 'mysql', true )
		);

		return $id
			? [ 'ok' => true, 'id' => $id, 'error' => '' ]
			: [ 'ok' => false, 'id' => 0, 'error' => 'note_write_failed' ];
	}
}
