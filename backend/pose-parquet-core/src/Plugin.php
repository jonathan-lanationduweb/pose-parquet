<?php



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



	public static function boot(): void {


		Installer::maybe_upgrade();



		Capabilities::ensure_once();


		Hardening::register();

		\PoseParquet\Core\Security\Environnement::register();

		add_action( 'rest_api_init', [ Routes::class, 'register' ] );

		Cors::register();



		Queue::register();

		\PoseParquet\Core\Partenaires\Surveillance::register();



		Types::register();


		MaintenancePage::register();

		if ( is_admin() ) {

			Socle::register();
			Menu::register();
			Edition::register();
			Listes::register();
			MaintenanceReglages::register();
			Settings::register();
			SitePublic::register();
			CatalogueEcran::register();
			MonSite::register();

			\PoseParquet\Core\Publication\Publication::register();

			Apercu::register();


			Actions::register();
		}
	}



	public static function deactivate(): void {
		Queue::purger();
		\PoseParquet\Core\Partenaires\Surveillance::deplanifier();
	}
}
