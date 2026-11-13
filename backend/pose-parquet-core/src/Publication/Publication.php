<?php



declare(strict_types=1);

namespace PoseParquet\Core\Publication;

use PoseParquet\Core\Admin\SitePublic;
use PoseParquet\Core\Contenus\Apercu;
use PoseParquet\Core\Contenus\Export;
use PoseParquet\Core\Security\Capabilities;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Publication {

	public const ACTION      = 'pp_publier';
	public const PAGE        = 'pose-parquet-publication';
	public const OPTION      = 'pose_parquet_publication';
	public const VERROU      = 'pose_parquet_publication_verrou';
	private const CACHE_PUB  = 'pp_publication_publie';
	private const JOURNAL    = 15;

	public const DELAI_MAX   = 600;
	public const EVENEMENT_GITHUB = 'wordpress-publish';

	public const WORKFLOW_GITHUB = 'deploy-pages.yml';
	public const BRANCHE_GITHUB  = 'main';

	public const DELAI_DEMARRAGE_GITHUB = 180;



	public static function environnement( string $mode ): string {
		if ( $mode === 'local' ) {
			return 'local';
		}
		return defined( 'POSE_PARQUET_ENVIRONNEMENT' ) && POSE_PARQUET_ENVIRONNEMENT === 'production' ? 'production' : 'staging';
	}


	public static function libelle_environnement( string $env ): array {
		return [
			'local'      => [ __( 'Local', 'pose-parquet-core' ), 'neutre' ],
			'staging'    => [ __( 'Préproduction GitHub', 'pose-parquet-core' ), 'attente' ],
			'production' => [ __( 'Production', 'pose-parquet-core' ), 'ok' ],
		][ $env ] ?? [ $env, 'neutre' ];
	}

	public static function register(): void {
		add_action( 'admin_post_' . self::ACTION, [ self::class, 'publier' ] );
		add_action( 'admin_notices', [ self::class, 'rappel_editorial' ] );
	}






	public static function node(): ?string {
		$candidats = defined( 'POSE_PARQUET_NODE' ) ? [ (string) POSE_PARQUET_NODE ] : [ 'C:\\Program Files\\nodejs\\node.exe', '/usr/local/bin/node', '/usr/bin/node' ];
		foreach ( $candidats as $c ) {
			if ( $c !== '' && is_file( $c ) ) {
				return $c;
			}
		}
		return null;
	}


	public static function github(): ?array {
		if ( ! defined( 'POSE_PARQUET_GITHUB_REPO' ) || ! defined( 'POSE_PARQUET_GITHUB_TOKEN' ) ) {
			return null;
		}
		$repo = (string) POSE_PARQUET_GITHUB_REPO;
		return preg_match( '#^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$#', $repo ) && (string) POSE_PARQUET_GITHUB_TOKEN !== ''
			? [ 'repo' => $repo, 'jeton' => (string) POSE_PARQUET_GITHUB_TOKEN ]
			: null;
	}

	public static function mode(): string {
		if ( defined( 'POSE_PARQUET_PUBLICATION' ) && in_array( POSE_PARQUET_PUBLICATION, [ 'local', 'github', 'aucune' ], true ) ) {
			return (string) POSE_PARQUET_PUBLICATION;
		}
		if ( self::script() && self::node() ) {
			return 'local';
		}
		return self::github() ? 'github' : 'aucune';
	}


	private static function script(): ?string {
		$racine = Apercu::dossier();
		return $racine && is_file( $racine . '/_generator/publier.js' ) ? $racine . DIRECTORY_SEPARATOR . '_generator' . DIRECTORY_SEPARATOR . 'publier.js' : null;
	}


	public static function dossier_etat(): string {
		$d = WP_CONTENT_DIR . '/pp-publication';
		if ( is_dir( $d ) && (string) @file_get_contents( $d . '/.htaccess' ) !== self::HTACCESS ) {
			file_put_contents( $d . '/.htaccess', self::HTACCESS );
		}
		if ( ! is_dir( $d ) ) {
			wp_mkdir_p( $d );
			file_put_contents( $d . '/.htaccess', self::HTACCESS );
			file_put_contents( $d . '/index.php', "<?php // Silence.\n" );
		}
		return $d;
	}


	private const HTACCESS = "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n";

	public static function fichier_etat(): string {
		return self::dossier_etat() . '/publication-etat.json';
	}






	public static function export_courant(): array {
		$d = Export::donnees();
		unset( $d['genere'] );
		return (array) json_decode( (string) wp_json_encode( $d ), true );
	}


	public static function publie(): ?array {
		$cache = get_transient( self::CACHE_PUB );
		if ( is_array( $cache ) ) {
			return $cache;
		}
		$corps  = '';
		$racine = Apercu::dossier();
		if ( $racine && is_readable( $racine . '/data/wordpress/contenus.json' ) ) {
			$corps = (string) file_get_contents( $racine . '/data/wordpress/contenus.json' );
		} else {
			$r = \PoseParquet\Core\Admin\SitePublic::lire( SitePublic::url() . 'data/wordpress/contenus.json', [ 'timeout' => 6 ] );
			if ( ! is_wp_error( $r ) && (int) wp_remote_retrieve_response_code( $r ) === 200 ) {
				$corps = (string) wp_remote_retrieve_body( $r );
			}
		}
		$d = json_decode( $corps, true );
		if ( ! is_array( $d ) ) {
			return null;
		}
		unset( $d['genere'] );
		set_transient( self::CACHE_PUB, $d, 2 * MINUTE_IN_SECONDS );
		return $d;
	}

	public static function oublier_cache(): void {
		delete_transient( self::CACHE_PUB );
	}



	public static function changements(): array {
		$pub = self::publie();
		$cur = self::export_courant();
		if ( $pub === null ) {
			return [ [ 'type' => 'site', 'libelle' => __( 'Tout le site', 'pose-parquet-core' ), 'changement' => __( 'état publié introuvable', 'pose-parquet-core' ) ] ];
		}
		$out = [];
		if ( ( $pub['site'] ?? null ) != ( $cur['site'] ?? null ) ) {
			$out[] = [ 'type' => 'site', 'libelle' => __( 'Mon site', 'pose-parquet-core' ), 'changement' => __( 'modifié', 'pose-parquet-core' ) ];
		}
		if ( ( $pub['maintenance'] ?? null ) != ( $cur['maintenance'] ?? null ) ) {

			$avant = ! empty( $pub['maintenance']['actif'] );
			$apres = ! empty( $cur['maintenance']['actif'] );
			$out[] = match ( true ) {
				$apres && ! $avant => [ 'type' => 'maintenance', 'libelle' => __( 'Activation de la maintenance', 'pose-parquet-core' ), 'changement' => __( 'les visiteurs verront la page de maintenance', 'pose-parquet-core' ) ],
				! $apres && $avant => [ 'type' => 'maintenance', 'libelle' => __( 'Désactivation de la maintenance', 'pose-parquet-core' ), 'changement' => __( 'le site public sera rouvert', 'pose-parquet-core' ) ],
				default            => [ 'type' => 'maintenance', 'libelle' => __( 'Page de maintenance', 'pose-parquet-core' ), 'changement' => __( 'modifiée', 'pose-parquet-core' ) ],
			};
		}
		$listes = [
			'guides'       => [ 'slug', __( 'Guide', 'pose-parquet-core' ), \PoseParquet\Core\Contenus\Types::GUIDE ],
			'tutoriels'    => [ 'slug', __( 'Tutoriel', 'pose-parquet-core' ), \PoseParquet\Core\Contenus\Types::TUTORIEL ],
			'articles'     => [ 'slug', __( 'Article', 'pose-parquet-core' ), \PoseParquet\Core\Contenus\Types::ARTICLE ],
			'inspirations' => [ 'cle', __( 'Inspiration', 'pose-parquet-core' ), \PoseParquet\Core\Contenus\Types::INSPIRATION ],
			'pages'        => [ 'cle', __( 'Page', 'pose-parquet-core' ), \PoseParquet\Core\Contenus\Types::PAGE ],
		];
		foreach ( $listes as $liste => [ $cle, $nom, $type ] ) {
			$avant = array_column( (array) ( $pub[ $liste ] ?? [] ), null, $cle );
			$apres = array_column( (array) ( $cur[ $liste ] ?? [] ), null, $cle );
			foreach ( $apres as $k => $item ) {
				$titre = (string) ( $item['h1'] ?? $item['titre'] ?? $k ) ?: (string) $k;
				if ( ! isset( $avant[ $k ] ) ) {
					$out[] = [ 'type' => $type, 'libelle' => $nom . ' « ' . $titre . ' »', 'changement' => __( 'nouveau', 'pose-parquet-core' ), 'cle' => (string) $k ];
				} elseif ( $avant[ $k ] != $item ) {
					$out[] = [ 'type' => $type, 'libelle' => $nom . ' « ' . $titre . ' »', 'changement' => __( 'modifié', 'pose-parquet-core' ), 'cle' => (string) $k ];
				}
			}
			foreach ( array_diff_key( $avant, $apres ) as $k => $item ) {
				$out[] = [ 'type' => $type, 'libelle' => $nom . ' « ' . (string) ( $item['h1'] ?? $item['titre'] ?? $k ) . ' »', 'changement' => __( 'retiré (brouillon ou corbeille)', 'pose-parquet-core' ), 'cle' => (string) $k ];
			}
		}
		return $out;
	}


	public static function maintenance_publiee(): ?bool {
		$pub = self::publie();
		return $pub === null ? null : ! empty( $pub['maintenance']['actif'] );
	}






	public static function memoire(): array {
		$m = get_option( self::OPTION, [] );
		$m = is_array( $m ) ? $m : [];
		return [ 'derniere' => $m['derniere'] ?? null, 'journal' => (array) ( $m['journal'] ?? [] ) ];
	}



	public static function etat(): array {
		self::synchroniser();
		$mode     = self::mode();
		$memoire  = self::memoire();
		$verrou   = get_option( self::VERROU );
		$dernier  = $memoire['journal'][0] ?? null;
		$chgts    = $verrou ? [] : self::changements();
		$maint    = \PoseParquet\Core\Maintenance\Reglages::actif();
		$publiee  = self::maintenance_publiee();
		$etat = [
			'mode'                  => $mode,
			'etape'                 => '',
			'derniere'              => $memoire['derniere'],
			'changements'           => $chgts,
			'raison'                => '',
			'maintenance_a_publier' => $publiee !== null && $publiee !== $maint,
		];
		if ( is_array( $verrou ) ) {
			$fichier = self::lire_fichier_etat();
			return array_merge( $etat, [ 'statut' => 'en_cours', 'libelle' => __( 'Publication en cours', 'pose-parquet-core' ), 'etape' => (string) ( $fichier['etape'] ?? ( ( $verrou['mode'] ?? '' ) === 'github' ? 'ci' : 'export' ) ) ] );
		}
		if ( is_array( $dernier ) && ( $dernier['resultat'] ?? '' ) === 'echec' && $chgts ) {
			return array_merge( $etat, [ 'statut' => 'echec', 'libelle' => __( 'Échec de publication', 'pose-parquet-core' ), 'raison' => (string) ( $dernier['raison'] ?? '' ) ] );
		}
		if ( $chgts ) {
			return $etat + [ 'statut' => 'modifications', 'libelle' => __( 'Modifications à publier', 'pose-parquet-core' ) ];
		}
		return $etat + [ 'statut' => 'a_jour', 'libelle' => __( 'Site à jour', 'pose-parquet-core' ) ];
	}

	private static function lire_fichier_etat(): ?array {
		$f = self::fichier_etat();
		if ( ! is_readable( $f ) ) {
			return null;
		}
		$d = json_decode( (string) file_get_contents( $f ), true );
		return is_array( $d ) ? $d : null;
	}





	public static function publier(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), '', [ 'response' => 403 ] );
		}
		check_admin_referer( self::ACTION );
		$r = self::lancer( get_current_user_id() );
		$retour = wp_get_referer() ?: admin_url( 'admin.php?page=' . self::PAGE );
		wp_safe_redirect( add_query_arg( 'pp-publication', $r['code'], remove_query_arg( 'pp-publication', $retour ) ) );
		exit;
	}



	public static function lancer( int $utilisateur, bool $catalogue = false ): array {
		$mode = self::mode();
		if ( $mode === 'aucune' ) {
			return [ 'code' => 'indisponible', 'message' => __( 'Aucune publication configurée sur cette installation.', 'pose-parquet-core' ) ];
		}
		self::synchroniser();

		$verrou = [ 'debut' => time(), 'utilisateur' => $utilisateur, 'mode' => $mode, 'maintenance' => \PoseParquet\Core\Maintenance\Reglages::actif() ];
		if ( ! add_option( self::VERROU, $verrou, '', false ) ) {
			return [ 'code' => 'en_cours', 'message' => __( 'Une publication est déjà en cours.', 'pose-parquet-core' ) ];
		}

		$ok = $mode === 'local' ? self::lancer_local( $catalogue ) : self::lancer_github( $utilisateur );
		if ( ! $ok['ok'] ) {
			self::terminer( [ 'statut' => 'echec', 'raison' => $ok['raison'], 'duree' => 0 ] );
			return [ 'code' => 'echec', 'message' => $ok['raison'] ];
		}
		return [ 'code' => 'lancee', 'message' => __( 'Publication lancée.', 'pose-parquet-core' ) ];
	}


	private static function lancer_local( bool $catalogue = false ): array {
		$node   = self::node();
		$script = self::script();
		if ( ! $node || ! $script ) {
			return [ 'ok' => false, 'raison' => __( 'Node ou le script de publication est introuvable.', 'pose-parquet-core' ) ];
		}
		$fichier = self::fichier_etat();
		@unlink( $fichier );
		$export = rest_url( 'pose-parquet/v1/contenus' );

		$args = implode( ' ', array_map( 'escapeshellarg', array_merge( [ $node, $script, '--etat', $fichier, '--export', $export ], $catalogue ? [ '--catalogue' ] : [] ) ) );
		if ( DIRECTORY_SEPARATOR === '\\' ) {
			$commande = 'start "" /B ' . $args . ' > NUL 2>&1';
		} else {
			$commande = 'nohup ' . $args . ' > /dev/null 2>&1 &';
		}
		$p = popen( $commande, 'r' );
		if ( $p === false ) {
			return [ 'ok' => false, 'raison' => __( 'Le processus de publication n’a pas pu démarrer.', 'pose-parquet-core' ) ];
		}
		pclose( $p );
		return [ 'ok' => true, 'raison' => '' ];
	}


	private static function lancer_github( int $utilisateur ): array {
		$gh = self::github();
		if ( ! $gh ) {
			return [ 'ok' => false, 'raison' => __( 'Publication GitHub non configurée (wp-config.php).', 'pose-parquet-core' ) ];
		}


		$workflow = defined( 'POSE_PARQUET_GITHUB_WORKFLOW' ) ? (string) POSE_PARQUET_GITHUB_WORKFLOW : self::WORKFLOW_GITHUB;
		$branche  = defined( 'POSE_PARQUET_GITHUB_REF' ) ? (string) POSE_PARQUET_GITHUB_REF : self::BRANCHE_GITHUB;
		if ( ! preg_match( '/^[A-Za-z0-9_.-]+\.ya?ml$/', $workflow ) || ! preg_match( '#^[A-Za-z0-9_./-]+$#', $branche ) ) {
			return [ 'ok' => false, 'raison' => __( 'Workflow ou branche GitHub invalide (wp-config.php).', 'pose-parquet-core' ) ];
		}
		$r = wp_remote_post(
			'https://api.github.com/repos/' . $gh['repo'] . '/actions/workflows/' . $workflow . '/dispatches',
			[
				'timeout' => 10,
				'headers' => [
					'Accept'               => 'application/vnd.github+json',
					'Authorization'        => 'Bearer ' . $gh['jeton'],
					'X-GitHub-Api-Version' => '2022-11-28',
					'User-Agent'           => 'pose-parquet-core',
				],

				'body'    => (string) wp_json_encode( [ 'ref' => $branche ] ),
			]
		);
		$code = is_wp_error( $r ) ? 0 : (int) wp_remote_retrieve_response_code( $r );
		return $code === 204
			? [ 'ok' => true, 'raison' => '' ]
			: [ 'ok' => false, 'raison' => sprintf(   __( 'GitHub a refusé le déclenchement (%s).', 'pose-parquet-core' ), $code ?: ( is_wp_error( $r ) ? $r->get_error_message() : '?' ) ) ];
	}






	public static function synchroniser(): void {
		$verrou = get_option( self::VERROU );
		if ( ! is_array( $verrou ) ) {
			return;
		}
		$age = time() - (int) ( $verrou['debut'] ?? 0 );
		if ( ( $verrou['mode'] ?? '' ) === 'github' ) {
			$run = self::run_github( (int) $verrou['debut'] );
			if ( $run && $run['status'] === 'completed' ) {
				self::terminer( [ 'statut' => $run['conclusion'] === 'success' ? 'succes' : 'echec', 'raison' => $run['conclusion'] === 'success' ? '' : sprintf(   __( 'Le workflow GitHub s’est terminé en « %s » : le site en ligne n’a pas été remplacé.', 'pose-parquet-core' ), $run['conclusion'] ), 'duree' => $age, 'empreinte' => substr( (string) $run['sha'], 0, 12 ) ] );
				return;
			}


			if ( ! $run && $age > self::DELAI_DEMARRAGE_GITHUB ) {
				self::terminer( [ 'statut' => 'echec', 'raison' => __( 'GitHub a reçu le signal mais aucun workflow n’a démarré : la branche publiée doit contenir deploy-pages.yml avec le déclencheur workflow_dispatch. Le site en ligne n’a pas changé.', 'pose-parquet-core' ), 'duree' => $age ] );
				return;
			}
		} else {
			$etat = self::lire_fichier_etat();

			$du_meme_lancement = $etat && strtotime( (string) ( $etat['debut'] ?? '' ) ) >= (int) ( $verrou['debut'] ?? 0 ) - 2;
			if ( $du_meme_lancement && in_array( $etat['statut'] ?? '', [ 'succes', 'echec' ], true ) ) {
				self::terminer( $etat );
				return;
			}
		}
		if ( $age > self::DELAI_MAX ) {
			self::terminer( [ 'statut' => 'echec', 'raison' => __( 'Publication interrompue : aucune nouvelle depuis dix minutes.', 'pose-parquet-core' ), 'duree' => $age ] );
		}
	}


	private static function run_github( int $depuis ): ?array {
		$gh = self::github();
		if ( ! $gh ) {
			return null;
		}
		$r = wp_remote_get(
			'https://api.github.com/repos/' . $gh['repo'] . '/actions/runs?event=workflow_dispatch&per_page=1',
			[ 'timeout' => 8, 'headers' => [ 'Accept' => 'application/vnd.github+json', 'Authorization' => 'Bearer ' . $gh['jeton'], 'User-Agent' => 'pose-parquet-core' ] ]
		);
		$run = json_decode( (string) wp_remote_retrieve_body( $r ), true )['workflow_runs'][0] ?? null;
		if ( ! is_array( $run ) || strtotime( (string) ( $run['created_at'] ?? '' ) ) < $depuis - 5 ) {
			return null;
		}
		return [ 'status' => (string) $run['status'], 'conclusion' => (string) ( $run['conclusion'] ?? '' ), 'sha' => (string) ( $run['head_sha'] ?? '' ) ];
	}


	private static function terminer( array $fin ): void {
		$verrou  = get_option( self::VERROU );
		$verrou  = is_array( $verrou ) ? $verrou : [];
		$memoire = self::memoire();
		$user    = get_userdata( (int) ( $verrou['utilisateur'] ?? 0 ) );
		$ligne   = [
			'date'        => time(),
			'utilisateur' => $user ? $user->display_name : '—',
			'resultat'    => ( $fin['statut'] ?? '' ) === 'succes' ? 'succes' : 'echec',
			'duree'       => (int) ( $fin['duree'] ?? 0 ),
			'empreinte'   => sanitize_text_field( (string) ( $fin['empreinte'] ?? '' ) ),
			'mode'        => (string) ( $verrou['mode'] ?? self::mode() ),
			'environnement' => self::environnement( (string) ( $verrou['mode'] ?? self::mode() ) ),
			'raison'      => mb_substr( sanitize_text_field( (string) ( $fin['raison'] ?? '' ) . ( ! empty( $fin['retablissement'] ) ? ' — ' . $fin['retablissement'] : '' ) ), 0, 400 ),
			'site_intact' => ( $fin['statut'] ?? '' ) === 'succes' ? true : (bool) ( $fin['siteIntact'] ?? true ),
		];
		array_unshift( $memoire['journal'], $ligne );
		$memoire['journal'] = array_slice( $memoire['journal'], 0, self::JOURNAL );
		if ( $ligne['resultat'] === 'succes' ) {
			$memoire['derniere'] = $ligne;
		}
		update_option( self::OPTION, $memoire, false );
		delete_option( self::VERROU );
		self::oublier_cache();
		delete_transient( 'pp_catalogue_etat' );
	}





	public static function url(): string {
		return admin_url( 'admin.php?page=' . self::PAGE );
	}

	private static function variante( string $statut ): string {
		return [ 'a_jour' => 'ok', 'modifications' => 'attente', 'en_cours' => 'neutre', 'echec' => 'ko' ][ $statut ] ?? 'neutre';
	}

	private static function date( ?array $ligne ): string {
		return $ligne ? wp_date( 'j F Y à H:i', (int) $ligne['date'] ) : __( 'jamais depuis WordPress', 'pose-parquet-core' );
	}


	public static function bouton( array $etat, string $classe = 'adm-bouton adm-bouton--plein' ): string {
		$actif = $etat['mode'] !== 'aucune' && $etat['statut'] !== 'en_cours';
		return '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="adm-carte__formulaire" data-pp-publier>'
			. '<input type="hidden" name="action" value="' . esc_attr( self::ACTION ) . '" />'
			. wp_nonce_field( self::ACTION, '_wpnonce', true, false )
			. '<button type="submit" class="' . esc_attr( $classe ) . '"' . ( $actif ? '' : ' disabled' ) . '><span class="dashicons dashicons-upload" aria-hidden="true"></span>'
			. esc_html( $etat['statut'] === 'en_cours' ? __( 'Publication en cours…', 'pose-parquet-core' ) : __( 'Publier le site', 'pose-parquet-core' ) ) . '</button></form>';
	}



	private static function statut( array $e ): void {
		$n = count( $e['changements'] );
		[ $icone, $variante, $phrase ] = match ( $e['statut'] ) {
			'a_jour'        => [ 'dashicons-yes-alt', 'ok', __( 'Le site public est à jour.', 'pose-parquet-core' ) ],
			'modifications' => [ 'dashicons-warning', 'attente', sprintf(   _n( '%d modification à publier.', '%d modifications à publier.', $n, 'pose-parquet-core' ), $n ) ],
			'en_cours'      => [ 'dashicons-update', 'info', __( 'Publication en cours…', 'pose-parquet-core' ) ],
			default         => [ 'dashicons-dismiss', 'ko', __( 'La dernière publication a échoué.', 'pose-parquet-core' ) ],
		};
		echo '<div class="adm-statut adm-statut--' . esc_attr( $variante ) . '"><span class="dashicons ' . esc_attr( $icone ) . '" aria-hidden="true"></span><div>';
		echo '<strong class="adm-statut__phrase">' . esc_html( $phrase ) . '</strong>';
		if ( $e['statut'] === 'en_cours' && $e['etape'] !== '' ) {
			$etapes = [ 'catalogue' => __( 'synchronisation du catalogue Premibel', 'pose-parquet-core' ), 'export' => __( 'export et validation', 'pose-parquet-core' ), 'validation' => __( 'validation', 'pose-parquet-core' ), 'build' => __( 'construction du site', 'pose-parquet-core' ), 'ci' => __( 'workflow GitHub', 'pose-parquet-core' ) ];
			echo '<span class="adm-statut__detail">' . esc_html( sprintf(   __( 'Étape : %s', 'pose-parquet-core' ), $etapes[ $e['etape'] ] ?? $e['etape'] ) ) . '</span>';
		}
		echo '<span class="adm-statut__detail">' . esc_html( sprintf(   __( 'Dernière publication : %s', 'pose-parquet-core' ), self::date( $e['derniere'] ) ) ) . '</span>';
		echo '</div></div>';
	}


	public static function panneau( bool $compact = true ): void {
		$e = self::etat();
		echo '<div class="adm-panneau adm-publication" data-pp-publication="' . esc_attr( $e['statut'] ) . '">';
		echo '<div class="adm-panneau__entete"><h2 class="adm-panneau__titre"><span class="dashicons dashicons-admin-site-alt3" aria-hidden="true"></span>' . esc_html__( 'Publication du site', 'pose-parquet-core' ) . '</h2></div>';
		self::statut( $e );
		self::alertes( $e );
		echo '<div class="adm-publication__actions">';
		echo self::bouton( $e );
		echo '</div>';
		echo '<p class="adm-publication__liens">';
		if ( $compact ) {
			echo '<a href="' . esc_url( self::url() . '#pp-changements' ) . '">' . esc_html( $e['changements'] ? __( 'Prévisualiser les changements →', 'pose-parquet-core' ) : __( 'Historique des publications →', 'pose-parquet-core' ) ) . '</a>';
		}
		echo '<a href="' . esc_url( \PoseParquet\Core\Admin\SitePublic::url() ) . '" target="_blank" rel="noopener">' . esc_html__( 'Voir le site public ↗', 'pose-parquet-core' ) . '</a>';
		echo '</p></div>';
	}


	private static function alertes( array $e ): void {

		if ( $e['statut'] === 'echec' && $e['raison'] !== '' ) {
			echo '<p class="adm-alerte-ligne adm-alerte-ligne--ko"><span class="dashicons dashicons-warning" aria-hidden="true"></span>' . esc_html__( 'Publication échouée :', 'pose-parquet-core' ) . ' ' . esc_html( $e['raison'] ) . ' ' . esc_html__( 'Le site en ligne n’a pas changé.', 'pose-parquet-core' ) . '</p>';
		}
		if ( $e['mode'] === 'aucune' ) {

			echo wp_get_environment_type() === 'local'
				? '<p class="adm-panneau__texte">' . esc_html__( 'Aucune publication n’est configurée ici : ni dossier local du site avec Node, ni GitHub. Voir Publication.', 'pose-parquet-core' ) . '</p>'
				: '<p class="adm-alerte-ligne"><span class="dashicons dashicons-info-outline" aria-hidden="true"></span>' . esc_html__( 'Publication GitHub à configurer : POSE_PARQUET_GITHUB_REPO et POSE_PARQUET_GITHUB_TOKEN dans wp-config.php, WP_EXPORT_URL dans le dépôt GitHub.', 'pose-parquet-core' ) . '</p>';
		}
	}



	public static function bandeau(): void {
		$e     = self::etat();
		$modes = [ 'local' => __( 'Local', 'pose-parquet-core' ), 'github' => 'GitHub Actions', 'aucune' => __( 'Non configurée', 'pose-parquet-core' ) ];
		echo '<section class="adm-bandeau adm-publication" data-pp-publication="' . esc_attr( $e['statut'] ) . '" aria-label="' . esc_attr__( 'Site public', 'pose-parquet-core' ) . '">';
		echo '<div class="adm-bandeau__ligne">';
		echo '<div class="adm-bandeau__statut"><span class="adm-bandeau__libelle">' . esc_html__( 'Site public', 'pose-parquet-core' ) . '</span>';
		self::statut( $e );
		echo '<span class="adm-bandeau__mode">' . esc_html( sprintf(   __( 'Mode de publication : %s', 'pose-parquet-core' ), $modes[ $e['mode'] ] ?? $e['mode'] ) ) . '</span></div>';
		echo '<div class="adm-bandeau__actions"><a class="adm-bouton" href="#pp-changements"><span class="dashicons dashicons-visibility" aria-hidden="true"></span>' . esc_html__( 'Prévisualiser', 'pose-parquet-core' ) . '</a>' . self::bouton( $e ) . '</div>';
		echo '</div>';
		self::alertes( $e );
		echo '</section>';
	}


	public static function rappel_editorial(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) return;
		$screen = get_current_screen();
		if ( ! $screen || ! in_array( $screen->post_type, \PoseParquet\Core\Contenus\Types::all(), true ) ) return;
		self::rappel();
	}

	public static function rappel(): void {
		$e = self::etat();
		if ( ! in_array( $e['statut'], [ 'modifications', 'echec' ], true ) ) {
			return;
		}
		echo '<div class="notice notice-warning inline adm-rappel-publication"><p><strong>' . esc_html( $e['libelle'] ) . '</strong> — ' . esc_html( sprintf(   _n( '%d changement attend d’être mis en ligne.', '%d changements attendent d’être mis en ligne.', count( $e['changements'] ), 'pose-parquet-core' ), count( $e['changements'] ) ) ) . ' <a href="' . esc_url( self::url() ) . '">' . esc_html__( 'Prévisualiser et publier', 'pose-parquet-core' ) . '</a></p></div>';
	}


	public static function render(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), esc_html__( 'Accès refusé', 'pose-parquet-core' ), [ 'response' => 403 ] );
		}
		require POSE_PARQUET_DIR . '/templates/admin-publication.php';
	}
}
