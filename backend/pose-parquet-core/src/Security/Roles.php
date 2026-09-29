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

	/**
	 * Libellé du rôle, stocké tel quel — volontairement sans `__()`.
	 *
	 * Un nom de rôle vit en base, écrit une fois à la création : le traduire au
	 * moment de l'écriture figerait la langue de l'installation dans la table
	 * des options, et surtout obligeait à charger le domaine de traduction sur
	 * `plugins_loaded`, c'est-à-dire avant `init`. WordPress 6.7 le signale
	 * désormais par un `_load_textdomain_just_in_time` — cinq de ces notices
	 * figuraient au journal local, toutes dues à cette seule ligne.
	 *
	 * L'usage de WordPress est de stocker le libellé brut et de le traduire à
	 * l'affichage, par `translate_user_role()` : c'est ce que fait le cœur pour
	 * « Administrator » ou « Subscriber », et les écrans d'administration
	 * appliquent déjà cette fonction aux rôles personnalisés.
	 *
	 * Conséquence assumée : ce libellé s'affiche en français quelle que soit la
	 * langue de l'administration. Le site est francophone, son unique rôle
	 * métier porte un nom français, et personne n'a demandé autre chose. Le jour
	 * où ce serait le cas, la traduction se branchera sur le filtre
	 * `translate_user_role` — c'est-à-dire à l'affichage, jamais à l'écriture.
	 */
	public const MANAGER_LABEL = 'Gestionnaire Pose Parquet';

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
	 * Idempotent, mais plus appelé à chaque chargement : la pose passe par
	 * `Capabilities::ensure_once()`, qui ne rejoue qu'à l'activation, à la
	 * migration, ou sur réparation explicite depuis la page « État ». On n'écrit
	 * que ce qui manque.
	 *
	 * Ce qu'on ne fait PAS : retirer un droit qu'un administrateur aurait
	 * volontairement ajouté à ce rôle. Le plugin garantit un plancher, il
	 * n'impose pas un plafond.
	 */
	public static function ensure(): void {
		$role = get_role( self::MANAGER );

		if ( ! $role ) {
			add_role( self::MANAGER, self::MANAGER_LABEL, self::manager_caps() );

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
