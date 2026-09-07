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
				/*
				 * Carnet du front, nettoyé par le validateur avant d arriver ici.
				 * Le serveur n en impose pas la forme, mais il n est plus vrai qu il
				 * ne le lit jamais : depuis les libellés d affichage, la fiche
				 * d administration y cherche `nomScene` et `nom` pour nommer la
				 * scène et le parquet. Deux clés connues dans un carnet libre.
				 */
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

	/* ================================================================== */
	/* Liste d'administration : filtre, recherche, pagination             */
	/* ================================================================== */

	/** Colonnes lues par la liste. `SELECT *` y ramènerait le message et le JSON du Visualiseur pour rien. */
	private const LIST_COLUMNS = 'id, reference, status, first_name, last_name, email, phone, city, department,'
		. ' room_type, surface, internal_mail_status, visitor_mail_status, created_at';

	/**
	 * Construit le WHERE commun à `search()` et `count_search()`.
	 *
	 * Une seule fonction pour les deux, sinon le compte total finit par ne plus
	 * décrire la page affichée — et une pagination qui ment est pire qu'absente.
	 *
	 * La recherche est un LIKE sur sept colonnes. C'est assumé pour cette
	 * version : `reference`, `email` et `department` sont indexés, les trois
	 * autres ne le sont pas, et un LIKE `%terme%` ne peut de toute façon pas
	 * utiliser un index B-tree. Mesuré sur mille lignes, la requête reste sous
	 * la milliseconde ; le jour où le volume l'exigera, ce sera un index
	 * FULLTEXT sur nom/email, pas un index par colonne posé à l'aveugle.
	 *
	 * @param array{status?:string,search?:string} $args
	 * @return array{0:string,1:array<int,mixed>} clause (sans le mot WHERE) et paramètres
	 */
	private function where( array $args ): array {
		$clauses = [];
		$params  = [];

		$status = (string) ( $args['status'] ?? '' );
		if ( $status !== '' && Status::is_valid( $status ) ) {
			$clauses[] = 'status = %s';
			$params[]  = $status;
		}

		$search = trim( (string) ( $args['search'] ?? '' ) );
		if ( $search !== '' ) {
			global $wpdb;
			// Borné : au-delà, c'est un collage accidentel, pas une recherche.
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

	/** Longueur maximale d'un terme de recherche, en caractères. */
	public const SEARCH_MAX = 100;

	/** Demandes par page de la liste d'administration. */
	public const PER_PAGE = 20;

	/**
	 * Une page de demandes, la plus récente d'abord.
	 *
	 * `created_at DESC, id DESC` : la date seule ne suffit pas à ordonner deux
	 * demandes arrivées dans la même seconde, et une pagination dont l'ordre
	 * n'est pas total répète ou saute des lignes entre deux pages.
	 *
	 * @param array{status?:string,search?:string,page?:int,per_page?:int} $args
	 * @return array<int,array<string,mixed>>
	 */
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

		$rows = $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return $rows ?: [];
	}

	/**
	 * Nombre de demandes répondant aux mêmes critères que `search()`.
	 *
	 * @param array{status?:string,search?:string} $args
	 */
	public function count_search( array $args = [] ): int {
		global $wpdb;

		[ $where, $params ] = $this->where( $args );
		$table              = Schema::table( 'projects' );
		$sql                = "SELECT COUNT(*) FROM {$table}" . ( $where ? " WHERE {$where}" : '' );

		if ( ! $params ) {
			return (int) $wpdb->get_var( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		}

		return (int) $wpdb->get_var( $wpdb->prepare( $sql, $params ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	/**
	 * Nombre de demandes par statut, y compris les statuts à zéro.
	 *
	 * Un GROUP BY, pas sept COUNT : la liste d'administration affiche les sept
	 * onglets à chaque affichage. La recherche courante est appliquée pour que
	 * les compteurs décrivent ce que les onglets vont réellement montrer.
	 *
	 * @param array{search?:string} $args
	 * @return array<string,int> statut → nombre, plus la clé `all`
	 */
	public function counts_by_status( array $args = [] ): array {
		global $wpdb;

		// Le statut ne filtre pas les compteurs de statut : ce serait circulaire.
		unset( $args['status'] );
		[ $where, $params ] = $this->where( $args );
		$table              = Schema::table( 'projects' );
		$sql                = "SELECT status, COUNT(*) AS n FROM {$table}"
			. ( $where ? " WHERE {$where}" : '' ) . ' GROUP BY status';

		$rows = $params
			? $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A ) // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			: $wpdb->get_results( $sql, ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

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

	/**
	 * Change le statut — à condition qu'il soit encore celui qu'on croit.
	 *
	 * C'est toute la protection contre l'écrasement concurrent, et elle tient
	 * dans le WHERE : `WHERE id = ? AND status = ?`. Deux gestionnaires ouvrent
	 * la même fiche, le premier passe la demande à `contacted`, le second
	 * envoie encore `new → lost` depuis sa page périmée — sa condition ne
	 * s'applique plus à aucune ligne, l'UPDATE ne touche rien, et il reçoit un
	 * refus au lieu d'écraser silencieusement le travail du premier. Aucun
	 * numéro de version, aucune colonne de plus : la valeur attendue EST le
	 * jeton d'optimisme, et le SGBD arbitre.
	 *
	 * @return bool vrai si une ligne a bougé
	 */
	public function update_status_if( int $id, string $expected_old, string $new_status, string $now ): bool {
		global $wpdb;

		$table   = Schema::table( 'projects' );
		$updated = $wpdb->query( $wpdb->prepare(
			"UPDATE {$table} SET status = %s, updated_at = %s WHERE id = %d AND status = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$new_status,
			$now,
			$id,
			$expected_old
		) );

		return $updated === 1;
	}

	/* ---- Notes internes ---- */

	/**
	 * Ajoute une note. Le contenu arrive déjà nettoyé et borné (voir Notes).
	 *
	 * @return int identifiant créé, 0 en cas d'échec
	 */
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

	/**
	 * Notes d'une demande, la plus récente d'abord.
	 *
	 * L'ordre est l'inverse de celui de l'historique, et c'est voulu :
	 * l'historique est le récit de la vie de la demande, qui se lit du début ;
	 * les notes sont un carnet de travail, où ce qui compte est la dernière.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public function notes_of( int $project_id ): array {
		global $wpdb;

		$table = Schema::table( 'notes' );
		$rows  = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE project_id = %d ORDER BY id DESC", $project_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		return $rows ?: [];
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
