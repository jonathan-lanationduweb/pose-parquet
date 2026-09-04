<?php
/**
 * Corps de l'accusé de réception au visiteur.
 *
 * @var string $first_name
 * @var string $reference
 * @var string $summary
 * @package PoseParquet\Core
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<p style="margin:0 0 16px;">Bonjour<?php echo $first_name !== '' ? ' ' . esc_html( $first_name ) : ''; ?>,</p>
<p style="margin:0 0 16px;">Nous avons bien reçu votre demande.</p>
<p style="margin:0 0 4px;color:#6b6b6b;">Référence</p>
<p style="margin:0 0 16px;font-size:22px;font-weight:700;letter-spacing:.02em;"><?php echo esc_html( $reference ); ?></p>
<?php if ( $summary !== '' ) : ?>
<p style="margin:0 0 16px;">Votre projet : <?php echo esc_html( $summary ); ?>.</p>
<?php endif; ?>
<p style="margin:0 0 16px;">Nous reviendrons vers vous prochainement pour en parler.</p>
<p style="margin:0;">Pose Parquet</p>
