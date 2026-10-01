<?php
/**
 * Libellés français des valeurs codées d'une demande, pour les emails.
 *
 * Les valeurs stockées sont celles du formulaire (`sejour`, `baton-rompu`…) ;
 * un lecteur humain veut « Séjour », « Bâton rompu ». Une valeur inconnue est
 * rendue telle quelle : mieux vaut un code lisible qu'un blanc.
 *
 * Le fichier vit sous `Mail\` pour des raisons d'histoire — il y est né. Il
 * sert aussi l'administration depuis `Admin\View::label()`, et c'est très
 * bien ainsi : une demande affichée à l'écran et la même demande résumée dans
 * un email doivent employer les mêmes mots, sinon deux personnes qui en
 * parlent au téléphone ne décrivent pas la même chose.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Mail;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Labels {

	private const VALUES = [
		'housing_type'      => [ 'appartement' => 'Appartement', 'maison' => 'Maison', 'commerce' => 'Commerce', 'bureaux' => 'Bureaux', 'autre' => 'Autre' ],
		'room_type'         => [ 'sejour' => 'Séjour', 'chambre' => 'Chambre', 'cuisine' => 'Cuisine', 'couloir' => 'Couloir', 'plusieurs' => 'Plusieurs pièces', 'autre' => 'Autre' ],
		'support_type'      => [ 'dalle' => 'Dalle béton', 'chape' => 'Chape', 'carrelage' => 'Carrelage existant', 'parquet' => 'Ancien parquet', 'autre' => 'Autre', 'inconnu' => 'Je ne sais pas' ],
		'parquet_type'      => [ 'massif' => 'Massif', 'contrecolle' => 'Contrecollé', 'autre' => 'Autre', 'inconnu' => 'Je ne sais pas' ],
		'installation_type' => [ 'longueur' => 'Dans la longueur', 'largeur' => 'Dans la largeur', 'diagonale' => 'En diagonale', 'point-de-hongrie' => 'Point de Hongrie', 'baton-rompu' => 'Bâton rompu', 'inconnu' => 'À conseiller' ],
		'style'             => [ 'clair-scandinave' => 'Clair scandinave', 'naturel-chene' => 'Chêne naturel', 'haussmannien' => 'Haussmannien', 'contemporain-fume' => 'Contemporain fumé', 'brut-atelier' => 'Brut atelier' ],
		'timeframe'         => [ 'urgent' => 'Urgent', 'mois' => 'Dans le mois', '1-3-mois' => 'Dans 1 à 3 mois', 'plus-tard' => 'Plus tard', 'renseignement' => 'Simple renseignement' ],
		'pattern'           => [ 'lames' => 'Lames droites', 'point-de-hongrie' => 'Point de Hongrie', 'baton-rompu' => 'Bâton rompu' ],

		/*
		 * Qualification commerciale.
		 *
		 * « À qualifier » plutôt que « Indéterminé » pour `undetermined` : le
		 * premier dit à qui lit la liste qu'il y a quelque chose à faire, le
		 * second se lit comme un constat dont personne ne se saisit.
		 */
		'lead_source'       => [
			'accueil'     => 'Accueil',
			'guide'       => 'Guide',
			'motif'       => 'Fiche motif',
			'tutoriel'    => 'Tutoriel',
			'inspiration' => 'Inspiration',
			'visualiseur' => 'Visualiseur',
			'mode-plan'   => 'Mode Plan',
			'outils'      => 'Page outils',
			'projet'      => 'Formulaire direct',
			'contact'     => 'Contact',
			'a-propos'    => 'À propos',
			'autre'       => 'Autre page',
		],
		'lead_need'         => [
			'produit'       => 'Trouver un parquet',
			'pose'          => 'Faire poser',
			'produit-pose'  => 'Parquet + pose',
			'renovation'    => 'Rénovation / aménagement',
			'renseignement' => 'Se renseigne',
			'indetermine'   => 'À préciser',
		],
		'lead_destination'  => [
			'premibel'      => 'Premibel',
			'allure_design' => 'Allure Design',
			'mixed'         => 'Les deux',
			'undetermined'  => 'À qualifier',
		],
	];

	public static function of( string $column, ?string $value ): string {
		$value = (string) $value;
		return self::VALUES[ $column ][ $value ] ?? $value;
	}
}
