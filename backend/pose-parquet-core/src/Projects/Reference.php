<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Reference {

	public const PREFIX = 'PP';

	public static function build( int $id, int $year ): string {
		return sprintf( '%s-%04d-%06d', self::PREFIX, $year, $id );
	}


	public static function is_valid( string $reference ): bool {
		return (bool) preg_match( '/^PP-\d{4}-\d{6,}$/', $reference );
	}
}
