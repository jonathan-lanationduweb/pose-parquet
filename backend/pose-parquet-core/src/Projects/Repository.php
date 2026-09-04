<?php
/**
 * Accès aux tables pp_projects et pp_project_history.
 *
 * Seule classe du plugin qui écrit dans ces tables. Elle reçoit des données
 * DÉJÀ validées et normalisées (Validator) et ne re-valide rien : son travail
 * est le SQL — préparé, sur des noms de tables issus de Schema, jamais d'une
 * entrée. Elle expose aussi les trois verbes de transaction pour que Service
 * puisse rendre atomiques l'insertion, la référence et l'historique.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Projects;

use PoseParquet\Core\Database\Schema;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Repository {

	/**
	 * Insère la demande, sans référence (NULL) : Service la pose juste après,
	 * une fois l'identifiant connu.
	 *
	 * @param array<string,mixed> $data       sortie de Validator::validate()['data']
	 * @param string              $consent_at datetime serveur, format MySQL
	 * @param string              $now        datetime serveur, format MySQL
	 * @return int identifiant créé, 0 en cas d'échec
	 */
	public function insert_project( array $data, string $consent_at, string $now ): int {
		global $wpdb;

		$row     = [
			'reference'  => null,
			'status'     => Status::DEFAULT,
			'consent_at' => $consent_at,
			'created_at' => $now,
			'updated_at' => $now,
		];
		$formats = [ null, '%s', '%s', '%s', '%s' ];

		foreach ( Fields::COLUMNS as $api => $column ) {
			if ( ! array_key_exists( $api, $data ) ) {
				continue;
			}
			$row[ $column ] = $data[ $api ];
			$formats[]      = $api === 'surface' ? '%d' : '%s';
		}

		if ( isset( $data['visualizer'] ) ) {
			$v = $data['visualizer'];
			foreach ( [ 'sceneId' => 'scene_id', 'productId' => 'product_id', 'pattern' => 'pattern' ] as $k => $column ) {
				if ( isset( $v[ $k ] ) ) {
					$row[ $column ] = $v[ $k ];
					$formats[]      = '%s';
				}
			}
			if ( isset( $v['orientation'] ) ) {
				$row['orientation'] = $v['orientation'];
				$formats[]          = '%d';
			}
			if ( isset( $v['config'] ) ) {
				// Stocké tel quel, jamais lu par le serveur : c'est un carnet, pas une commande.
				$row['visualizer_config'] = wp_json_encode( $v['config'] );
				$formats[]                = '%s';
			}
		}

		$ok = $wpdb->insert( Schema::table( 'projects' ), $row, $formats );

		return $ok ? (int) $wpdb->insert_id : 0;
	}

	public function set_reference( int $id, string $reference ): bool {
		global $wpdb;

		$updated = $wpdb->update(
			Schema::table( 'projects' ),
			[ 'reference' => $reference ],
			[ 'id' => $id ],
			[ '%s' ],
			[ '%d' ]
		);

		return $updated === 1;
	}

	/**
	 * Événement d'historique. old_status NULL marque la création ; user_id 0
	 * marque une action sans utilisateur connecté (le formulaire public).
	 */
	public function insert_history( int $project_id, ?string $old_status, string $new_status, int $user_id, string $now, string $comment = '' ): bool {
		global $wpdb;

		$ok = $wpdb->insert(
			Schema::table( 'history' ),
			[
				'project_id' => $project_id,
				'old_status' => $old_status,
				'new_status' => $new_status,
				'user_id'    => $user_id,
				'comment'    => $comment,
				'created_at' => $now,
			],
			[ '%d', $old_status === null ? null : '%s', '%s', '%d', '%s', '%s' ]
		);

		return (bool) $ok;
	}

	/**
	 * État d'un email de la demande (`internal` ou `visitor`) : un mot et une date, jamais un contenu.
	 */
	public function set_mail_status( int $id, string $type, string $status, ?string $sent_at ): bool {
		global $wpdb;

		if ( ! in_array( $type, [ 'internal', 'visitor' ], true ) ) {
			return false;
		}
		$updated = $wpdb->update(
			Schema::table( 'projects' ),
			[ $type . '_mail_status' => $status, $type . '_mail_sent_at' => $sent_at ],
			[ 'id' => $id ],
			[ '%s', $sent_at === null ? null : '%s' ],
			[ '%d' ]
		);

		return $updated !== false;
	}

	/** @return array<string,mixed>|null ligne brute de pp_projects */
	public function find_by_id( int $id ): ?array {
		global $wpdb;

		$table = Schema::table( 'projects' );
		$row   = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		return $row ?: null;
	}

	/** @return array<string,mixed>|null */
	public function find_by_reference( string $reference ): ?array {
		global $wpdb;

		$table = Schema::table( 'projects' );
		$row   = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE reference = %s", $reference ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		return $row ?: null;
	}

	/** @return array<int,array<string,mixed>> événements, du plus ancien au plus récent */
	public function history_of( int $project_id ): array {
		global $wpdb;

		$table = Schema::table( 'history' );
		$rows  = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE project_id = %d ORDER BY id ASC", $project_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		return $rows ?: [];
	}

	public function count(): int {
		global $wpdb;

		$table = Schema::table( 'projects' );

		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}

	/* ---- Transaction : InnoDB requis, sinon les verbes sont sans effet et Service le sait. ---- */

	public function begin(): bool {
		global $wpdb;
		return $wpdb->query( 'START TRANSACTION' ) !== false;
	}

	public function commit(): bool {
		global $wpdb;
		return $wpdb->query( 'COMMIT' ) !== false;
	}

	public function rollback(): void {
		global $wpdb;
		$wpdb->query( 'ROLLBACK' );
	}

	/** Vrai si pp_projects est en InnoDB (donc transactionnelle). Mémorisé par requête. */
	public function supports_transactions(): bool {
		static $supports = null;
		if ( $supports !== null ) {
			return $supports;
		}
		global $wpdb;
		$engine   = $wpdb->get_var( $wpdb->prepare(
			'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s',
			Schema::table( 'projects' )
		) );
		$supports = is_string( $engine ) && strtolower( $engine ) === 'innodb';

		return $supports;
	}
}
