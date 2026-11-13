<?php



declare(strict_types=1);

namespace PoseParquet\Core\Antispam;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Honeypot {

	public const FIELD = 'website';


	public static function is_triggered( array $input ): bool {
		if ( ! array_key_exists( self::FIELD, $input ) ) {
			return false;
		}
		$v = $input[ self::FIELD ];
		if ( $v === null || $v === '' || $v === false ) {
			return false;
		}
		return ! ( is_string( $v ) && trim( $v ) === '' );
	}
}
