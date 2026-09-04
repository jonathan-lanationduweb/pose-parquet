<?php
/**
 * Libellés français des valeurs codées d'une demande, pour les emails.
 *
 * Les valeurs stockées sont celles du formulaire (`sejour`, `baton-rompu`…) ;
 * un lecteur humain veut « Séjour », « Bâton rompu ». Une valeur inconnue est
 * rendue telle quelle : mieux vaut un code lisible qu'un blanc.
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
	];

	public static function of( string $column, ?string $value ): string {
		$value = (string) $value;
		return self::VALUES[ $column ][ $value ] ?? $value;
	}
}
