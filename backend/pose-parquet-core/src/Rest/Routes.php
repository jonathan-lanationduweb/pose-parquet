<?php
/**
 * Déclaration des routes REST.
 *
 * Espace de noms : `pose-parquet/v1`. Une route, un contrôleur, une méthode
 * `permission` et une méthode `handle` : c'est tout le contrat. Les routes à
 * venir (POST /projects au lot 2, routes d'administration au lot 4) s'ajoutent
 * ici, chacune avec son contrôleur, sans toucher aux autres.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Rest;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Routes {

	public const NAMESPACE = 'pose-parquet/v1';

	/** Branché sur `rest_api_init`. */
	public static function register(): void {
		register_rest_route(
			self::NAMESPACE,
			'/health',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ HealthController::class, 'handle' ],
				'permission_callback' => [ HealthController::class, 'permission' ],
			]
		);
	}
}
