<?php
/**
 * Droits du plugin.
 *
 * Trois capabilities, pas une de plus tant qu'aucun écran ne les distingue :
 *
 *   pp_view_projects     lire les demandes
 *   pp_manage_projects   changer un statut, écrire une note
 *   pp_manage_settings   régler le plugin
 *
 * Les administrateurs WordPress les reçoivent toutes. Un rôle « Gestionnaire
 * Pose Parquet » viendra plus tard avec les deux premières — la mécanique est
 * là (`grant()`), le rôle non, parce que personne n'en a encore l'usage.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Security;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Capabilities {

	public const VIEW_PROJECTS   = 'pp_view_projects';
	public const MANAGE_PROJECTS = 'pp_manage_projects';
	public const MANAGE_SETTINGS = 'pp_manage_settings';

	/** @return string[] */
	public static function all(): array {
		return [ self::VIEW_PROJECTS, self::MANAGE_PROJECTS, self::MANAGE_SETTINGS ];
	}

	/**
	 * Donne les trois droits au rôle administrateur s'il ne les a pas déjà.
	 *
	 * Appelé à l'installation ET à chaque chargement : les rôles sont stockés en
	 * base, et un plugin de gestion de rôles ou une restauration de site peut
	 * les avoir effacés. `add_cap` n'écrit rien si le droit est déjà présent.
	 */
	public static function ensure(): void {
		self::grant( 'administrator', self::all() );
	}

	/**
	 * @param string[] $caps
	 */
	public static function grant( string $role_name, array $caps ): void {
		$role = get_role( $role_name );
		if ( ! $role ) {
			return;
		}
		foreach ( $caps as $cap ) {
			if ( ! $role->has_cap( $cap ) ) {
				$role->add_cap( $cap );
			}
		}
	}

	/**
	 * Retire les droits de tous les rôles. Utilisé par uninstall.php uniquement.
	 */
	public static function remove_all(): void {
		$roles = wp_roles();
		foreach ( array_keys( $roles->roles ) as $role_name ) {
			$role = get_role( $role_name );
			if ( ! $role ) {
				continue;
			}
			foreach ( self::all() as $cap ) {
				if ( $role->has_cap( $cap ) ) {
					$role->remove_cap( $cap );
				}
			}
		}
	}
}
