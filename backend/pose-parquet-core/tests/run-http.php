<?php



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



$creations = 0;



$appel = static function ( string $method, string $route, array $entetes = [], ?string $corps = null ) use ( $base, &$creations ): array {

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
			$headers = [];
		} elseif ( str_contains( $ligne, ':' ) ) {
			[ $k, $v ] = explode( ':', $ligne, 2 );
			$k = strtolower( trim( $k ) );
			$headers[ $k ] = isset( $headers[ $k ] ) ? $headers[ $k ] . ', ' . trim( $v ) : trim( $v );
		}
	}
	if ( $method === 'POST' && str_contains( $route, '/projects' ) && $status === 201 ) {
		$creations++;
	}
	return [ 'status' => $status, 'headers' => $headers, 'body' => (string) $body ];
};

$json = static fn( array $d ): string => (string) json_encode( $d, JSON_UNESCAPED_UNICODE );


$requete = [

	'department' => '75', 'housingType' => 'appartement', 'roomType' => 'chambre', 'surface' => 12,
	'supportType' => 'dalle', 'parquetType' => 'massif', 'installationType' => 'longueur', 'timeframe' => 'urgent',
	'firstName' => 'HttpTest', 'lastName' => 'HttpTest', 'email' => 'httptest@example.com', 'phone' => '0612345678', 'consent' => true,
	'leadSource' => 'guide', 'leadNeed' => 'produit', 'leadDestination' => 'premibel',
	'entryPage' => '/guides/point-de-hongrie-ou-baton-rompu.html',
	'utmSource' => 'google', 'utmMedium' => 'cpc', 'utmCampaign' => 'hongrie-2026',
	'utmContent' => 'variante-b', 'utmTerm' => 'point de hongrie',
	'visualizer' => [ 'sceneId' => 'sejour', 'productId' => 'CHENF36006', 'pattern' => 'lames', 'orientation' => 0 ],
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


$rt_frais    = $appel( 'GET', '/pose-parquet/v1/form-token' );
$token_jeune = (string) ( ( json_decode( $rt_frais['body'], true ) ?: [] )['token'] ?? '' );
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( $requete + [ 'formToken' => $token_jeune ] ) );
$verifie( 'POST immédiat après le jeton → 422 form_token_invalid (trop rapide)', $r['status'] === 422 && str_contains( $r['body'], 'form_token_invalid' ), $r['status'] . ' ' . substr( $r['body'], 0, 160 ) );


$pool          = [];
$remplir_pool  = static function ( int $combien ) use ( &$pool, $appel ): void {
	for ( $i = 0; $i < $combien; $i++ ) {
		$rt = $appel( 'GET', '/pose-parquet/v1/form-token' );
		$dt = json_decode( $rt['body'], true ) ?: [];
		if ( ! empty( $dt['token'] ) ) {
			$pool[] = (string) $dt['token'];
		}
	}
	sleep( 2 );
};
$remplir_pool( 14 );
$jeton = static function () use ( &$pool, $remplir_pool ): string {
	if ( ! $pool ) {
		$remplir_pool( 6 );
	}
	return (string) array_shift( $pool );
};
$requete['formToken'] = $jeton();


$corps = static fn( array $extra = [] ): string => $json( array_merge( $requete, [ 'formToken' => $jeton() ], $extra ) );

echo "\n== Qualification commerciale ==\n";



foreach ( [ 'leadSource' => 'depuis-la-lune', 'leadNeed' => 'jacuzzi', 'leadDestination' => 'concurrent' ] as $champ => $valeur ) {
	$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $corps( [ $champ => $valeur ] ) );
	$verifie( "{$champ} hors liste → 422", $r['status'] === 422 && str_contains( $r['body'], $champ ), $r['status'] . ' ' . substr( $r['body'], 0, 160 ) );
}

$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $corps( [ 'entryPage' => 42 ] ) );
$verifie( 'page d’entrée non textuelle → 422', $r['status'] === 422 && str_contains( $r['body'], 'entryPage' ), (string) $r['status'] );

$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $corps( [ 'utmTerm' => str_repeat( 'x', 200 ) ] ) );
$verifie( 'utmTerm de 200 caractères → 422', $r['status'] === 422 && str_contains( $r['body'], 'utmTerm' ), (string) $r['status'] );

$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $corps( [ 'leadRouting' => 'premibel' ] ) );
$verifie( 'champ de qualification inventé → 422 champ inconnu', $r['status'] === 422 && str_contains( $r['body'], 'leadRouting' ), (string) $r['status'] );

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
$localhost_autorise = ( $r['headers']['access-control-allow-origin'] ?? '' ) === 'http://localhost:5180';
$verifie( 'localhost:5180 : ' . ( $localhost_autorise ? 'autorisé — le site se déclare de développement' : 'refusé — le site ne se déclare pas de développement' ), true );
$verifie( 'jamais « * » pour localhost', ( $r['headers']['access-control-allow-origin'] ?? '' ) !== '*' );

echo "\n== POST ==\n";
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json', 'Origin' => $ok_origin ], $corps() );
$d = json_decode( $r['body'], true ) ?: [];
$verifie( 'POST valide → 201', $r['status'] === 201, $r['status'] . ' ' . substr( $r['body'], 0, 200 ) );
$verifie( 'corps { success: true, reference }', ( $d['success'] ?? false ) === true && preg_match( '/^PP-\d{4}-\d{6,}$/', $d['reference'] ?? '' ) );
$verifie( 'POST : Access-Control-Allow-Origin sur la réponse', ( $r['headers']['access-control-allow-origin'] ?? '' ) === $ok_origin );
$verifie( 'POST : X-Request-Id exposé', isset( $r['headers']['x-request-id'] ) && stripos( $r['headers']['access-control-expose-headers'] ?? '', 'x-request-id' ) !== false );
$verifie( 'POST : Cache-Control: no-store', ( $r['headers']['cache-control'] ?? '' ) === 'no-store' );

$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json', 'Origin' => $bad_origin ], $corps() );
$verifie( 'POST depuis origine inconnue : traité (201) mais sans en-tête CORS — CORS n’est pas une authentification', $r['status'] === 201 && ! isset( $r['headers']['access-control-allow-origin'] ) );

$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], '{"zone":' );
$verifie( 'JSON illisible → 400', $r['status'] === 400, (string) $r['status'] );
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $corps( [ 'status' => 'completed' ] ) );
$verifie( 'status injecté → 422', $r['status'] === 422 );
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $corps( [ 'message' => str_repeat( 'x', 40000 ) ] ) );
$verifie( 'corps de 40 Ko → 413', $r['status'] === 413, (string) $r['status'] );


echo "\n== Type de contenu ==\n";
$avant_type = $corps();
foreach ( [
	'text/plain'                        => 'text/plain',
	'text/plain; charset=utf-8'         => 'text/plain avec charset',
	'application/x-www-form-urlencoded' => 'form-urlencoded',
	'multipart/form-data; boundary=xx'  => 'multipart',
	'application/xml'                   => 'xml',
] as $type => $libelle ) {
	$r = $appel( 'POST', $route, [ 'Content-Type' => $type ], $avant_type );
	$verifie( "$libelle → 415", $r['status'] === 415 && str_contains( $r['body'], 'unsupported_media_type' ), $r['status'] . ' ' . substr( $r['body'], 0, 120 ) );
}
$r = $appel( 'POST', $route, [], $avant_type );
$verifie( 'sans Content-Type → 415', $r['status'] === 415, $r['status'] . ' ' . substr( $r['body'], 0, 120 ) );
$verifie( '415 : Cache-Control no-store et X-Request-Id', ( $r['headers']['cache-control'] ?? '' ) === 'no-store' && isset( $r['headers']['x-request-id'] ) );
$verifie( '415 : aucune donnée saisie en écho', ! str_contains( $r['body'], 'httptest@example.com' ) && ! str_contains( $r['body'], 'HttpTest' ) );


$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json; charset=utf-8' ], $corps( [ 'surface' => 5000 ] ) );
$verifie( 'application/json; charset=utf-8 : accepté et lu (422 de validation, pas 415)', $r['status'] === 422 && str_contains( $r['body'], 'validation_failed' ), $r['status'] . ' ' . substr( $r['body'], 0, 160 ) );



echo "\n== Jeton à usage unique ==\n";
$unique = $jeton();
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( array_merge( $requete, [ 'formToken' => $unique ] ) ) );
$verifie( 'jeton neuf → 201', $r['status'] === 201, $r['status'] . ' ' . substr( $r['body'], 0, 160 ) );
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( array_merge( $requete, [ 'formToken' => $unique ] ) ) );
$verifie( 'même jeton réutilisé → 422 form_token_invalid', $r['status'] === 422 && str_contains( $r['body'], 'form_token_invalid' ), $r['status'] . ' ' . substr( $r['body'], 0, 160 ) );
$verifie( 'le refus ne renvoie pas le jeton', ! str_contains( $r['body'], substr( $unique, 0, 24 ) ) );


$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $corps( [ 'surface' => 5000 ] ) );
$verifie( 'un jeton neuf repasse la garde (422 de validation, pas form_token_invalid)', $r['status'] === 422 && str_contains( $r['body'], 'validation_failed' ), $r['status'] . ' ' . substr( $r['body'], 0, 160 ) );



if ( function_exists( 'curl_multi_init' ) ) {
	$simultane = $jeton();
	$charge    = $json( array_merge( $requete, [ 'formToken' => $simultane ] ) );
	$multi     = curl_multi_init();
	$mains     = [];
	for ( $i = 0; $i < 4; $i++ ) {
		$ch = curl_init( $base . '/?rest_route=' . $route );
		curl_setopt_array( $ch, [
			CURLOPT_POST           => true,
			CURLOPT_POSTFIELDS     => $charge,
			CURLOPT_HTTPHEADER     => [ 'Content-Type: application/json' ],
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_TIMEOUT        => 20,
		] );
		curl_multi_add_handle( $multi, $ch );
		$mains[] = $ch;
	}
	$actives = null;
	do {
		curl_multi_exec( $multi, $actives );
		curl_multi_select( $multi, 0.1 );
	} while ( $actives > 0 );
	$codes = [];
	foreach ( $mains as $ch ) {
		$codes[] = (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
		curl_multi_remove_handle( $multi, $ch );
		curl_close( $ch );
	}
	curl_multi_close( $multi );
	$gagnants   = count( array_filter( $codes, static fn( int $c ): bool => $c === 201 ) );
	$creations += $gagnants;
	$verifie( 'quatre requêtes simultanées, un seul jeton → une seule création (' . implode( ',', $codes ) . ')', $gagnants === 1, implode( ',', $codes ) );
	$verifie( 'les trois autres sont refusées, pas perdues', count( array_filter( $codes, static fn( int $c ): bool => $c === 422 ) ) === 3, implode( ',', $codes ) );
} else {
	$verifie( 'concurrence : non testée (extension curl absente)', true );
}
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $corps( [ 'website' => 'http://spam.example' ] ) );
$verifie( 'pot de miel rempli → 422 submission_rejected', $r['status'] === 422 && str_contains( $r['body'], 'submission_rejected' ), $r['status'] . ' ' . substr( $r['body'], 0, 120 ) );
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $json( array_diff_key( $requete, [ 'formToken' => 1 ] ) ) );
$verifie( 'sans jeton → 422 form_token_invalid', $r['status'] === 422 && str_contains( $r['body'], 'form_token_invalid' ) );

echo "\n== Sécurité des réponses ==\n";
$r = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $corps( [ 'email' => 'fuite.http@example.com', 'surface' => 0 ] ) );
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



echo "\n== Limite de débit (défaut : 5 créations / heure) ==\n";

$deja    = $creations;
$statuts = [];
for ( $i = 0; $i < 8 && ! in_array( 429, $statuts, true ); $i++ ) {
	$r         = $appel( 'POST', $route, [ 'Content-Type' => 'application/json' ], $corps() );
	$statuts[] = $r['status'];
}
$verifie( "429 atteint, et 5 créations au total ($deja avant cette section, statuts " . implode( ',', $statuts ) . ')', end( $statuts ) === 429 && $creations === 5, 'créations=' . $creations );
$verifie( '429 : code rate_limited, message, Retry-After', str_contains( $r['body'], 'rate_limited' ) && str_contains( $r['body'], 'Trop de demandes' ) && ctype_digit( $r['headers']['retry-after'] ?? '' ) && (int) $r['headers']['retry-after'] > 0 );
$verifie( '429 : aucun identifiant technique, aucune adresse', ! preg_match( '/127\.0\.0\.1|pp_rl_|[a-f0-9]{32}/', $r['body'] ) );
$verifie( '429 : Cache-Control: no-store', ( $r['headers']['cache-control'] ?? '' ) === 'no-store' );

echo "\n$reussis vérifications réussies, $echecs échec(s).\n";
echo "(Les demandes « HttpTest » et les compteurs de débit de cette adresse sont effacés par run-projects.php : le lancer ensuite.)\n";
exit( $echecs ? 1 : 0 );
