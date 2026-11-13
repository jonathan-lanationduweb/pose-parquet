<?php



declare(strict_types=1);

namespace PoseParquet\Core\Database;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Schema {



	public static function tables(): array {
		global $wpdb;
		return [
			'projects' => $wpdb->prefix . 'pp_projects',
			'history'  => $wpdb->prefix . 'pp_project_history',
			'notes'    => $wpdb->prefix . 'pp_project_notes',
		];
	}


	public static function table( string $name ): string {
		$tables = self::tables();
		if ( ! isset( $tables[ $name ] ) ) {
			throw new \InvalidArgumentException( sprintf( 'Table inconnue : %s', $name ) );
		}
		return $tables[ $name ];
	}



	public static function statements(): array {
		global $wpdb;
		$t       = self::tables();
		$charset = $wpdb->get_charset_collate();



		$projects = "CREATE TABLE {$t['projects']} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  reference varchar(20) DEFAULT NULL,
  status varchar(20) NOT NULL DEFAULT 'new',
  first_name varchar(100) NOT NULL DEFAULT '',
  last_name varchar(100) NOT NULL DEFAULT '',
  email varchar(190) NOT NULL DEFAULT '',
  phone varchar(40) NOT NULL DEFAULT '',
  postal_code varchar(12) NOT NULL DEFAULT '',
  city varchar(120) NOT NULL DEFAULT '',
  department varchar(3) NOT NULL DEFAULT '',
  region varchar(80) NOT NULL DEFAULT '',
  housing_type varchar(40) NOT NULL DEFAULT '',
  room_type varchar(40) NOT NULL DEFAULT '',
  surface decimal(8,2) DEFAULT NULL,
  parquet_type varchar(40) NOT NULL DEFAULT '',
  support_type varchar(40) NOT NULL DEFAULT '',
  installation_type varchar(40) NOT NULL DEFAULT '',
  style varchar(40) NOT NULL DEFAULT '',
  timeframe varchar(40) NOT NULL DEFAULT '',
  message text,
  scene_id varchar(60) DEFAULT NULL,
  product_id varchar(60) DEFAULT NULL,
  pattern varchar(40) DEFAULT NULL,
  orientation smallint(6) DEFAULT NULL,
  visualizer_config longtext,
  source_url varchar(500) NOT NULL DEFAULT '',
  entry_page varchar(500) NOT NULL DEFAULT '',
  utm_source varchar(100) NOT NULL DEFAULT '',
  utm_medium varchar(100) NOT NULL DEFAULT '',
  utm_campaign varchar(100) NOT NULL DEFAULT '',
  utm_content varchar(100) NOT NULL DEFAULT '',
  utm_term varchar(100) NOT NULL DEFAULT '',
  lead_source varchar(40) NOT NULL DEFAULT '',
  lead_need varchar(40) NOT NULL DEFAULT '',
  lead_destination varchar(40) NOT NULL DEFAULT '',
  lead_destination_auto varchar(40) NOT NULL DEFAULT '',
  consent_at datetime DEFAULT NULL,
  internal_mail_status varchar(10) NOT NULL DEFAULT 'pending',
  internal_mail_sent_at datetime DEFAULT NULL,
  visitor_mail_status varchar(10) NOT NULL DEFAULT 'pending',
  visitor_mail_sent_at datetime DEFAULT NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY reference (reference),
  KEY status (status),
  KEY created_at (created_at),
  KEY email (email),
  KEY department (department),
  KEY lead_destination (lead_destination)
) $charset;";



		$history = "CREATE TABLE {$t['history']} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  project_id bigint(20) unsigned NOT NULL,
  old_status varchar(20) DEFAULT NULL,
  new_status varchar(20) NOT NULL,
  user_id bigint(20) unsigned NOT NULL DEFAULT 0,
  comment text,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY project_id (project_id),
  KEY created_at (created_at)
) $charset;";



		$notes = "CREATE TABLE {$t['notes']} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  project_id bigint(20) unsigned NOT NULL,
  user_id bigint(20) unsigned NOT NULL DEFAULT 0,
  content text NOT NULL,
  created_at datetime NOT NULL,
  updated_at datetime DEFAULT NULL,
  PRIMARY KEY  (id),
  KEY project_id (project_id)
) $charset;";

		return [ $projects, $history, $notes ];
	}



	public static function status(): array {
		global $wpdb;
		$out = [];
		foreach ( self::tables() as $logical => $table ) {
			$found = $wpdb->get_var(
				$wpdb->prepare(
					'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = %s',
					$table
				)
			);
			$out[ $logical ] = (int) $found === 1;
		}
		return $out;
	}
}
