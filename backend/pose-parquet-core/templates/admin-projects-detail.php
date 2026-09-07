<?php
/**
 * Gabarit de la fiche d'une demande. Reçoit `$view` de Admin\Projects.
 *
 * Une page métier, pas un empilement de meta-boxes : les informations sont
 * groupées comme on les utilise au téléphone — qui appeler, quoi lui dire du
 * projet, puis ce qui s'est passé depuis.
 *
 * Les champs facultatifs vides ne sont PAS rendus. Une fiche criblée de « — »
 * demande au lecteur de trier le vide du plein à chaque coup d'œil ; ce qui
 * est absent n'a pas à occuper une ligne. Les champs essentiels, eux, restent
 * toujours affichés, même vides : leur absence est une information.
 *
 * @var array{project:array,history:array,notes:array,statuses:array,notice:?array,can_edit:bool,note_max:int,back_url:string,visualizer:array,acquisition:array} $view
 * @package PoseParquet\Core
 */

declare(strict_types=1);

use PoseParquet\Core\Admin\Actions;
use PoseParquet\Core\Admin\Notices;
use PoseParquet\Core\Admin\View;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$p         = $view['project'];
$id        = (int) $p['id'];
$reference = (string) ( $p['reference'] ?? '' );
$nom       = trim( (string) $p['first_name'] . ' ' . (string) $p['last_name'] );

/** Une ligne de définition, omise si la valeur est vide et le champ facultatif. */
$ligne = static function ( string $libelle, string $valeur, bool $toujours = false ): void {
	if ( $valeur === '' && ! $toujours ) {
		return;
	}
	echo '<div class="pp-field"><dt>' . esc_html( $libelle ) . '</dt><dd>' . esc_html( $valeur !== '' ? $valeur : '—' ) . '</dd></div>';
};

/** État d'un email : un mot, et la date quand elle existe. */
$etat_mail = static function ( string $statut, ?string $sent_at ): string {
	$mots = [
		'sent'    => __( 'Envoyée', 'pose-parquet-core' ),
		'failed'  => __( 'Échec', 'pose-parquet-core' ),
		'skipped' => __( 'Désactivée', 'pose-parquet-core' ),
		'pending' => __( 'En attente', 'pose-parquet-core' ),
	];
	$mot  = $mots[ $statut ] ?? $statut;
	$date = View::date( $sent_at );

	return $date !== '' ? $mot . ' — ' . $date : $mot;
};
?>
<div class="wrap pp-admin pp-detail">
	<h1 class="wp-heading-inline">
		<?php esc_html_e( 'Demande', 'pose-parquet-core' ); ?>
		<span class="pp-ref-title"><?php echo esc_html( $reference !== '' ? $reference : sprintf( '#%d', $id ) ); ?></span>
	</h1>
	<a href="<?php echo esc_url( $view['back_url'] ); ?>" class="page-title-action"><?php esc_html_e( 'Retour à la liste', 'pose-parquet-core' ); ?></a>
	<hr class="wp-header-end" />

	<?php Notices::output( $view['notice'] ); ?>

	<p class="pp-meta">
		<span class="pp-status pp-status--<?php echo esc_attr( (string) $p['status'] ); ?>">
			<?php echo esc_html( View::status( $p['status'] ) ); ?>
		</span>
		<span class="pp-sub">
			<?php
			printf(
				/* translators: %s : date de réception. */
				esc_html__( 'Reçue le %s', 'pose-parquet-core' ),
				esc_html( View::date( $p['created_at'] ) )
			);
			?>
		</span>
	</p>

	<div class="pp-cols">
		<div class="pp-col-main">

			<section class="pp-card">
				<h2><?php esc_html_e( 'Client', 'pose-parquet-core' ); ?></h2>
				<dl class="pp-fields">
					<?php $ligne( __( 'Nom', 'pose-parquet-core' ), $nom, true ); ?>
					<div class="pp-field">
						<dt><?php esc_html_e( 'Email', 'pose-parquet-core' ); ?></dt>
						<dd>
							<?php $email = (string) $p['email']; ?>
							<?php if ( is_email( $email ) ) : ?>
								<a href="<?php echo esc_url( 'mailto:' . $email ); ?>"><?php echo esc_html( $email ); ?></a>
							<?php else : ?>
								<?php echo esc_html( $email !== '' ? $email : '—' ); ?>
							<?php endif; ?>
						</dd>
					</div>
					<div class="pp-field">
						<dt><?php esc_html_e( 'Téléphone', 'pose-parquet-core' ); ?></dt>
						<dd>
							<?php
							$tel = (string) $p['phone'];
							// `tel:` n'accepte ni espace ni point : on ne garde que
							// les chiffres et un éventuel préfixe international.
							$tel_href = preg_replace( '/[^\d+]/', '', $tel );
							?>
							<?php if ( $tel !== '' && (string) $tel_href !== '' ) : ?>
								<a href="<?php echo esc_url( 'tel:' . $tel_href ); ?>"><?php echo esc_html( $tel ); ?></a>
							<?php else : ?>
								<?php echo esc_html( $tel !== '' ? $tel : '—' ); ?>
							<?php endif; ?>
						</dd>
					</div>
				</dl>
			</section>

			<section class="pp-card">
				<h2><?php esc_html_e( 'Projet', 'pose-parquet-core' ); ?></h2>
				<dl class="pp-fields">
					<?php
					$region = (string) $p['region'];
					$ligne( __( 'Zone', 'pose-parquet-core' ), $region );
					$ligne( __( 'Département', 'pose-parquet-core' ), (string) $p['department'], true );
					$ligne( __( 'Ville', 'pose-parquet-core' ), (string) $p['city'] );
					$ligne( __( 'Logement', 'pose-parquet-core' ), View::label( 'housing_type', $p['housing_type'] ), true );
					$ligne( __( 'Pièce', 'pose-parquet-core' ), View::label( 'room_type', $p['room_type'] ), true );
					$ligne( __( 'Surface', 'pose-parquet-core' ), View::surface( $p['surface'] ), true );
					$ligne( __( 'Ambiance', 'pose-parquet-core' ), View::label( 'style', $p['style'] ) );
					$ligne( __( 'Parquet', 'pose-parquet-core' ), View::label( 'parquet_type', $p['parquet_type'] ), true );
					$ligne( __( 'Support', 'pose-parquet-core' ), View::label( 'support_type', $p['support_type'] ), true );
					$ligne( __( 'Sens de pose', 'pose-parquet-core' ), View::label( 'installation_type', $p['installation_type'] ), true );
					$ligne( __( 'Délai', 'pose-parquet-core' ), View::label( 'timeframe', $p['timeframe'] ), true );
					?>
				</dl>
				<?php $message = (string) $p['message']; ?>
				<?php if ( $message !== '' ) : ?>
					<h3><?php esc_html_e( 'Message du visiteur', 'pose-parquet-core' ); ?></h3>
					<p class="pp-message"><?php echo nl2br( esc_html( $message ) ); ?></p>
				<?php endif; ?>
			</section>

			<?php if ( $view['visualizer'] ) : ?>
				<section class="pp-card">
					<h2><?php esc_html_e( 'Visualiseur', 'pose-parquet-core' ); ?></h2>
					<p class="pp-sub"><?php esc_html_e( 'Ce que le visiteur a essayé avant d’envoyer sa demande.', 'pose-parquet-core' ); ?></p>
					<dl class="pp-fields">
						<?php foreach ( $view['visualizer'] as $libelle => $valeur ) : ?>
							<?php $ligne( (string) $libelle, (string) $valeur, true ); ?>
						<?php endforeach; ?>
					</dl>
				</section>
			<?php endif; ?>

			<section class="pp-card">
				<h2><?php esc_html_e( 'Notes internes', 'pose-parquet-core' ); ?></h2>
				<p class="pp-sub"><?php esc_html_e( 'Jamais visibles du visiteur, jamais envoyées par email. Une note enregistrée ne se modifie pas : corrigez par une nouvelle note.', 'pose-parquet-core' ); ?></p>

				<?php if ( $view['can_edit'] ) : ?>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="pp-note-form">
						<?php wp_nonce_field( Actions::nonce_action( Actions::ADD_NOTE, $id ) ); ?>
						<input type="hidden" name="action" value="<?php echo esc_attr( Actions::ADD_NOTE ); ?>" />
						<input type="hidden" name="project_id" value="<?php echo esc_attr( (string) $id ); ?>" />
						<label class="screen-reader-text" for="pp-note"><?php esc_html_e( 'Nouvelle note interne', 'pose-parquet-core' ); ?></label>
						<textarea
							id="pp-note"
							name="note"
							rows="3"
							maxlength="<?php echo (int) $view['note_max']; ?>"
							placeholder="<?php esc_attr_e( 'Appelé, rappeler jeudi matin…', 'pose-parquet-core' ); ?>"
							required
						></textarea>
						<?php submit_button( __( 'Ajouter la note', 'pose-parquet-core' ), 'secondary', 'submit', false ); ?>
					</form>
				<?php endif; ?>

				<?php if ( ! $view['notes'] ) : ?>
					<p><?php esc_html_e( 'Aucune note pour le moment.', 'pose-parquet-core' ); ?></p>
				<?php else : ?>
					<ol class="pp-notes">
						<?php foreach ( $view['notes'] as $note ) : ?>
							<li>
								<p class="pp-note-head">
									<strong><?php echo esc_html( View::author( (int) $note['user_id'] ) ); ?></strong>
									<span class="pp-sub"><?php echo esc_html( View::date( $note['created_at'] ) ); ?></span>
								</p>
								<p class="pp-note-body"><?php echo nl2br( esc_html( (string) $note['content'] ) ); ?></p>
							</li>
						<?php endforeach; ?>
					</ol>
				<?php endif; ?>
			</section>
		</div>

		<div class="pp-col-side">

			<section class="pp-card">
				<h2><?php esc_html_e( 'Statut', 'pose-parquet-core' ); ?></h2>
				<?php if ( $view['can_edit'] ) : ?>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="pp-status-form">
						<?php wp_nonce_field( Actions::nonce_action( Actions::UPDATE_STATUS, $id ) ); ?>
						<input type="hidden" name="action" value="<?php echo esc_attr( Actions::UPDATE_STATUS ); ?>" />
						<input type="hidden" name="project_id" value="<?php echo esc_attr( (string) $id ); ?>" />
						<?php /* Le statut lu au rendu : le serveur refusera si la base a bougé depuis. */ ?>
						<input type="hidden" name="expected_status" value="<?php echo esc_attr( (string) $p['status'] ); ?>" />
						<label for="pp-status"><?php esc_html_e( 'Nouveau statut', 'pose-parquet-core' ); ?></label>
						<select id="pp-status" name="new_status">
							<?php foreach ( $view['statuses'] as $valeur => $libelle ) : ?>
								<option value="<?php echo esc_attr( $valeur ); ?>"<?php selected( (string) $p['status'], $valeur ); ?>>
									<?php echo esc_html( $libelle ); ?>
								</option>
							<?php endforeach; ?>
						</select>
						<?php submit_button( __( 'Mettre à jour', 'pose-parquet-core' ), 'primary', 'submit', false ); ?>
					</form>
				<?php else : ?>
					<p><?php echo esc_html( View::status( $p['status'] ) ); ?></p>
					<p class="pp-sub"><?php esc_html_e( 'Vous n’avez pas le droit de modifier le statut.', 'pose-parquet-core' ); ?></p>
				<?php endif; ?>
			</section>

			<section class="pp-card">
				<h2><?php esc_html_e( 'Emails', 'pose-parquet-core' ); ?></h2>
				<dl class="pp-fields">
					<?php
					$ligne(
						__( 'Notification interne', 'pose-parquet-core' ),
						$etat_mail( (string) $p['internal_mail_status'], $p['internal_mail_sent_at'] ),
						true
					);
					$ligne(
						__( 'Confirmation visiteur', 'pose-parquet-core' ),
						$etat_mail( (string) $p['visitor_mail_status'], $p['visitor_mail_sent_at'] ),
						true
					);
					?>
				</dl>
			</section>

			<section class="pp-card">
				<h2><?php esc_html_e( 'Historique', 'pose-parquet-core' ); ?></h2>
				<?php if ( ! $view['history'] ) : ?>
					<p><?php esc_html_e( 'Aucun événement.', 'pose-parquet-core' ); ?></p>
				<?php else : ?>
					<ol class="pp-history">
						<?php foreach ( $view['history'] as $event ) : ?>
							<li>
								<p class="pp-history-line">
									<?php
									$ancien = $event['old_status'] === null ? '' : View::status( (string) $event['old_status'] );
									if ( $ancien === '' ) {
										echo esc_html( sprintf(
											/* translators: %s : statut initial. */
											__( 'Création — %s', 'pose-parquet-core' ),
											View::status( (string) $event['new_status'] )
										) );
									} else {
										echo esc_html( sprintf(
											/* translators: 1 : ancien statut, 2 : nouveau statut. */
											__( '%1$s → %2$s', 'pose-parquet-core' ),
											$ancien,
											View::status( (string) $event['new_status'] )
										) );
									}
									?>
								</p>
								<p class="pp-sub">
									<?php echo esc_html( View::author( (int) $event['user_id'] ) ); ?>
									· <?php echo esc_html( View::date( $event['created_at'] ) ); ?>
								</p>
							</li>
						<?php endforeach; ?>
					</ol>
				<?php endif; ?>
			</section>

			<?php if ( $view['acquisition'] ) : ?>
				<section class="pp-card pp-card--quiet">
					<h2><?php esc_html_e( 'Acquisition', 'pose-parquet-core' ); ?></h2>
					<dl class="pp-fields">
						<?php foreach ( $view['acquisition'] as $libelle => $valeur ) : ?>
							<?php $ligne( (string) $libelle, (string) $valeur, true ); ?>
						<?php endforeach; ?>
					</dl>
				</section>
			<?php endif; ?>
		</div>
	</div>
</div>
