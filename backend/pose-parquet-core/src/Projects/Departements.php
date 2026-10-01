<?php
/**
 * Le département dit la région — côté serveur, et sans croire le navigateur.
 *
 * -----------------------------------------------------------------------------
 * POURQUOI LE SERVEUR REFAIT CE CALCUL
 * -----------------------------------------------------------------------------
 *
 * Le front déduit déjà la région du département, et c'est bien. Mais le front
 * est du code qu'on nous envoie, pas du code sur lequel on compte : une charge
 * fabriquée à la main peut annoncer `department=35` et `region=Île-de-France`,
 * et la fiche afficherait alors une contradiction qui ferait partir un
 * chantier breton chez une entreprise francilienne.
 *
 * Le serveur ne fait donc pas confiance à la région reçue : il ne l'accepte
 * même pas. `region` n'est plus un champ du contrat, c'est une conséquence
 * calculée ici, à partir du seul `department`, lui-même validé par un motif
 * strict.
 *
 * -----------------------------------------------------------------------------
 * CETTE TABLE EXISTE AUSSI EN JAVASCRIPT
 * -----------------------------------------------------------------------------
 *
 * `js/forms/departements.js` en porte l'originale : c'est elle qui décide de
 * l'orientation commerciale, et la règle de décision reste côté front, à un
 * seul endroit. Une extension WordPress ne lit pas les fichiers du site
 * statique, d'où cette copie.
 *
 * `_generator/check-routage.js` compare les deux entrée par entrée, et échoue
 * si elles diffèrent d'un seul département. Une duplication surveillée, pas
 * une duplication oubliée.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Departements {

	/** Le libellé exact de l'Île-de-France. Écrit une fois, comparé partout. */
	public const ILE_DE_FRANCE = 'Île-de-France';

	/**
	 * Région → départements, dans les libellés que la base stocke.
	 *
	 * Les cinq départements d'outre-mer partagent « Outre-mer » : c'est le
	 * découpage qu'emploie déjà la liste fermée `region`, et le préciser
	 * demanderait une migration pour une distinction dont personne ne se sert.
	 *
	 * @var array<string,string[]>
	 */
	public const REGIONS = [
		'Auvergne-Rhône-Alpes'        => [ '01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74' ],
		'Bourgogne-Franche-Comté'     => [ '21', '25', '39', '58', '70', '71', '89', '90' ],
		'Bretagne'                    => [ '22', '29', '35', '56' ],
		'Centre-Val de Loire'         => [ '18', '28', '36', '37', '41', '45' ],
		'Corse'                       => [ '2A', '2B' ],
		'Grand Est'                   => [ '08', '10', '51', '52', '54', '55', '57', '67', '68', '88' ],
		'Hauts-de-France'             => [ '02', '59', '60', '62', '80' ],
		'Île-de-France'               => [ '75', '77', '78', '91', '92', '93', '94', '95' ],
		'Normandie'                   => [ '14', '27', '50', '61', '76' ],
		'Nouvelle-Aquitaine'          => [ '16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87' ],
		'Occitanie'                   => [ '09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82' ],
		'Pays de la Loire'            => [ '44', '49', '53', '72', '85' ],
		"Provence-Alpes-Côte d'Azur"  => [ '04', '05', '06', '13', '83', '84' ],
		'Outre-mer'                   => [ '971', '972', '973', '974', '976' ],
	];

	/**
	 * Met un département sous sa forme canonique.
	 *
	 * Deux chiffres pour la métropole, trois pour l'outre-mer, Corse en
	 * majuscules, et `6` devient `06` : un département à un chiffre n'existe
	 * pas dans la nomenclature, et le zéro initial se perd facilement quand la
	 * valeur passe par un tableur ou un champ numérique.
	 */
	public static function normaliser( $valeur ): string {
		$brut = strtoupper( trim( (string) $valeur ) );
		if ( $brut === '' ) {
			return '';
		}
		if ( preg_match( '/^[1-9]$/', $brut ) ) {
			return '0' . $brut;
		}
		if ( preg_match( '/^2[AB]$/', $brut ) || preg_match( '/^\d{2,3}$/', $brut ) ) {
			return $brut;
		}
		return '';
	}

	/** Table inverse, construite une fois par requête. Jamais recopiée. */
	private static function par_departement(): array {
		static $table = null;
		if ( $table === null ) {
			$table = [];
			foreach ( self::REGIONS as $region => $departements ) {
				foreach ( $departements as $departement ) {
					$table[ $departement ] = $region;
				}
			}
		}
		return $table;
	}

	/**
	 * La région d'un département, ou une chaîne vide.
	 *
	 * Vide veut dire « on ne sait pas », jamais « métropole par défaut ». Un
	 * numéro que la table ne connaît pas — 975, une faute de frappe qui tombe
	 * au bon format — n'est rattaché de force à aucune région.
	 */
	public static function region( $valeur ): string {
		return self::par_departement()[ self::normaliser( $valeur ) ] ?? '';
	}

	/**
	 * Ce département est-il en Île-de-France ?
	 *
	 * La seule question qui décide de l'éligibilité d'Allure Design, et elle
	 * sort de la table — pas d'une liste de huit numéros tenue à côté.
	 */
	public static function est_idf( $valeur ): bool {
		return self::region( $valeur ) === self::ILE_DE_FRANCE;
	}

	/** Le département est-il connu de la nomenclature ? */
	public static function connu( $valeur ): bool {
		return isset( self::par_departement()[ self::normaliser( $valeur ) ] );
	}

	/** Les départements franciliens, déduits — jamais écrits à la main. */
	public static function idf(): array {
		return self::REGIONS[ self::ILE_DE_FRANCE ];
	}
}
