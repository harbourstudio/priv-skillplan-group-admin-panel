<?php
/**
 * Permissions utility.
 *
 * Centralizes all REST API permission checks. Routers should use these
 * static helpers in `permission_callback` instead of duplicating logic.
 *
 * @package BYS_Groups
 * @since 1.1.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Permissions')) {
    class BYS_Groups_Permissions {

        /**
         * Check for admin role (check against 'manage_options')
         */
        public static function is_site_admin($user_id = null) {
            $user_id = $user_id ?: get_current_user_id();
            if (!$user_id) return false;
            
            return user_can($user_id, 'manage_options');
        }

        /**
         * Permission for grading-attempt endpoints
         */
        public static function has_marker_role($user_id = null) {
            $user_id = $user_id ?: get_current_user_id();
            if (!$user_id) return false;

            if (user_can($user_id, 'manage_options')) return true;

            $user = get_userdata($user_id);
            return $user && in_array('marker', (array) $user->roles, true);
        }

        /**
         * Checks if the user holds the 'grader' role
         */
        public static function has_grader_role($user_id = null) {
            $user_id = $user_id ?: get_current_user_id();
            if (!$user_id) return false;

            $user = get_userdata($user_id);
            return $user && in_array('grader', (array) $user->roles, true);
        }

        /**
         * Checks if the user is an administrator of a specific organization.
         *
         * Site admins (manage_options) always pass. Otherwise the user must be
         * listed in the organization's ACF 'administrators' field.
         */
        public static function is_org_admin($org_id, $user_id = null) {
            $org_id  = (int) $org_id;
            $user_id = $user_id ?: get_current_user_id();
            if (!$org_id || !$user_id) return false;

            if (self::is_site_admin($user_id)) return true;

            if (!function_exists('get_field')) return false;

            $org = get_post($org_id);
            if (!$org || $org->post_type !== 'organization' || $org->post_status !== 'publish') return false;

            $raw_admins = get_field('administrators', $org_id);
            foreach ((array) $raw_admins as $admin) {
                $admin_id = $admin instanceof \WP_User ? $admin->ID : intval($admin);
                if ($admin_id === $user_id) return true;
            }

            return false;
        }

        /**
         * Org-admin check: iterate ACF 'organization' posts and verify the
         * group is contained AND the user is an admin
         */
        private static function is_org_admin_for_group($user_id, $group_id) {
            if (!function_exists('get_field')) return false;

            $orgs = get_posts(array(
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
            ));

            foreach ($orgs as $org) {
                $raw_groups = get_field('groups', $org->ID);
                $group_ids  = array_map(function ($g) {
                    return $g instanceof \WP_Post ? $g->ID : intval($g);
                }, (array) $raw_groups);

                if (!in_array($group_id, $group_ids, true)) continue;

                $raw_admins = get_field('administrators', $org->ID);
                $admin_ids  = array_map(function ($a) {
                    return $a instanceof \WP_User ? $a->ID : intval($a);
                }, (array) $raw_admins);

                if (in_array($user_id, $admin_ids, true)) return true;
            }

            return false;
        }


        /**
         * Checks if the user can read or manage the current group
         */
        public static function can_access_group($group_id, $user_id = null) {
            $group_id = (int) $group_id;
            if ($group_id <= 0) return false;

            $user_id = $user_id ?: get_current_user_id();
            if (!$user_id) return false;

            if (self::is_site_admin($user_id)) return true; // if site_admin, this is enough permission

            if (get_user_meta($user_id, "learndash_group_leaders_{$group_id}", true)) return true; // if user is a leader fo this group, then allow

            return self::is_org_admin_for_group($user_id, $group_id); // if the user administers an org that contains this group, then allow
        }

        /**
         * Checks if the current user can read a specific user's data when no group context
         * is provided by the URL (e.g. /users/{user_id}/* endpoints).
         *
         * Allows access when:
         *  - current user IS the target (self-access always passes), OR
         *  - current user is a site admin, OR
         *  - current user shares at least one group with the target — either as a leader
         *    of that group or as an admin of an organization containing it
         *    (delegated to can_access_group per matched group).
         */
        public static function can_access_user($target_user_id, $user_id = null) {
            $target_user_id = (int) $target_user_id;
            $user_id       = $user_id ?: get_current_user_id();

            if (!$target_user_id || !$user_id) return false;

            if ($user_id === $target_user_id) return true; // self always passes
            if (self::is_site_admin($user_id)) return true; // site admins always pass

            if (!function_exists('learndash_get_users_group_ids')) return false;

            $target_group_ids = (array) learndash_get_users_group_ids($target_user_id);
            foreach ($target_group_ids as $group_id) {
                if (self::can_access_group($group_id, $user_id)) return true;
            }

            return false;
        }

        /**
         * The current user can perform a leader action against $target_user_id within $group_id
         */
        public static function can_manage_user_in_group($group_id, $target_user_id, $user_id = null) {
            $group_id       = (int) $group_id;
            $target_user_id = (int) $target_user_id;
            $user_id       = $user_id ?: get_current_user_id();

            if ($group_id <= 0 || $target_user_id <= 0 || !$user_id) return false;

            if (!self::can_access_group($group_id, $user_id)) return false;

            // Target must be a member of the group.
            if (function_exists('learndash_is_user_in_group')) {
                return (bool) learndash_is_user_in_group($target_user_id, $group_id);
            }

            return false;
        }

        /**
         * Constant-time comparison of the Postmark webhook token against the
         * configured value. Used as `permission_callback` on POST /webhooks/postmark.
         *
         * @param \WP_REST_Request $request
         * @return bool
         */
        public static function verify_postmark_token($request) {
            $expected = (string) get_option('bys_postmark_token', '');
            $provided = (string) $request->get_header('X-Postmark-Server-Token');

            if ($expected === '' || $provided === '') return false;

            return hash_equals($expected, $provided);
        }
    }
}
