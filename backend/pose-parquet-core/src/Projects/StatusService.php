<?php
/**
 * Changement de statut d'une demande.
 *
 * Deux écritures qui n'ont de sens qu'ensemble : la ligne de `pp_projects`
 * change de statut, et `pp_project_history` reçoit l'événement. Une demande
 * dont le statut a bougé sans trace, ou une trace sans changement, sont deux
 * mensonges différents — d'où la transaction.
 *
 * L'appelant fournit le statut qu'il CROIT actuel. Le dépôt en fait la
 * condition de son UPDATE ; si la valeur a changé entre-temps, rien ne bouge
 * et l'appelant reçoit `stale`. Voir Repository::update_status_if().
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Projects;

use PoseParquet\Core\Support\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class StatusService {

	public const OK               = 'ok';
	public const UNCHANGED        = 'unchanged';
	public const STALE            = 'stale';
	public const INVALID          = 'invalid_status';
	public const NOT_FOUND        = 'not_found';
	public const WRITE_FAILED     = 'write_failed';

	/**
	 * @param int    $project_id    demande visée
	 * @param string $expected_old  statut lu au moment de l'affichage de la fiche
	 * @param string $new_status     statut voulu
	 * @return array{code:string,old:string,new:string}
	 */
	public static function change( int $project_id, string $expected_old, string $new_status ): array {
		$echec = static fn( string $code ): array => [ 'code' => $code, 'old' => $expected_old, 'new' => $new_status ];

		if ( ! Status::is_valid( $new_status ) || ! Status::is_valid( $expected_old ) ) {
			return $echec( self::INVALID );
		}

		$repo = new Repository();
		$row  = $repo->find_by_id( $project_id );
		if ( $row === null ) {
			return $echec( self::NOT_FOUND );
		}

		$actuel = (string) $row['status'];

		/*
		 * Le statut affiché n'est plus le statut en base : quelqu'un est passé
		 * avant. On refuse AVANT la transaction — c'est un contrôle de courtoisie
		 * qui permet un message précis ; la garantie, elle, est dans le WHERE de
		 * l'UPDATE, qui tient même si la ligne change entre cette lecture et lui.
		 */
		if ( $actuel !== $expected_old ) {
			return [ 'code' => self::STALE, 'old' => $actuel, 'new' => $new_status ];
		}

		/*
		 * Même statut demandé : ce n'est pas une erreur, c'est un clic sans
		 * conséquence. Aucune écriture, aucun événement d'historique — un
		 * historique qui note « new → new » se remplit de bruit et devient
		 * illisible, ce qui est la seule façon de perdre un historique.
		 */
		if ( $actuel === $new_status ) {
			return [ 'code' => self::UNCHANGED, 'old' => $actuel, 'new' => $new_status ];
		}

		$now           = current_time( 'mysql', true );
		$user_id       = get_current_user_id();
		$transactionne = $repo->supports_transactions();

		if ( $transactionne ) {
			$repo->begin();
		}

		if ( ! $repo->update_status_if( $project_id, $expected_old, $new_status, $now ) ) {
			if ( $transactionne ) {
				$repo->rollback();
			}
			// Zéro ligne touchée alors que la lecture disait le contraire : la
			// course a été perdue dans l'intervalle. Le message est le même.
			return [ 'code' => self::STALE, 'old' => (string) ( $repo->find_by_id( $project_id )['status'] ?? $actuel ), 'new' => $new_status ];
		}

		if ( ! $repo->insert_history( $project_id, $actuel, $new_status, $user_id, $now ) ) {
			if ( $transactionne ) {
				$repo->rollback();
				Logger::error( 'historique impossible, changement de statut annulé', [
					'project_id' => $project_id,
					'user_id'    => $user_id,
					'error_code' => self::WRITE_FAILED,
				] );

				return $echec( self::WRITE_FAILED );
			}
			/*
			 * Sans transaction (table non InnoDB), le statut est déjà écrit et on
			 * ne peut pas le reprendre. On garde le changement — il est ce que
			 * l'utilisateur a demandé — et on journalise le trou dans la trace.
			 */
			Logger::error( 'statut changé sans trace d’historique (moteur non transactionnel)', [
				'project_id'    => $project_id,
				'user_id'       => $user_id,
				'status_before' => $actuel,
				'status_after'  => $new_status,
			] );
		}

		if ( $transactionne ) {
			$repo->commit();
		}

		Logger::info( 'statut de demande changé', [
			'project_id'    => $project_id,
			'user_id'       => $user_id,
			'status_before' => $actuel,
			'status_after'  => $new_status,
		] );

		return [ 'code' => self::OK, 'old' => $actuel, 'new' => $new_status ];
	}
}
