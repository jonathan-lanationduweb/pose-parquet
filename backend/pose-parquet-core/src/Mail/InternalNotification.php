<?php
/**
 * Notification interne : « une demande vient d'arriver », avec ce qu'il faut
 * pour rappeler le prospect.
 *
 * Construite depuis la ligne en base (la vérité après COMMIT), jamais depuis
 * la requête. Le sujet ne porte que la référence ; le corps porte les
 * coordonnées, parce que c'est son rôle. Champs vides non affichés, aucun
 * JSON, aucune donnée technique.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Mail;

use PoseParquet\Core\Projects\LeadRouting;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class InternalNotification {

	/** @param array<string,mixed> $project ligne de pp_projects */
	public static function subject( array $project ): string {
		return sprintf( 'Nouvelle demande Pose Parquet — %s', (string) $project['reference'] );
	}

	/** @param array<string,mixed> $project ligne de pp_projects */
	public static function body( array $project ): string {
		$p = static fn( string $k ): string => isset( $project[ $k ] ) ? (string) $project[ $k ] : '';

		$surface = $p( 'surface' ) !== '' ? rtrim( rtrim( number_format( (float) $p( 'surface' ), 2, ',', ' ' ), '0' ), ',' ) . ' m²' : '';

		$visualiseur = [];
		if ( $p( 'scene_id' ) || $p( 'product_id' ) || $p( 'pattern' ) || $project['orientation'] !== null ) {
			$visualiseur = [
				Template::row( 'Scène', $p( 'scene_id' ) ),
				Template::row( 'Produit', $p( 'product_id' ) ),
				Template::row( 'Motif', Labels::of( 'pattern', $p( 'pattern' ) ) ),
				Template::row( 'Orientation', $project['orientation'] !== null ? (string) (int) $project['orientation'] . '°' : '' ),
			];
		}

		$utm = array_filter( [ $p( 'utm_source' ), $p( 'utm_medium' ), $p( 'utm_campaign' ), $p( 'utm_content' ), $p( 'utm_term' ) ] );

		/*
		 * Orientation : trois lignes, tout en haut.
		 *
		 * Quelqu'un qui reçoit cet email sur son téléphone doit savoir en une
		 * seconde si la demande le concerne. Origine, besoin, destination
		 * recommandée répondent à cela ; le détail du projet, lui, se lit
		 * ensuite et posément.
		 *
		 * La section est ABSENTE quand rien n'est renseigné — une demande
		 * d'avant le schéma 4, par exemple. Trois lignes vides en tête d'email
		 * feraient croire à une panne.
		 */
		$orientation = [];
		if ( $p( 'lead_source' ) || $p( 'lead_need' ) || $p( 'lead_destination' ) ) {
			/*
			 * Sept lignes, et quelques-unes se repetent plus bas.
			 *
			 * La repetition est voulue. Ce bloc doit suffire a decider sans
			 * faire defiler : qui traite, pour quel chantier, de quelle taille,
			 * avec quel parquet. La zone y figure parce qu'elle conditionne le
			 * routage vers Allure Design — un chantier hors Ile-de-France n'est
			 * pas dans sa zone annoncee, et c'est la premiere chose a voir.
			 */
			$orientation = [
				Template::row( 'Origine', Labels::of( 'lead_source', $p( 'lead_source' ) ) ),
				Template::row( 'Besoin', Labels::of( 'lead_need', $p( 'lead_need' ) ) ),
				Template::row( 'Destination recommandée', Labels::of( 'lead_destination', $p( 'lead_destination' ) ) ),
				/*
				 * La zone est RECALCULEE depuis le departement, jamais relue
				 * d'un champ declaratif. Un email qui annoncerait une region
				 * en desaccord avec le departement ferait perdre une demi-heure
				 * a quelqu'un avant qu'il ouvre la fiche.
				 *
				 * Une seule ligne ici : c'est celle qui decide de l'orientation.
				 * Le departement et la region restent dans la section Projet,
				 * ou on les cherche, et ou ils figurent meme pour une demande
				 * qui n'a pas ete qualifiee.
				 */
				Template::row( 'Zone', LeadRouting::en_idf( $project ) ? 'Paris / Île-de-France' : 'Hors zone Allure Design' ),
				Template::row( 'Surface', $surface ),
				Template::row( 'Parquet', $p( 'product_id' ) ),
				Template::row( 'Motif', Labels::of( 'pattern', $p( 'pattern' ) ) ),
			];

			/*
			 * La raison, en clair, sous le bloc.
			 *
			 * La meme phrase que l'administration affiche : les deux doivent
			 * dire la meme chose, sinon deux personnes qui en parlent au
			 * telephone ne decrivent pas le meme dossier.
			 */
			$raison = LeadRouting::raison( $project );
			if ( $raison !== '' ) {
				$orientation[] = Template::row( 'Pourquoi', $raison );
			}
		}

		return Template::render( 'internal', [
			'title'     => 'Nouvelle demande Pose Parquet',
			'reference' => $p( 'reference' ),
			'sections'  => [
				Template::section( 'Orientation', $orientation ),
				Template::section( 'Client', [
					Template::row( 'Nom', trim( $p( 'first_name' ) . ' ' . $p( 'last_name' ) ) ),
					Template::row( 'Email', $p( 'email' ) ),
					Template::row( 'Téléphone', $p( 'phone' ) ),
				] ),
				Template::section( 'Projet', [
					/*
					 * La region est DEDUITE du departement a l'affichage, et non
					 * relue de la colonne. Les deux disent la meme chose pour
					 * toute demande enregistree depuis ce lot ; pour une demande
					 * plus ancienne, c'est le departement qui fait foi.
					 */
					Template::row( 'Département', $p( 'department' ) ),
					Template::row( 'Région', LeadRouting::region( $project ) ),
					Template::row( 'Ville', $p( 'city' ) ),
					Template::row( 'Logement', Labels::of( 'housing_type', $p( 'housing_type' ) ) ),
					Template::row( 'Pièce', Labels::of( 'room_type', $p( 'room_type' ) ) ),
					Template::row( 'Surface', $surface ),
					Template::row( 'Style', Labels::of( 'style', $p( 'style' ) ) ),
					Template::row( 'Parquet', Labels::of( 'parquet_type', $p( 'parquet_type' ) ) ),
					Template::row( 'Support', Labels::of( 'support_type', $p( 'support_type' ) ) ),
					Template::row( 'Pose', Labels::of( 'installation_type', $p( 'installation_type' ) ) ),
					Template::row( 'Délai', Labels::of( 'timeframe', $p( 'timeframe' ) ) ),
					Template::row( 'Message', $p( 'message' ) ),
				] ),
				Template::section( 'Configuration Visualiseur', $visualiseur ),
				Template::section( 'Source', [
					/*
					 * Deux pages, et elles ne disent pas la même chose : celle
					 * par laquelle la visite a commencé — le contenu qui a fait
					 * venir — et celle depuis laquelle la demande est partie,
					 * presque toujours /projet/.
					 */
					Template::row( 'Page d’entrée', $p( 'entry_page' ) ),
					Template::row( 'Page d’envoi', $p( 'source_url' ) ),
					Template::row( 'Campagne', implode( ' / ', $utm ) ),
					Template::row( 'Reçue le (UTC)', $p( 'created_at' ) ),
				] ),
			],
		] );
	}
}
