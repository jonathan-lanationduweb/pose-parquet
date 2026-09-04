<?php
/**
 * Gabarit de la page « Réglages ». La Settings API rend les champs ; le nonce
 * et l'action viennent de settings_fields(), la vérification d'options.php.
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

use PoseParquet\Core\Admin\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="wrap">
	<h1><?php esc_html_e( 'Pose Parquet — Réglages', 'pose-parquet-core' ); ?></h1>
	<?php settings_errors( Settings::OPTION ); ?>
	<form method="post" action="<?php echo esc_url( admin_url( 'options.php' ) ); ?>">
		<?php
		settings_fields( Settings::GROUP );
		do_settings_sections( Settings::PAGE );
		submit_button( __( 'Enregistrer', 'pose-parquet-core' ) );
		?>
	</form>
</div>
