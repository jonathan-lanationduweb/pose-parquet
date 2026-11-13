<?php



declare(strict_types=1);

namespace PoseParquet\Core\Rest;

use PoseParquet\Core\Antispam\FormToken;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FormTokenController {

	public static function permission(): bool {
		return true;
	}

	public static function issue(): WP_REST_Response {
		$response = new WP_REST_Response( [
			'token'     => FormToken::issue(),
			'minAge'    => FormToken::MIN_AGE,
			'expiresIn' => FormToken::MAX_AGE,
		], 200 );
		$response->header( 'Cache-Control', 'no-store' );

		return $response;
	}
}
