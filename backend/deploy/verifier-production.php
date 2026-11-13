<?php

declare(strict_types=1);
if ( PHP_SAPI !== 'cli' ) { http_response_code(403); exit(2); }
$racine = rtrim($argv[1] ?? '', '/\\');
if (!is_file($racine . '/wp-load.php')) { fwrite(STDERR, "Usage : php verifier-production.php <racine WordPress>\n"); exit(2); }
define('WP_USE_THEMES', false);
require $racine . '/wp-load.php';
$echecs = 0;
$check = static function (string $libelle, bool $ok) use (&$echecs): void {
    echo ($ok ? 'OK   ' : 'BLOQUE ') . $libelle . PHP_EOL;
    if (!$ok) { ++$echecs; }
};
$check('Environnement production', wp_get_environment_type() === 'production');
$check('PHP compatible', version_compare(PHP_VERSION, '8.2', '>='));
$check('Débogage et affichage désactivés', defined('WP_DEBUG') && !WP_DEBUG && defined('WP_DEBUG_DISPLAY') && !WP_DEBUG_DISPLAY);
$check('Éditeur de code désactivé', defined('DISALLOW_FILE_EDIT') && DISALLOW_FILE_EDIT);
$check('Administration HTTPS forcée', defined('FORCE_SSL_ADMIN') && FORCE_SSL_ADMIN);
$check('URLs WordPress en HTTPS', str_starts_with(home_url(), 'https://') && str_starts_with(site_url(), 'https://'));
$check('Compte SQL dédié et mot de passe présent', defined('DB_USER') && !in_array(strtolower(DB_USER), ['root', 'admin', ''], true) && defined('DB_PASSWORD') && strlen(DB_PASSWORD) >= 20);
$cles = ['AUTH_KEY','SECURE_AUTH_KEY','LOGGED_IN_KEY','NONCE_KEY','AUTH_SALT','SECURE_AUTH_SALT','LOGGED_IN_SALT','NONCE_SALT'];
$valeurs = array_map(static fn($k) => defined($k) ? (string)constant($k) : '', $cles);
$check('Clés de sécurité distinctes et non triviales (rotation à confirmer)', count(array_unique($valeurs)) === 8 && count(array_filter($valeurs, static fn($v) => strlen($v) >= 64 && !str_contains($v, 'put your unique phrase') && !str_contains(strtolower($v), 'pose-parquet-dev'))) === 8);
$check('Plugin Pose Parquet chargé', class_exists('PoseParquet\\Core\\Plugin'));
$check('Publication distante GitHub configurée', class_exists('PoseParquet\\Core\\Publication\\Publication') && defined('POSE_PARQUET_PUBLICATION') && POSE_PARQUET_PUBLICATION === 'github' && \PoseParquet\Core\Publication\Publication::github() !== null);
if (class_exists('PoseParquet\\Core\\Admin\\SitePublic')) {
    $check('Site public de production configuré', in_array(rtrim(\PoseParquet\Core\Admin\SitePublic::url(), '/'), ['https://pose-parquet.com', 'https://www.pose-parquet.com'], true));
}
echo "A VALIDER SUR L'HEBERGEMENT : certificat/redirections, permissions fichiers, mises à jour, 2FA/limitation connexion, cron réel, SMTP, en-têtes HTTP, sauvegarde ET restauration.\n";
echo "Ces contrôles CLI ne certifient pas la sécurité du serveur.\n";
exit($echecs ? 1 : 0);
