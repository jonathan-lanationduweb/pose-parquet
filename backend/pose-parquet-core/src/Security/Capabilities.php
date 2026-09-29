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

	/**
	 * Numéro du plancher de droits posé en base.
	 *
	 * À incrémenter quand une capability est ajoutée à `all()` ou à
	 * `Roles::manager_caps()` : c'est le signal qui autorise une nouvelle pose
	 * sur les installations déjà en service. Distinct de la version du plugin,
	 * qui bouge à chaque livraison alors que le plancher, lui, bouge rarement.
	 */
	public const VERSION        = 1;
	public const OPTION_VERSION = 'pose_parquet_caps_version';

	/** @return string[] */
	public static function all(): array {
		return [ self::VIEW_PROJECTS, self::MANAGE_PROJECTS, self::MANAGE_SETTINGS ];
	}

	/**
	 * Donne les trois droits au rôle administrateur s'il ne les a pas déjà.
	 */
	public static function ensure(): void {
		self::grant( 'administrator', self::all() );
	}

	/**
	 * Le plancher complet : droits de l'administrateur et rôle gestionnaire.
	 *
	 * Le point d'entrée unique de la pose — activation, migration, réparation
	 * manuelle depuis la page « État » passent tous par ici, pour qu'il n'existe
	 * qu'une définition de ce que « les droits sont en place » veut dire.
	 */
	public static function apply(): void {
		self::ensure();
		Roles::ensure();
		update_option( self::OPTION_VERSION, self::VERSION, true );
	}

	/**
	 * Pose les droits une seule fois, puis plus jamais tant que `VERSION` ne
	 * bouge pas.
	 *
	 * Le contraire — réécrire à chaque chargement — donnait une auto-réparation
	 * gratuite, mais rendait toute révocation d'administration impossible :
	 * retirer un droit au rôle gestionnaire ne tenait qu'une requête. Ce qui
	 * ressemblait à de la robustesse était en fait un refus d'obéir.
	 */
	public static function ensure_once(): void {
		if ( (int) get_option( self::OPTION_VERSION, 0 ) >= self::VERSION ) {
			return;
		}
		self::apply();
	}

	/**
	 * Les droits du plancher absents des rôles, pour la page « État ».
	 *
	 * Rend un tableau vide quand tout est en place. C'est ce que la page
	 * affiche à la place de la réécriture silencieuse d'avant : le manque est
	 * visible, et sa réparation est une décision, pas un effet de bord.
	 *
	 * @return array<string,string[]> rôle → droits manquants
	 */
	public static function missing(): array {
		$attendu = [
			'administrator' => self::all(),
			Roles::MANAGER  => array_keys( Roles::manager_caps() ),
		];

		$manques = [];
		foreach ( $attendu as $role_name => $caps ) {
			$role = get_role( $role_name );
			if ( ! $role ) {
				// Un rôle absent manque de tous ses droits, par définition.
				$manques[ $role_name ] = $caps;
				continue;
			}
			$absents = array_values( array_filter( $caps, static fn( string $cap ): bool => ! $role->has_cap( $cap ) ) );
			if ( $absents ) {
				$manques[ $role_name ] = $absents;
			}
		}

		return $manques;
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
