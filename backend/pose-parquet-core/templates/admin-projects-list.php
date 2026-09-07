<?php
/**
 * Gabarit de la liste des demandes. Reçoit `$view` de Admin\Projects.
 *
 * Huit colonnes, dont quatre disparaissent sous 900 px par la feuille de style
 * (`admin.css`) : Référence, Client, Date et Statut restent toujours, parce
 * que ce sont les quatre qui permettent de reconnaître une demande et de la
 * traiter. La référence est le lien vers la fiche.
 *
 * @var array{rows:array,counts:array,total:int,page:int,pages:int,per_page:int,status:string,search:string,statuses:array,notice:?array,can_edit:bool} $view
 * @package PoseParquet\Core
 */

declare(strict_types=1);

use PoseParquet\Core\Admin\Notices;
use PoseParquet\Core\Admin\View;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="wrap pp-admin">
	<h1 class="wp-heading-inline"><?php esc_html_e( 'Demandes', 'pose-parquet-core' ); ?></h1>
	<hr class="wp-header-end" />

	<?php Notices::output( $view['notice'] ); ?>

	<ul class="subsubsub pp-filters">
		<?php
		$onglets = [ '' => __( 'Tous', 'pose-parquet-core' ) ] + $view['statuses'];
		$dernier = array_key_last( $onglets );
		foreach ( $onglets as $valeur => $libelle ) :
			$nombre = $valeur === '' ? (int) $view['counts']['all'] : (int) ( $view['counts'][ $valeur ] ?? 0 );
			$actif  = $view['status'] === $valeur;
			$url    = View::list_url( [ 'status' => $valeur, 's' => $view['search'] ] );
			?>
			<li>
				<a href="<?php echo esc_url( $url ); ?>"<?php echo $actif ? ' class="current" aria-current="page"' : ''; ?>>
					<?php echo esc_html( $libelle ); ?>
					<span class="count">(<?php echo esc_html( number_format_i18n( $nombre ) ); ?>)</span>
				</a><?php echo $valeur === $dernier ? '' : ' |'; ?>
			</li>
		<?php endforeach; ?>
	</ul>

	<form method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>" class="pp-search">
		<input type="hidden" name="page" value="<?php echo esc_attr( \PoseParquet\Core\Admin\Projects::PAGE ); ?>" />
		<?php if ( $view['status'] !== '' ) : ?>
			<input type="hidden" name="status" value="<?php echo esc_attr( $view['status'] ); ?>" />
		<?php endif; ?>
		<label class="screen-reader-text" for="pp-search-input"><?php esc_html_e( 'Rechercher une demande', 'pose-parquet-core' ); ?></label>
		<input
			type="search"
			id="pp-search-input"
			name="s"
			value="<?php echo esc_attr( $view['search'] ); ?>"
			maxlength="<?php echo (int) \PoseParquet\Core\Projects\Repository::SEARCH_MAX; ?>"
			placeholder="<?php esc_attr_e( 'Référence, nom, email, téléphone, ville…', 'pose-parquet-core' ); ?>"
		/>
		<?php submit_button( __( 'Rechercher une demande', 'pose-parquet-core' ), '', '', false ); ?>
		<?php if ( $view['search'] !== '' ) : ?>
			<a class="button-link" href="<?php echo esc_url( View::list_url( [ 'status' => $view['status'] ] ) ); ?>"><?php esc_html_e( 'Effacer la recherche', 'pose-parquet-core' ); ?></a>
		<?php endif; ?>
	</form>

	<div class="tablenav top">
		<div class="tablenav-pages">
			<span class="displaying-num">
				<?php
				printf(
					/* translators: %s : nombre de demandes. */
					esc_html( _n( '%s demande', '%s demandes', (int) $view['total'], 'pose-parquet-core' ) ),
					esc_html( number_format_i18n( (int) $view['total'] ) )
				);
				?>
			</span>
			<?php
			if ( $view['pages'] > 1 ) {
				echo '<span class="pagination-links">' . wp_kses_post( (string) paginate_links( [
					'base'      => add_query_arg( 'paged', '%#%' ),
					'format'    => '',
					'prev_text' => '&laquo;',
					'next_text' => '&raquo;',
					'total'     => (int) $view['pages'],
					'current'   => (int) $view['page'],
					'type'      => 'plain',
				] ) ) . '</span>';
			}
			?>
		</div>
	</div>

	<table class="wp-list-table widefat fixed striped pp-table">
		<caption class="screen-reader-text"><?php esc_html_e( 'Demandes de projet, la plus récente en premier', 'pose-parquet-core' ); ?></caption>
		<thead>
			<tr>
				<th scope="col" class="pp-col-ref"><?php esc_html_e( 'Référence', 'pose-parquet-core' ); ?></th>
				<th scope="col" class="pp-col-date"><?php esc_html_e( 'Date', 'pose-parquet-core' ); ?></th>
				<th scope="col" class="pp-col-client"><?php esc_html_e( 'Client', 'pose-parquet-core' ); ?></th>
				<th scope="col" class="pp-col-secondary"><?php esc_html_e( 'Téléphone', 'pose-parquet-core' ); ?></th>
				<th scope="col" class="pp-col-secondary"><?php esc_html_e( 'Ville', 'pose-parquet-core' ); ?></th>
				<th scope="col" class="pp-col-secondary"><?php esc_html_e( 'Surface', 'pose-parquet-core' ); ?></th>
				<th scope="col" class="pp-col-secondary"><?php esc_html_e( 'Projet', 'pose-parquet-core' ); ?></th>
				<th scope="col" class="pp-col-status"><?php esc_html_e( 'Statut', 'pose-parquet-core' ); ?></th>
			</tr>
		</thead>
		<tbody>
			<?php if ( ! $view['rows'] ) : ?>
				<tr>
					<td colspan="8">
						<?php
						echo $view['search'] !== '' || $view['status'] !== ''
							? esc_html__( 'Aucune demande ne correspond à ce filtre.', 'pose-parquet-core' )
							: esc_html__( 'Aucune demande pour le moment.', 'pose-parquet-core' );
						?>
					</td>
				</tr>
			<?php endif; ?>

			<?php foreach ( $view['rows'] as $row ) : ?>
				<?php
				$id        = (int) $row['id'];
				$reference = (string) ( $row['reference'] ?? '' );
				$nom       = trim( (string) $row['first_name'] . ' ' . (string) $row['last_name'] );
				$ville     = (string) $row['city'];
				$dept      = (string) $row['department'];
				?>
				<tr>
					<td class="pp-col-ref">
						<a href="<?php echo esc_url( View::detail_url( $id ) ); ?>" class="pp-ref">
							<?php echo esc_html( $reference !== '' ? $reference : sprintf( '#%d', $id ) ); ?>
						</a>
						<?php if ( (string) $row['internal_mail_status'] === 'failed' ) : ?>
							<span class="pp-mail-flag" title="<?php esc_attr_e( 'La notification interne n’a pas pu être envoyée', 'pose-parquet-core' ); ?>">
								<?php esc_html_e( 'email en échec', 'pose-parquet-core' ); ?>
							</span>
						<?php endif; ?>
					</td>
					<td class="pp-col-date"><?php echo esc_html( View::date_short( $row['created_at'] ) ); ?></td>
					<td class="pp-col-client">
						<?php echo esc_html( $nom !== '' ? $nom : __( '(sans nom)', 'pose-parquet-core' ) ); ?>
						<span class="pp-sub"><?php echo esc_html( (string) $row['email'] ); ?></span>
					</td>
					<td class="pp-col-secondary"><?php echo esc_html( (string) $row['phone'] ); ?></td>
					<td class="pp-col-secondary">
						<?php
						$lieu = $ville !== '' && $dept !== '' ? $ville . ' (' . $dept . ')' : ( $ville !== '' ? $ville : $dept );
						echo esc_html( $lieu );
						?>
					</td>
					<td class="pp-col-secondary"><?php echo esc_html( View::surface( $row['surface'] ) ); ?></td>
					<td class="pp-col-secondary"><?php echo esc_html( View::label( 'room_type', $row['room_type'] ) ); ?></td>
					<td class="pp-col-status">
						<span class="pp-status pp-status--<?php echo esc_attr( (string) $row['status'] ); ?>">
							<?php echo esc_html( View::status( $row['status'] ) ); ?>
						</span>
					</td>
				</tr>
			<?php endforeach; ?>
		</tbody>
	</table>

	<?php if ( $view['pages'] > 1 ) : ?>
		<div class="tablenav bottom">
			<div class="tablenav-pages">
				<span class="pagination-links">
					<?php
					echo wp_kses_post( (string) paginate_links( [
						'base'      => add_query_arg( 'paged', '%#%' ),
						'format'    => '',
						'prev_text' => '&laquo;',
						'next_text' => '&raquo;',
						'total'     => (int) $view['pages'],
						'current'   => (int) $view['page'],
						'type'      => 'plain',
					] ) );
					?>
				</span>
			</div>
		</div>
	<?php endif; ?>
</div>
