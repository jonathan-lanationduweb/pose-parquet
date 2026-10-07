<?php
/**
 * Gabarit de la page « Réglages », dans le socle commun : des cartes
 * groupées comme les Réglages d'Expert Parquet, sur DEUX colonnes —
 *
 *   Notifications      Site public
 *   Environnement      Mises à jour
 *   Rôles et droits (pleine largeur)
 *
 * Deux cartes s'enregistrent (Notifications, par la Settings API ; Site
 * public, par admin-post) ; les autres se lisent.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

use PoseParquet\Core\Admin\Menu;
use PoseParquet\Core\Admin\Settings;
use PoseParquet\Core\Admin\SitePublic;
use PoseParquet\Core\Admin\Socle;
use PoseParquet\Core\Contenus\Apercu;
use PoseParquet\Core\Security\Roles;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
global $wpdb;
$site_ok   = isset( $_GET['pp-site-public'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
// La constante, si elle est définie, prime sur l'option de l'écran Mises à jour.
$constante = defined( 'WP_AUTO_UPDATE_CORE' ) ? WP_AUTO_UPDATE_CORE : null;
$majeures  = $constante !== null
	? in_array( $constante, [ true, 'beta', 'rc', 'development', 'branch-development' ], true )
	: get_site_option( 'auto_update_core_major', '' ) === 'enabled';
$mineures  = $constante === null || $constante !== false;
$oui       = static fn(): string => Socle::badge( __( 'Oui', 'pose-parquet-core' ), 'ok' );
$non       = static fn(): string => Socle::badge( __( 'Non', 'pose-parquet-core' ), 'neutre' );
$roles     = [
	[ __( 'Administrateur', 'pose-parquet-core' ), true, true, true ],
	[ Roles::MANAGER_LABEL, false, true, false ],
	[ __( 'Autres rôles', 'pose-parquet-core' ), false, false, false ],
];
?>
<div class="wrap">
	<?php Socle::entete( __( 'Réglages', 'pose-parquet-core' ), __( 'Les réglages du module et l’état de l’installation.', 'pose-parquet-core' ) ); ?>
	<?php settings_errors( Settings::OPTION ); ?>
	<?php if ( $site_ok ) : ?>
		<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Réglages du site public enregistrés.', 'pose-parquet-core' ); ?></p></div>
	<?php endif; ?>

	<div class="adm-reglages adm-reglages--2">
		<?php Socle::carte_ouvrir( __( 'Notifications', 'pose-parquet-core' ) ); ?>
		<form method="post" action="<?php echo esc_url( admin_url( 'options.php' ) ); ?>">
			<?php
			settings_fields( Settings::GROUP );
			do_settings_sections( Settings::PAGE );
			?>
			<p class="adm-carte__actions"><button type="submit" class="adm-bouton adm-bouton--plein"><?php esc_html_e( 'Enregistrer', 'pose-parquet-core' ); ?></button></p>
		</form>
		<?php Socle::carte_fermer(); ?>

		<?php Socle::carte_ouvrir( __( 'Site public', 'pose-parquet-core' ) ); ?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="<?php echo esc_attr( SitePublic::ACTION ); ?>" />
			<?php wp_nonce_field( SitePublic::ACTION ); ?>
			<p class="adm-champ">
				<label for="pp-site-public"><?php esc_html_e( 'Adresse du site public', 'pose-parquet-core' ); ?></label>
				<input type="url" id="pp-site-public" name="pp_site_public" value="<?php echo esc_attr( (string) get_option( SitePublic::OPTION, '' ) ); ?>" placeholder="<?php echo esc_attr( SitePublic::defaut() ); ?>" />
				<span class="description"><?php echo esc_html( sprintf( /* translators: %s: URL */ __( 'Vide : %s', 'pose-parquet-core' ), SitePublic::defaut() ) ); ?></span>
			</p>
			<p class="adm-champ">
				<label for="pp-site-dossier"><?php esc_html_e( 'Dossier du site sur cette machine (développement)', 'pose-parquet-core' ); ?></label>
				<input type="text" id="pp-site-dossier" name="pp_site_dossier" value="<?php echo esc_attr( SitePublic::dossier() ); ?>" placeholder="C:\…\pose-parquet.com" />
				<span class="description"><?php echo esc_html( Apercu::dossier() ? __( 'Utilisé : l’éditeur, l’aperçu et le catalogue lisent les fichiers du site ici, sans serveur de développement.', 'pose-parquet-core' ) : __( 'Vide : les fichiers sont lus sur l’adresse du site public.', 'pose-parquet-core' ) ); ?></span>
			</p>
			<p class="adm-carte__actions"><button type="submit" class="adm-bouton adm-bouton--plein"><?php esc_html_e( 'Enregistrer', 'pose-parquet-core' ); ?></button></p>
		</form>
		<?php Socle::carte_fermer(); ?>

		<?php Socle::carte_ouvrir( __( 'Environnement', 'pose-parquet-core' ) ); ?>
		<?php
		Socle::etat(
			[
				[ __( 'Environnement', 'pose-parquet-core' ), wp_get_environment_type() ],
				[ 'WordPress', get_bloginfo( 'version' ) ],
				[ 'PHP', PHP_VERSION ],
				[ 'MySQL', (string) $wpdb->db_version() ],
				[ __( 'Module Pose Parquet', 'pose-parquet-core' ), POSE_PARQUET_VERSION ],
			]
		);
		?>
		<?php Socle::carte_fermer( '<a href="' . esc_url( Menu::status_url() ) . '">' . esc_html__( 'État technique →', 'pose-parquet-core' ) . '</a>' ); ?>

		<?php Socle::carte_ouvrir( __( 'Mises à jour de WordPress', 'pose-parquet-core' ) ); ?>
		<?php
		Socle::etat(
			[
				[ __( 'Versions mineures', 'pose-parquet-core' ), $mineures ? __( 'Automatiques', 'pose-parquet-core' ) : __( 'Manuelles', 'pose-parquet-core' ), $mineures ? 'ok' : 'attente' ],
				[ __( 'Versions majeures', 'pose-parquet-core' ), $majeures ? __( 'Automatiques', 'pose-parquet-core' ) : __( 'Manuelles', 'pose-parquet-core' ), $majeures ? 'attente' : 'ok' ],
				[ 'WP_AUTO_UPDATE_CORE', $constante === null ? __( 'non défini', 'pose-parquet-core' ) : ( is_bool( $constante ) ? ( $constante ? 'true' : 'false' ) : (string) $constante ) ],
			],
			$constante === 'minor'
				? __( 'Réglé dans wp-config.php : une version majeure s’installe à la main, quand elle a été décidée.', 'pose-parquet-core' )
				: __( 'Recommandé : define( \'WP_AUTO_UPDATE_CORE\', \'minor\' ); dans wp-config.php (non appliqué d’ici).', 'pose-parquet-core' )
		);
		?>
		<?php Socle::carte_fermer(); ?>

		<?php Socle::carte_ouvrir( __( 'Rôles et droits', 'pose-parquet-core' ), 'adm-reglages__large' ); ?>
		<table class="adm-table adm-table--empilable">
			<thead><tr><th scope="col"><?php esc_html_e( 'Rôle', 'pose-parquet-core' ); ?></th><th scope="col"><?php esc_html_e( 'Contenus', 'pose-parquet-core' ); ?></th><th scope="col"><?php esc_html_e( 'Projets', 'pose-parquet-core' ); ?></th><th scope="col"><?php esc_html_e( 'Réglages', 'pose-parquet-core' ); ?></th></tr></thead>
			<tbody>
			<?php foreach ( $roles as [ $nom, $contenus, $projets, $reglages ] ) : ?>
				<tr>
					<th scope="row"><?php echo esc_html( $nom ); ?></th>
					<td data-label="<?php esc_attr_e( 'Contenus', 'pose-parquet-core' ); ?>"><?php echo $contenus ? $oui() : $non(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe. ?></td>
					<td data-label="<?php esc_attr_e( 'Projets', 'pose-parquet-core' ); ?>"><?php echo $projets ? $oui() : $non(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
					<td data-label="<?php esc_attr_e( 'Réglages', 'pose-parquet-core' ); ?>"><?php echo $reglages ? $oui() : $non(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<p class="adm-carte__aide"><?php esc_html_e( 'Les contenus éditoriaux restent réservés aux administrateurs. Le détail réel des droits, rôle par rôle, est sur la page État.', 'pose-parquet-core' ); ?></p>
		<?php Socle::carte_fermer(); ?>
	</div>
</div>
