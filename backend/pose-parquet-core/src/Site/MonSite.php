<?php
/**
 * « Mon site » : identité, en-tête, pied de page, liens commerciaux.
 *
 * Même principe que les réglages du socle Expert Parquet, mais sans page
 * builder : on règle des TEXTES, des choix (afficher ou non) et deux images.
 * Les champs eux-mêmes viennent du dépôt du site (_generator/content-site.js),
 * importés une fois (tools/importer-champs.php) : le site sait ce qu'il peut
 * afficher, WordPress ne fait que le remplir. La structure HTML/CSS reste
 * celle du front.
 *
 * Présentation : quatre onglets (Identité, En-tête & navigation, Pied de
 * page, Liens commerciaux). Les paires « libellé + afficher » se lisent en
 * LISTE compacte, une ligne par entrée, au lieu d'un champ puis d'une case
 * empilés. Chaque onglet a son propre formulaire et n'enregistre que ses
 * champs : les autres onglets ne sont jamais touchés.
 *
 * Deux options : le schéma (OPTION_SCHEMA) et les valeurs (OPTION).
 */

declare(strict_types=1);

namespace PoseParquet\Core\Site;

use PoseParquet\Core\Admin\Socle;
use PoseParquet\Core\Contenus\Structure;
use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class MonSite {

	public const PAGE          = 'pose-parquet-site';
	public const OPTION        = 'pose_parquet_site';
	public const OPTION_SCHEMA = 'pose_parquet_site_schema';
	public const ACTION        = 'pp_site_enregistrer';
	private const REFUS        = 'pp_site_refus_';
	private const FORMULAIRE   = 'pp-site-formulaire';

	public static function register(): void {
		add_action( 'admin_post_' . self::ACTION, [ self::class, 'enregistrer' ] );
	}

	/** @return array<int,array<string,mixed>> */
	public static function schema(): array {
		return Structure::schema( get_option( self::OPTION_SCHEMA, [] ) );
	}

	/** Les valeurs en vigueur : celles saisies, complétées des valeurs par défaut du dépôt. */
	public static function valeurs(): array {
		$v = get_option( self::OPTION, [] );
		return array_merge( Structure::defauts( self::schema() ), is_array( $v ) ? $v : [] );
	}

	public static function url( string $onglet = '' ): string {
		return admin_url( 'admin.php?page=' . self::PAGE . ( $onglet !== '' ? '&onglet=' . $onglet : '' ) );
	}

	/** @return array<string,mixed>|null pour l'export ; null tant que rien n'est importé. */
	public static function pour_export(): ?array {
		$schema = self::schema();
		return $schema ? Structure::pour_export( $schema, self::valeurs() ) : null;
	}

	/* ------------------------------------------------------------ onglets */

	/** @return array<string,string> */
	public static function onglets(): array {
		return [
			'identite' => __( 'Identité', 'pose-parquet-core' ),
			'entete'   => __( 'En-tête & navigation', 'pose-parquet-core' ),
			'pied'     => __( 'Pied de page', 'pose-parquet-core' ),
			'liens'    => __( 'Liens commerciaux', 'pose-parquet-core' ),
		];
	}

	/** L'onglet d'un groupe du schéma (les groupes sont nommés dans content-site.js). */
	public static function onglet_du_groupe( string $groupe ): string {
		foreach ( [ 'Identité' => 'identite', 'En-tête' => 'entete', 'Navigation' => 'entete', 'Pied de page' => 'pied', 'Liens commerciaux' => 'liens' ] as $debut => $onglet ) {
			if ( str_starts_with( $groupe, $debut ) ) {
				return $onglet;
			}
		}
		return 'autres';
	}

	/** Les champs d'un onglet, dans l'ordre du schéma. */
	private static function champs_de( array $schema, string $onglet ): array {
		return array_values( array_filter( $schema, static fn( array $d ): bool => self::onglet_du_groupe( $d['groupe'] ) === $onglet ) );
	}

	private static function onglet_courant( array $schema ): string {
		$o = isset( $_GET['onglet'] ) ? sanitize_key( wp_unslash( $_GET['onglet'] ) ) : 'identite'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$possibles = array_keys( self::onglets() );
		if ( self::champs_de( $schema, 'autres' ) ) {
			$possibles[] = 'autres';
		}
		return in_array( $o, $possibles, true ) ? $o : 'identite';
	}

	/* ------------------------------------------------------------ enregistrement */

	public static function enregistrer(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), '', [ 'response' => 403 ] );
		}
		check_admin_referer( self::ACTION );
		$schema = self::schema();
		$onglet = isset( $_POST['pp_onglet'] ) ? sanitize_key( wp_unslash( $_POST['pp_onglet'] ) ) : '';
		$champs = self::champs_de( $schema, $onglet );
		$recu   = isset( $_POST['pp_site'] ) && is_array( $_POST['pp_site'] ) ? wp_unslash( $_POST['pp_site'] ) : []; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Structure::nettoyer, champ par champ.
		$avant  = self::valeurs();
		// Seuls les champs de l'onglet envoyé sont lus ; les autres gardent leur valeur.
		[ $valeurs, $refus ] = Structure::nettoyer( $champs, $recu, $avant );
		update_option( self::OPTION, array_merge( $avant, $valeurs ), false );
		if ( $refus ) {
			set_transient( self::REFUS . get_current_user_id(), $refus, 5 * MINUTE_IN_SECONDS );
		}
		wp_safe_redirect( add_query_arg( 'pp-site', 'ok', self::url( $champs ? $onglet : '' ) ) );
		exit;
	}

	/* ------------------------------------------------------------ rendu */

	public static function render(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), esc_html__( 'Accès refusé', 'pose-parquet-core' ), [ 'response' => 403 ] );
		}
		$schema = self::schema();
		$onglet = self::onglet_courant( $schema );
		echo '<div class="wrap adm-page-formulaire">';
		echo '<div class="adm-entete-actions"><h1 class="wp-heading-inline">' . esc_html__( 'Mon site', 'pose-parquet-core' ) . '</h1>';
		if ( $schema ) {
			echo '<button type="submit" form="' . esc_attr( self::FORMULAIRE ) . '" class="adm-bouton adm-bouton--plein">' . esc_html__( 'Enregistrer les modifications', 'pose-parquet-core' ) . '</button>';
		}
		echo '</div><hr class="wp-header-end">';
		echo '<p class="adm-entete__sous-titre">' . esc_html__( 'Identité, en-tête, pied de page et liens commerciaux. Des textes et des choix : la mise en page reste celle du site.', 'pose-parquet-core' ) . '</p>';
		\PoseParquet\Core\Publication\Publication::rappel();

		$refus = get_transient( self::REFUS . get_current_user_id() );
		if ( is_array( $refus ) && $refus ) {
			delete_transient( self::REFUS . get_current_user_id() );
			echo '<div class="notice notice-error"><p><strong>' . esc_html__( 'Certaines valeurs ont été refusées, l’ancienne valeur est conservée :', 'pose-parquet-core' ) . '</strong></p><ul>';
			foreach ( $refus as $r ) {
				echo '<li>' . esc_html( (string) $r ) . '</li>';
			}
			echo '</ul></div>';
		} elseif ( isset( $_GET['pp-site'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Modifications enregistrées. Elles seront en ligne après « Publier le site ».', 'pose-parquet-core' ) . '</p></div>';
		}
		if ( ! $schema ) {
			echo '<p class="adm-avertissement">' . esc_html__( 'Les champs de « Mon site » n’ont pas encore été importés depuis le dépôt du site : php tools/importer-champs.php <racine WordPress> data/wordpress/import.json', 'pose-parquet-core' ) . '</p></div>';
			return;
		}

		// Onglets WordPress natifs ; ils défilent horizontalement sur mobile.
		$onglets = self::onglets();
		if ( self::champs_de( $schema, 'autres' ) ) {
			$onglets['autres'] = __( 'Autres', 'pose-parquet-core' );
		}
		echo '<nav class="nav-tab-wrapper adm-onglets" aria-label="' . esc_attr__( 'Sections de Mon site', 'pose-parquet-core' ) . '">';
		foreach ( $onglets as $cle => $libelle ) {
			echo '<a href="' . esc_url( self::url( $cle ) ) . '" class="nav-tab' . ( $cle === $onglet ? ' nav-tab-active" aria-current="page' : '' ) . '">' . esc_html( $libelle ) . '</a>';
		}
		echo '</nav>';

		$valeurs = self::valeurs();
		$champs  = self::champs_de( $schema, $onglet );
		echo '<form id="' . esc_attr( self::FORMULAIRE ) . '" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="adm-onglet">';
		echo '<input type="hidden" name="action" value="' . esc_attr( self::ACTION ) . '" />';
		echo '<input type="hidden" name="pp_onglet" value="' . esc_attr( $onglet ) . '" />';
		wp_nonce_field( self::ACTION );
		match ( $onglet ) {
			'identite' => self::onglet_identite( $champs, $valeurs ),
			'entete'   => self::onglet_entete( $champs, $valeurs ),
			'pied'     => self::onglet_pied( $champs, $valeurs ),
			'liens'    => self::onglet_liens( $champs, $valeurs ),
			default    => self::carte_generique( __( 'Autres réglages', 'pose-parquet-core' ), $champs, $valeurs ),
		};
		echo '<div class="adm-barre-actions"><span class="adm-barre-actions__note">' . esc_html__( 'Enregistrer, puis « Publier le site » depuis le tableau de bord ou l’écran Publication.', 'pose-parquet-core' ) . '</span>';
		echo '<button type="submit" class="adm-bouton adm-bouton--plein">' . esc_html__( 'Enregistrer les modifications', 'pose-parquet-core' ) . '</button></div>';
		echo '</form></div>';
	}

	/** Un champ par sa clé. */
	private static function par_cle( array $champs, string $cle ): ?array {
		foreach ( $champs as $d ) {
			if ( $d['cle'] === $cle ) {
				return $d;
			}
		}
		return null;
	}

	private static function carte_generique( string $titre, array $champs, array $valeurs ): void {
		Socle::carte_ouvrir( $titre );
		foreach ( $champs as $d ) {
			Structure::champ( $d, $valeurs[ $d['cle'] ] ?? $d['defaut'], 'pp_site' );
		}
		Socle::carte_fermer();
	}

	/* -- Identité ------------------------------------------------------ */

	private static function onglet_identite( array $champs, array $valeurs ): void {
		$images = array_values( array_filter( $champs, static fn( array $d ): bool => $d['type'] === 'image' ) );
		$textes = array_values( array_filter( $champs, static fn( array $d ): bool => $d['type'] !== 'image' ) );
		echo '<div class="adm-grille">';
		echo '<div>';
		Socle::carte_ouvrir( __( 'Nom et baseline', 'pose-parquet-core' ) );
		foreach ( $textes as $d ) {
			Structure::champ( $d, $valeurs[ $d['cle'] ] ?? $d['defaut'], 'pp_site' );
		}
		Socle::carte_fermer();
		Socle::carte_ouvrir( __( 'Logo et favicon', 'pose-parquet-core' ) );
		echo '<div class="adm-deux-champs">';
		foreach ( $images as $d ) {
			Structure::champ( $d, $valeurs[ $d['cle'] ] ?? $d['defaut'], 'pp_site' );
		}
		echo '</div>';
		Socle::carte_fermer();
		echo '</div><div>';
		self::apercu( $valeurs );
		echo '</div></div>';
	}

	/**
	 * Une carte de marque : le logo (ou le nom), la baseline, le favicon.
	 * D'après les réglages enregistrés ; pas une maquette du site.
	 */
	private static function apercu( array $v ): void {
		$nom      = (string) ( $v['nom'] ?? '' );
		$mots     = explode( ' ', $nom, 2 );
		$logo     = absint( $v['logo'] ?? 0 ) ? (string) wp_get_attachment_image_url( absint( $v['logo'] ), 'medium' ) : '';
		$favicon  = absint( $v['favicon'] ?? 0 ) ? (string) wp_get_attachment_image_url( absint( $v['favicon'] ), 'thumbnail' ) : '';
		$symbole  = '<span class="adm-marque__symbole" aria-hidden="true"></span>';
		Socle::carte_ouvrir( __( 'Aperçu de la marque', 'pose-parquet-core' ) );
		echo '<div class="adm-marque">';
		echo '<div class="adm-marque__nom">';
		echo $logo // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- composé et échappé ici.
			? '<img class="adm-marque__logo" src="' . esc_url( $logo ) . '" alt="" />'
			: $symbole . '<strong>' . esc_html( $mots[0] ) . '</strong> <span>' . esc_html( $mots[1] ?? '' ) . '</span>';
		echo '</div>';
		if ( (string) ( $v['baseline'] ?? '' ) !== '' ) {
			echo '<p class="adm-marque__baseline">' . esc_html( (string) $v['baseline'] ) . '</p>';
		}
		echo '</div>';
		echo '<dl class="adm-etat">';
		echo '<dt>' . esc_html__( 'Logo', 'pose-parquet-core' ) . '</dt><dd>' . esc_html( $logo ? __( 'Image', 'pose-parquet-core' ) : __( 'Symbole et nom du site', 'pose-parquet-core' ) ) . '</dd>';
		echo '<dt>' . esc_html__( 'Favicon', 'pose-parquet-core' ) . '</dt><dd class="adm-marque__favicon">';
		echo $favicon ? '<img src="' . esc_url( $favicon ) . '" alt="" width="16" height="16" />' : '<span class="adm-marque__favicon-symbole">' . $symbole . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- composé et échappé ici.
		echo '</dd></dl>';
		echo '<p class="adm-carte__aide">' . esc_html__( 'D’après les réglages enregistrés. Le rendu exact est celui du site après publication.', 'pose-parquet-core' ) . '</p>';
		Socle::carte_fermer();
	}

	/* -- Listes « libellé + afficher » --------------------------------- */

	/** Le nom d'une entrée, tiré de son libellé de schéma (« Guides : libellé » → « Guides »). */
	private static function nom_entree( string $libelle ): string {
		return (string) preg_replace( '/\s*:\s*(libellé|afficher)$/u', '', $libelle );
	}

	/** Une ligne de liste : nom, champ texte, case « Affiché » si le schéma la prévoit. */
	private static function ligne( array $d, ?array $affiche, array $valeurs, string $nom = '' ): void {
		$id = 'pp-s-' . $d['cle'];
		echo '<tr><th scope="row"><label for="' . esc_attr( $id ) . '">' . esc_html( $nom !== '' ? $nom : self::nom_entree( $d['libelle'] ) ) . '</label></th>';
		echo '<td><input type="text" id="' . esc_attr( $id ) . '" name="pp_site[' . esc_attr( $d['cle'] ) . ']" value="' . esc_attr( (string) ( $valeurs[ $d['cle'] ] ?? $d['defaut'] ) ) . '"' . ( $d['max'] ? ' maxlength="' . (int) $d['max'] . '"' : '' ) . ' /></td>';
		echo '<td class="adm-liste__case">';
		if ( $affiche ) {
			$ida = 'pp-s-' . $affiche['cle'];
			echo '<input type="hidden" name="pp_site[' . esc_attr( $affiche['cle'] ) . ']" value="0" />';
			echo '<label for="' . esc_attr( $ida ) . '"><input type="checkbox" id="' . esc_attr( $ida ) . '" name="pp_site[' . esc_attr( $affiche['cle'] ) . ']" value="1"' . checked( ! empty( $valeurs[ $affiche['cle'] ] ), true, false ) . ' /> ' . esc_html__( 'Affiché', 'pose-parquet-core' ) . '</label>';
		}
		echo '</td></tr>';
	}

	/**
	 * Une liste compacte : chaque champ texte, avec sa case « _afficher »
	 * quand elle existe.
	 *
	 * @param array<int,array<string,mixed>> $champs
	 */
	private static function liste( array $champs, array $tous, array $valeurs, string $entete = '' ): void {
		echo '<table class="adm-liste">';
		if ( $entete !== '' ) {
			echo '<thead><tr><th scope="col">' . esc_html( $entete ) . '</th><th scope="col">' . esc_html__( 'Libellé', 'pose-parquet-core' ) . '</th><th scope="col" class="adm-liste__case">' . esc_html__( 'Afficher', 'pose-parquet-core' ) . '</th></tr></thead>';
		}
		echo '<tbody>';
		foreach ( $champs as $d ) {
			if ( $d['type'] !== 'texte' ) {
				continue;
			}
			self::ligne( $d, self::par_cle( $tous, $d['cle'] . '_afficher' ), $valeurs );
		}
		echo '</tbody></table>';
	}

	/* -- En-tête & navigation ------------------------------------------ */

	private static function onglet_entete( array $champs, array $valeurs ): void {
		$groupe = static fn( string $g ): array => array_values( array_filter( $champs, static fn( array $d ): bool => $d['groupe'] === $g ) );
		echo '<div class="adm-colonnes-2">';
		Socle::carte_ouvrir( __( 'Navigation', 'pose-parquet-core' ) );
		echo '<p class="adm-carte__aide">' . esc_html__( 'Menu principal (ordinateur et mobile). Les adresses suivent l’arborescence du site.', 'pose-parquet-core' ) . '</p>';
		self::liste( $groupe( 'Navigation' ), $champs, $valeurs, __( 'Entrée', 'pose-parquet-core' ) );
		$mobile = $groupe( 'Navigation (menu mobile)' );
		if ( $mobile ) {
			echo '<h3 class="adm-carte__sous-titre">' . esc_html__( 'Menu mobile seulement', 'pose-parquet-core' ) . '</h3>';
			self::liste( $mobile, $champs, $valeurs );
		}
		Socle::carte_fermer();

		Socle::carte_ouvrir( __( 'Boutons de l’en-tête', 'pose-parquet-core' ) );
		$boutons = $groupe( 'En-tête' );
		echo '<table class="adm-liste"><tbody>';
		$noms = [
			'cta_projet'           => __( 'Bouton « Votre projet »', 'pose-parquet-core' ),
			'menu_cta_projet'      => __( 'Menu mobile : projet', 'pose-parquet-core' ),
			'menu_cta_visualiseur' => __( 'Menu mobile : Visualiseur', 'pose-parquet-core' ),
			'menu_note'            => __( 'Menu mobile : mention', 'pose-parquet-core' ),
		];
		foreach ( $boutons as $d ) {
			if ( $d['type'] === 'texte' ) {
				self::ligne( $d, self::par_cle( $champs, $d['cle'] . '_afficher' ), $valeurs, $noms[ $d['cle'] ] ?? '' );
			}
		}
		echo '</tbody></table>';
		Socle::carte_fermer();
		echo '</div>';
	}

	/* -- Pied de page --------------------------------------------------- */

	private static function onglet_pied( array $champs, array $valeurs ): void {
		$textes = array_values( array_filter( $champs, static fn( array $d ): bool => $d['groupe'] === 'Pied de page' ) );
		$liens  = array_values( array_filter( $champs, static fn( array $d ): bool => $d['groupe'] !== 'Pied de page' ) );

		Socle::carte_ouvrir( __( 'Textes du pied de page', 'pose-parquet-core' ) );
		echo '<div class="adm-deux-champs">';
		foreach ( $textes as $d ) {
			Structure::champ( $d, $valeurs[ $d['cle'] ] ?? $d['defaut'], 'pp_site' );
		}
		echo '</div>';
		Socle::carte_fermer();

		// Les colonnes : un titre (pied_col_*), puis ses liens jusqu'au titre suivant.
		$colonnes = [];
		foreach ( $liens as $d ) {
			if ( str_starts_with( $d['cle'], 'pied_col_' ) ) {
				$colonnes[] = [ 'titre' => $d, 'liens' => [] ];
			} elseif ( $colonnes ) {
				$colonnes[ count( $colonnes ) - 1 ]['liens'][] = $d;
			}
		}
		echo '<div class="adm-colonnes-3">';
		foreach ( $colonnes as $i => $col ) {
			$t = $col['titre'];
			Socle::carte_ouvrir( sprintf( /* translators: 1: numéro, 2: titre */ __( 'Colonne %1$d — %2$s', 'pose-parquet-core' ), $i + 1, (string) ( $valeurs[ $t['cle'] ] ?? $t['defaut'] ) ) );
			echo '<table class="adm-liste adm-liste--etroite"><tbody>';
			self::ligne( $t, null, $valeurs, __( 'Titre', 'pose-parquet-core' ) );
			foreach ( $col['liens'] as $d ) {
				if ( $d['type'] === 'texte' ) {
					self::ligne( $d, self::par_cle( $liens, $d['cle'] . '_afficher' ), $valeurs );
				}
			}
			echo '</tbody></table>';
			Socle::carte_fermer();
		}
		echo '</div>';
	}

	/* -- Liens commerciaux ----------------------------------------------- */

	private static function onglet_liens( array $champs, array $valeurs ): void {
		echo '<p class="adm-note">' . esc_html__( 'Ces liens alimentent les mentions et CTA prévus dans le site.', 'pose-parquet-core' ) . '</p>';
		echo '<div class="adm-colonnes-2">';
		foreach ( [ 'premibel' => 'Premibel', 'allure' => 'Allure Design' ] as $prefixe => $titre ) {
			$siens = array_values( array_filter( $champs, static fn( array $d ): bool => str_starts_with( $d['cle'], $prefixe . '_' ) ) );
			if ( ! $siens ) {
				continue;
			}
			// « Actif » quand le lien est affiché sur le site ; rien sinon.
			$affiche = false;
			foreach ( $siens as $d ) {
				if ( $d['type'] === 'oui-non' ) {
					$affiche = ! empty( $valeurs[ $d['cle'] ] ?? $d['defaut'] );
				}
			}
			Socle::carte_ouvrir( $titre, '', $affiche ? Socle::badge( __( 'Actif', 'pose-parquet-core' ), 'ok' ) : '' );
			foreach ( $siens as $d ) {
				// Le libellé dans la carte n'a plus besoin de répéter le nom du partenaire.
				$d['libelle'] = (string) preg_replace( '/^[^:]+:\s*/u', '', $d['libelle'] );
				$d['libelle'] = $d['type'] === 'oui-non' ? __( 'Afficher sur le site', 'pose-parquet-core' ) : ucfirst( $d['libelle'] );
				Structure::champ( $d, $valeurs[ $d['cle'] ] ?? $d['defaut'], 'pp_site' );
			}
			Socle::carte_fermer();
		}
		echo '</div>';
		$restants = array_values( array_filter( $champs, static fn( array $d ): bool => ! str_starts_with( $d['cle'], 'premibel_' ) && ! str_starts_with( $d['cle'], 'allure_' ) ) );
		if ( $restants ) {
			self::carte_generique( __( 'Autres liens', 'pose-parquet-core' ), $restants, $valeurs );
		}
	}
}
