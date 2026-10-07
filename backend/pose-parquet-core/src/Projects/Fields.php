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
	/**
	 * Le libellé de l'Île-de-France.
	 *
	 * Conservé pour les appelants qui comparent une région stockée ; la
	 * source reste Projects\Departements::ILE_DE_FRANCE, et cette constante
	 * s'y aligne au lieu de porter sa propre chaîne.
	 */
	public const REGION_IDF_LABEL = Departements::ILE_DE_FRANCE;

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
	public const MAX_ENTRY_PAGE = 500;
	public const MAX_UTM        = 100;
	public const MAX_SCENE_ID   = 60;
	public const MAX_PRODUCT_ID = 60;
	public const MAX_PATTERN    = 40;
	/** Taille maximale, en octets JSON, de `visualizer.config`. */
	public const MAX_VISUALIZER_CONFIG_BYTES = 4096;

	/**
	 * Longueur maximale d'une chaîne à l'intérieur de `visualizer.config`.
	 *
	 * `config` est un carnet libre : le serveur n'en connaît pas la forme et
	 * n'a pas à la connaître. Il en borne quand même chaque chaîne, parce
	 * qu'une valeur libre reste une valeur envoyée par un navigateur. Cent
	 * vingt caractères couvrent largement le nom d'une scène ou d'une
	 * référence — la plus longue du catalogue de démonstration en fait 45 — et
	 * le front applique la même limite de son côté.
	 */
	public const MAX_VISUALIZER_TEXT = 120;

	/**
	 * Profondeur maximale de `visualizer.config`.
	 *
	 * Deux niveaux suffisent à un récapitulatif plat. La limite existe pour que
	 * le nettoyage récursif ne puisse pas être occupé par un objet imbriqué
	 * mille fois : la borne d'octets seule n'y suffirait pas, un JSON très
	 * profond tenant dans très peu de place.
	 */
	public const MAX_VISUALIZER_DEPTH = 3;

	/** Listes fermées : nom API → valeurs acceptées. */
	public const ENUMS = [
		/*
		 * `zone` et `region` ne sont plus des champs recevables.
		 *
		 * Le client en envoyait trois pour un seul fait : une zone, une
		 * region, un departement. Rien n'empechait `department=35` avec
		 * `region=Île-de-France`, et la fiche affichait alors une
		 * contradiction sur laquelle un humain devait trancher.
		 *
		 * La region est maintenant DEDUITE du departement par
		 * Projects\Departements, cote serveur, a partir de la seule donnee
		 * geographique qui reste. Une region recue est refusee comme champ
		 * inconnu plutot que silencieusement ecrasee : ecraser aurait cache
		 * un defaut du client, refuser le signale.
		 *
		 * La colonne `region` reste, elle : c'est ce qu'on stocke et ce qu'on
		 * affiche. Seule la SAISIE a disparu.
		 */
		'housingType'      => [ 'appartement', 'maison', 'commerce', 'bureaux', 'autre' ],
		'roomType'         => [ 'sejour', 'chambre', 'cuisine', 'couloir', 'plusieurs', 'autre' ],
		'supportType'      => [ 'dalle', 'chape', 'carrelage', 'parquet', 'autre', 'inconnu' ],
		'parquetType'      => [ 'massif', 'contrecolle', 'autre', 'inconnu' ],
		'installationType' => [ 'longueur', 'largeur', 'diagonale', 'point-de-hongrie', 'baton-rompu', 'inconnu' ],
		'style'            => [ 'clair-scandinave', 'naturel-chene', 'haussmannien', 'contemporain-fume', 'brut-atelier' ],
		'timeframe'        => [ 'urgent', 'mois', '1-3-mois', 'plus-tard', 'renseignement' ],

		/*
		 * Qualification commerciale (schema 4).
		 *
		 * `leadSource` : la famille editoriale de la page d'entree, pas le
		 * canal d'acquisition. Une meme fiche motif s'atteint par une
		 * recherche, par une campagne ou par un lien : la page est la meme, le
		 * canal non. Ecrire « seo-motif » dans un seul champ reviendrait a
		 * deviner. Le canal se lit dans les `utm_*`, a cote.
		 *
		 * `leadNeed` : six valeurs depuis que le perimetre d'Allure Design est
		 * etabli — pose, revetements de sol, renovation interieure, amenagement,
		 * second oeuvre, a Paris et en Ile-de-France. La version precedente en
		 * comptait quatre, volontairement neutres : nommer un besoin que
		 * personne ne s'etait engage a servir aurait ete une promesse en l'air.
		 * `projet` a disparu au profit de `pose`, `produit-pose` et
		 * `renovation`, qui disent ce qu'il faut savoir pour orienter. Aucune
		 * migration : la colonne est un varchar, seule la liste s'allonge.
		 *
		 * `leadDestination` : la regle du front les produit maintenant toutes
		 * les quatre. Voir js/forms/lead-context.js — la regle y vit une seule
		 * fois, et le serveur ne la reecrit pas.
		 */
		'leadSource'       => [
			'accueil', 'guide', 'motif', 'tutoriel', 'inspiration',
			'visualiseur', 'mode-plan', 'outils', 'projet', 'contact',
			'a-propos', 'autre',
		],
		'leadNeed'         => [ 'produit', 'pose', 'produit-pose', 'renovation', 'renseignement', 'indetermine' ],
		'leadDestination'  => [ 'premibel', 'allure_design', 'mixed', 'undetermined' ],
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
		/*
		 * Coordonnées FACULTATIVES depuis le 06/10/2026.
		 *
		 * Le formulaire public ne les demande plus : il qualifie un projet
		 * pour orienter le visiteur vers Premibel ou Allure Design, et
		 * personne chez Pose-Parquet ne rappelle. On ne stocke pas de donnée
		 * personnelle « au cas où ». Les champs restent dans le contrat —
		 * validés s'ils sont fournis — pour le jour où une transmission réelle
		 * à une entreprise serait mise en place, en le disant au visiteur.
		 */
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
		'utmContent'       => 'utm_content',
		'utmTerm'          => 'utm_term',
		'entryPage'        => 'entry_page',
		'leadSource'       => 'lead_source',
		'leadNeed'         => 'lead_need',
		'leadDestination'  => 'lead_destination',
		/*
		 * `lead_destination_auto` n'est PAS ici : le navigateur ne l'envoie
		 * pas. Repository::insert_project la recopie de `leadDestination` a la
		 * creation, pour qu'aucune charge fabriquee ne puisse annoncer une
		 * recommandation differente de la destination et simuler un arbitrage
		 * humain qui n'a pas eu lieu.
		 */
	];

	/** @return string[] */
	public static function enum( string $field ): array {
		return self::ENUMS[ $field ] ?? [];
	}
}
