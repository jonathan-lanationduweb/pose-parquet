<?php
/**
 * PUBLIER LE SITE depuis WordPress.
 *
 *   Enregistrer → Prévisualiser → Publier le site
 *
 * Le site public est statique : publier, c'est tirer l'export WordPress, le
 * valider, reconstruire le site. Ce module ne fait QUE déclencher un workflow
 * fermé et en suivre l'état ; il n'accepte aucune commande, aucun chemin,
 * aucun paramètre venu du navigateur.
 *
 * DEUX MODES, choisis par l'installation, jamais par la requête :
 *
 *   local   le dossier du site est sur cette machine (Réglages → Site public)
 *           et Node y est installé : WordPress lance
 *           `node _generator/publier.js` (export → validation → build), en
 *           tâche de fond, avec un délai maximal. En cas d'échec du build, le
 *           script rétablit le site précédent.
 *   github  production : WordPress n'a ni le dépôt ni Node. Il envoie un
 *           `repository_dispatch` à GitHub (jeton dans wp-config.php, jamais
 *           dans le navigateur) ; le workflow de déploiement tire l'export,
 *           valide, construit et ne déploie que si tout a réussi — le site en
 *           ligne n'est jamais remplacé par un build raté.
 *   aucune  ni l'un ni l'autre : le bouton est désactivé et dit pourquoi.
 *
 * « MODIFICATIONS À PUBLIER » sans rien mémoriser : on compare l'export
 * actuel de WordPress à l'instantané RÉELLEMENT publié
 * (data/wordpress/contenus.json, lu dans le dossier du site ou sur le site
 * public). Tout ce qui change ce que le site afficherait — un guide, une
 * inspiration, une page, Mon site, la maintenance — apparaît ; un brouillon,
 * qui n'est pas exporté, n'apparaît pas.
 *
 * Une seule publication à la fois (verrou atomique `add_option`), un journal
 * des 15 dernières.
 */

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
	/** Au-delà, une publication sans nouvelles est considérée comme interrompue. */
	public const DELAI_MAX   = 600;
	public const EVENEMENT_GITHUB = 'wordpress-publish';
	/** Sans run GitHub visible après ce délai, le déclenchement n'a rien démarré : on le dit. */
	public const DELAI_DEMARRAGE_GITHUB = 180;

	/**
	 * L'environnement que vise une publication, pour le journal :
	 * local, préproduction GitHub (staging) ou production. Le mode GitHub vise
	 * la préproduction tant que wp-config.php ne dit pas
	 * POSE_PARQUET_ENVIRONNEMENT = 'production'.
	 */
	public static function environnement( string $mode ): string {
		if ( $mode === 'local' ) {
			return 'local';
		}
		return defined( 'POSE_PARQUET_ENVIRONNEMENT' ) && POSE_PARQUET_ENVIRONNEMENT === 'production' ? 'production' : 'staging';
	}

	/** @return array{0:string,1:string} libellé, variante de badge */
	public static function libelle_environnement( string $env ): array {
		return [
			'local'      => [ __( 'Local', 'pose-parquet-core' ), 'neutre' ],
			'staging'    => [ __( 'Préproduction GitHub', 'pose-parquet-core' ), 'attente' ],
			'production' => [ __( 'Production', 'pose-parquet-core' ), 'ok' ],
		][ $env ] ?? [ $env, 'neutre' ];
	}

	public static function register(): void {
		add_action( 'admin_post_' . self::ACTION, [ self::class, 'publier' ] );
	}

	/* ================================================================== */
	/* Mode                                                               */
	/* ================================================================== */

	/** Node : une constante de wp-config.php, sinon les emplacements habituels. Jamais une saisie. */
	public static function node(): ?string {
		$candidats = defined( 'POSE_PARQUET_NODE' ) ? [ (string) POSE_PARQUET_NODE ] : [ 'C:\\Program Files\\nodejs\\node.exe', '/usr/local/bin/node', '/usr/bin/node' ];
		foreach ( $candidats as $c ) {
			if ( $c !== '' && is_file( $c ) ) {
				return $c;
			}
		}
		return null;
	}

	/** @return array{repo:string,jeton:string}|null configuration GitHub, côté serveur seulement. */
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

	/** Le script de publication du dépôt, s'il est là. */
	private static function script(): ?string {
		$racine = Apercu::dossier();
		return $racine && is_file( $racine . '/_generator/publier.js' ) ? $racine . DIRECTORY_SEPARATOR . '_generator' . DIRECTORY_SEPARATOR . 'publier.js' : null;
	}

	/** Dossier privé de l'état (hors uploads, interdit au web). */
	public static function dossier_etat(): string {
		$d = WP_CONTENT_DIR . '/pp-publication';
		if ( is_dir( $d ) && (string) @file_get_contents( $d . '/.htaccess' ) !== self::HTACCESS ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			file_put_contents( $d . '/.htaccess', self::HTACCESS ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		}
		if ( ! is_dir( $d ) ) {
			wp_mkdir_p( $d );
			file_put_contents( $d . '/.htaccess', self::HTACCESS ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $d . '/index.php', "<?php // Silence.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		}
		return $d;
	}

	/** Interdit au web, Apache 2.4 comme 2.2. */
	private const HTACCESS = "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n";

	public static function fichier_etat(): string {
		return self::dossier_etat() . '/publication-etat.json';
	}

	/* ================================================================== */
	/* Ce qui est publié, ce qui ne l'est pas                             */
	/* ================================================================== */

	/** L'export actuel, sous la forme où l'instantané le garde. */
	public static function export_courant(): array {
		$d = Export::donnees();
		unset( $d['genere'] );
		return (array) json_decode( (string) wp_json_encode( $d ), true );
	}

	/** L'instantané publié (dossier local, sinon site public), mis en cache deux minutes. */
	public static function publie(): ?array {
		$cache = get_transient( self::CACHE_PUB );
		if ( is_array( $cache ) ) {
			return $cache;
		}
		$corps  = '';
		$racine = Apercu::dossier();
		if ( $racine && is_readable( $racine . '/data/wordpress/contenus.json' ) ) {
			$corps = (string) file_get_contents( $racine . '/data/wordpress/contenus.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		} else {
			$r = wp_remote_get( SitePublic::url() . 'data/wordpress/contenus.json', [ 'timeout' => 6 ] );
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

	/**
	 * Ce qui a changé depuis la dernière publication, en mots.
	 *
	 * @return array<int,array{type:string,libelle:string,changement:string,id?:int}>
	 */
	public static function changements(): array {
		$pub = self::publie();
		$cur = self::export_courant();
		if ( $pub === null ) {
			return [ [ 'type' => 'site', 'libelle' => __( 'Tout le site', 'pose-parquet-core' ), 'changement' => __( 'état publié introuvable', 'pose-parquet-core' ) ] ];
		}
		$out = [];
		if ( ( $pub['site'] ?? null ) != ( $cur['site'] ?? null ) ) { // phpcs:ignore Universal.Operators.StrictComparisons -- comparaison de structures décodées.
			$out[] = [ 'type' => 'site', 'libelle' => __( 'Mon site', 'pose-parquet-core' ), 'changement' => __( 'modifié', 'pose-parquet-core' ) ];
		}
		if ( ( $pub['maintenance'] ?? null ) != ( $cur['maintenance'] ?? null ) ) { // phpcs:ignore Universal.Operators.StrictComparisons
			$out[] = [ 'type' => 'maintenance', 'libelle' => __( 'Maintenance', 'pose-parquet-core' ), 'changement' => ! empty( $cur['maintenance']['actif'] ) !== ! empty( $pub['maintenance']['actif'] ) ? ( ! empty( $cur['maintenance']['actif'] ) ? __( 'activée', 'pose-parquet-core' ) : __( 'désactivée', 'pose-parquet-core' ) ) : __( 'page modifiée', 'pose-parquet-core' ) ];
		}
		$listes = [
			'guides'       => [ 'slug', __( 'Guide', 'pose-parquet-core' ), \PoseParquet\Core\Contenus\Types::GUIDE ],
			'tutoriels'    => [ 'slug', __( 'Tutoriel', 'pose-parquet-core' ), \PoseParquet\Core\Contenus\Types::TUTORIEL ],
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
				} elseif ( $avant[ $k ] != $item ) { // phpcs:ignore Universal.Operators.StrictComparisons
					$out[] = [ 'type' => $type, 'libelle' => $nom . ' « ' . $titre . ' »', 'changement' => __( 'modifié', 'pose-parquet-core' ), 'cle' => (string) $k ];
				}
			}
			foreach ( array_diff_key( $avant, $apres ) as $k => $item ) {
				$out[] = [ 'type' => $type, 'libelle' => $nom . ' « ' . (string) ( $item['h1'] ?? $item['titre'] ?? $k ) . ' »', 'changement' => __( 'retiré (brouillon ou corbeille)', 'pose-parquet-core' ), 'cle' => (string) $k ];
			}
		}
		return $out;
	}

	/** La maintenance publiée diffère-t-elle de celle réglée ? null = inconnu. */
	public static function maintenance_publiee(): ?bool {
		$pub = self::publie();
		return $pub === null ? null : ! empty( $pub['maintenance']['actif'] );
	}

	/* ================================================================== */
	/* État                                                               */
	/* ================================================================== */

	/** @return array{derniere:?array,journal:array<int,array>} */
	public static function memoire(): array {
		$m = get_option( self::OPTION, [] );
		$m = is_array( $m ) ? $m : [];
		return [ 'derniere' => $m['derniere'] ?? null, 'journal' => (array) ( $m['journal'] ?? [] ) ];
	}

	/**
	 * L'état à afficher.
	 *
	 * @return array{statut:string,libelle:string,mode:string,etape:string,derniere:?array,changements:array,raison:string,maintenance_a_publier:bool}
	 */
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
		$d = json_decode( (string) file_get_contents( $f ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		return is_array( $d ) ? $d : null;
	}

	/* ================================================================== */
	/* Lancer                                                             */
	/* ================================================================== */

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

	/**
	 * Déclenche le workflow fermé. Aucun argument ne vient de la requête.
	 *
	 * @return array{code:string,message:string}
	 */
	public static function lancer( int $utilisateur ): array {
		$mode = self::mode();
		if ( $mode === 'aucune' ) {
			return [ 'code' => 'indisponible', 'message' => __( 'Aucune publication configurée sur cette installation.', 'pose-parquet-core' ) ];
		}
		self::synchroniser();
		// Verrou atomique : add_option échoue si l'option existe déjà.
		$verrou = [ 'debut' => time(), 'utilisateur' => $utilisateur, 'mode' => $mode, 'maintenance' => \PoseParquet\Core\Maintenance\Reglages::actif() ];
		if ( ! add_option( self::VERROU, $verrou, '', false ) ) {
			return [ 'code' => 'en_cours', 'message' => __( 'Une publication est déjà en cours.', 'pose-parquet-core' ) ];
		}
		$ok = $mode === 'local' ? self::lancer_local() : self::lancer_github( $utilisateur );
		if ( ! $ok['ok'] ) {
			self::terminer( [ 'statut' => 'echec', 'raison' => $ok['raison'], 'duree' => 0 ] );
			return [ 'code' => 'echec', 'message' => $ok['raison'] ];
		}
		return [ 'code' => 'lancee', 'message' => __( 'Publication lancée.', 'pose-parquet-core' ) ];
	}

	/** @return array{ok:bool,raison:string} */
	private static function lancer_local(): array {
		$node   = self::node();
		$script = self::script();
		if ( ! $node || ! $script ) {
			return [ 'ok' => false, 'raison' => __( 'Node ou le script de publication est introuvable.', 'pose-parquet-core' ) ];
		}
		$fichier = self::fichier_etat();
		@unlink( $fichier ); // phpcs:ignore WordPress.PHP.NoSilencedErrors, WordPress.WP.AlternativeFunctions.unlink_unlink
		$export = rest_url( 'pose-parquet/v1/contenus' );
		// Commande FERMÉE : quatre valeurs, toutes calculées ici, toutes échappées.
		$args = implode( ' ', array_map( 'escapeshellarg', [ $node, $script, '--etat', $fichier, '--export', $export ] ) );
		if ( DIRECTORY_SEPARATOR === '\\' ) {
			$commande = 'start "" /B ' . $args . ' > NUL 2>&1';
		} else {
			$commande = 'nohup ' . $args . ' > /dev/null 2>&1 &';
		}
		$p = popen( $commande, 'r' ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		if ( $p === false ) {
			return [ 'ok' => false, 'raison' => __( 'Le processus de publication n’a pas pu démarrer.', 'pose-parquet-core' ) ];
		}
		pclose( $p );
		return [ 'ok' => true, 'raison' => '' ];
	}

	/** @return array{ok:bool,raison:string} */
	private static function lancer_github( int $utilisateur ): array {
		$gh = self::github();
		if ( ! $gh ) {
			return [ 'ok' => false, 'raison' => __( 'Publication GitHub non configurée (wp-config.php).', 'pose-parquet-core' ) ];
		}
		$r = wp_remote_post(
			'https://api.github.com/repos/' . $gh['repo'] . '/dispatches',
			[
				'timeout' => 10,
				'headers' => [
					'Accept'               => 'application/vnd.github+json',
					'Authorization'        => 'Bearer ' . $gh['jeton'],
					'X-GitHub-Api-Version' => '2022-11-28',
					'User-Agent'           => 'pose-parquet-core',
				],
				'body'    => (string) wp_json_encode( [ 'event_type' => self::EVENEMENT_GITHUB, 'client_payload' => [ 'demande_le' => gmdate( 'c' ), 'par' => $utilisateur ] ] ),
			]
		);
		$code = is_wp_error( $r ) ? 0 : (int) wp_remote_retrieve_response_code( $r );
		return $code === 204
			? [ 'ok' => true, 'raison' => '' ]
			: [ 'ok' => false, 'raison' => sprintf( /* translators: %s : code */ __( 'GitHub a refusé le déclenchement (%s).', 'pose-parquet-core' ), $code ?: ( is_wp_error( $r ) ? $r->get_error_message() : '?' ) ) ];
	}

	/* ================================================================== */
	/* Suivre, terminer                                                    */
	/* ================================================================== */

	/** Lit l'avancement et clôt une publication terminée (ou interrompue). */
	public static function synchroniser(): void {
		$verrou = get_option( self::VERROU );
		if ( ! is_array( $verrou ) ) {
			return;
		}
		$age = time() - (int) ( $verrou['debut'] ?? 0 );
		if ( ( $verrou['mode'] ?? '' ) === 'github' ) {
			$run = self::run_github( (int) $verrou['debut'] );
			if ( $run && $run['status'] === 'completed' ) {
				self::terminer( [ 'statut' => $run['conclusion'] === 'success' ? 'succes' : 'echec', 'raison' => $run['conclusion'] === 'success' ? '' : sprintf( /* translators: %s : conclusion */ __( 'Le workflow GitHub s’est terminé en « %s » : le site en ligne n’a pas été remplacé.', 'pose-parquet-core' ), $run['conclusion'] ), 'duree' => $age, 'empreinte' => substr( (string) $run['sha'], 0, 12 ) ] );
				return;
			}
			/*
			 * GitHub a accepté le signal (204) mais AUCUN run n'apparaît : le
			 * workflow de la branche par défaut n'écoute pas repository_dispatch
			 * (« wordpress-publish »). Un repository_dispatch ne déclenche que
			 * les workflows de la branche par défaut. On le dit au lieu
			 * d'attendre dix minutes en silence.
			 */
			if ( ! $run && $age > self::DELAI_DEMARRAGE_GITHUB ) {
				self::terminer( [ 'statut' => 'echec', 'raison' => __( 'GitHub a reçu le signal mais aucun workflow n’a démarré : la branche par défaut du dépôt doit contenir deploy-pages.yml avec le déclencheur repository_dispatch « wordpress-publish ». Le site en ligne n’a pas changé.', 'pose-parquet-core' ), 'duree' => $age ] );
				return;
			}
		} else {
			$etat = self::lire_fichier_etat();
			// Un fichier d'état d'une publication PRÉCÉDENTE ne clôt pas celle-ci.
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

	/** @return array{status:string,conclusion:string,sha:string}|null le run déclenché après $depuis. */
	private static function run_github( int $depuis ): ?array {
		$gh = self::github();
		if ( ! $gh ) {
			return null;
		}
		$r = wp_remote_get(
			'https://api.github.com/repos/' . $gh['repo'] . '/actions/runs?event=repository_dispatch&per_page=1',
			[ 'timeout' => 8, 'headers' => [ 'Accept' => 'application/vnd.github+json', 'Authorization' => 'Bearer ' . $gh['jeton'], 'User-Agent' => 'pose-parquet-core' ] ]
		);
		$run = json_decode( (string) wp_remote_retrieve_body( $r ), true )['workflow_runs'][0] ?? null;
		if ( ! is_array( $run ) || strtotime( (string) ( $run['created_at'] ?? '' ) ) < $depuis - 5 ) {
			return null;
		}
		return [ 'status' => (string) $run['status'], 'conclusion' => (string) ( $run['conclusion'] ?? '' ), 'sha' => (string) ( $run['head_sha'] ?? '' ) ];
	}

	/** Clôt la publication : journal, dernière réussite, verrou levé. */
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

	/* ================================================================== */
	/* Affichage                                                          */
	/* ================================================================== */

	public static function url(): string {
		return admin_url( 'admin.php?page=' . self::PAGE );
	}

	private static function variante( string $statut ): string {
		return [ 'a_jour' => 'ok', 'modifications' => 'attente', 'en_cours' => 'neutre', 'echec' => 'ko' ][ $statut ] ?? 'neutre';
	}

	private static function date( ?array $ligne ): string {
		return $ligne ? wp_date( 'j F Y à H:i', (int) $ligne['date'] ) : __( 'jamais depuis WordPress', 'pose-parquet-core' );
	}

	/** Le bouton « Publier le site » : son propre formulaire, jeton, désactivé pendant une publication. */
	public static function bouton( array $etat, string $classe = 'adm-bouton adm-bouton--plein' ): string {
		$actif = $etat['mode'] !== 'aucune' && $etat['statut'] !== 'en_cours';
		return '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="adm-carte__formulaire" data-pp-publier>'
			. '<input type="hidden" name="action" value="' . esc_attr( self::ACTION ) . '" />'
			. wp_nonce_field( self::ACTION, '_wpnonce', true, false )
			. '<button type="submit" class="' . esc_attr( $classe ) . '"' . ( $actif ? '' : ' disabled' ) . '><span class="dashicons dashicons-upload" aria-hidden="true"></span>'
			. esc_html( $etat['statut'] === 'en_cours' ? __( 'Publication en cours…', 'pose-parquet-core' ) : __( 'Publier le site', 'pose-parquet-core' ) ) . '</button></form>';
	}

	/** Le panneau « Site public » (tableau de bord, écran Publication). */
	public static function panneau( bool $compact = true ): void {
		$e = self::etat();
		echo '<div class="adm-panneau adm-publication" data-pp-publication="' . esc_attr( $e['statut'] ) . '">';
		echo '<div class="adm-panneau__entete"><h2 class="adm-panneau__titre"><span class="dashicons dashicons-admin-site-alt3" aria-hidden="true"></span>' . esc_html__( 'Site public', 'pose-parquet-core' ) . '</h2>';
		echo \PoseParquet\Core\Admin\Socle::badge( $e['libelle'], self::variante( $e['statut'] ) ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe.
		$lignes = [ [ __( 'Dernière publication', 'pose-parquet-core' ), self::date( $e['derniere'] ) ] ];
		if ( $e['statut'] === 'modifications' || $e['statut'] === 'echec' ) {
			$lignes[] = [ __( 'Changements', 'pose-parquet-core' ), (string) count( $e['changements'] ) ];
		}
		if ( $e['statut'] === 'en_cours' && $e['etape'] !== '' ) {
			$lignes[] = [ __( 'Étape', 'pose-parquet-core' ), [ 'export' => __( 'export et validation', 'pose-parquet-core' ), 'validation' => __( 'validation', 'pose-parquet-core' ), 'build' => __( 'construction du site', 'pose-parquet-core' ), 'ci' => __( 'workflow GitHub', 'pose-parquet-core' ) ][ $e['etape'] ] ?? $e['etape'] ];
		}
		\PoseParquet\Core\Admin\Socle::etat( $lignes );
		self::alertes( $e );
		echo '<div class="adm-publication__actions">';
		if ( $compact ) {
			echo '<a class="adm-bouton" href="' . esc_url( self::url() ) . '"><span class="dashicons dashicons-visibility" aria-hidden="true"></span>' . esc_html__( 'Prévisualiser', 'pose-parquet-core' ) . '</a>';
		}
		echo self::bouton( $e ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- composé et échappé dans bouton().
		echo '</div></div>';
	}

	/** Ce qui demande l'attention : maintenance à publier, échec, publication non configurée. */
	private static function alertes( array $e ): void {
		if ( $e['maintenance_a_publier'] ) {
			echo '<p class="adm-panneau__alerte"><span class="adm-pastille adm-pastille--actif"></span> ' . esc_html( \PoseParquet\Core\Maintenance\Reglages::actif() ? __( 'Maintenance activée — publication nécessaire. Le site public n’affiche pas encore la page de maintenance.', 'pose-parquet-core' ) : __( 'Maintenance désactivée — publication nécessaire. Le site public affiche encore la page de maintenance.', 'pose-parquet-core' ) ) . '</p>';
		}
		if ( $e['statut'] === 'echec' && $e['raison'] !== '' ) {
			echo '<p class="adm-alerte-ligne adm-alerte-ligne--ko"><span class="dashicons dashicons-warning" aria-hidden="true"></span>' . esc_html__( 'Publication échouée :', 'pose-parquet-core' ) . ' ' . esc_html( $e['raison'] ) . ' ' . esc_html__( 'Le site en ligne n’a pas changé.', 'pose-parquet-core' ) . '</p>';
		}
		if ( $e['mode'] === 'aucune' ) {
			// Hors poste local, la seule publication prévue est GitHub : on dit ce qui manque.
			echo wp_get_environment_type() === 'local'
				? '<p class="adm-panneau__texte">' . esc_html__( 'Aucune publication n’est configurée ici : ni dossier local du site avec Node, ni GitHub. Voir Publication.', 'pose-parquet-core' ) . '</p>'
				: '<p class="adm-alerte-ligne"><span class="dashicons dashicons-info-outline" aria-hidden="true"></span>' . esc_html__( 'Publication GitHub à configurer : POSE_PARQUET_GITHUB_REPO et POSE_PARQUET_GITHUB_TOKEN dans wp-config.php, WP_EXPORT_URL dans le dépôt GitHub.', 'pose-parquet-core' ) . '</p>';
		}
	}

	/**
	 * Le bandeau « Site public » de l'écran Publication : le statut, la
	 * dernière publication, le mode. Les actions sont dans l'en-tête de l'écran.
	 */
	public static function bandeau(): void {
		$e     = self::etat();
		$modes = [ 'local' => __( 'Local', 'pose-parquet-core' ), 'github' => 'GitHub Actions', 'aucune' => __( 'Non configurée', 'pose-parquet-core' ) ];
		echo '<section class="adm-bandeau adm-publication" data-pp-publication="' . esc_attr( $e['statut'] ) . '" aria-label="' . esc_attr__( 'Site public', 'pose-parquet-core' ) . '">';
		echo '<div class="adm-bandeau__ligne">';
		echo '<div class="adm-bandeau__statut"><span class="adm-bandeau__libelle">' . esc_html__( 'Site public', 'pose-parquet-core' ) . '</span>' . \PoseParquet\Core\Admin\Socle::badge( $e['libelle'], self::variante( $e['statut'] ) ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- badge() échappe.
		echo '<dl class="adm-bandeau__infos">';
		echo '<div><dt>' . esc_html__( 'Dernière publication', 'pose-parquet-core' ) . '</dt><dd>' . esc_html( self::date( $e['derniere'] ) ) . '</dd></div>';
		if ( $e['statut'] === 'modifications' || $e['statut'] === 'echec' ) {
			echo '<div><dt>' . esc_html__( 'Changements', 'pose-parquet-core' ) . '</dt><dd>' . (int) count( $e['changements'] ) . '</dd></div>';
		}
		if ( $e['statut'] === 'en_cours' && $e['etape'] !== '' ) {
			echo '<div><dt>' . esc_html__( 'Étape', 'pose-parquet-core' ) . '</dt><dd>' . esc_html( [ 'export' => __( 'export et validation', 'pose-parquet-core' ), 'validation' => __( 'validation', 'pose-parquet-core' ), 'build' => __( 'construction du site', 'pose-parquet-core' ), 'ci' => __( 'workflow GitHub', 'pose-parquet-core' ) ][ $e['etape'] ] ?? $e['etape'] ) . '</dd></div>';
		}
		echo '<div><dt>' . esc_html__( 'Mode', 'pose-parquet-core' ) . '</dt><dd>' . esc_html( $modes[ $e['mode'] ] ?? $e['mode'] ) . '</dd></div>';
		echo '</dl></div>';
		self::alertes( $e );
		echo '</section>';
	}

	/** Une ligne d'avertissement réutilisable (Mon site, maintenance) quand il y a quelque chose à publier. */
	public static function rappel(): void {
		$e = self::etat();
		if ( ! in_array( $e['statut'], [ 'modifications', 'echec' ], true ) ) {
			return;
		}
		echo '<div class="notice notice-warning inline adm-rappel-publication"><p><strong>' . esc_html( $e['libelle'] ) . '</strong> — ' . esc_html( sprintf( /* translators: %d : nombre */ _n( '%d changement attend d’être mis en ligne.', '%d changements attendent d’être mis en ligne.', count( $e['changements'] ), 'pose-parquet-core' ), count( $e['changements'] ) ) ) . ' <a href="' . esc_url( self::url() ) . '">' . esc_html__( 'Prévisualiser et publier', 'pose-parquet-core' ) . '</a></p></div>';
	}

	/** Écran « Publication » : état, changements (avec aperçu), journal, architecture. */
	public static function render(): void {
		if ( ! current_user_can( Capabilities::MANAGE_SETTINGS ) ) {
			wp_die( esc_html__( 'Vous n’avez pas les droits nécessaires.', 'pose-parquet-core' ), esc_html__( 'Accès refusé', 'pose-parquet-core' ), [ 'response' => 403 ] );
		}
		require POSE_PARQUET_DIR . '/templates/admin-publication.php';
	}
}
