<?php
/**
 * Un WordPress d'ADMINISTRATION, pas un site public.
 *
 * Le site public de Pose Parquet est statique (GitHub Pages en préproduction,
 * l'hébergement définitif ensuite). Le WordPress distant ne sert que
 * l'administration, l'export REST et la publication. Sur un serveur
 * (environnement « staging » ou « production ») :
 *
 *   - toute page publique de WordPress (thème, flux, archives, recherche)
 *     redirige vers le site public réglé (Réglages → Site public) — sauf la
 *     page de maintenance, qui garde sa réponse 503 ;
 *   - rien n'est indexable : en-tête X-Robots-Tag sur toutes les réponses,
 *     robots.txt « Disallow: / » ;
 *   - l'administration, la connexion, l'API REST (export lu par GitHub
 *     Actions) et le cron ne sont pas touchés.
 *
 * En local (WAMP), rien ne change : les outils de développement restent tels
 * quels.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Security;

use PoseParquet\Core\Admin\SitePublic;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Environnement {

	public static function sur_serveur(): bool {
		return in_array( wp_get_environment_type(), [ 'staging', 'production' ], true );
	}

	public static function register(): void {
		if ( ! self::sur_serveur() ) {
			return;
		}
		add_action( 'init', [ self::class, 'entete_noindex' ], 0 );
		add_filter( 'robots_txt', [ self::class, 'robots' ], 99 );
		// Après la maintenance (Maintenance\Page, priorité 0) : la page 503 garde la main quand elle est active.
		add_action( 'template_redirect', [ self::class, 'pas_de_front' ], 20 );
	}

	/** Aucune réponse de ce WordPress n'est indexable, API comprise. */
	public static function entete_noindex(): void {
		if ( ! headers_sent() ) {
			header( 'X-Robots-Tag: noindex, nofollow', true );
		}
	}

	public static function robots(): string {
		return "User-agent: *\nDisallow: /\n";
	}

	/** Une page publique de WordPress n'existe pas : on renvoie vers le vrai site. */
	public static function pas_de_front(): void {
		if ( is_admin() || is_robots() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}
		wp_redirect( SitePublic::url(), 302, 'Pose Parquet administration' ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect -- adresse réglée par l'administrateur, hors domaine par nature.
		exit;
	}
}
