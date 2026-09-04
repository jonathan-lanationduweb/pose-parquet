<?php
/**
 * Contrat d'une demande de projet — la seule description des champs.
 *
 * Chaque champ accepté par l'API publique est déclaré ici une fois : nom API,
 * colonne, obligation, longueur maximale, liste fermée de valeurs. Le
 * validateur, le dépôt, la documentation et les tests lisent cette table ;
 * rien n'est redéclaré ailleurs.
 *
 * Les listes fermées sont la copie exacte des options du formulaire public
 * (components/project-form/project-form.config.js) au 4 septembre 2026. Le
 * jour où le front change une option, c'est ici — et seulement ici — que le
 * backend l'apprend ; un front décalé est refusé en 422, jamais accepté en
 * silence.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Fields {

	/** Valeur de `zone` qui dispense de `region`. */
	public const ZONE_IDF          = 'idf';
	public const ZONE_AUTRE        = 'autre';
	public const REGION_IDF_LABEL  = 'Île-de-France';

	/** Bornes de surface : celles du champ `surface` du formulaire (min 1, max 2000, pas 1). */
	public const SURFACE_MIN = 1;
	public const SURFACE_MAX = 2000;

	/** Longueurs maximales des textes libres, en caractères. */
	public const MAX_NAME       = 100;
	public const MAX_EMAIL      = 190;
	public const MAX_PHONE      = 40;
	public const MAX_CITY       = 120;
	public const MAX_MESSAGE    = 4000;
	public const MAX_SOURCE_URL = 500;
	public const MAX_UTM        = 100;
	public const MAX_SCENE_ID   = 60;
	public const MAX_PRODUCT_ID = 60;
	public const MAX_PATTERN    = 40;
	/** Taille maximale, en octets JSON, de `visualizer.config`. */
	public const MAX_VISUALIZER_CONFIG_BYTES = 4096;

	/** Listes fermées : nom API → valeurs acceptées. */
	public const ENUMS = [
		'zone'             => [ self::ZONE_IDF, self::ZONE_AUTRE ],
		'region'           => [
			'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse',
			'Grand Est', 'Hauts-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie',
			'Pays de la Loire', "Provence-Alpes-Côte d'Azur", 'Outre-mer',
		],
		'housingType'      => [ 'appartement', 'maison', 'commerce', 'bureaux', 'autre' ],
		'roomType'         => [ 'sejour', 'chambre', 'cuisine', 'couloir', 'plusieurs', 'autre' ],
		'supportType'      => [ 'dalle', 'chape', 'carrelage', 'parquet', 'autre', 'inconnu' ],
		'parquetType'      => [ 'massif', 'contrecolle', 'autre', 'inconnu' ],
		'installationType' => [ 'longueur', 'largeur', 'diagonale', 'point-de-hongrie', 'baton-rompu', 'inconnu' ],
		'style'            => [ 'clair-scandinave', 'naturel-chene', 'haussmannien', 'contemporain-fume', 'brut-atelier' ],
		'timeframe'        => [ 'urgent', 'mois', '1-3-mois', 'plus-tard', 'renseignement' ],
	];

	/** Motifs acceptés dans `visualizer.pattern` : ceux du moteur du Studio. */
	public const VISUALIZER_PATTERNS     = [ 'lames', 'point-de-hongrie', 'baton-rompu' ];
	/** Angles acceptés dans `visualizer.orientation`. */
	public const VISUALIZER_ORIENTATIONS = [ 0, 90, 45, -45 ];

	/**
	 * Champs acceptés à la racine de la requête : nom API → obligatoire.
	 *
	 * `region` est obligatoire quand `zone` vaut `autre` (règle dans Validator).
	 * Tout nom absent de cette liste est un champ inconnu → 422.
	 */
	public const ROOT = [
		'zone'             => true,
		'region'           => false,
		'department'       => true,
		'city'             => false,
		'housingType'      => true,
		'roomType'         => true,
		'surface'          => true,
		'supportType'      => true,
		'parquetType'      => true,
		'installationType' => true,
		'style'            => false,
		'timeframe'        => true,
		'firstName'        => true,
		'lastName'         => true,
		'email'            => true,
		'phone'            => true,
		'message'          => false,
		'consent'          => true,
		'sourceUrl'        => false,
		'utmSource'        => false,
		'utmMedium'        => false,
		'utmCampaign'      => false,
		'visualizer'       => false,
	];

	/** Clés acceptées dans l'objet `visualizer`. Toutes facultatives. */
	public const VISUALIZER = [ 'sceneId', 'productId', 'pattern', 'orientation', 'config' ];

	/**
	 * Noms qui appartiennent au serveur. Reçus dans une requête publique, ils
	 * sont refusés explicitement — plutôt qu'ignorés — pour qu'une tentative se
	 * voie.
	 */
	public const RESERVED = [ 'id', 'status', 'reference', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'consentAt', 'consent_at', 'userId' ];

	/** Nom API → colonne de pp_projects, pour les champs qui se copient tels quels. */
	public const COLUMNS = [
		'region'           => 'region',
		'department'       => 'department',
		'city'             => 'city',
		'housingType'      => 'housing_type',
		'roomType'         => 'room_type',
		'surface'          => 'surface',
		'supportType'      => 'support_type',
		'parquetType'      => 'parquet_type',
		'installationType' => 'installation_type',
		'style'            => 'style',
		'timeframe'        => 'timeframe',
		'firstName'        => 'first_name',
		'lastName'         => 'last_name',
		'email'            => 'email',
		'phone'            => 'phone',
		'message'          => 'message',
		'sourceUrl'        => 'source_url',
		'utmSource'        => 'utm_source',
		'utmMedium'        => 'utm_medium',
		'utmCampaign'      => 'utm_campaign',
	];

	/** @return string[] */
	public static function enum( string $field ): array {
		return self::ENUMS[ $field ] ?? [];
	}
}
