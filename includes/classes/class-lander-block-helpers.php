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

        // Collect ALL groups the user belongs to — the same lander may be shared
        // across multiple groups in one org, so we must not stop at the first hit.
        $matched_group_ids = [];
        foreach ( $org_groups as $g ) {
            $gid = $g instanceof WP_Post ? $g->ID : intval( $g );
            if ( in_array( $gid, $user_group_ids, true ) ) {
                $matched_group_ids[] = $gid;
            }
        }

        if ( ! empty( $matched_group_ids ) ) {
            // Use the first matched group's title for display.
            $courses_group_title = get_the_title( $matched_group_ids[0] );

            // ── Aggregate courses from every matched group ────────────────────
            // $course_group_data[ cid ][ gid ] = [ 'required' => bool, 'unmet' => [] ]
            $course_group_data = [];

            foreach ( $matched_group_ids as $gid ) {
                $raw_required = get_post_meta( $gid, '_bys_required_course_ids', true );
                $required_ids = is_array( $raw_required ) ? array_map( 'intval', $raw_required ) : [];
                $enrolled     = array_unique( array_map( 'intval', (array) learndash_group_enrolled_courses( $gid ) ) );

                foreach ( $enrolled as $cid ) {
                    $lock = BYS_Groups_Prerequisites::get_lock_state( $cid, $user_id, $gid );
                    $course_group_data[ $cid ][ $gid ] = [
                        'required'      => in_array( $cid, $required_ids, true ),
                        'is_locked'     => $lock['is_locked'],
                        'prereq_titles' => $lock['prereq_titles'],
                    ];
                }
            }

            // ── Build merged course meta ──────────────────────────────────────
            // required: true if required in ANY matched group (required takes precedence).
            // locked:   true only if prerequisites (course AND form) are unmet in ALL
            //           groups where the course appears — satisfying them in one group
            //           is enough to unlock.
            foreach ( $course_group_data as $cid => $group_entries ) {
                $is_required       = false;
                $locked_in_all     = true;
                $all_prereq_titles = [];

                foreach ( $group_entries as $data ) {
                    if ( $data['required'] ) {
                        $is_required = true;
                    }
                    if ( ! $data['is_locked'] ) {
                        $locked_in_all = false; // at least one group has all prereqs met
                    } else {
                        $all_prereq_titles = array_merge( $all_prereq_titles, $data['prereq_titles'] );
                    }
                }

                $lander_course_meta[ $cid ] = [
                    'is_required'   => $is_required,
                    'is_locked'     => $locked_in_all,
                    'prereq_titles' => $locked_in_all ? array_unique( $all_prereq_titles ) : [],
                ];
            }

            $enrolled_all    = array_keys( $course_group_data );
            $bucket_required = array_values( array_filter( $enrolled_all, fn( $id ) => $lander_course_meta[ $id ]['is_required'] && ! $lander_course_meta[ $id ]['is_locked'] ) );
            $bucket_optional = array_values( array_filter( $enrolled_all, fn( $id ) => ! $lander_course_meta[ $id ]['is_required'] && ! $lander_course_meta[ $id ]['is_locked'] ) );
            $bucket_locked   = array_values( array_filter( $enrolled_all, fn( $id ) => $lander_course_meta[ $id ]['is_locked'] ) );

            // ── Merge sort orders from all matched groups ─────────────────────
            // For courses appearing in multiple group orders, the lowest (earliest)
            // position wins so the most prominent placement is honoured.
            $merged_order = []; // [ cid => min_position ]
            foreach ( $matched_group_ids as $gid ) {
                foreach ( BYS_Course_Order::get_order( $gid ) as $position => $cid ) {
                    if ( ! isset( $merged_order[ $cid ] ) || $position < $merged_order[ $cid ] ) {
                        $merged_order[ $cid ] = $position;
                    }
                }
            }
            asort( $merged_order );
            $course_order = array_keys( $merged_order );

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
