<?php
/**
 * Écran « Publication » : prévisualiser ce qui va partir, publier, relire
 * les dernières publications.
 *
 *   Enregistrer → Prévisualiser → Publier le site
 *
 * Les changements sont calculés (export actuel ≠ instantané publié) : rien à
 * mémoriser. Chaque guide ou tutoriel modifié a son aperçu public ; Mon
 * site, les pages et la maintenance renvoient à leur écran.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

use PoseParquet\Core\Admin\SitePublic;
use PoseParquet\Core\Admin\Socle;
use PoseParquet\Core\Contenus\Apercu;
use PoseParquet\Core\Contenus\Types;
use PoseParquet\Core\Publication\Publication;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$e       = Publication::etat();
$journal = Publication::memoire()['journal'];
$retours = [
	'lancee'       => [ 'success', __( 'Publication lancée. L’état se met à jour tout seul.', 'pose-parquet-core' ) ],
	'en_cours'     => [ 'warning', __( 'Une publication est déjà en cours : attendez qu’elle se termine.', 'pose-parquet-core' ) ],
	'indisponible' => [ 'error', __( 'Aucune publication n’est configurée sur cette installation.', 'pose-parquet-core' ) ],
	'echec'        => [ 'error', __( 'La publication n’a pas pu démarrer.', 'pose-parquet-core' ) ],
];
$retour = isset( $_GET['pp-publication'] ) ? sanitize_key( wp_unslash( $_GET['pp-publication'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

/** Les liens d'un changement : aperçu public (guides, tutoriels), édition. */
$liens = static function ( array $c ): string {
	if ( $c['type'] === 'site' ) {
		return '<a href="' . esc_url( \PoseParquet\Core\Site\MonSite::url() ) . '">' . esc_html__( 'Mon site', 'pose-parquet-core' ) . '</a>';
	}
	if ( $c['type'] === 'maintenance' ) {
		return '<a href="' . esc_url( \PoseParquet\Core\Maintenance\Reglages::url() ) . '">' . esc_html__( 'Maintenance', 'pose-parquet-core' ) . '</a>';
	}
	$post = null;
	if ( in_array( $c['type'], [ Types::GUIDE, Types::TUTORIEL, Types::INSPIRATION ], true ) ) {
		$post = get_page_by_path( (string) ( $c['cle'] ?? '' ), OBJECT, $c['type'] );
	} elseif ( $c['type'] === Types::PAGE ) {
		$ids  = get_posts( [ 'post_type' => Types::PAGE, 'post_status' => 'any', 'meta_key' => '_pp_cle', 'meta_value' => (string) ( $c['cle'] ?? '' ), 'fields' => 'ids', 'posts_per_page' => 1 ] ); // phpcs:ignore WordPress.DB.SlowDBQuery
		$post = $ids ? get_post( (int) $ids[0] ) : null;
	}
	if ( ! $post ) {
		return '';
	}
	$out = '';
	if ( isset( Apercu::GABARITS[ $post->post_type ] ) && $post->post_status !== 'trash' ) {
		$out .= '<a href="' . esc_url( Apercu::url( $post->ID ) ) . '" target="_blank" rel="noopener">' . esc_html__( 'Aperçu', 'pose-parquet-core' ) . '</a> · ';
	}
	return $out . '<a href="' . esc_url( (string) get_edit_post_link( $post->ID ) ) . '">' . esc_html__( 'Modifier', 'pose-parquet-core' ) . '</a>';
};
?>
<div class="wrap">
	<?php
	// L'action principale en tête d'écran : prévisualiser les changements, puis publier.
	Socle::entete(
		__( 'Publication', 'pose-parquet-core' ),
		__( 'Enregistrer, prévisualiser, puis publier : le site public est reconstruit à partir de WordPress, sans ligne de commande.', 'pose-parquet-core' ),
		'<a class="adm-bouton" href="#pp-changements"><span class="dashicons dashicons-visibility" aria-hidden="true"></span>' . esc_html__( 'Prévisualiser', 'pose-parquet-core' ) . '</a>' . Publication::bouton( $e )
	);
	?>
	<?php if ( isset( $retours[ $retour ] ) ) : ?>
		<div class="notice notice-<?php echo esc_attr( $retours[ $retour ][0] ); ?> is-dismissible"><p><?php echo esc_html( $retours[ $retour ][1] ); ?></p></div>
	<?php endif; ?>

	<?php Publication::bandeau(); ?>

	<div class="adm-grille">
		<div>
			<span id="pp-changements" class="adm-ancre"></span>
			<?php Socle::carte_ouvrir( __( 'Changements à publier', 'pose-parquet-core' ) ); ?>
			<?php if ( $e['statut'] === 'en_cours' ) : ?>
				<?php Socle::vide( __( 'Publication en cours.', 'pose-parquet-core' ), __( 'La liste sera recalculée à la fin.', 'pose-parquet-core' ), 'dashicons-update' ); ?>
			<?php elseif ( ! $e['changements'] ) : ?>
				<?php Socle::vide( __( 'Aucune modification à publier.', 'pose-parquet-core' ), __( 'Votre site est à jour : il affiche exactement ce qui est publié dans WordPress.', 'pose-parquet-core' ) ); ?>
			<?php else : ?>
				<div class="adm-defilement"><table class="adm-table">
					<thead><tr><th><?php esc_html_e( 'Élément', 'pose-parquet-core' ); ?></th><th><?php esc_html_e( 'Changement', 'pose-parquet-core' ); ?></th><th><?php esc_html_e( 'Voir', 'pose-parquet-core' ); ?></th></tr></thead>
					<tbody>
					<?php foreach ( $e['changements'] as $c ) : ?>
						<tr><td><?php echo esc_html( $c['libelle'] ); ?></td><td><?php echo esc_html( $c['changement'] ); ?></td><td class="adm-table__liens"><?php echo $liens( $c ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- composé et échappé ci-dessus. ?></td></tr>
					<?php endforeach; ?>
					</tbody>
				</table></div>
			<?php endif; ?>
			<?php Socle::carte_fermer( '<a href="' . esc_url( SitePublic::url() ) . '" target="_blank" rel="noopener">' . esc_html__( 'Voir le site actuellement publié ↗', 'pose-parquet-core' ) . '</a>' ); ?>

			<?php Socle::carte_ouvrir( __( 'Journal des publications', 'pose-parquet-core' ) ); ?>
			<?php if ( ! $journal ) : ?>
				<?php Socle::vide( __( 'Aucune publication pour le moment.', 'pose-parquet-core' ), __( 'Les publications lancées depuis WordPress apparaîtront ici.', 'pose-parquet-core' ), 'dashicons-clock' ); ?>
			<?php else : ?>
				<div class="adm-defilement"><table class="adm-table adm-table--empilable adm-journal">
					<thead><tr><th><?php esc_html_e( 'Date', 'pose-parquet-core' ); ?></th><th><?php esc_html_e( 'Environnement', 'pose-parquet-core' ); ?></th><th><?php esc_html_e( 'Utilisateur', 'pose-parquet-core' ); ?></th><th class="adm-nombre"><?php esc_html_e( 'Durée', 'pose-parquet-core' ); ?></th><th><?php esc_html_e( 'Résultat', 'pose-parquet-core' ); ?></th></tr></thead>
					<tbody>
					<?php foreach ( $journal as $l ) : ?>
						<?php
						// Les lignes d'avant ce champ n'ont qu'un mode : local → Local, github → préproduction.
						[ $pp_env, $pp_var ] = Publication::libelle_environnement( (string) ( $l['environnement'] ?? Publication::environnement( (string) ( $l['mode'] ?? 'local' ) ) ) );
						$pp_succes           = $l['resultat'] === 'succes';
						$pp_empreinte        = (string) ( $l['empreinte'] ?? '' );
						?>
						<tr>
							<th scope="row"><?php echo esc_html( wp_date( 'j M Y, H:i', (int) $l['date'] ) ); ?></th>
							<td data-label="<?php esc_attr_e( 'Environnement', 'pose-parquet-core' ); ?>"><?php echo Socle::badge( $pp_env, $pp_var ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe. ?></td>
							<td data-label="<?php esc_attr_e( 'Utilisateur', 'pose-parquet-core' ); ?>"><?php echo esc_html( (string) $l['utilisateur'] ); ?></td>
							<td class="adm-nombre" data-label="<?php esc_attr_e( 'Durée', 'pose-parquet-core' ); ?>"><?php echo esc_html( sprintf( '%d s', (int) $l['duree'] ) ); ?></td>
							<td data-label="<?php esc_attr_e( 'Résultat', 'pose-parquet-core' ); ?>">
								<?php echo Socle::badge( $pp_succes ? __( 'Succès', 'pose-parquet-core' ) : __( 'Échec', 'pose-parquet-core' ), $pp_succes ? 'ok' : 'ko' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe. ?>
								<?php if ( ! $pp_succes && ( $l['raison'] !== '' || $pp_empreinte !== '' ) ) : ?>
									<?php // Le détail technique reste replié : on le déplie quand on en a besoin. ?>
									<details class="adm-details">
										<summary><?php esc_html_e( 'Détails', 'pose-parquet-core' ); ?></summary>
										<?php if ( $l['raison'] !== '' ) : ?>
											<p><?php echo esc_html( $l['raison'] ); ?><?php echo ! empty( $l['site_intact'] ) ? ' ' . esc_html__( 'Site en ligne inchangé.', 'pose-parquet-core' ) : ''; ?></p>
										<?php endif; ?>
										<?php if ( $pp_empreinte !== '' ) : ?>
											<p><?php esc_html_e( 'Empreinte du contenu :', 'pose-parquet-core' ); ?> <code><?php echo esc_html( $pp_empreinte ); ?></code></p>
										<?php endif; ?>
									</details>
								<?php endif; ?>
							</td>
						</tr>
					<?php endforeach; ?>
					</tbody>
				</table></div>
			<?php endif; ?>
			<?php Socle::carte_fermer(); ?>
		</div>

		<div>
			<?php Socle::carte_ouvrir( __( 'Comment le site est publié', 'pose-parquet-core' ) ); ?>
			<?php
			$modes = [
				'local'  => __( 'Local : WordPress lance le script de publication du dépôt (export → validation → build).', 'pose-parquet-core' ),
				'github' => __( 'GitHub : WordPress déclenche le workflow de déploiement, qui tire l’export, valide, construit et déploie.', 'pose-parquet-core' ),
				'aucune' => wp_get_environment_type() === 'local' ? __( 'Non configurée : ni dossier local avec Node, ni GitHub (wp-config.php).', 'pose-parquet-core' ) : __( 'Publication GitHub à configurer (jeton et dépôt dans wp-config.php, WP_EXPORT_URL dans GitHub).', 'pose-parquet-core' ),
			];
			Socle::etat(
				[
					[ __( 'Mode', 'pose-parquet-core' ), [ 'local' => 'Local', 'github' => 'GitHub Actions', 'aucune' => __( 'Aucun', 'pose-parquet-core' ) ][ $e['mode'] ] ],
				],
				$modes[ $e['mode'] ]
			);
			?>
			<div class="adm-info"><span class="dashicons dashicons-info-outline" aria-hidden="true"></span><span><?php esc_html_e( 'Si le contenu est refusé ou si le build échoue, le site en ligne reste celui d’avant. Une seule publication à la fois.', 'pose-parquet-core' ); ?></span></div>
			<?php Socle::carte_fermer(); ?>
		</div>
	</div>
</div>
