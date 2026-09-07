<?php
/**
 * Les deux écritures de l'administration : changer un statut, ajouter une note.
 *
 * Toutes deux en POST vers `admin-post.php`, jamais en GET. Un changement de
 * statut atteignable par un lien serait déclenché par un prefetch de
 * navigateur, un scanner d'URL ou une image dans un email ; l'administration
 * n'expose donc aucune URL qui modifie quoi que ce soit.
 *
 * Chaque poignée suit le même ordre, et l'ordre est la sécurité :
 *
 *   1. capability   — a-t-il le droit ?
 *   2. nonce        — est-ce bien lui qui l'a demandé, depuis notre formulaire ?
 *   3. données      — la demande existe-t-elle, la valeur est-elle valide ?
 *   4. écriture     — couche métier, jamais de SQL ici
 *   5. redirection  — POST → traitement → redirect → GET
 *
 * Le point 5 n'est pas cosmétique : sans lui, un rafraîchissement de la page
 * rejoue l'action. Avec lui, la page finale est un GET sans effet, qu'on peut
 * recharger, mettre en favori ou partager sans rien déclencher.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Projects\Notes;
use PoseParquet\Core\Projects\Repository;
use PoseParquet\Core\Projects\StatusService;
use PoseParquet\Core\Security\Capabilities;
use PoseParquet\Core\Support\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Actions {

	public const UPDATE_STATUS = 'pp_update_status';
	public const ADD_NOTE      = 'pp_add_note';

	public static function register(): void {
		// `admin_post_` (sans `nopriv`) : la poignée n'existe pas pour un
		// visiteur non connecté, qui reçoit la page « action non prise en
		// charge » de WordPress sans qu'aucun de nos codes ne tourne.
		add_action( 'admin_post_' . self::UPDATE_STATUS, [ self::class, 'update_status' ] );
		add_action( 'admin_post_' . self::ADD_NOTE, [ self::class, 'add_note' ] );
	}

	/** Nom du champ de nonce, et action du nonce, propres à une demande. */
	public static function nonce_action( string $verb, int $project_id ): string {
		return $verb . '_' . $project_id;
	}

	public static function update_status(): void {
		$id = isset( $_POST['project_id'] ) ? absint( wp_unslash( $_POST['project_id'] ) ) : 0;

		self::require_can( Capabilities::MANAGE_PROJECTS );
		check_admin_referer( self::nonce_action( self::UPDATE_STATUS, $id ) );

		if ( $id === 0 ) {
			self::back( 0, Notices::NOT_FOUND );
		}

		$nouveau = isset( $_POST['new_status'] ) ? sanitize_key( wp_unslash( $_POST['new_status'] ) ) : '';
		$attendu = isset( $_POST['expected_status'] ) ? sanitize_key( wp_unslash( $_POST['expected_status'] ) ) : '';

		$resultat = StatusService::change( $id, $attendu, $nouveau );

		$codes = [
			StatusService::OK           => Notices::STATUS_UPDATED,
			StatusService::UNCHANGED    => Notices::STATUS_UNCHANGED,
			StatusService::STALE        => Notices::STATUS_STALE,
			StatusService::NOT_FOUND    => Notices::NOT_FOUND,
			StatusService::INVALID      => Notices::SAVE_FAILED,
			StatusService::WRITE_FAILED => Notices::SAVE_FAILED,
		];

		self::back( $id, $codes[ $resultat['code'] ] ?? Notices::SAVE_FAILED );
	}

	public static function add_note(): void {
		$id = isset( $_POST['project_id'] ) ? absint( wp_unslash( $_POST['project_id'] ) ) : 0;

		self::require_can( Capabilities::MANAGE_PROJECTS );
		check_admin_referer( self::nonce_action( self::ADD_NOTE, $id ) );

		if ( $id === 0 ) {
			self::back( 0, Notices::NOT_FOUND );
		}

		/*
		 * `wp_unslash` sans `sanitize_text_field` : le nettoyage appartient à
		 * Notes::prepare(), qui garde les retours à la ligne. Un
		 * `sanitize_text_field` ici les aurait déjà écrasés.
		 */
		$brut     = isset( $_POST['note'] ) ? (string) wp_unslash( $_POST['note'] ) : '';
		$resultat = Notes::add( $id, $brut );

		if ( $resultat['ok'] ) {
			Logger::info( 'note interne ajoutée', [
				'project_id' => $id,
				'user_id'    => get_current_user_id(),
				'action'     => 'add_note',
			] );
			self::back( $id, Notices::NOTE_ADDED );
		}

		$codes = [
			Notes::ERROR_EMPTY  => Notices::NOTE_EMPTY,
			Notes::ERROR_LONG   => Notices::NOTE_TOO_LONG,
			'project_not_found' => Notices::NOT_FOUND,
		];

		self::back( $id, $codes[ $resultat['error'] ] ?? Notices::SAVE_FAILED );
	}

	/**
	 * Arrête tout si le droit manque.
	 *
	 * `wp_die` en 403 et non une redirection : une redirection laisserait
	 * croire à un problème de navigation, alors qu'il s'agit d'un refus.
	 */
	private static function require_can( string $cap ): void {
		if ( ! current_user_can( $cap ) ) {
			wp_die(
				esc_html__( 'Vous n’avez pas les droits nécessaires pour cette action.', 'pose-parquet-core' ),
				esc_html__( 'Accès refusé', 'pose-parquet-core' ),
				[ 'response' => 403 ]
			);
		}
	}

	/**
	 * Redirige vers la fiche — ou vers la liste si la demande n'existe pas —
	 * avec le code du message, et s'arrête là.
	 */
	private static function back( int $project_id, string $notice ): void {
		$url = $project_id > 0
			? View::detail_url( $project_id )
			: View::list_url();

		wp_safe_redirect( add_query_arg( Notices::ARG, $notice, $url ) );
		exit;
	}

	/**
	 * Le statut actuel d'une demande, pour le champ caché `expected_status`.
	 *
	 * Passe par le dépôt : la valeur affichée dans le formulaire doit être
	 * celle de la base au moment du rendu, pas une valeur reconstituée.
	 */
	public static function current_status( int $project_id ): string {
		$row = ( new Repository() )->find_by_id( $project_id );

		return (string) ( $row['status'] ?? '' );
	}
}
