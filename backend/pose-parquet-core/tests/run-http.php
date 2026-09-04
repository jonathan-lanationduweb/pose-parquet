<?php
/**
 * Vérifications en HTTP réel : ce que rest_do_request() ne peut pas prouver —
 * les en-têtes effectivement envoyés (CORS, preflight) et le comportement du
 * serveur face aux méthodes.
 *
 *   php tests/run-http.php http://127.0.0.1:8181
 *
 * Sans WordPress chargé : le script est un client. Il crée une demande (201)
 * puis la signale pour nettoyage par run-projects (préfixe « HttpTest »).
 *
 * @package PoseParquet\Core
 */

declare(strict_types=1);

$base = rtrim( $argv[1] ?? '', '/' );
if ( ! $base ) {
	fwrite( STDERR, "Usage : php tests/run-http.php <URL WordPress>\n" );
	exit( 2 );
}

$echecs  = 0;
$reussis = 0;
$verifie = static function ( string $libelle, bool $ok, string $detail = '' ) use ( &$echecs, &$reussis ): void {
	$ok ? $reussis++ : $echecs++;
	echo ( $ok ? '  OK   ' : '  KO   ' ) . $libelle . ( ! $ok && $detail ? " — $detail" : '' ) . "\n";
};

/**
 * @return array{status:int,headers:array<string,string>,body:string}
 */
$appel = static function ( string $method, string $route, array $entetes = [], ?string $corps = null ) use ( $base ): array {
	// Une route REST passe par ?rest_route= ; un chemin de fichier s'appelle tel quel.
	$url  = str_starts_with( $route, '/wp-content/' ) ? $base . $route : $base . '/?rest_route=' . $route;
	$hdrs = '';
	foreach ( $entetes as $k => $v ) {
		$hdrs .= "$k: $v\r\n";
	}
	$ctx = stream_context_create( [ 'http' => [
		'method'        => $method,
		'header'        => $hdrs,
		'content'       => $corps ?? '',
		'ignore_errors' => true,
		'timeout'       => 15,
	] ] );
	$body = @file_get_contents( $url, false, $ctx );
	$raw  = $http_response_header ?? [];
	$status  = 0;
	$headers = [];
	foreach ( $raw as $ligne ) {
		if ( preg_match( '#^HTTP/\S+\s+(\d{3})#', $ligne, $m ) ) {
			$status  = (int) $m[1];
			$headers = []; // une redirection : on ne garde que la dernière réponse
		} elseif ( str_contains( $ligne, ':' ) ) {
			[ $k, $v ] = explode( ':', $ligne, 2 );
			$k = strtolower( trim( $k ) );
			$headers[ $k ] = isset( $headers[ $k ] ) ? $headers[ $k ] . ', ' . trim( $v ) : trim( $v );
		}
	}
	return [ 'status' => $status, 'headers' => $headers, 'body' => (string) $body ];
};

$json = static fn( array $d ): string => (string) json_encode( $d, JSON_UNESCAPED_UNICODE );
$requete = [
	'zone' => 'idf', 'department' => '75', 'housingType' => 'appartement', 'roomType' => 'chambre', 'surface' => 12,
	'supportType' => 'dalle', 'parquetType' => 'massif', 'installationType' => 'longueur', 'timeframe' => 'urgent',
	'firstName' => 'HttpTest', 'lastName' => 'HttpTest', 'email' => 'httptest@example.com', 'phone' => '0612345678', 'consent' => true,
];
$ok_origin  = 'https://jonathan-lanationduweb.github.io';
$bad_origin = 'https://evil.example.org';
$route      = '/pose-parquet/v1/projects';

echo "\n== Santé ==\n";
$r = $appel( 'GET', '/pose-parquet/v1/health' );
$verifie( 'GET /health → 200', $r['status'] === 200, (string) $r['status'] );
if ( $r['status'] !== 200 ) {
	fwrite( STDERR, "Serveur injoignable : $base\n" );
	exit( 2 );
}

echo "\n== Jeton de formulaire ==\n";
$r = $appel( 'GET', '/pose-parquet/v1/form-token', [ 'Origin' => $ok_origin ] );
$t = json_decode( $r['body'], true ) ?: [];
$verifie( 'GET /form-token → 200', $r['status'] === 200, (string) $r['status'] );
$verifie( 'jeton v1.<date>.<nonce>.<signature>', (bool) preg_match( '/^v1\.\d{10}\.[0-9a-f]{16}\.[0-9a-f]{64}$/', $t['token'] ?? '' ), $t['token'] ?? '' );
$verifie( 'minAge 2 / expiresIn 7200', ( $t['minAge'] ?? 0 ) === 2 && ( $t['expiresIn'] ?? 0 ) === 7200 );
$verifie( 'Cache-Control: no-store', ( $r['headers']['cache-control'] ?? '' ) === 'no-store' );
$verifie( 'CORS sur /form-token : origine autorisée renvoyée', ( $r['headers']['access-control-allow-origin'] ?? '' ) === $ok_origin );
$verifie( 'réponse < 300 octets', strlen( $r['body'] ) < 300 );
$r = $appel( 'GET', '/pose-parquet/v1/form-token', [ 'Origin' => $bad_origin ] );
$verifie( 'CORS sur /form-token : origine inconnue → aucun en-tête', $r['status'] === 200 && ! isset( $r['headers']['access-control-allow-origin'] ) );
foreach ( [ 'POST', 'PUT', 'DELETE' ] as $m ) {
	$r = $appel( $m, '/pose-parquet/v1/form-token', [ 'Content-Type' => 'application/json' ], '{}' );
	$verifie( "$m /form-token → 404", $r['status'] === 404, (string) $r['status'] );
}
$token_jeune = $t['token'] ?? '';
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( $requete + [ 'formToken' => $token_jeune ] ) );
$verifie( 'POST immédiat après le jeton → 422 form_token_invalid (trop rapide)', $r['status'] === 422 && str_contains( $r['body'], 'form_token_invalid' ), $r['status'] . ' ' . substr( $r['body'], 0, 160 ) );
sleep( 2 ); // âge minimum du jeton
$requete['formToken'] = $token_jeune;

echo "\n== Preflight OPTIONS ==\n";
$r = $appel( 'OPTIONS', $route, [ 'Origin' => $ok_origin, 'Access-Control-Request-Method' => 'POST', 'Access-Control-Request-Headers' => 'content-type' ] );
$verifie( 'OPTIONS origine autorisée → 200', $r['status'] === 200, (string) $r['status'] );
$verifie( 'Access-Control-Allow-Origin = origine exacte', ( $r['headers']['access-control-allow-origin'] ?? '' ) === $ok_origin, $r['headers']['access-control-allow-origin'] ?? '(absent)' );
$verifie( 'Allow-Methods = GET, POST, OPTIONS (ni PUT, PATCH, DELETE)', str_contains( $r['headers']['access-control-allow-methods'] ?? '', 'POST' ) && str_contains( $r['headers']['access-control-allow-methods'] ?? '', 'GET' ) && ! preg_match( '/PUT|PATCH|DELETE/', $r['headers']['access-control-allow-methods'] ?? '' ) );
$verifie( 'Allow-Headers contient Content-Type', stripos( $r['headers']['access-control-allow-headers'] ?? '', 'content-type' ) !== false );
$verifie( 'Vary: Origin', stripos( $r['headers']['vary'] ?? '', 'origin' ) !== false );
$verifie( 'pas de Allow-Credentials (héritage WordPress retiré)', ! isset( $r['headers']['access-control-allow-credentials'] ) );

$r = $appel( 'OPTIONS', $route, [ 'Origin' => $bad_origin, 'Access-Control-Request-Method' => 'POST' ] );
$verifie( 'OPTIONS origine inconnue : aucun Access-Control-Allow-Origin', ! isset( $r['headers']['access-control-allow-origin'] ), $r['headers']['access-control-allow-origin'] ?? '' );
$verifie( 'OPTIONS origine inconnue : jamais « * »', ( $r['headers']['access-control-allow-origin'] ?? '' ) !== '*' );

$r = $appel( 'OPTIONS', $route, [ 'Origin' => 'http://localhost:5180', 'Access-Control-Request-Method' => 'POST' ] );
$verifie( 'OPTIONS depuis localhost:5180 (dev) autorisé', ( $r['headers']['access-control-allow-origin'] ?? '' ) === 'http://localhost:5180' );

echo "\n== POST ==\n";
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json', 'Origin' => $ok_origin ], $json( $requete ) );
$d = json_decode( $r['body'], true ) ?: [];
$verifie( 'POST valide → 201', $r['status'] === 201, $r['status'] . ' ' . substr( $r['body'], 0, 200 ) );
$verifie( 'corps { success: true, reference }', ( $d['success'] ?? false ) === true && preg_match( '/^PP-\d{4}-\d{6,}$/', $d['reference'] ?? '' ) );
$verifie( 'POST : Access-Control-Allow-Origin sur la réponse', ( $r['headers']['access-control-allow-origin'] ?? '' ) === $ok_origin );
$verifie( 'POST : X-Request-Id exposé', isset( $r['headers']['x-request-id'] ) && stripos( $r['headers']['access-control-expose-headers'] ?? '', 'x-request-id' ) !== false );
$verifie( 'POST : Cache-Control: no-store', ( $r['headers']['cache-control'] ?? '' ) === 'no-store' );

$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json', 'Origin' => $bad_origin ], $json( $requete ) );
$verifie( 'POST depuis origine inconnue : traité (201) mais sans en-tête CORS — CORS n’est pas une authentification', $r['status'] === 201 && ! isset( $r['headers']['access-control-allow-origin'] ) );

$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], '{"zone":' );
$verifie( 'JSON illisible → 400', $r['status'] === 400, (string) $r['status'] );
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( $requete + [ 'status' => 'completed' ] ) );
$verifie( 'status injecté → 422', $r['status'] === 422 );
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( [ 'message' => str_repeat( 'x', 40000 ) ] + $requete ) );
$verifie( 'corps de 40 Ko → 413', $r['status'] === 413, (string) $r['status'] );
$r = $appel( 'POST', $route, [ 'Content-Type' => 'text/plain' ], $json( $requete ) );
$verifie( 'Content-Type text/plain avec corps JSON : accepté (le corps fait foi)', $r['status'] === 201, (string) $r['status'] );
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( $requete + [ 'website' => 'http://spam.example' ] ) );
$verifie( 'pot de miel rempli → 422 submission_rejected', $r['status'] === 422 && str_contains( $r['body'], 'submission_rejected' ), $r['status'] . ' ' . substr( $r['body'], 0, 120 ) );
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( array_diff_key( $requete, [ 'formToken' => 1 ] ) ) );
$verifie( 'sans jeton → 422 form_token_invalid', $r['status'] === 422 && str_contains( $r['body'], 'form_token_invalid' ) );

echo "\n== Sécurité des réponses ==\n";
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( [ 'email' => 'fuite.http@example.com', 'surface' => 0 ] + $requete ) );
$verifie( '422 sans email en écho', $r['status'] === 422 && ! str_contains( $r['body'], 'fuite.http' ), $r['status'] . ' ' . substr( $r['body'], 0, 120 ) );
$verifie( '422 sans chemin ni SQL', ! preg_match( '/wamp64|wp-content|SELECT |INSERT /i', $r['body'] ) );
$r = $appel( 'GET', '/wp-content/plugins/pose-parquet-core/src/Rest/ProjectsController.php' );
$verifie( 'accès direct au contrôleur : réponse vide', trim( $r['body'] ) === '', substr( $r['body'], 0, 80 ) );
$r = $appel( 'GET', '/wp-content/plugins/pose-parquet-core/src/Antispam/FormToken.php' );
$verifie( 'accès direct à FormToken : réponse vide (aucun secret servi)', trim( $r['body'] ) === '' );

echo "\n== Méthodes ==\n";
foreach ( [ 'GET', 'PUT', 'PATCH', 'DELETE' ] as $m ) {
	$r = $appel( $m, $route, [ 'Content-Type' => 'application/json' ], $m === 'GET' ? null : $json( $requete ) );
	$verifie( "$m /projects → 404", $r['status'] === 404, (string) $r['status'] );
}

/*
 * En dernier : cette section épuise volontairement le quota de l'adresse
 * appelante, donc tout POST qui la suivrait recevrait 429.
 */
echo "\n== Limite de débit (défaut : 5 créations / heure) ==\n";
// Trois créations ont déjà réussi depuis cette adresse ; on continue jusqu'au 429.
$statuts = [];
for ( $i = 0; $i < 4 && ! in_array( 429, $statuts, true ); $i++ ) {
	$r         = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( $requete ) );
	$statuts[] = $r['status'];
}
$verifie( '429 atteint après la 5e création (' . implode( ',', $statuts ) . ')', end( $statuts ) === 429 && count( array_filter( $statuts, static fn( int $s ): bool => $s === 201 ) ) === 2, implode( ',', $statuts ) );
$verifie( '429 : code rate_limited, message, Retry-After', str_contains( $r['body'], 'rate_limited' ) && str_contains( $r['body'], 'Trop de demandes' ) && ctype_digit( $r['headers']['retry-after'] ?? '' ) && (int) $r['headers']['retry-after'] > 0 );
$verifie( '429 : aucun identifiant technique, aucune adresse', ! preg_match( '/127\.0\.0\.1|pp_rl_|[a-f0-9]{32}/', $r['body'] ) );
$verifie( '429 : Cache-Control: no-store', ( $r['headers']['cache-control'] ?? '' ) === 'no-store' );

echo "\n$reussis vérifications réussies, $echecs échec(s).\n";
echo "(Les demandes « HttpTest » et les compteurs de débit de cette adresse sont effacés par run-projects.php : le lancer ensuite.)\n";
exit( $echecs ? 1 : 0 );
