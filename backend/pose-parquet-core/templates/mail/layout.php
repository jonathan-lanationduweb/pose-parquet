<?php
/**
 * Enveloppe commune des emails. Reçoit `$title` (texte) et `$content` (HTML
 * déjà échappé par le gabarit intérieur).
 *
 * @var string $title
 * @var string $content
 * @package PoseParquet\Core
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<title><?php echo esc_html( $title ); ?></title>
</head>
<body style="margin:0;padding:0;background:#f4f1ec;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="<?php echo (int) PoseParquet\Core\Mail\Template::WIDTH; ?>" cellpadding="0" cellspacing="0" style="max-width:<?php echo (int) PoseParquet\Core\Mail\Template::WIDTH; ?>px;width:100%;background:#ffffff;border:1px solid #e6e0d6;">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e6e0d6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a6d3b;">Pose Parquet</td></tr>
<tr><td style="padding:24px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1d1d1d;">
<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput -- HTML produit par nos gabarits, valeurs déjà échappées. ?>
</td></tr>
<tr><td style="padding:14px 28px;border-top:1px solid #e6e0d6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8a8a8a;">Pose Parquet — pose-parquet.com</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
