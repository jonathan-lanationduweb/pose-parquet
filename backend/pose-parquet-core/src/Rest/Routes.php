<?php



declare(strict_types=1);

namespace PoseParquet\Core\Rest;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Routes {

	public const NAMESPACE = 'pose-parquet/v1';


	public static function register(): void {

		\PoseParquet\Core\Contenus\Export::route( self::NAMESPACE );

		\PoseParquet\Core\Contenus\Apercu::route( self::NAMESPACE );

		\PoseParquet\Core\Partenaires\Surveillance::route( self::NAMESPACE );
		register_rest_route(
			self::NAMESPACE,
			'/health',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ HealthController::class, 'handle' ],
				'permission_callback' => [ HealthController::class, 'permission' ],
			]
		);



		register_rest_route(
			self::NAMESPACE,
			'/projects',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ ProjectsController::class, 'create' ],
				'permission_callback' => [ ProjectsController::class, 'permission' ],
			]
		);


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
