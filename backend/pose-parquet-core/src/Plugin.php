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

use PoseParquet\Core\Admin\Menu;
use PoseParquet\Core\Database\Installer;
use PoseParquet\Core\Rest\Routes;
use PoseParquet\Core\Security\Capabilities;

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

		// Les droits doivent exister avant que l'admin ou le REST ne les testent.
		Capabilities::ensure();

		add_action( 'rest_api_init', [ Routes::class, 'register' ] );

		if ( is_admin() ) {
			Menu::register();
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
