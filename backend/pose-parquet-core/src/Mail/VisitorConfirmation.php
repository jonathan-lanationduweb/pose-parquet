<?php



declare(strict_types=1);

namespace PoseParquet\Core\Mail;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class VisitorConfirmation {

	public static function subject(): string {
		return 'Votre demande Pose Parquet a bien été reçue';
	}


	public static function body( array $project ): string {
		$p = static fn( string $k ): string => isset( $project[ $k ] ) ? (string) $project[ $k ] : '';


		$morceaux = array_filter( [
			Labels::of( 'room_type', $p( 'room_type' ) ),
			$p( 'surface' ) !== '' ? rtrim( rtrim( number_format( (float) $p( 'surface' ), 2, ',', ' ' ), '0' ), ',' ) . ' m²' : '',
			$p( 'installation_type' ) !== '' && $p( 'installation_type' ) !== 'inconnu' ? 'pose ' . mb_strtolower( Labels::of( 'installation_type', $p( 'installation_type' ) ) ) : '',
			$p( 'department' ) !== '' ? 'département ' . $p( 'department' ) : '',
		] );

		return Template::render( 'visitor', [
			'title'      => 'Votre demande a bien été reçue',
			'first_name' => $p( 'first_name' ),
			'reference'  => $p( 'reference' ),
			'summary'    => implode( ', ', $morceaux ),
		] );
	}
}
