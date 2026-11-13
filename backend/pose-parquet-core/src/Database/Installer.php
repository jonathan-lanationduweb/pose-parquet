<?php



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


	public static function activate(): void {
		self::install();
	}



	public static function maybe_upgrade(): void {
		if ( self::installed_version() >= POSE_PARQUET_DB_VERSION ) {
			return;
		}
		self::install();
	}


	public static function installed_version(): int {
		return (int) get_option( self::OPTION_DB_VERSION, 0 );
	}



	public static function install(): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$from = self::installed_version();

		foreach ( Schema::statements() as $sql ) {
			dbDelta( $sql );
		}

		self::migrate( $from, POSE_PARQUET_DB_VERSION );

		$manquantes = array_keys( array_filter( Schema::status(), static fn( bool $ok ): bool => ! $ok ) );
		if ( $manquantes ) {


			Logger::error( 'Tables absentes après installation', [ 'tables' => $manquantes ] );
			return;
		}



		Capabilities::apply();

		update_option( self::OPTION_DB_VERSION, POSE_PARQUET_DB_VERSION, true );
		if ( ! get_option( self::OPTION_INSTALLED_AT ) ) {
			add_option( self::OPTION_INSTALLED_AT, current_time( 'mysql', true ), '', true );
		}
	}



	private static function migrate( int $from, int $to ): void {
		for ( $version = $from + 1; $version <= $to; $version++ ) {
			switch ( $version ) {
				case 1:

					break;
				case 2:


					global $wpdb;
					$table = Schema::table( 'projects' );
					$wpdb->query( "ALTER TABLE {$table} MODIFY reference varchar(20) DEFAULT NULL" );
					break;
				case 3:


					break;
				default:
					Logger::error( 'Version de schéma sans migration', [ 'version' => $version ] );
			}
		}
	}
}
