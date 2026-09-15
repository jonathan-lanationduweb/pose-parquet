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
use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Rest\Cors;
use PoseParquet\Core\Rest\Routes;
use PoseParquet\Core\Security\Capabilities;
use PoseParquet\Core\Security\Hardening;

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

		if ( is_admin() ) {
			Menu::register();
			Settings::register();
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
	 */
	public static function deactivate(): void {
		// Volontairement vide, et documenté comme tel.
	}
}
