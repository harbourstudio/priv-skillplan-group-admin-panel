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
         * The current user can perform a leader action against $target_user_id within $group_id
         */
        public static function can_manage_user_in_group($group_id, $target_user_id, $actor_id = null) {
            $group_id       = (int) $group_id;
            $target_user_id = (int) $target_user_id;
            $actor_id       = $actor_id ?: get_current_user_id();

            if ($group_id <= 0 || $target_user_id <= 0 || !$actor_id) return false;

            if (!self::can_access_group($group_id, $actor_id)) return false;

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
