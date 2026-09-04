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
	<p><?php esc_html_e( 'Fondation backend. Les écrans de gestion des demandes arrivent avec les lots suivants ; cette page montre ce qui est réellement installé.', 'pose-parquet-core' ); ?></p>

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

	<h2><?php esc_html_e( 'Statuts de demande', 'pose-parquet-core' ); ?></h2>
	<p>
		<?php foreach ( $state['statuses'] as $value => $label ) : ?>
			<code><?php echo esc_html( $value ); ?></code> <?php echo esc_html( $label ); ?> &nbsp;
		<?php endforeach; ?>
	</p>

	<h2><?php esc_html_e( 'API REST', 'pose-parquet-core' ); ?></h2>
	<p><a href="<?php echo esc_url( $state['health_url'] ); ?>" target="_blank" rel="noopener"><code><?php echo esc_html( $state['health_url'] ); ?></code></a></p>
	<p><code>POST <?php echo esc_html( $state['projects_url'] ); ?></code> — <?php esc_html_e( 'dépôt d’une demande (formulaire public).', 'pose-parquet-core' ); ?></p>
	<p><code>GET <?php echo esc_html( $state['form_token_url'] ); ?></code> — <?php esc_html_e( 'jeton temporel à joindre à chaque dépôt.', 'pose-parquet-core' ); ?></p>

	<h2><?php esc_html_e( 'Emails', 'pose-parquet-core' ); ?></h2>
	<table class="widefat striped" style="max-width:40rem">
		<tbody>
			<tr><th scope="row"><?php esc_html_e( 'Adresse de réception', 'pose-parquet-core' ); ?></th><td><?php echo $oui_non( $state['mail_configured'] ); // phpcs:ignore WordPress.Security.EscapeOutput ?> <?php echo $state['mail_configured'] ? esc_html__( 'configurée', 'pose-parquet-core' ) : esc_html__( 'non configurée', 'pose-parquet-core' ); ?></td></tr>
			<tr><th scope="row"><?php esc_html_e( 'Confirmation au visiteur', 'pose-parquet-core' ); ?></th><td><?php echo $state['visitor_mail'] ? esc_html__( 'activée', 'pose-parquet-core' ) : esc_html__( 'désactivée', 'pose-parquet-core' ); ?></td></tr>
		</tbody>
	</table>
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

	<h2><?php esc_html_e( 'Demandes', 'pose-parquet-core' ); ?></h2>
	<p>
		<?php
		/* translators: %d : nombre de demandes en base. */
		echo esc_html( sprintf( _n( '%d demande enregistrée.', '%d demandes enregistrées.', (int) $state['projects_count'], 'pose-parquet-core' ), (int) $state['projects_count'] ) );
		?>
		<?php esc_html_e( 'La liste et les fiches arrivent avec le lot 4.', 'pose-parquet-core' ); ?>
	</p>
</div>
