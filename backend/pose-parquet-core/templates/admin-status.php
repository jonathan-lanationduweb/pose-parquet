<?php
/**
 * Gabarit de la page « État ». Reçoit `$state` de Admin\Menu::render_status().
 *
 * @var array{plugin_version:string,schema_expected:int,schema_installed:int,installed_at:string,tables:array<string,bool>,caps:array<string,bool>,statuses:array<string,string>,health_url:string} $state
 * @package PoseParquet\Core
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$oui_non = static fn( bool $ok ): string => $ok
	? '<span style="color:#1a7f37">&#10003; ' . esc_html__( 'oui', 'pose-parquet-core' ) . '</span>'
	: '<span style="color:#b42318">&#10007; ' . esc_html__( 'non', 'pose-parquet-core' ) . '</span>';
?>
<div class="wrap">
	<h1><?php esc_html_e( 'Pose Parquet — État du plugin', 'pose-parquet-core' ); ?></h1>
	<?php \PoseParquet\Core\Admin\Notices::output( \PoseParquet\Core\Admin\Notices::pending() ); ?>
	<p><?php esc_html_e( 'Page de diagnostic technique : ce que le plugin a réellement installé. Le travail quotidien se fait dans « Projets ».', 'pose-parquet-core' ); ?></p>

	<table class="widefat striped" style="max-width:40rem">
		<tbody>
			<tr><th scope="row"><?php esc_html_e( 'Version du plugin', 'pose-parquet-core' ); ?></th><td><code><?php echo esc_html( $state['plugin_version'] ); ?></code></td></tr>
			<tr><th scope="row"><?php esc_html_e( 'Schéma de base attendu', 'pose-parquet-core' ); ?></th><td><code><?php echo (int) $state['schema_expected']; ?></code></td></tr>
			<tr><th scope="row"><?php esc_html_e( 'Schéma de base installé', 'pose-parquet-core' ); ?></th><td><code><?php echo (int) $state['schema_installed']; ?></code> <?php echo $oui_non( $state['schema_installed'] === $state['schema_expected'] ); // phpcs:ignore WordPress.Security.EscapeOutput ?></td></tr>
			<tr><th scope="row"><?php esc_html_e( 'Installé le (UTC)', 'pose-parquet-core' ); ?></th><td><?php echo esc_html( $state['installed_at'] ?: '—' ); ?></td></tr>
		</tbody>
	</table>

	<h2><?php esc_html_e( 'Tables', 'pose-parquet-core' ); ?></h2>
	<table class="widefat striped" style="max-width:40rem">
		<tbody>
			<?php foreach ( $state['tables'] as $logical => $ok ) : ?>
				<tr><th scope="row"><code>pp_<?php echo esc_html( $logical === 'projects' ? 'projects' : 'project_' . $logical ); ?></code></th><td><?php echo $oui_non( $ok ); // phpcs:ignore WordPress.Security.EscapeOutput ?></td></tr>
			<?php endforeach; ?>
		</tbody>
	</table>

	<h2><?php esc_html_e( 'Droits du rôle administrateur', 'pose-parquet-core' ); ?></h2>
	<table class="widefat striped" style="max-width:40rem">
		<tbody>
			<?php foreach ( $state['caps'] as $cap => $ok ) : ?>
				<tr><th scope="row"><code><?php echo esc_html( $cap ); ?></code></th><td><?php echo $oui_non( $ok ); // phpcs:ignore WordPress.Security.EscapeOutput ?></td></tr>
			<?php endforeach; ?>
		</tbody>
	</table>

	<h2><?php esc_html_e( 'Statuts de projet', 'pose-parquet-core' ); ?></h2>
	<p>
		<?php foreach ( $state['statuses'] as $value => $label ) : ?>
			<code><?php echo esc_html( $value ); ?></code> <?php echo esc_html( $label ); ?> &nbsp;
		<?php endforeach; ?>
	</p>

	<h2><?php esc_html_e( 'API REST', 'pose-parquet-core' ); ?></h2>
	<p><a href="<?php echo esc_url( $state['health_url'] ); ?>" target="_blank" rel="noopener"><code><?php echo esc_html( $state['health_url'] ); ?></code></a></p>
	<p><code>POST <?php echo esc_html( $state['projects_url'] ); ?></code> — <?php esc_html_e( 'enregistrement d’un projet qualifié (formulaire public « Décrivez votre projet »).', 'pose-parquet-core' ); ?></p>
	<p><code>GET <?php echo esc_html( $state['form_token_url'] ); ?></code> — <?php esc_html_e( 'jeton temporel à joindre à chaque dépôt.', 'pose-parquet-core' ); ?></p>

	<h2><?php esc_html_e( 'Emails', 'pose-parquet-core' ); ?></h2>
	<?php $mail = $state['mail']; ?>
	<?php if ( ! $mail['production_ready'] ) : ?>
		<div class="notice notice-warning inline" style="max-width:40rem;margin:0 0 1rem">
			<p><strong><?php esc_html_e( 'Cette installation ne peut pas être considérée comme prête à recevoir de vraies demandes.', 'pose-parquet-core' ); ?></strong></p>
			<ul style="list-style:disc;margin-left:1.5rem">
				<?php if ( ! $mail['explicit'] ) : ?>
					<li><?php esc_html_e( 'Aucune adresse n’a été saisie : celle affichée est héritée de l’adresse d’administration du site.', 'pose-parquet-core' ); ?></li>
				<?php endif; ?>
				<?php if ( ! $mail['deliverable'] ) : ?>
					<li><?php esc_html_e( 'Le domaine de l’adresse est réservé aux tests (RFC 2606) : aucun email ne peut y arriver.', 'pose-parquet-core' ); ?></li>
				<?php endif; ?>
				<?php if ( ! $mail['transport_declared'] ) : ?>
					<li><?php esc_html_e( 'Aucun transport d’email n’est déclaré sur ce WordPress : wp_mail() n’a rien pour remettre le message.', 'pose-parquet-core' ); ?></li>
				<?php endif; ?>
			</ul>
		</div>
	<?php endif; ?>
	<table class="widefat striped" style="max-width:40rem">
		<tbody>
			<tr>
				<th scope="row"><?php esc_html_e( 'Adresse de réception', 'pose-parquet-core' ); ?></th>
				<td>
					<code><?php echo esc_html( $mail['recipient'] ?: '—' ); ?></code><br />
					<?php echo $oui_non( $mail['explicit'] ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					<?php echo $mail['explicit'] ? esc_html__( 'saisie dans les réglages', 'pose-parquet-core' ) : esc_html__( 'héritée de l’adresse d’administration — jamais choisie', 'pose-parquet-core' ); ?>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e( 'Domaine joignable', 'pose-parquet-core' ); ?></th>
				<td><?php echo $oui_non( $mail['deliverable'] ); // phpcs:ignore WordPress.Security.EscapeOutput ?> <?php echo $mail['deliverable'] ? esc_html__( 'domaine ordinaire', 'pose-parquet-core' ) : esc_html__( 'domaine réservé aux tests', 'pose-parquet-core' ); ?></td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e( 'Transport', 'pose-parquet-core' ); ?></th>
				<td>
					<?php if ( $mail['transport_signals'] ) : ?>
						<ul style="margin:0">
							<?php foreach ( $mail['transport_signals'] as $signal ) : ?>
								<li><?php echo esc_html( $signal ); ?></li>
							<?php endforeach; ?>
						</ul>
						<p class="description" style="margin-top:.4rem"><?php esc_html_e( 'Un transport déclaré n’est pas un email reçu : seule une vraie remise le prouve.', 'pose-parquet-core' ); ?></p>
					<?php else : ?>
						<?php echo $oui_non( false ); // phpcs:ignore WordPress.Security.EscapeOutput ?> <?php esc_html_e( 'aucun transport détecté', 'pose-parquet-core' ); ?>
					<?php endif; ?>
				</td>
			</tr>
			<tr><th scope="row"><?php esc_html_e( 'Confirmation au visiteur', 'pose-parquet-core' ); ?></th><td><?php echo $state['visitor_mail'] ? esc_html__( 'activée', 'pose-parquet-core' ) : esc_html__( 'désactivée', 'pose-parquet-core' ); ?></td></tr>
		</tbody>
	</table>

	<h3><?php esc_html_e( 'Sort des notifications déjà tentées', 'pose-parquet-core' ); ?></h3>
	<table class="widefat striped" style="max-width:40rem">
		<thead><tr><th><?php esc_html_e( 'État', 'pose-parquet-core' ); ?></th><th><?php esc_html_e( 'Interne', 'pose-parquet-core' ); ?></th><th><?php esc_html_e( 'Visiteur', 'pose-parquet-core' ); ?></th></tr></thead>
		<tbody>
			<?php
			$etats = [
				'sent'    => __( 'envoyé', 'pose-parquet-core' ),
				'failed'  => __( 'échec', 'pose-parquet-core' ),
				'pending' => __( 'en attente', 'pose-parquet-core' ),
				'skipped' => __( 'non concerné', 'pose-parquet-core' ),
			];
			foreach ( $etats as $cle => $libelle ) :
				?>
				<tr>
					<th scope="row"><?php echo esc_html( $libelle ); ?></th>
					<td><?php echo esc_html( number_format_i18n( (int) ( $state['mail_counts']['internal'][ $cle ] ?? 0 ) ) ); ?></td>
					<td><?php echo esc_html( number_format_i18n( (int) ( $state['mail_counts']['visitor'][ $cle ] ?? 0 ) ) ); ?></td>
				</tr>
			<?php endforeach; ?>
		</tbody>
	</table>
	<p class="description" style="max-width:40rem"><?php esc_html_e( 'Ces états rapportent la réponse de wp_mail(), pas la réception. Un email peut être « envoyé » et finir en indésirable.', 'pose-parquet-core' ); ?></p>
	<?php
	/*
	 * Un lead perdu ne doit pas pouvoir l'être en silence.
	 *
	 * Les compteurs ci-dessus disent déjà combien d'envois ont échoué, mais un
	 * nombre dans un tableau se lit quand on le cherche. Un échec définitif
	 * mérite une alerte, et un lien direct vers les demandes concernées :
	 * quelqu'un doit rappeler ces personnes à la main.
	 */
	$echecs_mail  = (int) ( $state['mail_counts']['internal']['failed'] ?? 0 ) + (int) ( $state['mail_counts']['visitor']['failed'] ?? 0 );
	$attente_mail = (int) ( $state['mail_counts']['internal']['pending'] ?? 0 ) + (int) ( $state['mail_counts']['visitor']['pending'] ?? 0 );
	$file         = $state['mail_queue'];
	?>
	<?php if ( $echecs_mail > 0 ) : ?>
		<div class="notice notice-error inline" style="max-width:40rem;margin:1rem 0">
			<p>
				<strong><?php echo esc_html( sprintf(
					/* translators: %s : nombre de notifications en échec. */
					_n( '%s notification en échec définitif.', '%s notifications en échec définitif.', $echecs_mail, 'pose-parquet-core' ),
					number_format_i18n( $echecs_mail )
				) ); ?></strong>
				<?php esc_html_e( 'Le projet est enregistré, mais la notification interne n’est pas partie. Le visiteur, lui, a déjà reçu son orientation à l’écran.', 'pose-parquet-core' ); ?>
				<a href="<?php echo esc_url( $state['mail_failed_url'] ); ?>"><?php esc_html_e( 'Voir les demandes concernées', 'pose-parquet-core' ); ?></a>
			</p>
		</div>
	<?php endif; ?>

	<h3><?php esc_html_e( 'File d’envoi', 'pose-parquet-core' ); ?></h3>
	<p class="description" style="max-width:40rem">
		<?php esc_html_e( 'Les emails ne partent plus pendant la requête du visiteur : ils sont mis en file et envoyés par l’ordonnanceur. Une soumission ne dépend donc plus du temps de réponse du serveur d’envoi.', 'pose-parquet-core' ); ?>
	</p>
	<table class="widefat striped" style="max-width:40rem">
		<tbody>
			<tr>
				<th scope="row"><?php esc_html_e( 'Envois en attente', 'pose-parquet-core' ); ?></th>
				<td>
					<?php echo esc_html( number_format_i18n( $attente_mail ) ); ?>
					<?php if ( $attente_mail > 0 ) : ?>
						— <a href="<?php echo esc_url( $state['mail_pending_url'] ); ?>"><?php esc_html_e( 'voir les demandes', 'pose-parquet-core' ); ?></a>
					<?php endif; ?>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e( 'Événements planifiés', 'pose-parquet-core' ); ?></th>
				<td>
					<?php echo esc_html( sprintf(
						/* translators: %1$s : total planifié, %2$s : nombre déjà dû. */
						__( '%1$s au total, dont %2$s déjà dû(s)', 'pose-parquet-core' ),
						number_format_i18n( (int) $file['total'] ),
						number_format_i18n( (int) $file['dus'] )
					) ); ?>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e( 'Ordonnanceur', 'pose-parquet-core' ); ?></th>
				<td>
					<?php if ( $state['wp_cron_disabled'] ) : ?>
						<?php echo $oui_non( false ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						<?php esc_html_e( 'DISABLE_WP_CRON est actif : rien ne part tout seul.', 'pose-parquet-core' ); ?>
						<p class="description"><?php esc_html_e( 'C’est le réglage attendu en production, à condition qu’un cron système appelle wp-cron.php — sinon la file ne se vide jamais.', 'pose-parquet-core' ); ?></p>
					<?php else : ?>
						<?php echo $oui_non( true ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						<?php esc_html_e( 'WP-Cron s’exécute au fil des visites.', 'pose-parquet-core' ); ?>
					<?php endif; ?>
				</td>
			</tr>
		</tbody>
	</table>
	<form method="post" action="<?php echo esc_url( $state['repair_url'] ); ?>" style="margin:.8rem 0">
		<?php wp_nonce_field( $state['queue_action'] ); ?>
		<input type="hidden" name="action" value="<?php echo esc_attr( $state['queue_action'] ); ?>" />
		<?php submit_button( __( 'Traiter la file maintenant', 'pose-parquet-core' ), 'secondary', 'submit', false ); ?>
		<span class="description"><?php esc_html_e( 'Même code que l’ordonnanceur, appelé à la main. Un envoi déjà parti ne repart pas.', 'pose-parquet-core' ); ?></span>
	</form>
	<p><a href="<?php echo esc_url( $state['settings_url'] ); ?>"><?php esc_html_e( 'Modifier dans Réglages', 'pose-parquet-core' ); ?></a></p>

	<h2><?php esc_html_e( 'Anti-spam', 'pose-parquet-core' ); ?></h2>
	<p>
		<?php esc_html_e( 'Actif : pot de miel, jeton temporel signé, limite de débit.', 'pose-parquet-core' ); ?>
		<?php
		echo esc_html( sprintf(
			/* translators: 1: âge minimum du jeton, 2: durée de vie, 3: créations, 4: tentatives, 5: fenêtre en minutes */
			__( 'Jeton : %1$d s minimum, %2$d s de validité. Débit : %3$d demandes et %4$d tentatives par %5$d min et par identité réseau.', 'pose-parquet-core' ),
			(int) $state['token_min_age'],
			(int) $state['token_max_age'],
			(int) $state['rate_limits']['successes'],
			(int) $state['rate_limits']['attempts'],
			(int) round( $state['rate_limits']['window'] / 60 )
		) );
		?>
	</p>

	<h2><?php esc_html_e( 'Rôle gestionnaire', 'pose-parquet-core' ); ?></h2>
	<?php if ( ! $state['manager_role'] ) : ?>
		<p><?php echo $oui_non( false ); // phpcs:ignore WordPress.Security.EscapeOutput ?> <?php esc_html_e( 'le rôle « Gestionnaire Pose Parquet » n’existe pas.', 'pose-parquet-core' ); ?></p>
	<?php else : ?>
		<table class="widefat striped" style="max-width:40rem">
			<tbody>
				<?php foreach ( $state['manager_caps'] as $cap => $ok ) : ?>
					<tr><th scope="row"><code><?php echo esc_html( $cap ); ?></code></th><td><?php echo $oui_non( $ok ); // phpcs:ignore WordPress.Security.EscapeOutput ?></td></tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		<p class="description"><?php esc_html_e( 'Lecture et traitement des demandes, sans accès aux réglages.', 'pose-parquet-core' ); ?></p>
	<?php endif; ?>

	<?php
	/*
	 * Réparation des droits.
	 *
	 * Le plugin ne repose plus les capabilities à chaque chargement : une
	 * révocation décidée par un administrateur doit tenir. Le prix de ce choix
	 * est qu'un droit réellement perdu — extension de gestion de rôles,
	 * restauration partielle — ne revient plus tout seul. D'où ce bouton, qui
	 * n'apparaît que lorsqu'il manque effectivement quelque chose, et qui
	 * n'ajoute jamais que le plancher documenté.
	 */
	?>
	<?php if ( $state['caps_missing'] ) : ?>
		<div class="notice notice-warning inline" style="max-width:40rem;margin:1rem 0 0">
			<p><strong><?php esc_html_e( 'Des droits du plugin manquent.', 'pose-parquet-core' ); ?></strong></p>
			<ul style="list-style:disc;margin-left:1.5rem">
				<?php foreach ( $state['caps_missing'] as $role_name => $caps ) : ?>
					<li><code><?php echo esc_html( $role_name ); ?></code> : <?php echo esc_html( implode( ', ', $caps ) ); ?></li>
				<?php endforeach; ?>
			</ul>
			<form method="post" action="<?php echo esc_url( $state['repair_url'] ); ?>" style="margin-bottom:1rem">
				<input type="hidden" name="action" value="<?php echo esc_attr( $state['repair_action'] ); ?>" />
				<?php wp_nonce_field( $state['repair_action'] ); ?>
				<button type="submit" class="button button-secondary"><?php esc_html_e( 'Réappliquer les droits du plugin', 'pose-parquet-core' ); ?></button>
			</form>
		</div>
	<?php else : ?>
		<p class="description" style="max-width:40rem"><?php esc_html_e( 'Les droits sont posés une fois, à l’installation : le plugin ne les réécrit pas à chaque page. Une révocation faite ici tient donc, et un manque réel apparaîtrait ci-dessus avec un bouton de réparation.', 'pose-parquet-core' ); ?></p>
	<?php endif; ?>

	<h2><?php esc_html_e( 'Projets', 'pose-parquet-core' ); ?></h2>
	<p>
		<?php
		/* translators: %d : nombre de demandes en base. */
		echo esc_html( sprintf( _n( '%d projet enregistré.', '%d projets enregistrés.', (int) $state['projects_count'], 'pose-parquet-core' ), (int) $state['projects_count'] ) );
		?>
	</p>
	<table class="widefat striped" style="max-width:40rem">
		<tbody>
			<?php foreach ( $state['statuses'] as $value => $label ) : ?>
				<tr>
					<th scope="row"><?php echo esc_html( $label ); ?></th>
					<td><?php echo esc_html( number_format_i18n( (int) ( $state['counts_by_status'][ $value ] ?? 0 ) ) ); ?></td>
				</tr>
			<?php endforeach; ?>
		</tbody>
	</table>
	<p><a href="<?php echo esc_url( $state['projects_admin'] ); ?>"><?php esc_html_e( 'Ouvrir la liste des projets', 'pose-parquet-core' ); ?></a></p>
</div>
