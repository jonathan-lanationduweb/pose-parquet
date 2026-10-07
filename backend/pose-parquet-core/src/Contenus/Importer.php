<?php
/**
 * Migration : importe dans WordPress les contenus exportés du dépôt
 * (`node _generator/exporter-wordpress.js` → data/wordpress/import.json).
 *
 * Rejouable sans doublon : un contenu est retrouvé par son type et son slug
 * (une page par sa clé), une image par sa clé d'origine (`_pp_source_key`).
 * Rejouer met à jour ; rien n'est supprimé.
 *
 * Le corps est importé tel que le site le publie (HTML rendu, composants
 * compris), avec son empreinte (`_pp_import_hash`) : tant que personne ne le
 * modifie dans WordPress, l'export le rend octet pour octet — le site
 * reconstruit est identique.
 *
 * Exécuté en ligne de commande, en tant qu'administrateur (le HTML des
 * articles n'est pas filtré par kses : c'est celui du dépôt).
 */

declare(strict_types=1);

namespace PoseParquet\Core\Contenus;

use PoseParquet\Core\Maintenance\Reglages as Maintenance;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Importer {

	/** @var string[] */
	private array $journal = [];

	/** @return string[] */
	public function journal(): array {
		return $this->journal;
	}

	/** @param array<string,mixed> $d contenu de import.json */
	public function importer( array $d ): array {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$compte = [ 'guides' => 0, 'tutoriels' => 0, 'inspirations' => 0, 'pages' => 0, 'images' => 0 ];
		foreach ( (array) ( $d['guides'] ?? [] ) as $g ) {
			$this->article( Types::GUIDE, $g );
			++$compte['guides'];
		}
		foreach ( (array) ( $d['tutoriels'] ?? [] ) as $t ) {
			$this->article( Types::TUTORIEL, $t );
			++$compte['tutoriels'];
		}
		foreach ( (array) ( $d['inspirations'] ?? [] ) as $i ) {
			$this->inspiration( $i );
			++$compte['inspirations'];
		}
		foreach ( (array) ( $d['pages'] ?? [] ) as $p ) {
			$this->page( $p );
			++$compte['pages'];
		}
		$fond = $d['maintenance']['image'] ?? null;
		if ( is_array( $fond ) && ! Maintenance::lire()['image'] ) {
			$id = $this->image( $fond );
			if ( $id ) {
				update_option( Maintenance::OPTION, array_merge( Maintenance::lire(), [ 'image' => $id ] ), false );
			}
		}
		$compte['images'] = count( array_filter( $this->journal, static fn( string $l ): bool => str_starts_with( $l, 'image ' ) ) );
		return $compte;
	}

	/**
	 * Champs structurés et « Mon site » SEULEMENT, sans rien écraser.
	 *
	 * Le schéma vient du dépôt : il est toujours remplacé (c'est du code). Les
	 * valeurs, elles, sont des saisies : une valeur déjà présente dans
	 * WordPress est conservée, seules les clés nouvelles reçoivent la valeur
	 * par défaut du dépôt. Rejouable autant de fois qu'on veut.
	 *
	 * @param array<string,mixed> $d contenu de import.json
	 * @return array{pages:int,site:int,ajoutes:int}
	 */
	public function champs( array $d ): array {
		$compte = [ 'pages' => 0, 'site' => 0, 'ajoutes' => 0 ];
		foreach ( (array) ( $d['pages'] ?? [] ) as $p ) {
			$schema = Structure::schema( $p['champs'] ?? [] );
			if ( ! $schema ) {
				continue;
			}
			$cle = sanitize_key( (string) $p['cle'] );
			$ids = get_posts( [ 'post_type' => Types::PAGE, 'post_status' => 'any', 'meta_key' => '_pp_cle', 'meta_value' => $cle, 'posts_per_page' => 1, 'fields' => 'ids' ] ); // phpcs:ignore WordPress.DB.SlowDBQuery
			if ( ! $ids ) {
				$this->journal[] = 'page absente ' . $cle . ' (importer d’abord les contenus)';
				continue;
			}
			$id     = (int) $ids[0];
			$avant  = json_decode( (string) get_post_meta( $id, '_pp_champs', true ), true );
			$avant  = is_array( $avant ) ? $avant : [];
			$apres  = $avant + Structure::defauts( $schema );
			$compte['ajoutes'] += count( $apres ) - count( $avant );
			$this->meta( $id, '_pp_champs_def', $this->json( $schema ) );
			$this->meta( $id, '_pp_champs', $this->json( $apres ) );
			// Une page passée en champs structurés n'a plus de corps libre.
			if ( empty( $p['corps'] ) ) {
				$this->meta( $id, '_pp_corps_editable', '0' );
			}
			++$compte['pages'];
			$this->journal[] = 'champs ' . $cle . ' #' . $id . ' : ' . count( $schema ) . ' champs';
		}
		$schema = Structure::schema( $d['site'] ?? [] );
		if ( $schema ) {
			$avant = get_option( \PoseParquet\Core\Site\MonSite::OPTION, [] );
			$avant = is_array( $avant ) ? $avant : [];
			$apres = $avant + Structure::defauts( $schema );
			$compte['ajoutes'] += count( $apres ) - count( $avant );
			update_option( \PoseParquet\Core\Site\MonSite::OPTION_SCHEMA, $schema, false );
			update_option( \PoseParquet\Core\Site\MonSite::OPTION, $apres, false );
			$compte['site']  = count( $schema );
			$this->journal[] = 'Mon site : ' . count( $schema ) . ' champs';
		}
		return $compte;
	}

	private function trouver( string $type, string $slug ): int {
		$ids = get_posts(
			[
				'post_type'      => $type,
				'name'           => $slug,
				'post_status'    => 'any',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			]
		);
		return $ids ? (int) $ids[0] : 0;
	}

	/** @param array<string,mixed> $champs */
	private function enregistrer( string $type, int $id, array $champs ): int {
		$champs['post_type'] = $type;
		if ( $id ) {
			$champs['ID'] = $id;
		}
		// wp_insert_post attend des données « slashées ».
		$resultat = $id ? wp_update_post( wp_slash( $champs ), true ) : wp_insert_post( wp_slash( $champs ), true );
		if ( is_wp_error( $resultat ) ) {
			throw new \RuntimeException( $type . ' : ' . $resultat->get_error_message() );
		}
		return (int) $resultat;
	}

	private function meta( int $id, string $cle, string $valeur ): void {
		update_post_meta( $id, $cle, wp_slash( $valeur ) );
	}

	private function json( mixed $v ): string {
		return (string) wp_json_encode( $v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	}

	/** @param array<string,mixed> $a */
	private function article( string $type, array $a ): void {
		$slug = sanitize_title( (string) $a['slug'] );
		$id   = $this->enregistrer(
			$type,
			$this->trouver( $type, $slug ),
			[
				'post_title'   => (string) $a['h1'],
				'post_name'    => $slug,
				'post_status'  => 'publish',
				'post_excerpt' => (string) ( $a['resume'] ?? '' ),
				'post_content' => (string) $a['corps'],
				'post_date'    => (string) $a['date'] . ' 09:00:00',
				'menu_order'   => (int) ( $a['ordre'] ?? 0 ),
			]
		);
		$this->meta( $id, '_pp_import_hash', md5( (string) get_post_field( 'post_content', $id, 'raw' ) ) );
		$this->meta( $id, Champs::META_TITLE, (string) $a['titre'] );
		$this->meta( $id, Champs::META_DESCRIPTION, (string) $a['description'] );
		$this->meta( $id, Champs::INTRO, (string) ( $a['intro'] ?? '' ) );
		$this->meta( $id, '_pp_lecture', (string) ( $a['lecture'] ?? '' ) );
		$this->meta( $id, '_pp_faq', $this->json( $a['faq'] ?? [] ) );
		if ( $type === Types::GUIDE ) {
			$this->meta( $id, '_pp_tags', $this->json( $a['tags'] ?? [] ) );
			$this->meta( $id, '_pp_related', $this->json( $a['related'] ?? [] ) );
		} else {
			$this->meta( $id, '_pp_duree', (string) ( $a['duree'] ?? '' ) );
			$this->meta( $id, '_pp_niveau', (string) ( $a['niveau'] ?? '' ) );
			$this->meta( $id, '_pp_outils', implode( "\n", (array) ( $a['outils'] ?? [] ) ) );
		}
		$tax = Types::taxonomie( $type );
		if ( $tax && ! empty( $a['categorie'] ) ) {
			$terme = term_exists( (string) $a['categorie'], $tax );
			if ( ! $terme ) {
				$terme = wp_insert_term( (string) $a['categorie'], $tax );
			}
			if ( ! is_wp_error( $terme ) ) {
				wp_set_object_terms( $id, [ (int) $terme['term_id'] ], $tax, false );
			}
		}
		$this->couverture( $id, $a['image'] ?? null );
		$this->journal[] = $type . ' ' . $slug . ' #' . $id;
	}

	/** @param array<string,mixed> $i */
	private function inspiration( array $i ): void {
		$slug = sanitize_title( (string) $i['cle'] );
		$id   = $this->enregistrer(
			Types::INSPIRATION,
			$this->trouver( Types::INSPIRATION, $slug ),
			[
				'post_title'  => (string) $i['titre'],
				'post_name'   => $slug,
				'post_status' => 'publish',
				'menu_order'  => (int) ( $i['ordre'] ?? 0 ),
			]
		);
		$s = (array) ( $i['studio'] ?? [] );
		foreach ( [
			'_pp_phrase'        => (string) $i['phrase'],
			'_pp_piece'         => (string) $i['piece'],
			'_pp_motif'         => (string) $i['motif'],
			'_pp_motif_libelle' => (string) $i['motifLibelle'],
			'_pp_teinte'        => (string) $i['teinte'],
			'_pp_taille'        => (string) $i['taille'],
			'_pp_pexels'        => (string) (int) ( $i['id'] ?? 0 ),
			'_pp_scene'         => (string) ( $s['scene'] ?? '' ),
			'_pp_parquet'       => (string) ( $s['parquet'] ?? '' ),
			'_pp_studio_motif'  => (string) ( $s['motif'] ?? '' ),
			'_pp_studio_orient' => (string) (int) ( $s['orientation'] ?? 0 ),
			'_pp_studio'        => ! empty( $s['actif'] ) ? '1' : '0',
			'_pp_bibliotheque'  => ! empty( $s['bibliotheque'] ) ? '1' : '0',
		] as $cle => $valeur ) {
			$this->meta( $id, $cle, $valeur );
		}
		$this->couverture( $id, $i['image'] ?? null );
		$this->journal[] = 'inspiration ' . $slug . ' #' . $id;
	}

	/** @param array<string,mixed> $p */
	private function page( array $p ): void {
		$cle   = sanitize_key( (string) $p['cle'] );
		$ids   = get_posts( [ 'post_type' => Types::PAGE, 'post_status' => 'any', 'meta_key' => '_pp_cle', 'meta_value' => $cle, 'posts_per_page' => 1, 'fields' => 'ids' ] ); // phpcs:ignore WordPress.DB.SlowDBQuery
		$corps = isset( $p['corps'] ) && is_string( $p['corps'] ) ? $p['corps'] : '';
		$id    = $this->enregistrer(
			Types::PAGE,
			$ids ? (int) $ids[0] : 0,
			[
				'post_title'   => (string) $p['nom'],
				'post_name'    => $cle,
				'post_status'  => 'publish',
				'post_excerpt' => (string) ( $p['chapo'] ?? '' ),
				'post_content' => $corps,
				'menu_order'   => (int) ( $p['ordre'] ?? 0 ),
			]
		);
		$this->meta( $id, '_pp_cle', $cle );
		$this->meta( $id, '_pp_adresse', (string) $p['adresse'] );
		$this->meta( $id, '_pp_textes', ! empty( $p['textes'] ) ? '1' : '0' );
		$this->meta( $id, '_pp_h1', (string) ( $p['h1'] ?? '' ) );
		$this->meta( $id, Champs::META_TITLE, (string) $p['titre'] );
		$this->meta( $id, Champs::META_DESCRIPTION, (string) $p['description'] );
		$this->meta( $id, '_pp_corps_editable', $corps !== '' ? '1' : '0' );
		if ( $corps !== '' ) {
			$this->meta( $id, '_pp_import_hash', md5( (string) get_post_field( 'post_content', $id, 'raw' ) ) );
		}
		$this->journal[] = 'page ' . $cle . ' #' . $id;
	}

	/** @param array<string,mixed>|null $image */
	private function couverture( int $post_id, ?array $image ): void {
		if ( ! $image || empty( $image['fichier'] ) ) {
			return; // Pas d'image dans le dépôt : l'admin affichera « Image manquante ».
		}
		$id = $this->image( $image );
		if ( $id ) {
			set_post_thumbnail( $post_id, $id );
		}
	}

	/**
	 * Une image du dépôt dans la médiathèque, une seule fois par clé d'origine.
	 *
	 * @param array<string,mixed> $image { fichier, source, alt, credit }
	 */
	private function image( array $image ): int {
		$source = sanitize_key( (string) ( $image['source'] ?? '' ) );
		if ( $source !== '' ) {
			$deja = get_posts( [ 'post_type' => 'attachment', 'post_status' => 'inherit', 'meta_key' => '_pp_source_key', 'meta_value' => $source, 'posts_per_page' => 1, 'fields' => 'ids' ] ); // phpcs:ignore WordPress.DB.SlowDBQuery
			if ( $deja ) {
				return (int) $deja[0];
			}
		}
		$fichier = (string) $image['fichier'];
		if ( ! is_readable( $fichier ) ) {
			$this->journal[] = 'image introuvable ' . $fichier;
			return 0;
		}
		// media_handle_sideload déplace le fichier : on lui donne une copie.
		$copie = wp_tempnam( basename( $fichier ) );
		copy( $fichier, $copie );
		$id = media_handle_sideload( [ 'name' => basename( $fichier ), 'tmp_name' => $copie ], 0, (string) ( $image['alt'] ?? '' ) );
		if ( is_wp_error( $id ) ) {
			@unlink( $copie ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			$this->journal[] = 'image refusée ' . basename( $fichier ) . ' : ' . $id->get_error_message();
			return 0;
		}
		update_post_meta( (int) $id, '_wp_attachment_image_alt', sanitize_text_field( (string) ( $image['alt'] ?? '' ) ) );
		update_post_meta( (int) $id, '_pp_credit', sanitize_text_field( (string) ( $image['credit'] ?? '' ) ) );
		if ( $source !== '' ) {
			update_post_meta( (int) $id, '_pp_source_key', $source );
		}
		$this->journal[] = 'image ' . $source . ' #' . $id;
		return (int) $id;
	}
}
