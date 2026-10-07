<?php
/**
 * Écran « Maintenance », dans le socle commun (référence : le panneau de
 * maintenance d'Expert Parquet).
 *
 *   gauche : le panneau — interrupteur (son propre formulaire, confirmé),
 *            puis le contenu de la page (titre, message, image, liens) ;
 *   droite : l'aperçu de la page publique, et ce que la maintenance fait
 *            réellement (503, accès des administrateurs, site statique).
 *
 * @var array  $m          réglages
 * @var string $image_url  vignette de l'image de fond
 * @var string $apercu     URL de l'aperçu (avec jeton)
 * @var string $retour     retour d'une action (ok | active | desactivee)
 * @var bool   $enregistre vrai juste après un enregistrement
 */

use PoseParquet\Core\Admin\Socle;
use PoseParquet\Core\Maintenance\Reglages;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$messages = [
	'ok'         => __( 'Page de maintenance enregistrée.', 'pose-parquet-core' ),
	'active'     => __( 'Maintenance activée : le public voit la page de maintenance.', 'pose-parquet-core' ),
	'desactivee' => __( 'Maintenance désactivée : le site public est de nouveau ouvert.', 'pose-parquet-core' ),
];
?>
<div class="wrap">
	<?php Socle::entete( __( 'Maintenance', 'pose-parquet-core' ), __( 'Une page temporaire pour les visiteurs pendant vos mises à jour. L’administration reste accessible.', 'pose-parquet-core' ) ); ?>
	<?php \PoseParquet\Core\Publication\Publication::rappel(); ?>
	<?php if ( isset( $messages[ $retour ] ) ) : ?>
		<div class="notice notice-success is-dismissible"><p><?php echo esc_html( $messages[ $retour ] ); ?></p></div>
	<?php endif; ?>

	<div class="adm-grille">
		<div>
			<?php Reglages::panneau(); ?>

			<?php Socle::carte_ouvrir( __( 'Contenu de la page', 'pose-parquet-core' ) ); ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="<?php echo esc_attr( Reglages::ACTION ); ?>" />
				<?php wp_nonce_field( Reglages::ACTION ); ?>

				<p class="adm-champ">
					<label for="pp-titre"><?php esc_html_e( 'Titre de la page', 'pose-parquet-core' ); ?></label>
					<input type="text" id="pp-titre" name="pp_titre" maxlength="120" value="<?php echo esc_attr( $m['titre'] ); ?>" />
				</p>
				<p class="adm-champ">
					<label for="pp-message"><?php esc_html_e( 'Message', 'pose-parquet-core' ); ?></label>
					<textarea id="pp-message" name="pp_message" rows="4" maxlength="600"><?php echo esc_textarea( $m['message'] ); ?></textarea>
				</p>

				<div class="adm-champ adm-image adm-image--ligne" data-pp-couverture>
					<span class="adm-champ__libelle"><?php esc_html_e( 'Image de fond', 'pose-parquet-core' ); ?></span>
					<input type="hidden" name="pp_image" value="<?php echo esc_attr( (string) $m['image'] ); ?>" data-pp-couverture-id />
					<div class="adm-image__corps">
						<div class="adm-image__apercu" data-pp-couverture-apercu>
							<?php if ( $image_url ) : ?>
								<img src="<?php echo esc_url( $image_url ); ?>" alt="" />
							<?php else : ?>
								<span class="adm-image__vide"><?php esc_html_e( 'Aucune image', 'pose-parquet-core' ); ?></span>
							<?php endif; ?>
						</div>
						<span class="adm-image__actions">
							<button type="button" class="adm-bouton adm-bouton--petit" data-pp-choisir><span class="dashicons dashicons-format-image" aria-hidden="true"></span><span data-pp-choisir-texte><?php echo esc_html( $image_url ? __( 'Remplacer l’image', 'pose-parquet-core' ) : __( 'Choisir une image', 'pose-parquet-core' ) ); ?></span></button>
							<button type="button" class="adm-bouton adm-bouton--petit adm-bouton--danger" data-pp-retirer <?php echo $image_url ? '' : 'hidden'; ?>><?php esc_html_e( 'Retirer', 'pose-parquet-core' ); ?></button>
						</span>
					</div>
				</div>

				<fieldset class="adm-champ adm-champ--case">
					<legend><?php esc_html_e( 'Liens à afficher', 'pose-parquet-core' ); ?></legend>
					<label><input type="checkbox" name="pp_premibel" value="1" <?php checked( $m['premibel'] ); ?> /> <?php esc_html_e( 'Premibel — Trouver un parquet', 'pose-parquet-core' ); ?></label><br />
					<label><input type="checkbox" name="pp_allure" value="1" <?php checked( $m['allure'] ); ?> /> <?php esc_html_e( 'Allure Design — Pose et rénovation en Île-de-France', 'pose-parquet-core' ); ?></label>
				</fieldset>

				<p><button type="submit" class="adm-bouton adm-bouton--plein"><?php esc_html_e( 'Enregistrer la page de maintenance', 'pose-parquet-core' ); ?></button></p>
			</form>
			<?php Socle::carte_fermer(); ?>
		</div>

		<div>
			<?php Socle::carte_ouvrir( __( 'Aperçu de la page publique', 'pose-parquet-core' ) ); ?>
			<div class="adm-apercu-cadre">
				<iframe src="<?php echo esc_url( $apercu ); ?>" title="<?php esc_attr_e( 'Aperçu de la page de maintenance', 'pose-parquet-core' ); ?>" loading="lazy" tabindex="-1"></iframe>
			</div>
			<p class="adm-note"><?php esc_html_e( 'Aperçu des paramètres enregistrés.', 'pose-parquet-core' ); ?> <a href="<?php echo esc_url( $apercu ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Ouvrir en grand', 'pose-parquet-core' ); ?></a></p>
			<?php Socle::carte_fermer(); ?>

			<?php Socle::carte_ouvrir( __( 'Comment elle s’applique', 'pose-parquet-core' ) ); ?>
			<?php
			Socle::etat(
				[
					[ __( 'Visiteurs', 'pose-parquet-core' ), __( 'page de maintenance, HTTP 503 + Retry-After', 'pose-parquet-core' ) ],
					[ __( 'Administrateurs connectés', 'pose-parquet-core' ), __( 'voient le vrai site', 'pose-parquet-core' ) ],
					[ __( 'Administration, API, cron', 'pose-parquet-core' ), __( 'jamais bloqués', 'pose-parquet-core' ) ],
				]
			);
			?>
			<div class="adm-info"><span class="dashicons dashicons-info-outline" aria-hidden="true"></span><span><?php esc_html_e( 'Le site public est un site statique (GitHub Pages) : il ne peut pas répondre en 503. Il affiche la même page après la prochaine publication (export puis build) ; l’aperçu y reste possible avec ?apercu=1.', 'pose-parquet-core' ); ?></span></div>
			<?php Socle::carte_fermer(); ?>
		</div>
	</div>
</div>
