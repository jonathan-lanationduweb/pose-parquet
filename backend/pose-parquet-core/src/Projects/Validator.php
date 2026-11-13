<?php



declare(strict_types=1);

namespace PoseParquet\Core\Projects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Validator {



	public static function validate( mixed $input ): array {
		if ( ! is_array( $input ) || array_is_list( $input ) ) {
			return self::fail( [ '_' => 'Le corps de la requête doit être un objet JSON.' ] );
		}

		$errors = [];
		$data   = [];


		foreach ( array_keys( $input ) as $key ) {
			$key = (string) $key;
			if ( in_array( $key, Fields::RESERVED, true ) ) {
				$errors[ $key ] = 'Champ réservé au serveur : il ne peut pas être fourni.';
			} elseif ( ! array_key_exists( $key, Fields::ROOT ) ) {
				$errors[ $key ] = 'Champ inconnu.';
			}
		}


		foreach ( Fields::ROOT as $name => $required ) {
			if ( $required && ! self::present( $input, $name ) ) {
				$errors[ $name ] = 'Champ obligatoire absent.';
			}
		}


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



		self::texte( $input, 'department', 3, $errors, $data, static function ( string $v ) {
			$v = Departements::normaliser( $v );
			return preg_match( '/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/', $v ) ? $v : null;
		}, 'Numéro de département invalide (ex. 75, 2A, 974).' );



		if ( isset( $data['department'] ) ) {
			$region = Departements::region( $data['department'] );
			if ( $region !== '' ) {
				$data['region'] = $region;
			}
		}


		self::texte( $input, 'city', Fields::MAX_CITY, $errors, $data );
		self::texte( $input, 'firstName', Fields::MAX_NAME, $errors, $data );
		self::texte( $input, 'lastName', Fields::MAX_NAME, $errors, $data );
		self::texte( $input, 'message', Fields::MAX_MESSAGE, $errors, $data, null, '', true );
		self::texte( $input, 'utmSource', Fields::MAX_UTM, $errors, $data );
		self::texte( $input, 'utmMedium', Fields::MAX_UTM, $errors, $data );
		self::texte( $input, 'utmCampaign', Fields::MAX_UTM, $errors, $data );
		self::texte( $input, 'utmContent', Fields::MAX_UTM, $errors, $data );
		self::texte( $input, 'utmTerm', Fields::MAX_UTM, $errors, $data );


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



		if ( self::present( $input, 'phone' ) ) {
			if ( ! is_string( $input['phone'] ) ) {
				$errors['phone'] = 'Type invalide : chaîne attendue.';
			} else {
				$phone   = preg_replace( '/\s+/', ' ', trim( $input['phone'] ) );
				$chiffres = preg_replace( '/[^0-9+]/', '', $phone );
				if ( strlen( $phone ) > Fields::MAX_PHONE ) {
					$errors['phone'] = sprintf( 'Longueur maximale dépassée (%d caractères).', Fields::MAX_PHONE );


				} elseif ( ! preg_match( '/^(?:\+33|0)[1-9](?:[\s.\-]?\d{2}){4}$/', $phone ) && ! ( preg_match( '/^\+[\d\s.\-()]+$/', $phone ) && preg_match( '/^\+\d{8,15}$/', $chiffres ) ) ) {
					$errors['phone'] = 'Numéro de téléphone invalide.';
				} else {
					$data['phone'] = $phone;
				}
			}
		}


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


		if ( self::present( $input, 'consent' ) ) {
			if ( $input['consent'] === true ) {
				$data['consent'] = true;
			} elseif ( is_bool( $input['consent'] ) ) {
				$errors['consent'] = 'Le consentement doit être accepté.';
			} else {
				$errors['consent'] = 'Type invalide : booléen attendu.';
			}
		}


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



		if ( self::present( $input, 'entryPage' ) ) {
			if ( ! is_string( $input['entryPage'] ) ) {
				$errors['entryPage'] = 'Type invalide : chaîne attendue.';
			} else {
				$chemin = (string) wp_parse_url( trim( $input['entryPage'] ), PHP_URL_PATH );
				if ( $chemin === '' ) {
					$chemin = '/';
				}
				if ( strlen( $chemin ) > Fields::MAX_ENTRY_PAGE ) {
					$errors['entryPage'] = sprintf( 'Longueur maximale dépassée (%d caractères).', Fields::MAX_ENTRY_PAGE );
				} else {
					$data['entryPage'] = sanitize_text_field( $chemin );
				}
			}
		}


		if ( self::present( $input, 'visualizer' ) ) {
			self::visualizer( $input['visualizer'], $errors, $data );
		}

		return $errors ? self::fail( $errors ) : [ 'ok' => true, 'data' => $data, 'errors' => [] ];
	}



	private static function texte( array $input, string $name, int $max, array &$errors, array &$data, ?callable $transforme = null, string $message = '', bool $multiligne = false ): void {
		if ( ! self::present( $input, $name ) || isset( $errors[ $name ] ) ) {
			return;
		}
		$value = $input[ $name ];
		if ( ! is_string( $value ) ) {
			$errors[ $name ] = 'Type invalide : chaîne attendue.';
			return;
		}

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


				$souci = self::config_hors_bornes( $v['config'], 1 );
				if ( $souci !== null ) {
					$errors['visualizer.config'] = $souci;
				} else {
					$propre = self::sanitize_config( $v['config'], 1 );
					$json   = wp_json_encode( $propre );
					if ( ! is_string( $json ) || strlen( $json ) > Fields::MAX_VISUALIZER_CONFIG_BYTES ) {
						$errors['visualizer.config'] = sprintf( 'Configuration trop volumineuse (%d octets maximum).', Fields::MAX_VISUALIZER_CONFIG_BYTES );
					} else {
						$out['config'] = $propre;
					}
				}
			}
		}
		if ( $out ) {
			$data['visualizer'] = $out;
		}
	}



	private static function config_hors_bornes( array $config, int $depth ): ?string {
		if ( $depth > Fields::MAX_VISUALIZER_DEPTH ) {
			return sprintf( 'Configuration trop imbriquée (%d niveaux maximum).', Fields::MAX_VISUALIZER_DEPTH );
		}

		foreach ( $config as $cle => $valeur ) {
			if ( is_string( $cle ) && mb_strlen( $cle ) > Fields::MAX_VISUALIZER_TEXT ) {
				return sprintf( 'Nom de champ trop long (%d caractères maximum).', Fields::MAX_VISUALIZER_TEXT );
			}
			if ( is_string( $valeur ) && mb_strlen( $valeur ) > Fields::MAX_VISUALIZER_TEXT ) {
				return sprintf( 'Valeur trop longue (%d caractères maximum).', Fields::MAX_VISUALIZER_TEXT );
			}
			if ( is_array( $valeur ) ) {
				$souci = self::config_hors_bornes( $valeur, $depth + 1 );
				if ( $souci !== null ) {
					return $souci;
				}
			}
		}

		return null;
	}



	private static function sanitize_config( array $config, int $depth ): array {
		if ( $depth > Fields::MAX_VISUALIZER_DEPTH ) {
			return [];
		}

		$out = [];
		foreach ( $config as $cle => $valeur ) {
			$cle_propre = is_int( $cle ) ? $cle : sanitize_text_field( (string) $cle );



			if ( $cle_propre === '' ) {
				continue;
			}

			if ( is_string( $valeur ) ) {
				$out[ $cle_propre ] = sanitize_text_field( $valeur );
			} elseif ( is_int( $valeur ) || is_float( $valeur ) || is_bool( $valeur ) || $valeur === null ) {
				$out[ $cle_propre ] = $valeur;
			} elseif ( is_array( $valeur ) ) {
				$out[ $cle_propre ] = self::sanitize_config( $valeur, $depth + 1 );
			}


		}

		return $out;
	}


	private static function present( array $input, string $name ): bool {
		if ( ! array_key_exists( $name, $input ) || $input[ $name ] === null ) {
			return false;
		}
		return ! ( is_string( $input[ $name ] ) && trim( $input[ $name ] ) === '' );
	}



	private static function fail( array $errors ): array {
		return [ 'ok' => false, 'data' => [], 'errors' => $errors ];
	}
}
