<?php



declare(strict_types=1);

namespace PoseParquet\Core\Partenaires;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Surveillance {

	public const HOOK      = 'pose_parquet_verifier_partenaires';
	public const INTERVALLE = 'pose_parquet_15_minutes';
	public const OPTION    = 'pose_parquet_partenaires';

	public const ECHECS_MAX = 2;



	public const PARTENAIRES = [
		'premibel' => [
			'nom'      => 'Premibel',
			'domaines' => [ 'premibel.fr' ],
			'defaut'   => 'https://www.premibel.fr/',
			'url'      => 'premibel_url',
			'afficher' => 'premibel_afficher',
		],
		'allure'   => [
			'nom'      => 'Allure Design',
			'domaines' => [ 'allure-design.com' ],
			'defaut'   => 'https://www.allure-design.com/',
			'url'      => 'allure_url',
			'afficher' => 'allure_afficher',
		],
	];



	private const SIGNES_MAINTENANCE = [
		'#<title[^>]*>[^<]*(maintenance|coming soon|bient[oô]t disponible|en construction)[^<]*</title>#iu',
		'#woocommerce-coming-soon#i',
		'#Briefly unavailable for scheduled maintenance#i',
		'#(site|boutique) (est )?(actuellement )?en (cours de )?maintenance#iu',
	];

	public static function register(): void {
		add_filter( 'cron_schedules', [ self::class, 'intervalle' ] );
		add_action( self::HOOK, [ self::class, 'verifier' ] );
		add_action( 'init', [ self::class, 'planifier' ] );
	}


	public static function intervalle( array $s ): array {
		$s[ self::INTERVALLE ] = [ 'interval' => 15 * MINUTE_IN_SECONDS, 'display' => __( 'Toutes les 15 minutes', 'pose-parquet-core' ) ];
		return $s;
	}

	public static function planifier(): void {
		if ( ! wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_event( time() + MINUTE_IN_SECONDS, self::INTERVALLE, self::HOOK );
		}
	}

	public static function deplanifier(): void {
		wp_clear_scheduled_hook( self::HOOK );
	}


	public static function adresse( string $cle ): string {
		$p      = self::PARTENAIRES[ $cle ];
		$saisie = (string) ( \PoseParquet\Core\Site\MonSite::valeurs()[ $p['url'] ] ?? '' );
		$hote   = strtolower( (string) wp_parse_url( $saisie, PHP_URL_HOST ) );
		$schema = strtolower( (string) wp_parse_url( $saisie, PHP_URL_SCHEME ) );
		foreach ( $p['domaines'] as $d ) {
			if ( $schema === 'https' && ( $hote === $d || str_ends_with( $hote, '.' . $d ) ) ) {
				return $saisie;
			}
		}
		return $p['defaut'];
	}


	public static function affiche( string $cle ): bool {
		$v = \PoseParquet\Core\Site\MonSite::valeurs()[ self::PARTENAIRES[ $cle ]['afficher'] ] ?? true;
		return ! in_array( $v, [ false, 0, '0', '', 'non' ], true );
	}



	public static function diagnostic( $r ): ?string {
		if ( is_wp_error( $r ) ) {
			return __( 'site injoignable', 'pose-parquet-core' ) . ' (' . $r->get_error_message() . ')';
		}
		$code = (int) wp_remote_retrieve_response_code( $r );
		if ( $code === 503 ) {
			return __( 'site en maintenance (HTTP 503)', 'pose-parquet-core' );
		}
		if ( $code >= 400 || $code === 0 ) {
			return sprintf(   __( 'site en erreur (HTTP %d)', 'pose-parquet-core' ), $code );
		}
		$corps = substr( (string) wp_remote_retrieve_body( $r ), 0, 300000 );
		foreach ( self::SIGNES_MAINTENANCE as $motif ) {
			if ( preg_match( $motif, $corps ) ) {
				return __( 'page de maintenance affichée', 'pose-parquet-core' );
			}
		}
		return null;
	}


	public static function verifier(): array {
		$etat = self::etat_brut();
		foreach ( array_keys( self::PARTENAIRES ) as $cle ) {
			$avant = $etat[ $cle ] ?? [ 'disponible' => true, 'echecs' => 0, 'raison' => '', 'depuis' => time() ];
			if ( ! self::affiche( $cle ) ) {
				$etat[ $cle ] = [ 'disponible' => true, 'echecs' => 0, 'raison' => '', 'depuis' => time(), 'verifie' => time(), 'ignore' => true ];
				continue;
			}
			$r = wp_safe_remote_get(
				self::adresse( $cle ),
				[
					'timeout'             => 12,
					'redirection'         => 3,
					'limit_response_size' => 300000,
					'user-agent'          => 'PoseParquetPartenaires/1.0 (+https://pose-parquet.com; contrôle de disponibilité toutes les 15 minutes)',
				]
			);
			$raison = self::diagnostic( $r );
			$echecs = $raison === null ? 0 : (int) $avant['echecs'] + 1;
			$dispo  = $echecs < self::ECHECS_MAX;
			$etat[ $cle ] = [
				'disponible' => $dispo,
				'echecs'     => $echecs,
				'raison'     => (string) $raison,
				'depuis'     => $dispo === (bool) $avant['disponible'] ? (int) ( $avant['depuis'] ?? time() ) : time(),
				'verifie'    => time(),
			];
		}
		update_option( self::OPTION, $etat, false );
		return $etat;
	}


	public static function etat_brut(): array {
		$e = get_option( self::OPTION, [] );
		return is_array( $e ) ? $e : [];
	}


	public static function disponible( string $cle ): bool {
		$e = self::etat_brut()[ $cle ] ?? null;
		return ! is_array( $e ) || ! empty( $e['disponible'] );
	}


	public static function repondre(): \WP_REST_Response {
		$etat  = self::etat_brut();
		$dates = array_filter( array_map( static fn( $e ) => is_array( $e ) ? (int) ( $e['verifie'] ?? 0 ) : 0, $etat ) );
		$corps = [ 'verifie' => $dates ? gmdate( 'c', min( $dates ) ) : null ];
		foreach ( array_keys( self::PARTENAIRES ) as $cle ) {
			$corps[ $cle ] = self::disponible( $cle );
		}
		$r = new \WP_REST_Response( $corps, 200 );
		$r->header( 'Cache-Control', 'public, max-age=60' );
		return $r;
	}

	public static function route( string $espace ): void {
		register_rest_route(
			$espace,
			'/partenaires',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ self::class, 'repondre' ],
				'permission_callback' => '__return_true',
			]
		);
	}
}
