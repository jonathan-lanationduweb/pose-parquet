<?php



declare(strict_types=1);

namespace PoseParquet\Core\Admin;

use PoseParquet\Core\Mail\Labels;
use PoseParquet\Core\Projects\Status;
use PoseParquet\Core\Security\Roles;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class View {



	public static function date( ?string $mysql_utc ): string {
		$mysql_utc = (string) $mysql_utc;
		if ( $mysql_utc === '' || $mysql_utc === '0000-00-00 00:00:00' ) {
			return '';
		}
		$horodatage = strtotime( $mysql_utc . ' UTC' );
		if ( $horodatage === false ) {
			return '';
		}

		return (string) wp_date(
			get_option( 'date_format' ) . ' ' . get_option( 'time_format' ),
			$horodatage
		);
	}


	public static function date_short( ?string $mysql_utc ): string {
		$mysql_utc = (string) $mysql_utc;
		if ( $mysql_utc === '' ) {
			return '';
		}
		$horodatage = strtotime( $mysql_utc . ' UTC' );

		return $horodatage === false ? '' : (string) wp_date( get_option( 'date_format' ), $horodatage );
	}


	public static function label( string $column, ?string $value ): string {
		$value = (string) $value;

		return $value === '' ? '' : Labels::of( $column, $value );
	}


	public static function status( ?string $value ): string {
		return Status::label( (string) $value );
	}



	public static function author( int $user_id ): string {
		if ( $user_id === 0 ) {
			return __( 'Système', 'pose-parquet-core' );
		}

		$user = get_userdata( $user_id );
		if ( ! $user ) {

			return sprintf( __( 'Utilisateur #%d (supprimé)', 'pose-parquet-core' ), $user_id );
		}

		return $user->display_name !== '' ? $user->display_name : $user->user_login;
	}


	public static function list_url( array $args = [] ): string {
		$args = array_filter(
			$args,
			static fn( $v ): bool => $v !== '' && $v !== null && $v !== 0
		);

		return add_query_arg( [ 'page' => Projects::PAGE ] + $args, admin_url( 'admin.php' ) );
	}


	public static function detail_url( int $id ): string {
		return add_query_arg(
			[ 'page' => Projects::PAGE, 'project' => $id ],
			admin_url( 'admin.php' )
		);
	}



	public static function surface( ?string $value ): string {
		if ( $value === null || $value === '' ) {
			return '';
		}
		$n = (float) $value;

		return number_format_i18n( $n, ( $n === floor( $n ) ) ? 0 : 2 ) . ' m²';
	}


	public static function is_manager_only(): bool {
		$user = wp_get_current_user();

		return $user->exists()
			&& in_array( Roles::MANAGER, (array) $user->roles, true )
			&& count( (array) $user->roles ) === 1;
	}
}
