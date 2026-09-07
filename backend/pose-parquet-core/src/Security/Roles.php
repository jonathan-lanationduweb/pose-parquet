<?php
/**
 * Rôle « Gestionnaire Pose Parquet ».
 *
 * Un rôle pour la personne qui traite les demandes et rien d'autre : elle lit
 * la liste, ouvre une fiche, change un statut, écrit une note. Elle ne règle
 * pas le plugin, ne publie pas, ne touche pas aux extensions ni aux
 * utilisateurs.
 *
 * Trois capabilities seulement :
 *
 *   read                 exigée par WordPress pour entrer dans /wp-admin
 *   pp_view_projects     lire les demandes
 *   pp_manage_projects   changer un statut, écrire une note
 *
 * `read` n'est pas un droit du plugin, c'est le laissez-passer minimal de
 * l'administration : sans elle, l'utilisateur est renvoyé vers le site public
 * et ne voit jamais le menu. Elle ne donne accès à rien d'autre — un rôle qui
 * n'a que `read` voit son profil, et c'est tout.
 *
 * PAS de `pp_manage_settings` : les réglages touchent l'adresse de réception
 * des demandes, donc l'acheminement des emails. Cela reste administrateur.
 *
 * Rien n'est retiré aux administrateurs WordPress : ils gardent leur menu
 * complet. La simplicité de l'administration vue par un gestionnaire vient de
 * ce qu'il ne possède pas de droits, pas de ce qu'on lui cache des écrans.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Security;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Roles {

	public const MANAGER = 'pose_parquet_manager';

	/** @return array<string,bool> capabilities du rôle gestionnaire */
	public static function manager_caps(): array {
		return [
			'read'                          => true,
			Capabilities::VIEW_PROJECTS     => true,
			Capabilities::MANAGE_PROJECTS   => true,
		];
	}

	/**
	 * Crée le rôle s'il manque, et complète ses droits s'il existe déjà.
	 *
	 * Idempotent, et appelé à chaque chargement comme `Capabilities::ensure()` :
	 * les rôles vivent en base, un plugin de gestion de rôles ou une
	 * restauration peut les avoir amputés. On n'écrit que ce qui manque.
	 *
	 * Ce qu'on ne fait PAS : retirer un droit qu'un administrateur aurait
	 * volontairement ajouté à ce rôle. Le plugin garantit un plancher, il
	 * n'impose pas un plafond.
	 */
	public static function ensure(): void {
		$role = get_role( self::MANAGER );

		if ( ! $role ) {
			add_role(
				self::MANAGER,
				__( 'Gestionnaire Pose Parquet', 'pose-parquet-core' ),
				self::manager_caps()
			);

			return;
		}

		foreach ( array_keys( self::manager_caps() ) as $cap ) {
			if ( ! $role->has_cap( $cap ) ) {
				$role->add_cap( $cap );
			}
		}
	}

	/**
	 * Retire le rôle. Utilisé par uninstall.php uniquement.
	 *
	 * Les utilisateurs qui le portaient se retrouvent sans rôle sur ce site :
	 * c'est le comportement de WordPress, et c'est préférable à un rôle
	 * fantôme qui référence des capabilities disparues.
	 */
	public static function remove(): void {
		if ( get_role( self::MANAGER ) ) {
			remove_role( self::MANAGER );
		}
	}
}
