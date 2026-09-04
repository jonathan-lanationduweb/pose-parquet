<?php
/**
 * Validation et normalisation d'une demande reçue de l'API publique.
 *
 * Aucune confiance dans le navigateur : la validation du front est un confort,
 * celle-ci fait foi. Le validateur distingue, dans ses messages, un champ
 * absent, un type invalide, une valeur hors liste, une longueur dépassée et
 * une valeur hors plage — parce qu'un front qui casse doit pouvoir lire
 * pourquoi.
 *
 * Il rend soit des erreurs par champ, soit un tableau NORMALISÉ prêt pour le
 * dépôt : chaînes nettoyées et bornées, surface entière, région déduite de la
 * zone, consentement transformé en booléen. Il ne touche pas à la base et ne
 * connaît pas WordPress au-delà de `sanitize_text_field` et `is_email`.
 *
 * Champs inconnus : refusés (422). Champs réservés au serveur (status,
 * reference, dates) : refusés aussi, avec un message distinct — voir Fields.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Validator {

	/**
	 * @param mixed $input corps JSON décodé
	 * @return array{ok:bool,data:array<string,mixed>,errors:array<string,string>}
	 */
	public static function validate( mixed $input ): array {
		if ( ! is_array( $input ) || array_is_list( $input ) ) {
			return self::fail( [ '_' => 'Le corps de la requête doit être un objet JSON.' ] );
		}

		$errors = [];
		$data   = [];

		/* Champs réservés et inconnus : on les nomme tous, pas seulement le premier. */
		foreach ( array_keys( $input ) as $key ) {
			$key = (string) $key;
			if ( in_array( $key, Fields::RESERVED, true ) ) {
				$errors[ $key ] = 'Champ réservé au serveur : il ne peut pas être fourni.';
			} elseif ( ! array_key_exists( $key, Fields::ROOT ) ) {
				$errors[ $key ] = 'Champ inconnu.';
			}
		}

		/* Présence des obligatoires. */
		foreach ( Fields::ROOT as $name => $required ) {
			if ( $required && ! self::present( $input, $name ) ) {
				$errors[ $name ] = 'Champ obligatoire absent.';
			}
		}

		/* Listes fermées. */
		foreach ( array_keys( Fields::ENUMS ) as $name ) {
			if ( ! self::present( $input, $name ) || isset( $errors[ $name ] ) ) {
				continue;
			}
			$value = $input[ $name ];
			if ( ! is_string( $value ) ) {
				$errors[ $name ] = 'Type invalide : chaîne attendue.';
				continue;
			}
			$value = trim( $value );
			if ( ! in_array( $value, Fields::enum( $name ), true ) ) {
				$errors[ $name ] = 'Valeur hors de la liste autorisée.';
				continue;
			}
			$data[ $name ] = $value;
		}

		/* Région : obligatoire hors Île-de-France, déduite sinon. */
		if ( isset( $data['zone'] ) ) {
			if ( $data['zone'] === Fields::ZONE_IDF ) {
				$data['region'] = Fields::REGION_IDF_LABEL;
			} elseif ( ! isset( $data['region'] ) && ! isset( $errors['region'] ) ) {
				$errors['region'] = 'Champ obligatoire absent (zone hors Île-de-France).';
			}
		}

		/* Département : le motif du formulaire, 2A/2B en majuscules. */
		self::texte( $input, 'department', 3, $errors, $data, static function ( string $v ) {
			$v = strtoupper( $v );
			return preg_match( '/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/', $v ) ? $v : null;
		}, 'Numéro de département invalide (ex. 75, 2A, 974).' );

		/* Textes libres, bornés. Les noms de personnes ne sont pas transformés au-delà du nettoyage. */
		self::texte( $input, 'city', Fields::MAX_CITY, $errors, $data );
		self::texte( $input, 'firstName', Fields::MAX_NAME, $errors, $data );
		self::texte( $input, 'lastName', Fields::MAX_NAME, $errors, $data );
		self::texte( $input, 'message', Fields::MAX_MESSAGE, $errors, $data, null, '', true );
		self::texte( $input, 'utmSource', Fields::MAX_UTM, $errors, $data );
		self::texte( $input, 'utmMedium', Fields::MAX_UTM, $errors, $data );
		self::texte( $input, 'utmCampaign', Fields::MAX_UTM, $errors, $data );

		/* Email : validation WordPress, minuscules sur le domaine. */
		if ( self::present( $input, 'email' ) ) {
			$email = is_string( $input['email'] ) ? trim( $input['email'] ) : '';
			if ( ! is_string( $input['email'] ) ) {
				$errors['email'] = 'Type invalide : chaîne attendue.';
			} elseif ( strlen( $email ) > Fields::MAX_EMAIL ) {
				$errors['email'] = sprintf( 'Longueur maximale dépassée (%d caractères).', Fields::MAX_EMAIL );
			} elseif ( ! is_email( $email ) ) {
				$errors['email'] = 'Adresse email invalide.';
			} else {
				[ $local, $domain ] = explode( '@', $email, 2 );
				$data['email']      = $local . '@' . strtolower( $domain );
			}
		}

		/*
		 * Téléphone : formats français usuels — 0X XX XX XX XX, +33 X XX XX XX XX,
		 * avec espaces, points ou tirets. On conserve la saisie nettoyée (utile à
		 * lire) ; on refuse ce qui n'est manifestement pas un numéro. Pas de
		 * moteur international : le formulaire est français et le dit.
		 */
		if ( self::present( $input, 'phone' ) ) {
			if ( ! is_string( $input['phone'] ) ) {
				$errors['phone'] = 'Type invalide : chaîne attendue.';
			} else {
				$phone   = preg_replace( '/\s+/', ' ', trim( $input['phone'] ) );
				$chiffres = preg_replace( '/[^0-9+]/', '', $phone );
				if ( strlen( $phone ) > Fields::MAX_PHONE ) {
					$errors['phone'] = sprintf( 'Longueur maximale dépassée (%d caractères).', Fields::MAX_PHONE );
				} elseif ( ! preg_match( '/^(?:\+33|0)[1-9](?:[\s.\-]?\d{2}){4}$/', $phone ) && ! preg_match( '/^\+\d{8,15}$/', $chiffres ) ) {
					$errors['phone'] = 'Numéro de téléphone invalide.';
				} else {
					$data['phone'] = $phone;
				}
			}
		}

		/* Surface : entier de 1 à 2000 m², comme le champ du formulaire. */
		if ( self::present( $input, 'surface' ) ) {
			$s = $input['surface'];
			if ( is_string( $s ) && preg_match( '/^\d+$/', trim( $s ) ) ) {
				$s = (int) trim( $s );
			}
			if ( ! is_int( $s ) && ! ( is_float( $s ) && floor( $s ) === $s ) ) {
				$errors['surface'] = 'Type invalide : entier attendu.';
			} elseif ( $s < Fields::SURFACE_MIN || $s > Fields::SURFACE_MAX ) {
				$errors['surface'] = sprintf( 'Hors plage : entre %d et %d m².', Fields::SURFACE_MIN, Fields::SURFACE_MAX );
			} else {
				$data['surface'] = (int) $s;
			}
		}

		/* Consentement : la preuve, pas la date — la date, c'est le serveur. */
		if ( self::present( $input, 'consent' ) ) {
			if ( $input['consent'] === true ) {
				$data['consent'] = true;
			} elseif ( is_bool( $input['consent'] ) ) {
				$errors['consent'] = 'Le consentement doit être accepté.';
			} else {
				$errors['consent'] = 'Type invalide : booléen attendu.';
			}
		}

		/* URL d'origine : chemin seulement, sans requête ni fragment. */
		if ( self::present( $input, 'sourceUrl' ) ) {
			if ( ! is_string( $input['sourceUrl'] ) ) {
				$errors['sourceUrl'] = 'Type invalide : chaîne attendue.';
			} else {
				$path = (string) wp_parse_url( trim( $input['sourceUrl'] ), PHP_URL_PATH );
				if ( $path === '' ) {
					$path = '/';
				}
				if ( strlen( $path ) > Fields::MAX_SOURCE_URL ) {
					$errors['sourceUrl'] = sprintf( 'Longueur maximale dépassée (%d caractères).', Fields::MAX_SOURCE_URL );
				} else {
					$data['sourceUrl'] = sanitize_text_field( $path );
				}
			}
		}

		/* Visualiseur : facultatif, structure contrôlée, jamais interprété. */
		if ( self::present( $input, 'visualizer' ) ) {
			self::visualizer( $input['visualizer'], $errors, $data );
		}

		return $errors ? self::fail( $errors ) : [ 'ok' => true, 'data' => $data, 'errors' => [] ];
	}

	/**
	 * Texte libre : chaîne, nettoyée, bornée, éventuellement transformée.
	 *
	 * @param array<string,mixed>  $input
	 * @param array<string,string> $errors
	 * @param array<string,mixed>  $data
	 * @param null|callable(string):(string|null) $transforme rend null si invalide
	 */
	private static function texte( array $input, string $name, int $max, array &$errors, array &$data, ?callable $transforme = null, string $message = '', bool $multiligne = false ): void {
		if ( ! self::present( $input, $name ) || isset( $errors[ $name ] ) ) {
			return;
		}
		$value = $input[ $name ];
		if ( ! is_string( $value ) ) {
			$errors[ $name ] = 'Type invalide : chaîne attendue.';
			return;
		}
		// Pas de HTML en base : les balises tombent, le texte reste.
		$value = $multiligne ? sanitize_textarea_field( $value ) : sanitize_text_field( $value );
		if ( mb_strlen( $value ) > $max ) {
			$errors[ $name ] = sprintf( 'Longueur maximale dépassée (%d caractères).', $max );
			return;
		}
		if ( $transforme ) {
			$value = $transforme( $value );
			if ( $value === null ) {
				$errors[ $name ] = $message ?: 'Valeur invalide.';
				return;
			}
		}
		$data[ $name ] = $value;
	}

	/**
	 * @param mixed                $v
	 * @param array<string,string> $errors
	 * @param array<string,mixed>  $data
	 */
	private static function visualizer( mixed $v, array &$errors, array &$data ): void {
		if ( ! is_array( $v ) || array_is_list( $v ) ) {
			$errors['visualizer'] = 'Type invalide : objet attendu.';
			return;
		}
		foreach ( array_keys( $v ) as $k ) {
			if ( ! in_array( (string) $k, Fields::VISUALIZER, true ) ) {
				$errors[ 'visualizer.' . $k ] = 'Champ inconnu.';
			}
		}
		$out = [];
		foreach ( [ 'sceneId' => Fields::MAX_SCENE_ID, 'productId' => Fields::MAX_PRODUCT_ID ] as $k => $max ) {
			if ( isset( $v[ $k ] ) ) {
				if ( ! is_string( $v[ $k ] ) || ! preg_match( '/^[a-z0-9][a-z0-9_\-]*$/i', $v[ $k ] ) ) {
					$errors[ 'visualizer.' . $k ] = 'Identifiant invalide.';
				} elseif ( strlen( $v[ $k ] ) > $max ) {
					$errors[ 'visualizer.' . $k ] = sprintf( 'Longueur maximale dépassée (%d caractères).', $max );
				} else {
					$out[ $k ] = $v[ $k ];
				}
			}
		}
		if ( isset( $v['pattern'] ) ) {
			if ( ! is_string( $v['pattern'] ) || ! in_array( $v['pattern'], Fields::VISUALIZER_PATTERNS, true ) ) {
				$errors['visualizer.pattern'] = 'Valeur hors de la liste autorisée.';
			} else {
				$out['pattern'] = $v['pattern'];
			}
		}
		if ( isset( $v['orientation'] ) ) {
			if ( ! is_int( $v['orientation'] ) || ! in_array( $v['orientation'], Fields::VISUALIZER_ORIENTATIONS, true ) ) {
				$errors['visualizer.orientation'] = 'Valeur hors de la liste autorisée (0, 90, 45, -45).';
			} else {
				$out['orientation'] = $v['orientation'];
			}
		}
		if ( isset( $v['config'] ) ) {
			if ( ! is_array( $v['config'] ) ) {
				$errors['visualizer.config'] = 'Type invalide : objet attendu.';
			} else {
				$json = wp_json_encode( $v['config'] );
				if ( ! is_string( $json ) || strlen( $json ) > Fields::MAX_VISUALIZER_CONFIG_BYTES ) {
					$errors['visualizer.config'] = sprintf( 'Configuration trop volumineuse (%d octets maximum).', Fields::MAX_VISUALIZER_CONFIG_BYTES );
				} else {
					$out['config'] = $v['config'];
				}
			}
		}
		if ( $out ) {
			$data['visualizer'] = $out;
		}
	}

	/** Présent = clé existante et valeur non nulle, non vide si chaîne. */
	private static function present( array $input, string $name ): bool {
		if ( ! array_key_exists( $name, $input ) || $input[ $name ] === null ) {
			return false;
		}
		return ! ( is_string( $input[ $name ] ) && trim( $input[ $name ] ) === '' );
	}

	/**
	 * @param array<string,string> $errors
	 * @return array{ok:bool,data:array<string,mixed>,errors:array<string,string>}
	 */
	private static function fail( array $errors ): array {
		return [ 'ok' => false, 'data' => [], 'errors' => $errors ];
	}
}
