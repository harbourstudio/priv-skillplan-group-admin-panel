<?php
/**
 * Lander access control.
 *
 * Gates front-end access to individual `lander` CPT posts so that only users
 * with a legitimate relationship to the lander may view it. Everyone else is
 * redirected to the site homepage.
 *
 * Grant order:
 *   1. Site admin (manage_options)
 *   2. Editor role
 *   3. Lander is attached directly to this user's profile (ACF 'landers' on user)
 *   4. User is a learner or leader of a group that has this lander attached
 *   5. User is a learner or leader of any group inside an org that owns this lander
 *   6. User is an admin of that org
 *
 * @package BYS_Groups
 * @since 1.3.0
 */
if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'BYS_Groups_Lander_Access' ) ) {
    class BYS_Groups_Lander_Access {

        public function __construct() {
            // Priority 15: after the theme's login redirect (10) so only
            // authenticated users reach this check, but before the theme's
            // role-based page gate (20).
            add_action( 'template_redirect', [ $this, 'gate_lander_access' ], 15 );
        }

        /**
         * Redirect unauthorized users away from lander singular pages.
         *
         * @hooked template_redirect (priority 15)
         */
        public function gate_lander_access(): void {
            if ( ! is_singular( 'lander' ) ) return;
            if ( wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) return;

            $lander_id = get_queried_object_id();
            $user_id   = get_current_user_id();

            // Unauthenticated users are already handled by the theme's login
            // redirect, but add a safety net here in case this runs standalone.
            if ( ! $user_id ) {
                wp_safe_redirect( home_url( '/login/' ) );
                exit;
            }

            if ( $this->user_can_access_lander( $user_id, $lander_id ) ) {
                return;
            }

            wp_safe_redirect( home_url( '/' ) );
            exit;
        }

        /**
         * Determine whether a user is permitted to view a given lander.
         *
         * @param int $user_id
         * @param int $lander_id
         * @return bool
         */
        private function user_can_access_lander( int $user_id, int $lander_id ): bool {

            // ── 1. Site admin ────────────────────────────────────────────────────
            if ( BYS_Groups_Permissions::is_site_admin( $user_id ) ) {
                return true;
            }

            // ── 2. Editor role ───────────────────────────────────────────────────
            $user = get_userdata( $user_id );
            if ( $user && in_array( 'editor', (array) $user->roles, true ) ) {
                return true;
            }

            // ACF and LearnDash are required for the remaining checks.
            if ( ! function_exists( 'get_field' ) || ! function_exists( 'learndash_get_users_group_ids' ) ) {
                return false;
            }

            $resolve_id = fn( $v ) => $v instanceof WP_Post ? $v->ID : intval( $v );

            // ── 3. User-level lander ─────────────────────────────────────────────
            // Lander is attached directly to this user's profile.
            $user_landers = array_map( $resolve_id, (array) get_field( 'landers', 'user_' . $user_id ) );
            if ( in_array( $lander_id, $user_landers, true ) ) {
                return true;
            }

            // All groups the user is a learner or leader in (used for checks 4 & 5).
            $user_group_ids = array_values( array_unique( array_map( 'intval', array_merge(
                (array) learndash_get_users_group_ids( $user_id ),
                (array) learndash_get_administrators_group_ids( $user_id )
            ) ) ) );

            // ── 4. Group-level lander ────────────────────────────────────────────
            // User belongs to a group that has this lander directly attached.
            foreach ( $user_group_ids as $gid ) {
                $group_landers = array_map( $resolve_id, (array) get_field( 'landers', $gid ) );
                if ( in_array( $lander_id, $group_landers, true ) ) {
                    return true;
                }
            }

            // ── 5 & 6. Org-level lander ──────────────────────────────────────────
            // Walk every org; skip any that don't own this lander.
            $orgs = get_posts( [
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'fields'         => 'ids',
            ] );

            // Batch-warm all org post meta so each get_field() below is a cache hit.
            if ( ! empty( $orgs ) ) {
                update_postmeta_cache( $orgs );
            }

            foreach ( $orgs as $oid ) {
                $org_landers = array_map( $resolve_id, (array) get_field( 'landers', $oid ) );
                if ( ! in_array( $lander_id, $org_landers, true ) ) {
                    continue; // This org doesn't own the lander — skip.
                }

                // 6. Org admin has access to all landers in their org.
                if ( BYS_Groups_Permissions::is_org_admin( $oid, $user_id ) ) {
                    return true;
                }

                // 5. User is a member/leader of at least one group inside this org.
                $org_group_ids = array_map( $resolve_id, (array) get_field( 'groups', $oid ) );
                if ( ! empty( array_intersect( $user_group_ids, $org_group_ids ) ) ) {
                    return true;
                }
            }

            return false;
        }
    }
}
