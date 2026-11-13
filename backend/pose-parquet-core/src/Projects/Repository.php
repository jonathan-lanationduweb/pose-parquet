<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

use PoseParquet\Core\Database\Schema;
use PoseParquet\Core\Mail\Notifier;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Repository {



	public function insert_project( array $data, ?string $consent_at, string $now ): int {
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



		if ( isset( $data['leadDestination'] ) ) {
			$row['lead_destination_auto'] = $data['leadDestination'];
			$formats[]                    = '%s';
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


	public function find_by_id( int $id ): ?array {
		global $wpdb;

		$table = Schema::table( 'projects' );
		$row   = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), ARRAY_A );

		return $row ?: null;
	}


	public function find_by_reference( string $reference ): ?array {
		global $wpdb;

		$table = Schema::table( 'projects' );
		$row   = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE reference = %s", $reference ), ARRAY_A );

		return $row ?: null;
	}


	public function history_of( int $project_id ): array {
		global $wpdb;

		$table = Schema::table( 'history' );
		$rows  = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE project_id = %d ORDER BY id ASC", $project_id ), ARRAY_A );

		return $rows ?: [];
	}

	public function count(): int {
		global $wpdb;

		$table = Schema::table( 'projects' );

		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
	}






	private const LIST_COLUMNS = 'id, reference, status, first_name, last_name, email, phone, city, department,'
		. ' room_type, surface, internal_mail_status, visitor_mail_status, created_at,'



		. ' lead_source, lead_need, lead_destination, lead_destination_auto, region,'

		. ' product_id';



	private function where( array $args ): array {
		$clauses = [];
		$params  = [];

		$status = (string) ( $args['status'] ?? '' );
		if ( $status !== '' && Status::is_valid( $status ) ) {
			$clauses[] = 'status = %s';
			$params[]  = $status;
		}



		$mail = (string) ( $args['mail'] ?? '' );
		if ( in_array( $mail, [ Notifier::STATUS_FAILED, Notifier::STATUS_PENDING ], true ) ) {
			$clauses[] = '(internal_mail_status = %s OR visitor_mail_status = %s)';
			$params[]  = $mail;
			$params[]  = $mail;
		}



		$destination = (string) ( $args['destination'] ?? '' );
		if ( in_array( $destination, Fields::enum( 'leadDestination' ), true ) ) {
			$clauses[] = 'lead_destination = %s';
			$params[]  = $destination;
		}

		$search = trim( (string) ( $args['search'] ?? '' ) );
		if ( $search !== '' ) {
			global $wpdb;

			$search = mb_substr( $search, 0, self::SEARCH_MAX );
			$like   = '%' . $wpdb->esc_like( $search ) . '%';
			$champs = [ 'reference', 'first_name', 'last_name', 'email', 'phone', 'city', 'department' ];
			$ou     = [];
			foreach ( $champs as $champ ) {
				$ou[]     = $champ . ' LIKE %s';
				$params[] = $like;
			}
			$clauses[] = '(' . implode( ' OR ', $ou ) . ')';
		}

		return [ $clauses ? implode( ' AND ', $clauses ) : '', $params ];
	}


	public const SEARCH_MAX = 100;


	public const PER_PAGE = 20;



	public function search( array $args = [] ): array {
		global $wpdb;

		$per_page = max( 1, min( 200, (int) ( $args['per_page'] ?? self::PER_PAGE ) ) );
		$page     = max( 1, (int) ( $args['page'] ?? 1 ) );
		$offset   = ( $page - 1 ) * $per_page;

		[ $where, $params ] = $this->where( $args );
		$table              = Schema::table( 'projects' );
		$colonnes           = self::LIST_COLUMNS;

		$sql      = "SELECT {$colonnes} FROM {$table}"
			. ( $where ? " WHERE {$where}" : '' )
			. ' ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d';
		$params[] = $per_page;
		$params[] = $offset;

		$rows = $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A );

		return $rows ?: [];
	}



	public function count_search( array $args = [] ): int {
		global $wpdb;

		[ $where, $params ] = $this->where( $args );
		$table              = Schema::table( 'projects' );
		$sql                = "SELECT COUNT(*) FROM {$table}" . ( $where ? " WHERE {$where}" : '' );

		if ( ! $params ) {
			return (int) $wpdb->get_var( $sql );
		}

		return (int) $wpdb->get_var( $wpdb->prepare( $sql, $params ) );
	}



	public function counts_by_status( array $args = [] ): array {
		global $wpdb;


		unset( $args['status'] );
		[ $where, $params ] = $this->where( $args );
		$table              = Schema::table( 'projects' );
		$sql                = "SELECT status, COUNT(*) AS n FROM {$table}"
			. ( $where ? " WHERE {$where}" : '' ) . ' GROUP BY status';

		$rows = $params
			? $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A )
			: $wpdb->get_results( $sql, ARRAY_A );

		$counts = array_fill_keys( Status::all(), 0 );
		$total  = 0;
		foreach ( $rows ?: [] as $row ) {
			$statut = (string) $row['status'];
			$n      = (int) $row['n'];
			$total += $n;
			if ( array_key_exists( $statut, $counts ) ) {
				$counts[ $statut ] = $n;
			}
		}
		$counts['all'] = $total;

		return $counts;
	}



	public function counts_by_mail_status(): array {
		global $wpdb;

		$table  = Schema::table( 'projects' );
		$counts = [
			Notifier::TYPE_INTERNAL => [],
			Notifier::TYPE_VISITOR  => [],
		];

		foreach ( [ Notifier::TYPE_INTERNAL => 'internal_mail_status', Notifier::TYPE_VISITOR => 'visitor_mail_status' ] as $type => $colonne ) {

			$rows = $wpdb->get_results( "SELECT {$colonne} AS s, COUNT(*) AS n FROM {$table} GROUP BY {$colonne}", ARRAY_A );
			foreach ( $rows ?: [] as $row ) {
				$counts[ $type ][ (string) $row['s'] ] = (int) $row['n'];
			}
		}

		return $counts;
	}



	public function update_destination( int $id, string $destination, string $now ): bool {
		global $wpdb;

		$table   = Schema::table( 'projects' );
		$updated = $wpdb->query( $wpdb->prepare(
			"UPDATE {$table} SET lead_destination = %s, updated_at = %s WHERE id = %d",
			$destination,
			$now,
			$id
		) );

		return $updated === 1;
	}



	public function update_status_if( int $id, string $expected_old, string $new_status, string $now ): bool {
		global $wpdb;

		$table   = Schema::table( 'projects' );
		$updated = $wpdb->query( $wpdb->prepare(
			"UPDATE {$table} SET status = %s, updated_at = %s WHERE id = %d AND status = %s",
			$new_status,
			$now,
			$id,
			$expected_old
		) );

		return $updated === 1;
	}





	public function insert_note( int $project_id, int $user_id, string $content, string $now ): int {
		global $wpdb;

		$ok = $wpdb->insert(
			Schema::table( 'notes' ),
			[
				'project_id' => $project_id,
				'user_id'    => $user_id,
				'content'    => $content,
				'created_at' => $now,
			],
			[ '%d', '%d', '%s', '%s' ]
		);

		return $ok ? (int) $wpdb->insert_id : 0;
	}



	public function notes_of( int $project_id ): array {
		global $wpdb;

		$table = Schema::table( 'notes' );
		$rows  = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE project_id = %d ORDER BY id DESC", $project_id ), ARRAY_A );

		return $rows ?: [];
	}



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
