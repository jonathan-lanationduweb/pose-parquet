<?php
/**
 * Gabarit affiché quand l'identifiant de l'URL ne correspond à aucune demande.
 *
 * Une page, pas un `wp_die` : le cas normal est un favori vers une demande
 * supprimée, ou une URL retapée de travers, et l'utilisateur doit pouvoir
 * repartir vers la liste d'un clic.
 *
 * @var array{notice:?array} $view
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
	<h1><?php esc_html_e( 'Demande introuvable', 'pose-parquet-core' ); ?></h1>
	<?php Notices::output( $view['notice'] ); ?>
	<p><?php esc_html_e( 'Cette demande n’existe pas, ou plus.', 'pose-parquet-core' ); ?></p>
	<p><a class="button button-primary" href="<?php echo esc_url( View::list_url() ); ?>"><?php esc_html_e( 'Retour à la liste', 'pose-parquet-core' ); ?></a></p>
</div>
