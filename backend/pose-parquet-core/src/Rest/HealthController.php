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
 * Deux niveaux de détail, depuis l'audit du 14/09/2026.
 *
 * La version exacte du plugin sortait ici sans authentification. Une sonde n'en
 * a pas besoin — elle veut savoir si le service répond — alors qu'un numéro de
 * version précis dit à qui la lit quelles corrections ne sont pas encore
 * appliquées. La réponse publique se limite donc à l'état ; la version, le
 * numéro de schéma et la liste des tables ne s'ajoutent que pour un appelant
 * authentifié qui a déjà le droit d'administrer le plugin, et qui verrait de
 * toute façon tout cela sur la page « État ».
 *
 * La forme de la réponse ne change pas : `status` et `databaseStatus.ready`
 * sont présents dans les deux cas, et ce sont les deux seuls champs sur
 * lesquels une supervision doit s'appuyer.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Rest;

use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Security\Capabilities;

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
			'databaseStatus' => [
				'ready' => $ready,
			],
		];

		if ( current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			$body['pluginVersion']                      = POSE_PARQUET_VERSION;
			$body['databaseStatus']['schemaVersion']    = $version;
			$body['databaseStatus']['expectedVersion']  = $expected;
			// Noms logiques seulement : jamais le nom réel de la table.
			$body['databaseStatus']['tables']           = $tables;
		}

		$response = new \WP_REST_Response( $body, $ready ? 200 : 503 );
		// Une sonde ne doit pas lire un état mis en cache.
		$response->header( 'Cache-Control', 'no-store' );
		return $response;
	}
}
