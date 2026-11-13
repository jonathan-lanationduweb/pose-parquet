<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Fields {




	public const REGION_IDF_LABEL = Departements::ILE_DE_FRANCE;


	public const SURFACE_MIN = 1;
	public const SURFACE_MAX = 2000;


	public const MAX_NAME       = 100;
	public const MAX_EMAIL      = 190;
	public const MAX_PHONE      = 40;
	public const MAX_CITY       = 120;
	public const MAX_MESSAGE    = 4000;
	public const MAX_SOURCE_URL = 500;
	public const MAX_ENTRY_PAGE = 500;
	public const MAX_UTM        = 100;
	public const MAX_SCENE_ID   = 60;
	public const MAX_PRODUCT_ID = 60;
	public const MAX_PATTERN    = 40;

	public const MAX_VISUALIZER_CONFIG_BYTES = 4096;



	public const MAX_VISUALIZER_TEXT = 120;



	public const MAX_VISUALIZER_DEPTH = 3;


	public const ENUMS = [


		'housingType'      => [ 'appartement', 'maison', 'commerce', 'bureaux', 'autre' ],
		'roomType'         => [ 'sejour', 'chambre', 'cuisine', 'couloir', 'plusieurs', 'autre' ],
		'supportType'      => [ 'dalle', 'chape', 'carrelage', 'parquet', 'autre', 'inconnu' ],
		'parquetType'      => [ 'massif', 'contrecolle', 'autre', 'inconnu' ],
		'installationType' => [ 'longueur', 'largeur', 'diagonale', 'point-de-hongrie', 'baton-rompu', 'inconnu' ],
		'style'            => [ 'clair-scandinave', 'naturel-chene', 'haussmannien', 'contemporain-fume', 'brut-atelier' ],
		'timeframe'        => [ 'urgent', 'mois', '1-3-mois', 'plus-tard', 'renseignement' ],



		'leadSource'       => [
			'accueil', 'guide', 'motif', 'tutoriel', 'inspiration',
			'visualiseur', 'mode-plan', 'outils', 'projet', 'contact',
			'a-propos', 'autre',
		],
		'leadNeed'         => [ 'produit', 'pose', 'produit-pose', 'renovation', 'renseignement', 'indetermine' ],
		'leadDestination'  => [ 'premibel', 'allure_design', 'mixed', 'undetermined' ],
	];


	public const VISUALIZER_PATTERNS     = [ 'lames', 'point-de-hongrie', 'baton-rompu' ];

	public const VISUALIZER_ORIENTATIONS = [ 0, 90, 45, -45 ];



	public const ROOT = [
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


		'firstName'        => false,
		'lastName'         => false,
		'email'            => false,
		'phone'            => false,
		'message'          => false,
		'consent'          => false,
		'sourceUrl'        => false,
		'utmSource'        => false,
		'utmMedium'        => false,
		'utmCampaign'      => false,
		'utmContent'       => false,
		'utmTerm'          => false,
		'entryPage'        => false,
		'leadSource'       => false,
		'leadNeed'         => false,
		'leadDestination'  => false,
		'visualizer'       => false,
	];


	public const VISUALIZER = [ 'sceneId', 'productId', 'pattern', 'orientation', 'config' ];



	public const RESERVED = [ 'id', 'status', 'reference', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'consentAt', 'consent_at', 'userId' ];


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
		'utmContent'       => 'utm_content',
		'utmTerm'          => 'utm_term',
		'entryPage'        => 'entry_page',
		'leadSource'       => 'lead_source',
		'leadNeed'         => 'lead_need',
		'leadDestination'  => 'lead_destination',


	];


	public static function enum( string $field ): array {
		return self::ENUMS[ $field ] ?? [];
	}
}
