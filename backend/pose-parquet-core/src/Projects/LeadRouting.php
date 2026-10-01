<?php
/**
 * Dire POURQUOI une demande est orientée là où elle l'est.
 *
 * -----------------------------------------------------------------------------
 * CE FICHIER NE DÉCIDE RIEN
 * -----------------------------------------------------------------------------
 *
 * La règle de routage vit à un seul endroit, et c'est `js/forms/lead-context.js`
 * côté front : besoin + zone donnent une destination. Réécrire cette règle ici
 * ferait deux implémentations dans deux langages, qui divergeraient au premier
 * changement — et la seconde servirait justement à expliquer la première.
 *
 * Cette classe LIT ce qui est en base et le met en français. Rien de plus.
 * Elle ne recalcule pas, elle ne corrige pas, elle ne propose pas : si la
 * destination stockée ne correspond pas à ce que la phrase décrit, c'est
 * qu'un humain est passé par là, et c'est précisément ce qu'il faut voir.
 *
 * -----------------------------------------------------------------------------
 * POURQUOI UNE PHRASE PLUTÔT QU'UN CODE
 * -----------------------------------------------------------------------------
 *
 * « Destination : Allure Design » seul laisse le gestionnaire deviner s'il
 * peut faire confiance. « Besoin de pose, projet en Île-de-France » lui donne
 * les deux faits sur lesquels la machine s'est appuyée, et lui permet de
 * contredire la machine en connaissance de cause. Une recommandation dont on
 * ne voit pas le raisonnement finit par être suivie sans être lue, ou ignorée
 * sans être examinée.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Projects;

use PoseParquet\Core\Mail\Labels;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class LeadRouting {

	/**
	 * Le projet est-il en Île-de-France ?
	 *
	 * Le DÉPARTEMENT répond, et lui seul. La région stockée en est déduite au
	 * moment de l'enregistrement ; s'y fier ici reviendrait à lire une copie
	 * quand l'original est à côté, et à rouvrir la porte aux contradictions
	 * que ce lot referme.
	 *
	 * La liste des huit départements n'est écrite nulle part : elle sort de
	 * la table de Departements, comme celle du front.
	 */
	public static function en_idf( array $project ): bool {
		return Departements::est_idf( (string) ( $project['department'] ?? '' ) );
	}

	/** La région d'une demande, déduite de son département. */
	public static function region( array $project ): string {
		return Departements::region( (string) ( $project['department'] ?? '' ) );
	}

	/**
	 * La phrase qui explique l'orientation.
	 *
	 * Rend une chaîne vide quand il n'y a rien à expliquer : une demande
	 * antérieure au schéma 4 n'a pas été orientée, et lui inventer une raison
	 * serait pire que de n'en afficher aucune.
	 *
	 * @param array<string,mixed> $project ligne de pp_projects
	 */
	public static function raison( array $project ): string {
		$besoin      = (string) ( $project['lead_need'] ?? '' );
		$destination = (string) ( $project['lead_destination'] ?? '' );

		if ( $besoin === '' && $destination === '' ) {
			return '';
		}

		$zone = self::en_idf( $project )
			? __( 'projet en Île-de-France', 'pose-parquet-core' )
			: __( 'projet hors Île-de-France', 'pose-parquet-core' );

		switch ( $besoin ) {
			case 'produit':
				return __( 'Recherche de parquet : un produit se livre, la zone ne limite rien.', 'pose-parquet-core' );

			case 'pose':
				return self::en_idf( $project )
					? __( 'Besoin de pose, projet en Île-de-France : dans la zone d’intervention d’Allure Design.', 'pose-parquet-core' )
					: __( 'Besoin de pose, projet hors Île-de-France : hors de la zone annoncée par Allure Design. À qualifier à la main.', 'pose-parquet-core' );

			case 'produit-pose':
				return self::en_idf( $project )
					? __( 'Parquet et pose, projet en Île-de-France : Premibel pour la référence, Allure Design pour le chantier.', 'pose-parquet-core' )
					: __( 'Parquet et pose, projet hors Île-de-France : la référence est servable, la pose ne l’est pas. Orienté produit, la pose reste à traiter.', 'pose-parquet-core' );

			case 'renovation':
				return self::en_idf( $project )
					? __( 'Rénovation ou aménagement, projet en Île-de-France : dans le périmètre d’Allure Design.', 'pose-parquet-core' )
					: __( 'Rénovation ou aménagement, projet hors Île-de-France : hors de la zone annoncée. À qualifier à la main.', 'pose-parquet-core' );

			case 'renseignement':
				return __( 'Le visiteur se renseigne : aucun chantier annoncé, rien à orienter pour l’instant.', 'pose-parquet-core' );

			case 'indetermine':
				return sprintf(
					/* translators: %s : « projet en Île-de-France » ou « projet hors Île-de-France ». */
					__( 'Besoin non précisé (%s) : un appel vaudra mieux qu’une règle.', 'pose-parquet-core' ),
					$zone
				);

			default:
				return '';
		}
	}

	/**
	 * La destination a-t-elle été changée à la main ?
	 *
	 * Les deux colonnes partent égales — `Repository::insert_project` recopie
	 * la recommandation — donc toute différence est le fait d'une personne.
	 */
	public static function corrigee( array $project ): bool {
		$auto = (string) ( $project['lead_destination_auto'] ?? '' );
		return $auto !== '' && $auto !== (string) ( $project['lead_destination'] ?? '' );
	}

	/** « Premibel » plutôt que « premibel », pour la phrase de correction. */
	public static function libelle_auto( array $project ): string {
		return Labels::of( 'lead_destination', (string) ( $project['lead_destination_auto'] ?? '' ) );
	}
}
