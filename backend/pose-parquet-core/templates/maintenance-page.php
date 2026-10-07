<?php
/**
 * Page publique de maintenance (servie par WordPress en 503, ou en aperçu).
 *
 * @var array  $m       réglages (Maintenance\Reglages::lire)
 * @var string $image   URL de l'image de fond, ou vide
 * @var string $polices URL du dossier des polices du plugin
 * @var array  $liens   liens à afficher
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$css = (string) file_get_contents( POSE_PARQUET_DIR . '/assets/maintenance.css' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- fichier local du plugin.
?><!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title><?php echo esc_html( $m['titre'] ); ?> — Pose Parquet</title>
<style>
@font-face { font-family: "Instrument Serif"; font-style: normal; font-weight: 400; font-display: swap; src: url("<?php echo esc_url( $polices . 'instrument-serif-400-3.woff2' ); ?>") format("woff2"); }
@font-face { font-family: "Inter"; font-style: normal; font-weight: 100 900; font-display: swap; src: url("<?php echo esc_url( $polices . 'inter-var-1.woff2' ); ?>") format("woff2"); }
<?php echo $css; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- feuille de style du plugin, pas une saisie. ?>
</style>
</head>
<body>
<main class="pm"<?php echo $image ? ' style="background-image:url(\'' . esc_url( $image ) . '\')"' : ''; ?>>
	<span class="pm__marque" aria-label="Pose Parquet">
		<svg viewBox="0 0 106 197" fill="currentColor" aria-hidden="true"><g transform="scale(106 197)"><path d="M0 0H0.3396V0.5584L0 0.6396ZM0 0.6599L0.3396 0.5787V1H0ZM0.4057 0H0.7453V0.2437L0.4057 0.3249ZM0.4057 0.3452L0.7453 0.264V1H0.4057ZM0.8208 0H1V0.5584L0.8208 0.6012ZM0.8208 0.6215L1 0.5787V1H0.8208Z"/></g></svg>
		Pose <span>Parquet</span>
	</span>
	<div class="pm__corps">
		<h1 class="pm__titre"><?php echo esc_html( $m['titre'] ); ?></h1>
		<p class="pm__texte"><?php echo esc_html( $m['message'] ); ?></p>
		<?php if ( $liens ) : ?>
		<div class="pm__liens">
			<?php foreach ( $liens as $l ) : ?>
			<a class="pm__lien pm__lien--<?php echo esc_attr( $l['classe'] ); ?>" href="<?php echo esc_url( $l['url'] ); ?>"><?php echo esc_html( $l['titre'] ); ?><small><?php echo esc_html( $l['sous'] ); ?> →</small></a>
			<?php endforeach; ?>
		</div>
		<?php endif; ?>
	</div>
</main>
</body>
</html>
