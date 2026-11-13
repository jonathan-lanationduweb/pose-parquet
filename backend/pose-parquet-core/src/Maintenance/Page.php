<?php



declare(strict_types=1);

namespace PoseParquet\Core\Maintenance;

use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Page {


	public const RETRY_AFTER = 3600;

	public static function register(): void {
		add_action( 'template_redirect', [ self::class, 'intercepter' ], 0 );
		add_action( 'admin_bar_menu', [ self::class, 'barre' ], 100 );
	}


	public static function peut_contourner(): bool {
		return current_user_can( Capabilities::MANAGE_SETTINGS ) || current_user_can( Capabilities::EDIT_CONTENTS );
	}

	public static function intercepter(): void {
		if ( ! Reglages::actif() || self::peut_contourner() ) {
			return;
		}
		self::afficher( Reglages::lire(), true );
		exit;
	}

	public static function barre( \WP_Admin_Bar $barre ): void {
		if ( ! Reglages::actif() || ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			return;
		}
		$barre->add_node(
			[
				'id'    => 'pp-maintenance',
				'title' => esc_html__( 'Maintenance activée', 'pose-parquet-core' ),
				'href'  => Reglages::url(),
				'meta'  => [ 'class' => 'adm-barre-maintenance' ],
			]
		);
	}



	public static function afficher( array $m, bool $statut503 ): void {
		if ( $statut503 ) {
			status_header( 503 );
			header( 'Retry-After: ' . self::RETRY_AFTER );
		}
		if ( ! headers_sent() ) {
			nocache_headers();
			header( 'Content-Type: text/html; charset=utf-8' );
			header( 'X-Robots-Tag: noindex' );
		}

		$image  = $m['image'] ? (string) wp_get_attachment_image_url( (int) $m['image'], 'full' ) : '';
		$polices = plugins_url( 'assets/fonts/', POSE_PARQUET_FILE );
		$liens  = [];
		if ( $m['premibel'] ) {
			$liens[] = [ 'url' => Reglages::PREMIBEL_URL, 'titre' => 'Découvrir Premibel', 'sous' => 'Trouver un parquet', 'classe' => 'clair' ];
		}
		if ( $m['allure'] ) {
			$liens[] = [ 'url' => Reglages::ALLURE_URL, 'titre' => 'Découvrir Allure Design', 'sous' => 'Pose et rénovation', 'classe' => 'sombre' ];
		}
		require POSE_PARQUET_DIR . '/templates/maintenance-page.php';
	}
}
