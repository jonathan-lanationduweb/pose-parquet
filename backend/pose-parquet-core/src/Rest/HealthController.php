<?php
/**
 * GET /wp-json/pose-parquet/v1/health
 *
 * Dit si le plugin est là et si sa base est prête. Rien d'autre : pas de
 * version WordPress, pas de chemin, pas de préfixe de table, pas de nom de
 * base. Ce que cette route révèle doit pouvoir être lu par n'importe qui sans
 * rien apprendre du serveur — c'est la condition pour la laisser publique, et
 * c'est ce qui la rend utile à une sonde de supervision sans authentification.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Rest;

use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Database\Schema;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class HealthController {

	/** Publique : voir l'en-tête du fichier pour ce qui l'autorise. */
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
			'pluginVersion'  => POSE_PARQUET_VERSION,
			'databaseStatus' => [
				'ready'           => $ready,
				'schemaVersion'   => $version,
				'expectedVersion' => $expected,
				// Noms logiques seulement : jamais le nom réel de la table.
				'tables'          => $tables,
			],
		];

		$response = new \WP_REST_Response( $body, $ready ? 200 : 503 );
		// Une sonde ne doit pas lire un état mis en cache.
		$response->header( 'Cache-Control', 'no-store' );
		return $response;
	}
}
