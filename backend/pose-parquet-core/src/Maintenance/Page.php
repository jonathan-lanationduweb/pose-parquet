<?php
/**
 * La page publique de maintenance, servie par WordPress.
 *
 * Quand la maintenance est activée, tout visiteur du site servi par
 * WordPress reçoit cette page avec un vrai statut **503 Service Unavailable**
 * et un en-tête `Retry-After` : les moteurs de recherche comprennent une
 * indisponibilité passagère et ne désindexent rien.
 *
 * Jamais bloqués : l'administration (`wp-admin`), la connexion
 * (`wp-login.php`), l'API REST, l'AJAX et le cron — ils ne passent pas par
 * `template_redirect`. Un utilisateur connecté qui gère le site voit le vrai
 * site, pour le prévisualiser, et une mention « Maintenance activée » dans la
 * barre d'administration.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Maintenance;

use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Page {

	/** Une heure : une mise à jour, pas une fermeture. */
	public const RETRY_AFTER = 3600;

	public static function register(): void {
		add_action( 'template_redirect', [ self::class, 'intercepter' ], 0 );
		add_action( 'admin_bar_menu', [ self::class, 'barre' ], 100 );
	}

	/** Qui voit le vrai site pendant la maintenance. */
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

	/**
	 * @param array{actif:bool,titre:string,message:string,image:int,premibel:bool,allure:bool} $m
	 * @param bool $statut503 vrai pour la page publique ; faux pour l'aperçu
	 */
	public static function afficher( array $m, bool $statut503 ): void {
		if ( $statut503 ) {
			status_header( 503 );
			header( 'Retry-After: ' . self::RETRY_AFTER );
		}
		if ( ! headers_sent() ) { // Rendu en ligne de commande (tests) : pas d'en-têtes.
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
