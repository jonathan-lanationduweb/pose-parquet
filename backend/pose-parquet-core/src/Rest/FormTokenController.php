<?php
/**
 * GET /pose-parquet/v1/form-token — un jeton temporel signé pour le formulaire.
 *
 * Publique, sans session, minuscule, jamais mise en cache. Le front l'appelle
 * au chargement du formulaire et renvoie `token` dans `formToken` à la
 * soumission. Les durées annoncées sont celles de Antispam\FormToken.
 *
 * @package PoseParquet\Core
 */

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
