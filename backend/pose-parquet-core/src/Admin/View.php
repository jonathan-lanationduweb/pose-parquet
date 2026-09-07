<?php
/**
 * Petites aides d'affichage pour les écrans d'administration.
 *
 * Rien de métier ici : des dates au fuseau du site, des libellés lisibles, et
 * les URL des écrans. Les gabarits appellent ces fonctions plutôt que de
 * refaire chacun son formatage — c'est ce qui garantit qu'une date s'affiche
 * partout pareil.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Mail\Labels;
use PoseParquet\Core\Projects\Status;
use PoseParquet\Core\Security\Roles;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class View {

	/**
	 * Date stockée (MySQL, UTC) → date lisible au fuseau et au format du site.
	 *
	 * Les colonnes `*_at` sont écrites avec `current_time( 'mysql', true )`,
	 * donc en UTC : c'est la seule horloge qui a du sens pour un serveur. Mais
	 * un gestionnaire à Paris ne doit pas lire l'heure de Greenwich. `wp_date()`
	 * applique le fuseau du site ; le `' UTC'` ajouté à la chaîne dit à
	 * `strtotime()` de quoi il part, sans quoi il supposerait le fuseau du
	 * serveur PHP et se tromperait d'une ou deux heures.
	 */
	public static function date( ?string $mysql_utc ): string {
		$mysql_utc = (string) $mysql_utc;
		if ( $mysql_utc === '' || $mysql_utc === '0000-00-00 00:00:00' ) {
			return '';
		}
		$horodatage = strtotime( $mysql_utc . ' UTC' );
		if ( $horodatage === false ) {
			return '';
		}

		return (string) wp_date(
			get_option( 'date_format' ) . ' ' . get_option( 'time_format' ),
			$horodatage
		);
	}

	/** Date courte, pour les colonnes de liste. */
	public static function date_short( ?string $mysql_utc ): string {
		$mysql_utc = (string) $mysql_utc;
		if ( $mysql_utc === '' ) {
			return '';
		}
		$horodatage = strtotime( $mysql_utc . ' UTC' );

		return $horodatage === false ? '' : (string) wp_date( get_option( 'date_format' ), $horodatage );
	}

	/** Libellé lisible d'une valeur codée du formulaire. Vide si la valeur est vide. */
	public static function label( string $column, ?string $value ): string {
		$value = (string) $value;

		return $value === '' ? '' : Labels::of( $column, $value );
	}

	/** Libellé d'un statut. */
	public static function status( ?string $value ): string {
		return Status::label( (string) $value );
	}

	/**
	 * Auteur d'un événement ou d'une note.
   *
	 * `user_id` 0 marque une action sans utilisateur connecté : la création par
	 * le formulaire public. On affiche « Système », et c'est exact — personne
	 * n'a cliqué.
	 *
	 * Le nom n'est JAMAIS copié dans `pp_project_history` ni dans
	 * `pp_project_notes` : seul l'identifiant y est. Un utilisateur qui change
	 * de nom le change partout, et un utilisateur supprimé ne laisse pas son
	 * nom derrière lui dans une table métier.
	 */
	public static function author( int $user_id ): string {
		if ( $user_id === 0 ) {
			return __( 'Système', 'pose-parquet-core' );
		}

		$user = get_userdata( $user_id );
		if ( ! $user ) {
			/* translators: %d : identifiant de l'utilisateur supprimé. */
			return sprintf( __( 'Utilisateur #%d (supprimé)', 'pose-parquet-core' ), $user_id );
		}

		return $user->display_name !== '' ? $user->display_name : $user->user_login;
	}

	/** URL de la liste, avec les filtres passés. */
	public static function list_url( array $args = [] ): string {
		$args = array_filter(
			$args,
			static fn( $v ): bool => $v !== '' && $v !== null && $v !== 0
		);

		return add_query_arg( [ 'page' => Projects::PAGE ] + $args, admin_url( 'admin.php' ) );
	}

	/** URL de la fiche d'une demande. */
	public static function detail_url( int $id ): string {
		return add_query_arg(
			[ 'page' => Projects::PAGE, 'project' => $id ],
			admin_url( 'admin.php' )
		);
	}

	/**
	 * Surface en m², telle qu'un humain l'écrit.
	 *
	 * La colonne est un DECIMAL(8,2) et rend « 42.00 ». On retire les décimales
	 * quand elles sont nulles, et on met la virgule française.
	 */
	public static function surface( ?string $value ): string {
		if ( $value === null || $value === '' ) {
			return '';
		}
		$n = (float) $value;

		return number_format_i18n( $n, ( $n === floor( $n ) ) ? 0 : 2 ) . ' m²';
	}

	/** Vrai si l'utilisateur courant est un gestionnaire et rien de plus. */
	public static function is_manager_only(): bool {
		$user = wp_get_current_user();

		return $user->exists()
			&& in_array( Roles::MANAGER, (array) $user->roles, true )
			&& count( (array) $user->roles ) === 1;
	}
}
