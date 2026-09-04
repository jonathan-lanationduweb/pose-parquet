<?php
/**
 * Installation et évolution de la base.
 *
 * Deux entrées : `activate()` à l'activation du plugin, `maybe_upgrade()` à
 * chaque chargement. Les deux passent par le même `install()`, parce qu'une
 * activation n'est pas un événement unique : un plugin se réactive, se met à
 * jour par copie de fichiers, se déploie sur un site où il a déjà tourné.
 * `install()` est donc idempotent — dbDelta ne touche que ce qui diffère.
 *
 * Le numéro de schéma est un entier stocké dans une option. Quand le code
 * porte un numéro supérieur, on rejoue dbDelta (qui ajoute colonnes et index
 * manquants) puis, si un jour une évolution demande autre chose qu'un ajout —
 * renommer, transformer des données — elle s'écrit dans `migrate()` sous son
 * numéro. Il n'y en a aucune aujourd'hui, et la méthode le dit.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Database;

use PoseParquet\Core\Security\Capabilities;
use PoseParquet\Core\Support\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Installer {

	public const OPTION_DB_VERSION   = 'pose_parquet_db_version';
	public const OPTION_INSTALLED_AT = 'pose_parquet_installed_at';

	/** Activation du plugin : installation complète. */
	public static function activate(): void {
		self::install();
	}

	/**
	 * Au chargement : la base est-elle en retard sur le code ?
	 * Une comparaison d'entiers dans le cas courant, rien d'autre.
	 */
	public static function maybe_upgrade(): void {
		if ( self::installed_version() >= POSE_PARQUET_DB_VERSION ) {
			return;
		}
		self::install();
	}

	/** Numéro de schéma présent en base (0 = jamais installé). */
	public static function installed_version(): int {
		return (int) get_option( self::OPTION_DB_VERSION, 0 );
	}

	/**
	 * Crée ou met à niveau les tables, pose les droits, enregistre la version.
	 *
	 * dbDelta est chargé à la demande : upgrade.php n'est pas inclus par défaut
	 * hors de l'administration, et on peut arriver ici depuis une requête REST.
	 */
	public static function install(): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$from = self::installed_version();

		foreach ( Schema::statements() as $sql ) {
			dbDelta( $sql );
		}

		self::migrate( $from, POSE_PARQUET_DB_VERSION );

		$manquantes = array_keys( array_filter( Schema::status(), static fn( bool $ok ): bool => ! $ok ) );
		if ( $manquantes ) {
			// On n'enregistre pas une version que la base n'a pas atteinte : le
			// prochain chargement retentera, et la page d'état montrera le manque.
			Logger::error( 'Tables absentes après installation', [ 'tables' => $manquantes ] );
			return;
		}

		Capabilities::ensure();

		update_option( self::OPTION_DB_VERSION, POSE_PARQUET_DB_VERSION, true );
		if ( ! get_option( self::OPTION_INSTALLED_AT ) ) {
			add_option( self::OPTION_INSTALLED_AT, current_time( 'mysql', true ), '', true );
		}
	}

	/**
	 * Évolutions de schéma qui ne se réduisent pas à un dbDelta.
	 *
	 * Chaque étape porte le numéro de la version qu'elle amène, et s'exécute une
	 * seule fois, dans l'ordre. Version 1 : création initiale, tout est fait par
	 * dbDelta, il n'y a rien à transformer.
	 */
	private static function migrate( int $from, int $to ): void {
		for ( $version = $from + 1; $version <= $to; $version++ ) {
			switch ( $version ) {
				case 1:
					// Schéma initial : rien au-delà de dbDelta.
					break;
				default:
					Logger::error( 'Version de schéma sans migration', [ 'version' => $version ] );
			}
		}
	}
}
