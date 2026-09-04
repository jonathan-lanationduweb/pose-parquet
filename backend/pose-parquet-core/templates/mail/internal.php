<?php
/**
 * Corps de la notification interne. `$sections` est une liste de blocs HTML
 * déjà rendus (valeurs échappées par Template::row).
 *
 * @var string   $reference
 * @var string[] $sections
 * @package PoseParquet\Core
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<h1 style="margin:0 0 4px;font-size:20px;font-weight:600;">Nouvelle demande</h1>
<p style="margin:0 0 8px;font-size:15px;color:#6b6b6b;">Référence</p>
<p style="margin:0 0 8px;font-size:22px;font-weight:700;letter-spacing:.02em;"><?php echo esc_html( $reference ); ?></p>
<?php echo implode( '', array_filter( $sections ) ); // phpcs:ignore WordPress.Security.EscapeOutput -- blocs produits par Template, valeurs échappées. ?>
