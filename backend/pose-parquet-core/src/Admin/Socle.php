<?php
/**
 * SOCLE ADMIN — ce qui est commun à nos back-offices WordPress.
 *
 * Référence : le back-office Expert Parquet (plugin expert-parquet-leads,
 * classes EP_Admin, EP_Admin_Contenu, EP_Champs, EP_Maintenance). Même cadre
 * (menu sombre à rubriques et icônes, logotype), mêmes composants (chiffres,
 * cartes, état, badges, champs, panneaux, interrupteur), même logique
 * d'écrans. Ce qui change d'un site à l'autre tient dans `marque()` : le nom,
 * le logotype et UNE couleur d'accent.
 *
 * Feuilles : assets/socle/admin-shell.css (cadre, partout dans wp-admin) et
 * assets/socle/admin-composants.css (composants, sur les écrans du module).
 * Préfixe CSS neutre « adm- » : la même feuille peut servir à chaque site.
 * Pas un framework : des fonctions d'affichage, échappées, et deux feuilles.
 */

declare(strict_types=1);

namespace PoseParquet\Core\Admin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Socle {

	/**
	 * La marque du site. L'accent est celui de la direction artistique de
	 * Pose Parquet (css/tokens.css : --accent = --c-sage-deep), pas la terre
	 * cuite d'Expert Parquet, qui appartient à son identité.
	 *
	 * @return array{nom:string,logo:string,symbole:string,accent:string,accent_fonce:string,accent_clair:string,accent_pale:string,creme:string}
	 */
	public static function marque(): array {
		return [
			'nom'          => 'Pose Parquet',
			'logo'         => plugins_url( 'assets/socle/logo-on-dark.png', POSE_PARQUET_FILE ),
			// Le symbole seul, pour le menu replié.
			'symbole'      => plugins_url( 'assets/socle/logo-symbole-on-dark.svg', POSE_PARQUET_FILE ),
			'accent'       => '#46594A',
			'accent_fonce' => '#38483B',
			'accent_clair' => '#BFD0BB',
			'accent_pale'  => '#DAE2D4',
			'creme'        => '#F1F4EE',
		];
	}

	/** Écrans du module : nos pages, nos types de contenu, la médiathèque rangée chez nous. */
	public static function est_notre_ecran(): bool {
		$ecran = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $ecran ) {
			return false;
		}
		if ( str_contains( (string) $ecran->id, 'pose-parquet' ) ) {
			return true;
		}
		// La médiathèque est rangée sous « Contenu → Images » : même habillage que les autres écrans du module.
		if ( in_array( (string) $ecran->id, [ 'upload', 'media' ], true ) ) {
			return true;
		}
		if ( in_array( (string) $ecran->post_type, \PoseParquet\Core\Contenus\Types::all(), true ) ) {
			return true;
		}
		return in_array( (string) $ecran->taxonomy, [ \PoseParquet\Core\Contenus\Types::CAT_GUIDE, \PoseParquet\Core\Contenus\Types::CAT_TUTORIEL ], true );
	}

	public static function register(): void {
		add_action( 'admin_enqueue_scripts', [ self::class, 'assets' ] );
		add_filter( 'admin_body_class', [ self::class, 'classe_body' ] );
	}

	public static function classe_body( string $classes ): string {
		return self::est_notre_ecran() ? $classes . ' adm-ecran' : $classes;
	}

	public static function assets(): void {
		$base = plugins_url( 'assets/socle/', POSE_PARQUET_FILE );
		$m    = self::marque();
		// Le cadre est partout : le menu est sur chaque écran de wp-admin.
		wp_enqueue_style( 'pp-socle-shell', $base . 'admin-shell.css', [], self::version( 'assets/socle/admin-shell.css' ) );
		wp_add_inline_style(
			'pp-socle-shell',
			sprintf(
				':root{--adm-accent:%1$s;--adm-accent-clair:%2$s;--adm-logo:url("%3$s");--adm-symbole:url("%7$s");}body.adm-ecran{--adm-accent:%1$s;--adm-accent-fonce:%4$s;--adm-accent-pale:%5$s;--adm-creme:%6$s;}',
				esc_attr( $m['accent'] ),
				esc_attr( $m['accent_clair'] ),
				esc_url( $m['logo'] ),
				esc_attr( $m['accent_fonce'] ),
				esc_attr( $m['accent_pale'] ),
				esc_attr( $m['creme'] ),
				esc_url( $m['symbole'] )
			)
		);
		// Les intitulés de rubrique du menu ne sont pas des liens (même procédé qu'Expert Parquet).
		wp_add_inline_script(
			'jquery-core',
			"document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('#adminmenu .adm-menu-section').forEach(function(s){var li=s.closest('li');if(li){li.classList.add('adm-menu-section-item');}var a=s.closest('a');if(a){a.removeAttribute('href');a.setAttribute('aria-hidden','true');a.setAttribute('tabindex','-1');}});});"
		);
		if ( self::est_notre_ecran() ) {
			wp_enqueue_style( 'pp-socle-composants', $base . 'admin-composants.css', [ 'pp-socle-shell' ], self::version( 'assets/socle/admin-composants.css' ) );
		}
	}

	private static function version( string $relatif ): string {
		$chemin = POSE_PARQUET_DIR . '/' . $relatif;
		return is_file( $chemin ) ? (string) filemtime( $chemin ) : POSE_PARQUET_VERSION;
	}

	/* ------------------------------------------------------------------ menu */

	/** Un intitulé de rubrique dans un sous-menu (pas une page). */
	public static function section( string $nom ): array {
		return [ '<span class="adm-menu-section">' . esc_html( $nom ) . '</span>', 'read', 'adm-section-' . sanitize_key( $nom ), '' ];
	}

	/** Une icône devant une entrée du sous-menu, comme sur le socle. */
	public static function icone( array $entree, string $dashicon ): array {
		$entree[0] = '<span class="dashicons ' . esc_attr( $dashicon ) . ' adm-menu-icone" aria-hidden="true"></span>' . esc_html( wp_strip_all_tags( (string) $entree[0] ) );
		return $entree;
	}

	/* ------------------------------------------------------------------ rendu */

	/**
	 * Titre d'écran, description courte, et l'action principale à droite.
	 *
	 * @param string $actions_html boutons déjà échappés (formulaire ou lien)
	 */
	public static function entete( string $titre, string $sous_titre = '', string $actions_html = '' ): void {
		echo '<div class="adm-entete-actions"><h1 class="wp-heading-inline">' . esc_html( $titre ) . '</h1>';
		if ( $actions_html !== '' ) {
			echo '<div class="adm-entete__actions">' . $actions_html . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- composé et échappé par l'appelant.
		}
		echo '</div><hr class="wp-header-end">';
		if ( $sous_titre !== '' ) {
			echo '<p class="adm-entete__sous-titre">' . esc_html( $sous_titre ) . '</p>';
		}
	}

	/** État vide : une phrase qui dit ce qui se passe, pas une zone blanche. */
	public static function vide( string $titre, string $texte = '', string $dashicon = 'dashicons-yes-alt' ): void {
		echo '<div class="adm-vide-etat"><span class="dashicons ' . esc_attr( $dashicon ) . '" aria-hidden="true"></span><p><strong>' . esc_html( $titre ) . '</strong>';
		if ( $texte !== '' ) {
			echo '<span>' . esc_html( $texte ) . '</span>';
		}
		echo '</p></div>';
	}

	public static function chiffre( string $libelle, string $valeur, string $lien = '', string $texte_lien = '', bool $attention = false ): void {
		echo '<div class="adm-chiffre' . ( $attention ? ' adm-chiffre--attention' : '' ) . '">';
		echo '<span class="adm-chiffre__libelle">' . esc_html( $libelle ) . '</span>';
		echo '<span class="adm-chiffre__valeur">' . esc_html( $valeur ) . '</span>';
		if ( $lien !== '' ) {
			echo '<a class="adm-chiffre__lien" href="' . esc_url( $lien ) . '">' . esc_html( $texte_lien ) . '</a>';
		}
		echo '</div>';
	}

	/** @param string $badge_html un badge (Socle::badge) aligné à droite du titre */
	public static function carte_ouvrir( string $titre, string $classe = '', string $badge_html = '' ): void {
		echo '<section class="adm-carte ' . esc_attr( $classe ) . '"><h2 class="adm-carte__titre">' . esc_html( $titre );
		if ( $badge_html !== '' ) {
			echo ' ' . $badge_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe.
		}
		echo '</h2><div class="adm-carte__corps">';
	}

	public static function carte_fermer( string $pied_html = '' ): void {
		echo '</div>';
		if ( $pied_html !== '' ) {
			echo '<div class="adm-carte__pied">' . wp_kses_post( $pied_html ) . '</div>';
		}
		echo '</section>';
	}

	/**
	 * Liste « libellé → valeur ».
	 *
	 * @param array<int,array{0:string,1:string,2?:string}> $lignes [libellé, valeur, état ok|attente|ko|'']
	 */
	public static function etat( array $lignes, string $note = '' ): void {
		echo '<dl class="adm-etat">';
		foreach ( $lignes as $l ) {
			$classe = ! empty( $l[2] ) ? ' adm-etat__valeur adm-etat__valeur--' . $l[2] : '';
			echo '<dt>' . esc_html( $l[0] ) . '</dt><dd class="' . esc_attr( trim( $classe ) ) . '">' . esc_html( $l[1] ) . '</dd>';
		}
		if ( $note !== '' ) {
			echo '<dd class="adm-etat__note">' . esc_html( $note ) . '</dd>';
		}
		echo '</dl>';
	}

	public static function badge( string $texte, string $variante = '' ): string {
		return '<span class="adm-badge' . ( $variante !== '' ? ' adm-badge--' . esc_attr( $variante ) : '' ) . '">' . esc_html( $texte ) . '</span>';
	}

	/**
	 * Interrupteur qui bascule un réglage par son propre formulaire, avec
	 * confirmation — la manière d'Expert Parquet pour la maintenance.
	 */
	public static function interrupteur( bool $actif, string $action, string $confirmer, string $libelle_on = 'Activé', string $libelle_off = 'Désactivé' ): void {
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="adm-toggle-form" data-adm-confirmer="' . esc_attr( $confirmer ) . '">';
		echo '<input type="hidden" name="action" value="' . esc_attr( $action ) . '">';
		wp_nonce_field( $action );
		printf(
			'<button type="submit" class="adm-toggle%s" role="switch" aria-checked="%s" aria-label="%s"><span class="adm-toggle__curseur"></span></button><span class="adm-toggle__libelle">%s</span>',
			$actif ? ' adm-toggle--on' : '',
			$actif ? 'true' : 'false',
			esc_attr( $actif ? 'Désactiver' : 'Activer' ),
			esc_html( $actif ? $libelle_on : $libelle_off )
		);
		echo '</form>';
	}
}
