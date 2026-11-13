<?php



declare(strict_types=1);

namespace PoseParquet\Core\Security;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Capabilities {

	public const VIEW_PROJECTS   = 'pp_view_projects';
	public const MANAGE_PROJECTS = 'pp_manage_projects';
	public const MANAGE_SETTINGS = 'pp_manage_settings';



	public const CONTENTS = [
		'edit_pp_contenus',
		'edit_others_pp_contenus',
		'edit_published_pp_contenus',
		'edit_private_pp_contenus',
		'publish_pp_contenus',
		'read_private_pp_contenus',
		'delete_pp_contenus',
		'delete_others_pp_contenus',
		'delete_published_pp_contenus',
		'delete_private_pp_contenus',
	];


	public const EDIT_CONTENTS = 'edit_pp_contenus';




	public const VERSION        = 2;
	public const OPTION_VERSION = 'pose_parquet_caps_version';


	public static function all(): array {
		return array_merge( [ self::VIEW_PROJECTS, self::MANAGE_PROJECTS, self::MANAGE_SETTINGS ], self::CONTENTS );
	}



	public static function ensure(): void {
		self::grant( 'administrator', self::all() );
	}



	public static function apply(): void {
		self::ensure();
		Roles::ensure();
		update_option( self::OPTION_VERSION, self::VERSION, true );
	}



	public static function ensure_once(): void {
		if ( (int) get_option( self::OPTION_VERSION, 0 ) >= self::VERSION ) {
			return;
		}
		self::apply();
	}



	public static function missing(): array {
		$attendu = [
			'administrator' => self::all(),
			Roles::MANAGER  => array_keys( Roles::manager_caps() ),
		];

		$manques = [];
		foreach ( $attendu as $role_name => $caps ) {
			$role = get_role( $role_name );
			if ( ! $role ) {

				$manques[ $role_name ] = $caps;
				continue;
			}
			$absents = array_values( array_filter( $caps, static fn( string $cap ): bool => ! $role->has_cap( $cap ) ) );
			if ( $absents ) {
				$manques[ $role_name ] = $absents;
			}
		}

		return $manques;
	}



	public static function grant( string $role_name, array $caps ): void {
		$role = get_role( $role_name );
		if ( ! $role ) {
			return;
		}
		foreach ( $caps as $cap ) {
			if ( ! $role->has_cap( $cap ) ) {
				$role->add_cap( $cap );
			}
		}
	}



	public static function remove_all(): void {
		$roles = wp_roles();
		foreach ( array_keys( $roles->roles ) as $role_name ) {
			$role = get_role( $role_name );
			if ( ! $role ) {
				continue;
			}
			foreach ( self::all() as $cap ) {
				if ( $role->has_cap( $cap ) ) {
					$role->remove_cap( $cap );
				}
			}
		}
	}
}
