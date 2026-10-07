<?php
/**
 * Gabarit de la liste des projets orientés. Reçoit `$view` de Admin\Projects.
 *
 * Le site public est une PASSERELLE : il ne demande plus de coordonnées. Les
 * colonnes Client, Téléphone et Ville ont donc laissé la place à ce qui
 * décrit un parcours : Date, Référence, Origine, Besoin, Zone, Produit,
 * Destination (avec les liens rapides vers Premibel / Allure Design, selon la
 * règle publique) et Statut. Les coordonnées des anciens projets restent
 * lisibles sur leur fiche. Sous 782 px, chaque ligne s'empile (admin.css).
 *
 * @var array{rows:array,counts:array,total:int,page:int,pages:int,per_page:int,status:string,search:string,mail:string,statuses:array,notice:?array,can_edit:bool} $view
 * @package PoseParquet\Core
 */

declare(strict_types=1);

use PoseParquet\Core\Admin\Notices;
use PoseParquet\Core\Admin\View;
use PoseParquet\Core\Mail\Diagnostics;
use PoseParquet\Core\Projects\LeadRouting;
use PoseParquet\Core\Projects\Liens;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="wrap pp-admin">
	<h1 class="wp-heading-inline"><?php esc_html_e( 'Projets orientés', 'pose-parquet-core' ); ?></h1>
	<hr class="wp-header-end" />
	<p class="adm-entete__sous-titre"><?php esc_html_e( 'Les visiteurs orientés par le site : besoin, zone, destination recommandée et suivi.', 'pose-parquet-core' ); ?></p>

	<?php Notices::output( $view['notice'] ); ?>

	<?php
	/*
	 * Une liste filtrée doit dire qu'elle l'est.
	 *
	 * On arrive ici depuis l'écran « État », par le lien d'une alerte, et sans
	 * ce bandeau la page ressemblerait à la liste complète amputée sans raison.
	 * Le filtre porte sur le sort des notifications, pas sur le statut de la
	 * demande : les deux se cumulent, et les onglets ci-dessus le conservent.
	 */
	if ( ( $view['mail'] ?? '' ) !== '' ) :
		$libelle_mail = $view['mail'] === 'failed'
			? __( 'Projets dont une notification a définitivement échoué.', 'pose-parquet-core' )
			: __( 'Projets dont une notification attend encore son envoi.', 'pose-parquet-core' );
		?>
		<div class="notice notice-warning inline" style="margin:1rem 0">
			<p>
				<strong><?php echo esc_html( $libelle_mail ); ?></strong>
				<a href="<?php echo esc_url( View::list_url( [ 'status' => $view['status'], 's' => $view['search'] ] ) ); ?>"><?php esc_html_e( 'Retirer ce filtre', 'pose-parquet-core' ); ?></a>
			</p>
		</div>
	<?php endif; ?>

	<?php
	/*
	 * Filtre « destination recommandée ».
	 *
	 * Sous les onglets de statut et non parmi eux : ce sont deux axes
	 * différents. Le statut dit où en est le traitement, la destination dit à
	 * qui la demande revient — et on veut pouvoir croiser les deux, par
	 * exemple « nouvelles ET à qualifier ».
	 */
	$pp_dest_actuelle = (string) ( $view['dest'] ?? '' );
	?>
	<ul class="subsubsub pp-filters pp-filters--destination">
		<li class="pp-filters__libelle"><?php esc_html_e( 'Destination', 'pose-parquet-core' ); ?></li>
		<?php
		$pp_dests   = [ '' => __( 'Toutes', 'pose-parquet-core' ) ];
		foreach ( (array) ( $view['dests'] ?? [] ) as $pp_d ) {
			$pp_dests[ $pp_d ] = View::label( 'lead_destination', $pp_d );
		}
		$pp_dernier = array_key_last( $pp_dests );
		foreach ( $pp_dests as $pp_valeur => $pp_libelle ) :
			$pp_actif = $pp_dest_actuelle === $pp_valeur;
			$pp_url   = View::list_url(
				[
					'status'      => $view['status'],
					's'           => $view['search'],
					'mail'        => $view['mail'] ?? '',
					'destination' => $pp_valeur,
				]
			);
			?>
			<li>
				<a href="<?php echo esc_url( $pp_url ); ?>"<?php echo $pp_actif ? ' class="current" aria-current="page"' : ''; ?>>
					<?php echo esc_html( $pp_libelle ); ?>
				</a><?php echo $pp_valeur === $pp_dernier ? '' : ' |'; ?>
			</li>
		<?php endforeach; ?>
	</ul>

	<ul class="subsubsub pp-filters pp-filters--statut">
		<li class="pp-filters__libelle"><?php esc_html_e( 'Statut', 'pose-parquet-core' ); ?></li>
		<?php
		$onglets = [ '' => __( 'Tous', 'pose-parquet-core' ) ] + $view['statuses'];
		$dernier = array_key_last( $onglets );
		foreach ( $onglets as $valeur => $libelle ) :
			$nombre = $valeur === '' ? (int) $view['counts']['all'] : (int) ( $view['counts'][ $valeur ] ?? 0 );
			$actif  = $view['status'] === $valeur;
			$url    = View::list_url( [ 'status' => $valeur, 's' => $view['search'], 'mail' => $view['mail'] ?? '' ] );
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
		<?php if ( ( $view['mail'] ?? '' ) !== '' ) : ?>
			<input type="hidden" name="mail" value="<?php echo esc_attr( $view['mail'] ); ?>" />
		<?php endif; ?>
		<label class="screen-reader-text" for="pp-search-input"><?php esc_html_e( 'Rechercher un projet', 'pose-parquet-core' ); ?></label>
		<input
			type="search"
			id="pp-search-input"
			name="s"
			value="<?php echo esc_attr( $view['search'] ); ?>"
			maxlength="<?php echo (int) \PoseParquet\Core\Projects\Repository::SEARCH_MAX; ?>"
			placeholder="<?php esc_attr_e( 'Référence, département…', 'pose-parquet-core' ); ?>"
		/>
		<?php submit_button( __( 'Rechercher un projet', 'pose-parquet-core' ), '', '', false ); ?>
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
					esc_html( _n( '%s projet', '%s projets', (int) $view['total'], 'pose-parquet-core' ) ),
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

	<?php
	// L'email n'est un canal que s'il est réellement configuré : sinon, aucun drapeau « email en échec ».
	$pp_email_actif = (bool) ( Diagnostics::report()['production_ready'] ?? false );
	$pp_colonnes    = [
		'date'        => __( 'Date', 'pose-parquet-core' ),
		'ref'         => __( 'Référence', 'pose-parquet-core' ),
		'origine'     => __( 'Origine', 'pose-parquet-core' ),
		'besoin'      => __( 'Besoin', 'pose-parquet-core' ),
		'zone'        => __( 'Zone', 'pose-parquet-core' ),
		'produit'     => __( 'Produit', 'pose-parquet-core' ),
		'destination' => __( 'Destination', 'pose-parquet-core' ),
		'statut'      => __( 'Statut', 'pose-parquet-core' ),
	];
	?>
	<table class="wp-list-table widefat fixed striped pp-table pp-table--projets">
		<caption class="screen-reader-text"><?php esc_html_e( 'Projets orientés, le plus récent en premier', 'pose-parquet-core' ); ?></caption>
		<thead>
			<tr>
				<?php foreach ( $pp_colonnes as $pp_cle => $pp_libelle ) : ?>
					<th scope="col" class="pp-col-<?php echo esc_attr( $pp_cle ); ?>"><?php echo esc_html( $pp_libelle ); ?></th>
				<?php endforeach; ?>
			</tr>
		</thead>
		<tbody>
			<?php if ( ! $view['rows'] ) : ?>
				<tr class="pp-vide">
					<td colspan="<?php echo count( $pp_colonnes ); ?>">
						<?php
						if ( $view['search'] !== '' || $view['status'] !== '' || $pp_dest_actuelle !== '' ) {
							\PoseParquet\Core\Admin\Socle::vide( __( 'Aucun projet ne correspond à ce filtre.', 'pose-parquet-core' ), __( 'Élargissez la recherche ou revenez à « Tous ».', 'pose-parquet-core' ), 'dashicons-search' );
						} else {
							\PoseParquet\Core\Admin\Socle::vide( __( 'Aucun projet pour le moment.', 'pose-parquet-core' ), __( 'Les projets orientés depuis le site apparaîtront ici.', 'pose-parquet-core' ), 'dashicons-portfolio' );
						}
						?>
					</td>
				</tr>
			<?php endif; ?>

			<?php foreach ( $view['rows'] as $row ) : ?>
				<?php
				$id        = (int) $row['id'];
				$reference = (string) ( $row['reference'] ?? '' );
				$dept      = (string) $row['department'];
				$region    = LeadRouting::region( $row );
				$produit   = Liens::produit( $row );
				?>
				<tr>
					<td class="pp-col-date" data-label="<?php echo esc_attr( $pp_colonnes['date'] ); ?>"><?php echo esc_html( View::date_short( $row['created_at'] ) ); ?></td>
					<td class="pp-col-ref" data-label="<?php echo esc_attr( $pp_colonnes['ref'] ); ?>">
						<a href="<?php echo esc_url( View::detail_url( $id ) ); ?>" class="pp-ref">
							<?php echo esc_html( $reference !== '' ? $reference : sprintf( '#%d', $id ) ); ?>
						</a>
						<?php if ( $pp_email_actif && (string) $row['internal_mail_status'] === 'failed' ) : ?>
							<span class="pp-mail-flag" title="<?php esc_attr_e( 'La notification interne n’a pas pu être envoyée', 'pose-parquet-core' ); ?>">
								<?php esc_html_e( 'email en échec', 'pose-parquet-core' ); ?>
							</span>
						<?php endif; ?>
					</td>
					<td class="pp-col-origine" data-label="<?php echo esc_attr( $pp_colonnes['origine'] ); ?>"><?php echo esc_html( View::label( 'lead_source', (string) ( $row['lead_source'] ?? '' ) ) ?: '—' ); ?></td>
					<td class="pp-col-besoin" data-label="<?php echo esc_attr( $pp_colonnes['besoin'] ); ?>"><?php echo esc_html( View::label( 'lead_need', (string) ( $row['lead_need'] ?? '' ) ) ?: '—' ); ?></td>
					<td class="pp-col-zone" data-label="<?php echo esc_attr( $pp_colonnes['zone'] ); ?>">
						<?php
						if ( $dept === '' ) {
							echo '—';
						} else {
							echo esc_html( LeadRouting::en_idf( $row ) ? sprintf( 'IDF (%s)', $dept ) : ( $region !== '' ? sprintf( '%s (%s)', $region, $dept ) : $dept ) );
						}
						?>
					</td>
					<td class="pp-col-produit" data-label="<?php echo esc_attr( $pp_colonnes['produit'] ); ?>"><div class="pp-cellule">
						<?php echo esc_html( $produit !== '' ? $produit : '—' ); ?>
						<?php if ( View::surface( $row['surface'] ) !== '' ) : ?>
							<span class="pp-sub"><?php echo esc_html( trim( View::surface( $row['surface'] ) . ' · ' . View::label( 'room_type', $row['room_type'] ), ' ·' ) ); ?></span>
						<?php endif; ?>
					</div></td>
					<td class="pp-col-destination" data-label="<?php echo esc_attr( $pp_colonnes['destination'] ); ?>"><div class="pp-cellule">
						<?php
						/*
						 * Une demande d'avant le schéma 4 n'a pas de destination : sa
						 * cellule reste vide plutôt que d'afficher « À qualifier ».
						 */
						echo esc_html( View::label( 'lead_destination', (string) ( $row['lead_destination'] ?? '' ) ) ?: '—' );
						if ( ( $row['lead_destination'] ?? '' ) !== '' && $dept !== '' && ! LeadRouting::en_idf( $row ) ) {
							echo ' <span class="pp-sub">' . esc_html__( '(hors IDF)', 'pose-parquet-core' ) . '</span>';
						}
						$pp_liens = Liens::de( $row );
						if ( $pp_liens ) {
							echo '<span class="pp-liens">';
							foreach ( $pp_liens as $pp_lien ) {
								echo '<a href="' . esc_url( $pp_lien['url'] ) . '" target="_blank" rel="noopener" class="pp-lien pp-lien--' . esc_attr( $pp_lien['cible'] ) . '">' . esc_html( $pp_lien['libelle'] ) . ' <span aria-hidden="true">↗</span></a>';
							}
							echo '</span>';
						}
						?>
					</div></td>
					<td class="pp-col-statut" data-label="<?php echo esc_attr( $pp_colonnes['statut'] ); ?>">
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
