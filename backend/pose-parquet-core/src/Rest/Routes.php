<?php
/**
 * Déclaration des routes REST.
 *
 * Espace de noms : `pose-parquet/v1`. Une route, un contrôleur, une méthode
 * `permission` et une méthode de traitement : c'est tout le contrat. Les routes
 * à venir (administration au lot 4) s'ajoutent ici, chacune avec son
 * contrôleur, sans toucher aux autres. Les en-têtes CORS de l'espace sont
 * gérés à part, dans Cors.
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

		/*
		 * Dépôt d'une demande. POST seulement : il n'existe pas de GET /projects
		 * (pas de liste publique), ni de PUT/PATCH/DELETE. WordPress répond 404
		 * à toute autre méthode sur cette route. Publique : voir
		 * ProjectsController pour ce que « publique » couvre — et ne couvre pas.
		 */
		register_rest_route(
			self::NAMESPACE,
			'/projects',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ ProjectsController::class, 'create' ],
				'permission_callback' => [ ProjectsController::class, 'permission' ],
			]
		);

		// Jeton temporel signé, à demander avant de soumettre. GET seulement.
		register_rest_route(
			self::NAMESPACE,
			'/form-token',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ FormTokenController::class, 'issue' ],
				'permission_callback' => [ FormTokenController::class, 'permission' ],
			]
		);
	}
}
