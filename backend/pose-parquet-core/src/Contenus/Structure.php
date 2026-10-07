<?php
/**
 * Champs STRUCTURÉS : des blocs éditoriaux sans HTML libre ni mise en page.
 *
 * Le schéma (quels champs, de quel type, quelle longueur, dans quel groupe)
 * n'est pas écrit ici : il vient du dépôt du site (content-pages.js,
 * content-site.js), qui sait ce qu'il peut afficher, et arrive par l'import
 * (tools/importer-champs.php). WordPress l'affiche comme formulaire, nettoie
 * ce qu'on saisit, et le rend à l'export. Il ne peut ni ajouter, ni retirer,
 * ni déplacer une section.
 *
 * Types (identiques à _generator/textes.js) :
 *   texte, long        texte brut
 *   riche              texte + **gras**, *italique*, `code`
 *   lien               texte + [libellé] : l'adresse du lien est fixée par le site
 *   lignes             une entrée par ligne
 *   url, email         adresses vérifiées
 *   oui-non, image     interrupteur, image de la médiathèque
 *
 * Servi par l'édition des pages (Edition) et l'écran « Mon site » (Site\MonSite).
 */

declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Structure {

	public const TYPES = [ 'texte', 'long', 'riche', 'lien', 'lignes', 'url', 'email', 'oui-non', 'image' ];

	/**
	 * Un schéma reçu du dépôt, réduit à ce qu'on sait afficher.
	 *
	 * @param mixed $brut
	 * @return array<int,array<string,mixed>>
	 */
	public static function schema( mixed $brut ): array {
		$brut = is_string( $brut ) ? json_decode( $brut, true ) : $brut;
		$out  = [];
		foreach ( is_array( $brut ) ? $brut : [] as $d ) {
			if ( ! is_array( $d ) || ! isset( $d['cle'], $d['type'] ) || ! in_array( $d['type'], self::TYPES, true ) ) {
				continue;
			}
			$cle = (string) $d['cle'];
			if ( ! preg_match( '/^[a-z0-9_]{1,40}$/', $cle ) ) {
				continue; // Une clé invalide n'est pas réparée : elle est écartée.
			}
			$out[] = [
				'cle'     => $cle,
				'type'    => (string) $d['type'],
				'groupe'  => sanitize_text_field( (string) ( $d['groupe'] ?? '' ) ),
				'libelle' => sanitize_text_field( (string) ( $d['libelle'] ?? $cle ) ),
				'aide'    => sanitize_text_field( (string) ( $d['aide'] ?? '' ) ),
				'max'     => max( 0, (int) ( $d['max'] ?? 0 ) ),
				'defaut'  => $d['defaut'] ?? '',
			];
		}
		return $out;
	}

	/** Valeurs par défaut d'un schéma (celles que le site publie aujourd'hui). */
	public static function defauts( array $schema ): array {
		$out = [];
		foreach ( $schema as $d ) {
			$out[ $d['cle'] ] = $d['type'] === 'oui-non' ? (bool) $d['defaut'] : ( $d['type'] === 'image' ? absint( $d['defaut'] ) : (string) $d['defaut'] );
		}
		return $out;
	}

	/**
	 * Nettoie ce qui arrive du formulaire, champ par champ du schéma — rien
	 * d'autre n'est lu. Une adresse invalide n'est pas enregistrée : l'ancienne
	 * valeur reste, et le refus est rendu pour être affiché.
	 *
	 * @param array<string,mixed> $recu
	 * @param array<string,mixed> $avant
	 * @return array{0:array<string,mixed>,1:string[]} [valeurs, refus]
	 */
	public static function nettoyer( array $schema, array $recu, array $avant ): array {
		$out   = [];
		$refus = [];
		foreach ( $schema as $d ) {
			$cle = $d['cle'];
			$v   = $recu[ $cle ] ?? null;
			$max = (int) $d['max'];
			$borne = static fn( string $s ): string => $max > 0 ? mb_substr( $s, 0, $max ) : $s;
			switch ( $d['type'] ) {
				case 'oui-non':
					$out[ $cle ] = ! empty( $v ) && $v !== '0';
					break;
				case 'image':
					$id          = absint( is_scalar( $v ) ? $v : 0 );
					$out[ $cle ] = $id && wp_attachment_is_image( $id ) ? $id : 0;
					break;
				case 'texte':
					$out[ $cle ] = $borne( sanitize_text_field( is_scalar( $v ) ? (string) $v : '' ) );
					break;
				case 'lignes':
					$lignes      = array_filter( array_map( 'sanitize_text_field', preg_split( '/\R/', is_scalar( $v ) ? (string) $v : '' ) ?: [] ), static fn( string $l ): bool => $l !== '' );
					$out[ $cle ] = $borne( implode( "\n", $lignes ) );
					break;
				case 'url':
					$brut = trim( is_scalar( $v ) ? (string) $v : '' );
					$url  = esc_url_raw( $brut, [ 'http', 'https' ] );
					if ( $brut !== '' && ( $url === '' || ! wp_http_validate_url( $url ) ) ) {
						$refus[]     = sprintf( '%s : adresse refusée (%s)', $d['libelle'], $brut );
						$out[ $cle ] = (string) ( $avant[ $cle ] ?? $d['defaut'] );
					} else {
						$out[ $cle ] = $borne( $url );
					}
					break;
				case 'email':
					$brut  = trim( is_scalar( $v ) ? (string) $v : '' );
					$email = sanitize_email( $brut );
					if ( $brut !== '' && ! is_email( $email ) ) {
						$refus[]     = sprintf( '%s : adresse email refusée (%s)', $d['libelle'], $brut );
						$out[ $cle ] = (string) ( $avant[ $cle ] ?? $d['defaut'] );
					} else {
						$out[ $cle ] = $borne( $email );
					}
					break;
				default: // long, riche, lien : du texte, jamais de balise.
					$out[ $cle ] = $borne( sanitize_textarea_field( is_scalar( $v ) ? (string) $v : '' ) );
			}
		}
		return [ $out, $refus ];
	}

	/**
	 * Pour l'export : les valeurs du schéma seulement ; une image devient sa
	 * description (adresse, dimensions), ou null.
	 *
	 * @return array<string,mixed>
	 */
	public static function pour_export( array $schema, array $valeurs ): array {
		$out = [];
		foreach ( $schema as $d ) {
			if ( ! array_key_exists( $d['cle'], $valeurs ) ) {
				continue;
			}
			$v = $valeurs[ $d['cle'] ];
			if ( $d['type'] === 'image' ) {
				$out[ $d['cle'] ] = (int) $v ? Export::image( (int) $v ) : null;
			} elseif ( $d['type'] === 'oui-non' ) {
				$out[ $d['cle'] ] = (bool) $v;
			} else {
				$out[ $d['cle'] ] = (string) $v;
			}
		}
		return $out;
	}

	/** Aide de saisie selon le type : ce que le site fera du texte. */
	private static function aide_type( string $type ): string {
		return [
			'riche'  => __( 'Mise en valeur : **gras**, *italique*. Pas de HTML.', 'pose-parquet-core' ),
			'lien'   => __( 'Le texte entre [crochets] devient le lien.', 'pose-parquet-core' ),
			'lignes' => __( 'Une entrée par ligne.', 'pose-parquet-core' ),
		][ $type ] ?? '';
	}

	/**
	 * Le formulaire, groupe par groupe, avec les composants du socle.
	 *
	 * @param array<string,mixed> $valeurs
	 */
	public static function formulaire( array $schema, array $valeurs, string $nom ): void {
		$groupe = null;
		foreach ( $schema as $d ) {
			if ( $d['groupe'] !== $groupe ) {
				if ( $groupe !== null ) {
					echo '</fieldset>';
				}
				$groupe = $d['groupe'];
				echo '<fieldset class="adm-bloc adm-structure"><legend class="adm-bloc__titre">' . esc_html( $groupe ) . '</legend>';
			}
			self::champ( $d, $valeurs[ $d['cle'] ] ?? $d['defaut'], $nom );
		}
		if ( $groupe !== null ) {
			echo '</fieldset>';
		}
	}

	public static function champ( array $d, mixed $v, string $nom ): void {
		$id   = 'pp-s-' . $d['cle'];
		$name = $nom . '[' . $d['cle'] . ']';
		$max  = $d['max'] ? ' maxlength="' . (int) $d['max'] . '"' : '';
		$aide = trim( $d['aide'] . ' ' . self::aide_type( $d['type'] ) );

		if ( $d['type'] === 'image' ) {
			$id_image = absint( $v );
			$src      = $id_image ? (string) wp_get_attachment_image_url( $id_image, 'medium' ) : '';
			echo '<div class="adm-champ adm-image adm-image--ligne" data-pp-couverture><span class="adm-champ__libelle">' . esc_html( $d['libelle'] ) . '</span>';
			echo '<input type="hidden" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $id_image ) . '" data-pp-couverture-id />';
			echo '<div class="adm-image__corps"><div class="adm-image__apercu" data-pp-couverture-apercu>';
			echo $src ? '<img src="' . esc_url( $src ) . '" alt="" />' : '<span class="adm-image__vide">' . esc_html__( 'Aucune image', 'pose-parquet-core' ) . '</span>';
			echo '</div><span class="adm-image__actions"><button type="button" class="adm-bouton adm-bouton--petit" data-pp-choisir><span class="dashicons dashicons-format-image" aria-hidden="true"></span><span data-pp-choisir-texte>' . esc_html( $src ? __( 'Remplacer l’image', 'pose-parquet-core' ) : __( 'Choisir une image', 'pose-parquet-core' ) ) . '</span></button>';
			echo '<button type="button" class="adm-bouton adm-bouton--petit adm-bouton--danger" data-pp-retirer' . ( $src ? '' : ' hidden' ) . '>' . esc_html__( 'Retirer', 'pose-parquet-core' ) . '</button></span></div>';
			if ( $aide !== '' ) {
				echo '<span class="description">' . esc_html( $aide ) . '</span>';
			}
			echo '</div>';
			return;
		}
		if ( $d['type'] === 'oui-non' ) {
			echo '<p class="adm-champ adm-champ--case"><input type="hidden" name="' . esc_attr( $name ) . '" value="0" />';
			echo '<label for="' . esc_attr( $id ) . '"><input type="checkbox" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="1"' . checked( (bool) $v, true, false ) . ' /> ' . esc_html( $d['libelle'] ) . '</label>';
			if ( $aide !== '' ) {
				echo '<span class="description">' . esc_html( $aide ) . '</span>';
			}
			echo '</p>';
			return;
		}
		echo '<p class="adm-champ"><label for="' . esc_attr( $id ) . '">' . esc_html( $d['libelle'] ) . '</label>';
		$valeur = is_scalar( $v ) ? (string) $v : '';
		if ( in_array( $d['type'], [ 'long', 'riche', 'lien', 'lignes' ], true ) ) {
			$lignes = $d['type'] === 'lignes' ? max( 3, substr_count( $valeur, "\n" ) + 2 ) : ( $d['max'] > 300 ? 4 : 2 );
			echo '<textarea id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" rows="' . (int) $lignes . '"' . $max . '>' . esc_textarea( $valeur ) . '</textarea>';
		} else {
			$type = [ 'url' => 'url', 'email' => 'email' ][ $d['type'] ] ?? 'text';
			echo '<input type="' . esc_attr( $type ) . '" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( $valeur ) . '"' . $max . ' />';
		}
		if ( $aide !== '' ) {
			echo '<span class="description">' . esc_html( $aide ) . '</span>';
		}
		echo '</p>';
	}
}
