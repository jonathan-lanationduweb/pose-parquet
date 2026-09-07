<?php
/**
 * Notes internes d'une demande — validation et écriture.
 *
 * Une note est un texte brut, écrit par un membre de l'équipe, jamais vu par
 * le visiteur : aucune route publique ne la sert, aucun email ne la reprend.
 * C'est une trace de travail.
 *
 * ELLE NE SE MODIFIE PAS ET NE SE SUPPRIME PAS. Ce n'est pas un oubli. Une
 * note interne est datée et signée ; la corriger après coup effacerait ce que
 * l'équipe savait à ce moment-là. Une erreur se rectifie par une note de plus,
 * ce qui laisse les deux visibles. Cela évite du même coup un historique des
 * notes, une capability de suppression, et les suppressions accidentelles.
 * La table porte une colonne `updated_at` héritée du schéma 1 : elle reste
 * NULL, et le dira encore quand une version future ouvrira l'édition.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Notes {

	/** Longueur maximale d'une note, en caractères. */
	public const MAX_LENGTH = 5000;

	public const ERROR_EMPTY = 'note_empty';
	public const ERROR_LONG  = 'note_too_long';

	/**
	 * Nettoie et contrôle une note saisie dans l'administration.
	 *
	 * `sanitize_textarea_field()` retire les balises et les octets de contrôle
	 * mais GARDE les retours à la ligne : une note de chantier s'écrit en
	 * plusieurs lignes, et les aplatir serait une perte. Le texte est stocké
	 * brut ; c'est l'affichage qui l'échappe puis convertit les sauts de ligne.
	 *
	 * @return array{ok:bool,content:string,error:string}
	 */
	public static function prepare( string $raw ): array {
		$content = sanitize_textarea_field( $raw );
		// Espaces et lignes vides en tête et en queue : jamais significatifs.
		$content = trim( $content );

		if ( $content === '' ) {
			return [ 'ok' => false, 'content' => '', 'error' => self::ERROR_EMPTY ];
		}
		if ( mb_strlen( $content ) > self::MAX_LENGTH ) {
			return [ 'ok' => false, 'content' => '', 'error' => self::ERROR_LONG ];
		}

		return [ 'ok' => true, 'content' => $content, 'error' => '' ];
	}

	/**
	 * Enregistre une note pour la demande.
	 *
	 * L'auteur n'est pas un paramètre de la requête : c'est l'utilisateur
	 * connecté, lu côté serveur. Aucun écran ne propose de choisir un auteur,
	 * et aucune requête ne pourrait en imposer un.
	 *
	 * @return array{ok:bool,id:int,error:string}
	 */
	public static function add( int $project_id, string $raw ): array {
		$prepared = self::prepare( $raw );
		if ( ! $prepared['ok'] ) {
			return [ 'ok' => false, 'id' => 0, 'error' => $prepared['error'] ];
		}

		$repo = new Repository();
		if ( $repo->find_by_id( $project_id ) === null ) {
			return [ 'ok' => false, 'id' => 0, 'error' => 'project_not_found' ];
		}

		$id = $repo->insert_note(
			$project_id,
			get_current_user_id(),
			$prepared['content'],
			current_time( 'mysql', true )
		);

		return $id
			? [ 'ok' => true, 'id' => $id, 'error' => '' ]
			: [ 'ok' => false, 'id' => 0, 'error' => 'note_write_failed' ];
	}
}
