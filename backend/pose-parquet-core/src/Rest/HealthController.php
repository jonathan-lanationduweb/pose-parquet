<?php



declare(strict_types=1);

namespace PoseParquet\Core\Rest;

use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class HealthController {


	public static function permission(): bool {
		return true;
	}

	public static function handle( \WP_REST_Request $request ): \WP_REST_Response {
		$tables   = Schema::status();
		$complete = ! in_array( false, $tables, true );
		$version  = Installer::installed_version();
		$expected = POSE_PARQUET_DB_VERSION;
		$ready    = $complete && $version === $expected;

		$body = [
			'status'         => $ready ? 'ok' : 'degraded',
			'databaseStatus' => [
				'ready' => $ready,
			],
		];

		if ( current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			$body['pluginVersion']                      = POSE_PARQUET_VERSION;
			$body['databaseStatus']['schemaVersion']    = $version;
			$body['databaseStatus']['expectedVersion']  = $expected;

			$body['databaseStatus']['tables']           = $tables;
		}

		$response = new \WP_REST_Response( $body, $ready ? 200 : 503 );

		$response->header( 'Cache-Control', 'no-store' );
		return $response;
	}
}
