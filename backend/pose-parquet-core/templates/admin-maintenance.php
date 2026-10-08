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
 *                         (et ?pp-publication= au retour du bouton « Publier le site »)
 * @var bool   $enregistre vrai juste après un enregistrement
 */

use PoseParquet\Core\Admin\Socle;
use PoseParquet\Core\Maintenance\Reglages;
use PoseParquet\Core\Publication\Publication;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
// Le retour d'une action dit ce qui a changé dans WordPress, et ce qui reste à publier — jamais que le site public a changé s'il ne l'a pas fait.
$public   = Reglages::etat_public();
$messages = [
	'ok'         => __( 'Page de maintenance enregistrée.', 'pose-parquet-core' ),
	'active'     => $public === 'maintenance_a_publier' ? __( 'Maintenance activée dans WordPress. Publiez le site pour l’afficher aux visiteurs.', 'pose-parquet-core' ) : __( 'Maintenance activée.', 'pose-parquet-core' ),
	'desactivee' => $public === 'reactivation_a_publier' ? __( 'Maintenance désactivée dans WordPress. Le site public est encore en maintenance : publiez cette modification pour le réactiver.', 'pose-parquet-core' ) : __( 'Maintenance désactivée.', 'pose-parquet-core' ),
];
// Retour du bouton « Publier le site » du panneau (même moteur que l'écran Publication).
$publication = isset( $_GET['pp-publication'] ) ? sanitize_key( wp_unslash( $_GET['pp-publication'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
$retours_publication = [
	'lancee'       => [ 'success', __( 'Publication lancée. Cette page se met à jour toute seule.', 'pose-parquet-core' ) ],
	'en_cours'     => [ 'warning', __( 'Une publication est déjà en cours : attendez qu’elle se termine.', 'pose-parquet-core' ) ],
	'indisponible' => [ 'error', __( 'Aucune publication n’est configurée sur cette installation.', 'pose-parquet-core' ) ],
	'echec'        => [ 'error', __( 'La publication n’a pas pu démarrer.', 'pose-parquet-core' ) ],
];
?>
<div class="wrap">
	<?php Socle::entete( __( 'Maintenance', 'pose-parquet-core' ), __( 'Une page temporaire pour les visiteurs pendant vos mises à jour. L’administration reste accessible.', 'pose-parquet-core' ), '<button type="submit" form="pp-maintenance" class="adm-bouton adm-bouton--plein">' . esc_html__( 'Enregistrer', 'pose-parquet-core' ) . '</button>' ); ?>
	<?php
	// L'écart de maintenance est dit dans le panneau, avec son bouton ; le rappel général sert pour le reste.
	if ( ! in_array( $public, [ 'maintenance_a_publier', 'reactivation_a_publier' ], true ) ) {
		Publication::rappel();
	}
	?>
	<?php if ( isset( $messages[ $retour ] ) ) : ?>
		<div class="notice <?php echo $public === 'reactivation_a_publier' || $public === 'maintenance_a_publier' ? 'notice-warning' : 'notice-success'; ?> is-dismissible"><p><?php echo esc_html( $messages[ $retour ] ); ?></p></div>
	<?php endif; ?>
	<?php
	if ( $publication === 'lancee' ) {
		// La page se recharge pendant la publication : le message suit son état réel.
		$statut_pub = Publication::etat()['statut'];
		$retours_publication['lancee'] = match ( $statut_pub ) {
			'en_cours' => $retours_publication['lancee'],
			'echec'    => [ 'error', __( 'La publication a échoué : le site public n’a pas changé.', 'pose-parquet-core' ) ],
			default    => [ 'success', __( 'Publication terminée.', 'pose-parquet-core' ) ],
		};
	}
	?>
	<?php if ( isset( $retours_publication[ $publication ] ) ) : ?>
		<div class="notice notice-<?php echo esc_attr( $retours_publication[ $publication ][0] ); ?> is-dismissible"><p><?php echo esc_html( $retours_publication[ $publication ][1] ); ?></p></div>
	<?php endif; ?>

	<div class="adm-grille">
		<div>
			<?php Reglages::panneau(); ?>

			<?php Socle::carte_ouvrir( __( 'Contenu de la page', 'pose-parquet-core' ) ); ?>
			<form id="pp-maintenance" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
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

				<p class="adm-carte__actions adm-carte__actions--droite"><button type="submit" class="adm-bouton adm-bouton--plein"><?php esc_html_e( 'Enregistrer', 'pose-parquet-core' ); ?></button></p>
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

			<?php Socle::carte_ouvrir( __( 'Quand elle est activée', 'pose-parquet-core' ) ); ?>
			<?php
			Socle::etat(
				[
					[ __( 'Les visiteurs', 'pose-parquet-core' ), __( 'voient cette page', 'pose-parquet-core' ) ],
					[ __( 'Vous, connecté', 'pose-parquet-core' ), __( 'voyez le vrai site', 'pose-parquet-core' ) ],
					[ __( 'L’administration', 'pose-parquet-core' ), __( 'reste accessible', 'pose-parquet-core' ) ],
				]
			);
			?>
			<div class="adm-info"><span class="dashicons dashicons-info-outline" aria-hidden="true"></span><span><?php esc_html_e( 'Sur le site public, le changement apparaît à la prochaine publication.', 'pose-parquet-core' ); ?></span></div>
			<?php Socle::carte_fermer(); ?>
		</div>
	</div>
</div>
