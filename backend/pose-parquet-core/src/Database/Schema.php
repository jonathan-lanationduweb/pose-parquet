<?php
/**
 * Schéma des tables métier — la seule description de la structure des données.
 *
 * Trois tables, toutes préfixées par le préfixe WordPress du site (`$wpdb->prefix`,
 * jamais `wp_` en dur) :
 *
 *   pp_projects          une demande de projet, telle que remplie par le visiteur
 *   pp_project_history   chaque changement de statut d'une demande
 *   pp_project_notes     les notes internes de l'équipe sur une demande
 *
 * Les demandes NE sont PAS des articles WordPress. Un CPT aurait imposé
 * wp_posts + wp_postmeta pour des données tabulaires simples : requêtes de
 * filtrage lourdes, export pénible, aucune contrainte de type. Une table par
 * concept, des colonnes typées, des index sur ce qu'on filtre.
 *
 * Le SQL est écrit pour dbDelta(), qui compare le schéma déclaré à la table
 * existante et applique la différence — c'est ce qui rend l'activation
 * idempotente et les évolutions de schéma possibles sans migration manuelle.
 * dbDelta est pointilleux sur la forme : deux espaces entre le nom et le type
 * sont interdits, chaque champ sur sa ligne, `KEY` et non `INDEX`.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Database;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Schema {

	/**
	 * Noms logiques → nom complet de table. Toujours passer par ici.
	 *
	 * @return array<string,string>
	 */
	public static function tables(): array {
		global $wpdb;
		return [
			'projects' => $wpdb->prefix . 'pp_projects',
			'history'  => $wpdb->prefix . 'pp_project_history',
			'notes'    => $wpdb->prefix . 'pp_project_notes',
		];
	}

	/** Nom complet d'une table à partir de son nom logique. */
	public static function table( string $name ): string {
		$tables = self::tables();
		if ( ! isset( $tables[ $name ] ) ) {
			throw new \InvalidArgumentException( sprintf( 'Table inconnue : %s', $name ) );
		}
		return $tables[ $name ];
	}

	/**
	 * Instructions CREATE TABLE au format dbDelta, une par table.
	 *
	 * @return string[]
	 */
	public static function statements(): array {
		global $wpdb;
		$t       = self::tables();
		$charset = $wpdb->get_charset_collate();

		/*
		 * pp_projects.
		 *
		 * `reference` : identifiant lisible PP-AAAA-NNNNNN dérivé de `id` (voir
		 * Projects\Reference) ; unique, c'est ce que le client et l'équipe se
		 * communiquent. Nullable parce qu'il n'existe qu'après l'insertion — la
		 * ligne est insérée, l'id connu, la référence posée, le tout dans une
		 * transaction : aucune ligne validée n'a de référence NULL (schéma 2).
		 * `status` : voir Projects\Status. `surface` en m² avec deux décimales.
		 * `style` : ambiance choisie dans le formulaire (schéma 2).
		 * `visualizer_config` : JSON tel que produit par le Visualiseur, stocké
		 * tel quel et jamais interprété par le plugin — le rendu reste côté front.
		 *
		 * Les champs de projet sont des VARCHAR courts et non des ENUM SQL : les
		 * valeurs possibles sont des listes éditoriales du front (types de pièce,
		 * de support…) qui évolueront sans qu'on veuille modifier une table.
		 */
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
  utm_source varchar(100) NOT NULL DEFAULT '',
  utm_medium varchar(100) NOT NULL DEFAULT '',
  utm_campaign varchar(100) NOT NULL DEFAULT '',
  consent_at datetime DEFAULT NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY reference (reference),
  KEY status (status),
  KEY created_at (created_at),
  KEY email (email),
  KEY department (department)
) $charset;";

		/*
		 * pp_project_history : un enregistrement par transition de statut.
		 * `user_id` 0 = action automatique (création par le formulaire, robot).
		 * `old_status` NULL à la création. `comment` libre et facultatif.
		 */
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

		/*
		 * pp_project_notes : notes internes, jamais visibles du client.
		 */
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

	/**
	 * Les tables existent-elles réellement ? Nom logique → booléen.
	 *
	 * Interroge information_schema plutôt que SHOW TABLES LIKE : pas de motif à
	 * échapper, et le nom est comparé exactement.
	 *
	 * @return array<string,bool>
	 */
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
