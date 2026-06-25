<?php
/**
 * Shared data resolver for lander blocks.
 *
 * bys_lander_resolve() performs the org/course lookup once per post ID per
 * request and caches the result statically so lander-hero, lander-course-list,
 * and lander-completion-alert all share a single set of queries.
 *
 * @package BYS_Groups
 */
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Returns all data needed to render the lander block suite for a given post.
 *
 * @param int $lander_id  Post ID of the lander.
 * @return array          Keyed data array; empty array when ACF is unavailable.
 */
function bys_lander_resolve( int $lander_id ): array {
    static $cache = [];
    if ( isset( $cache[ $lander_id ] ) ) return $cache[ $lander_id ];

    if ( ! function_exists( 'get_field' ) ) {
        return $cache[ $lander_id ] = [];
    }

    // ── Resolve parent organization ───────────────────────────────────────────

    $org_id = null;
    $orgs   = get_posts( [
        'post_type'      => 'organization',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'fields'         => 'ids',
    ] );
    foreach ( $orgs as $oid ) {
        foreach ( (array) get_field( 'landers', $oid ) as $l ) {
            $lid = $l instanceof WP_Post ? $l->ID : intval( $l );
            if ( $lid === $lander_id ) {
                $org_id = $oid;
                break 2;
            }
        }
    }

    // ── Org fields ────────────────────────────────────────────────────────────

    $logo              = $org_id ? get_field( 'logo',              $org_id ) : null;
    $hero_start_colour = ( $org_id ? get_field( 'hero_start_colour', $org_id ) : '' ) ?: '#1a1a2e';
    $hero_end_colour   = ( $org_id ? get_field( 'hero_end_colour',   $org_id ) : '' ) ?: '#16213e';
    $footer_colour     = $org_id ? get_field( 'footer_colour', $org_id ) : '';

    // ── Lander-level colour overrides ─────────────────────────────────────────

    $lander_footer_colour      = get_field( 'lander_footer_colour',      $lander_id ) ?: '';
    $lander_footer_text_colour = get_field( 'lander_footer_text_colour', $lander_id ) ?: '';
    $lander_button_colour      = get_field( 'lander_button_colour',      $lander_id ) ?: '';
    $lander_page_colour        = get_field( 'lander_page_colour',        $lander_id ) ?: '';

    if ( $lander_footer_colour ) $footer_colour = $lander_footer_colour;
    $footer_text_colour = $lander_footer_text_colour;
    $button_colour      = $lander_button_colour;
    $page_colour        = $lander_page_colour;

    // ── Courses ───────────────────────────────────────────────────────────────

    $user_id             = get_current_user_id();
    $lander_courses      = [];
    $lander_course_meta  = [];
    $courses_group_title = '';

    if ( $org_id && function_exists( 'learndash_get_users_group_ids' ) ) {
        $org_groups     = (array) get_field( 'groups', $org_id );
        $user_group_ids = array_map( 'intval', array_unique( array_merge(
            (array) learndash_get_users_group_ids( $user_id ),
            (array) learndash_get_administrators_group_ids( $user_id )
        ) ) );

        $matched_group_id = null;
        foreach ( $org_groups as $g ) {
            $gid = $g instanceof WP_Post ? $g->ID : intval( $g );
            if ( in_array( $gid, $user_group_ids, true ) ) {
                $matched_group_id = $gid;
                break;
            }
        }

        if ( $matched_group_id ) {
            $courses_group_title = get_the_title( $matched_group_id );

            $raw_required        = get_post_meta( $matched_group_id, '_bys_required_course_ids', true );
            $lander_required_ids = is_array( $raw_required ) ? array_map( 'intval', $raw_required ) : [];

            $enrolled = array_unique( array_map( 'intval', (array) learndash_group_enrolled_courses( $matched_group_id ) ) );

            foreach ( $enrolled as $cid ) {
                $unmet = BYS_Groups_Prerequisites::get_unmet_prerequisites( $cid, $matched_group_id, $user_id );
                $lander_course_meta[ $cid ] = [
                    'is_required'   => in_array( $cid, $lander_required_ids, true ),
                    'is_locked'     => ! empty( $unmet ),
                    'prereq_titles' => array_map( 'get_the_title', $unmet ),
                ];
            }

            $bucket_required = array_values( array_filter( $enrolled, fn( $id ) => $lander_course_meta[ $id ]['is_required'] && ! $lander_course_meta[ $id ]['is_locked'] ) );
            $bucket_optional = array_values( array_filter( $enrolled, fn( $id ) => ! $lander_course_meta[ $id ]['is_required'] && ! $lander_course_meta[ $id ]['is_locked'] ) );
            $bucket_locked   = array_values( array_filter( $enrolled, fn( $id ) => $lander_course_meta[ $id ]['is_locked'] ) );

            $course_order = BYS_Course_Order::get_order( $matched_group_id );
            if ( ! empty( $course_order ) ) {
                $order_map     = array_flip( $course_order );
                $sort_by_order = function ( array &$bucket ) use ( $order_map ) {
                    usort( $bucket, function ( $a, $b ) use ( $order_map ) {
                        $ai = $order_map[ $a ] ?? PHP_INT_MAX;
                        $bi = $order_map[ $b ] ?? PHP_INT_MAX;
                        return $ai <=> $bi;
                    } );
                };
                $sort_by_order( $bucket_required );
                $sort_by_order( $bucket_optional );
                $sort_by_order( $bucket_locked );
            }

            $lander_courses = array_merge( $bucket_required, $bucket_optional, $bucket_locked );
        }
    }

    return $cache[ $lander_id ] = compact(
        'org_id', 'logo', 'hero_start_colour', 'hero_end_colour',
        'footer_colour', 'footer_text_colour', 'button_colour', 'page_colour',
        'lander_courses', 'lander_course_meta', 'courses_group_title', 'user_id'
    );
}
