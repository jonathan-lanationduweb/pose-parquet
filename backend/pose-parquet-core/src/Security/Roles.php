<?php



declare(strict_types=1);

namespace PoseParquet\Core\Security;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Roles {

	public const MANAGER = 'pose_parquet_manager';



	public const MANAGER_LABEL = 'Gestionnaire Pose Parquet';


	public static function manager_caps(): array {
		return [
			'read'                          => true,
			Capabilities::VIEW_PROJECTS     => true,
			Capabilities::MANAGE_PROJECTS   => true,
		];
	}



	public static function ensure(): void {
		$role = get_role( self::MANAGER );

		if ( ! $role ) {
			add_role( self::MANAGER, self::MANAGER_LABEL, self::manager_caps() );

			return;
		}

		foreach ( array_keys( self::manager_caps() ) as $cap ) {
			if ( ! $role->has_cap( $cap ) ) {
				$role->add_cap( $cap );
			}
		}
	}



	public static function remove(): void {
		if ( get_role( self::MANAGER ) ) {
			remove_role( self::MANAGER );
		}
	}
}
