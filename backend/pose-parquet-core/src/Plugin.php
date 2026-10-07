<?php
/**
 * Point d'assemblage du plugin.
 *
 * Une seule responsabilité : brancher les modules sur les hooks WordPress dans
 * le bon ordre. Aucune logique métier ici — si une méthode de cette classe
 * dépasse dix lignes, c'est qu'elle est au mauvais endroit.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core;

use PoseParquet\Core\Admin\Actions;
use PoseParquet\Core\Admin\Menu;
use PoseParquet\Core\Admin\Settings;
use PoseParquet\Core\Admin\SitePublic;
use PoseParquet\Core\Admin\Socle;
use PoseParquet\Core\Catalogue\Ecran as CatalogueEcran;
use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Mail\Queue;
use PoseParquet\Core\Rest\Cors;
use PoseParquet\Core\Rest\Routes;
use PoseParquet\Core\Security\Capabilities;
use PoseParquet\Core\Security\Hardening;
use PoseParquet\Core\Contenus\Types;
use PoseParquet\Core\Contenus\Edition;
use PoseParquet\Core\Contenus\Listes;
use PoseParquet\Core\Contenus\Apercu;
use PoseParquet\Core\Site\MonSite;
use PoseParquet\Core\Maintenance\Page as MaintenancePage;
use PoseParquet\Core\Maintenance\Reglages as MaintenanceReglages;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Plugin {

	/**
	 * Démarre le plugin. Appelé une fois, sur `plugins_loaded`.
	 */
	public static function boot(): void {
		/*
		 * La base peut être en retard sur le code : mise à jour du plugin par
		 * copie de fichiers, sans passer par l'écran d'activation. On vérifie à
		 * chaque chargement — l'opération se réduit à une comparaison d'entiers
		 * quand tout est à jour.
		 */
		Installer::maybe_upgrade();

		/*
		 * Droits et rôle : posés une fois, pas à chaque requête.
		 *
		 * Ils l'étaient auparavant à chaque chargement, au nom de
		 * l'auto-réparation. Le prix était caché et réel : un administrateur qui
		 * retirait volontairement `pp_manage_projects` au rôle gestionnaire le
		 * voyait revenir à la requête suivante, sans message ni trace. Une
		 * décision d'administration ne doit pas être défaite par le code qu'elle
		 * administre. La pose est donc versionnée, comme le schéma de base : elle
		 * ne rejoue qu'à l'activation, à la migration, ou quand le plancher de
		 * droits change dans le code.
		 *
		 * L'auto-réparation n'est pas perdue, elle devient explicite : la page
		 * « État » montre chaque droit manquant et propose de les réappliquer.
		 */
		Capabilities::ensure_once();

		// Ce que WordPress expose de lui-même et dont ce site n'a pas l'usage.
		Hardening::register();

		add_action( 'rest_api_init', [ Routes::class, 'register' ] );
		// Liste fermée d'origines pour notre espace REST, à la place du CORS permissif de WordPress.
		Cors::register();

		/*
		 * La file des notifications, branchée sur toutes les requêtes.
		 *
		 * Pas seulement en administration : c'est wp-cron.php qui déclenchera
		 * le hook, et wp-cron.php n'est ni un écran d'admin ni une route REST.
		 * Le coût d'un `add_action` sur une requête publique est nul tant que
		 * l'événement ne se produit pas.
		 */
		Queue::register();

		// Contenus éditoriaux : types déclarés partout (l'export REST en a besoin),
		// écrans seulement dans l'administration.
		Types::register();
		// Maintenance : la page publique (503) se décide côté site, jamais dans
		// l'administration, la connexion, l'API ou le cron.
		MaintenancePage::register();

		if ( is_admin() ) {
			// Le socle commun (référence : Expert Parquet) : barre latérale, composants.
			Socle::register();
			Menu::register();
			Edition::register();
			Listes::register();
			MaintenanceReglages::register();
			Settings::register();
			SitePublic::register();
			CatalogueEcran::register();
			MonSite::register();
			// Publier le site : workflow fermé, local (Node) ou GitHub (CI).
			\PoseParquet\Core\Publication\Publication::register();
			// Aperçu public, duplication comme brouillon.
			Apercu::register();
			/*
			 * Les poignées d'écriture se branchent sur `admin_post_*`, qui passe
			 * par admin-post.php — donc dans le contexte admin, mais AVANT que
			 * `is_admin()` ne soit vrai pour une page d'écran. admin-post.php
			 * définit WP_ADMIN, la condition tient.
			 */
			Actions::register();
		}
	}

	/**
	 * Désactivation : rien de destructif.
	 *
	 * Ni tables, ni options, ni droits ne sont retirés. Un site qui désactive le
	 * plugin pour diagnostiquer un conflit doit le retrouver intact en le
	 * réactivant. Voir uninstall.php pour la suppression, elle aussi prudente.
	 *
	 * Une seule chose est retirée, et elle n'est pas de la donnée : les
	 * événements planifiés. Plus personne n'écoute leur hook une fois le
	 * plugin désactivé ; les laisser encombrerait le cron du site d'entrées
	 * qui n'enverraient rien. Les états `pending` en base, eux, restent — ils
	 * disent la vérité, et une réactivation les reprendra.
	 */
	public static function deactivate(): void {
		Queue::purger();
	}
}
