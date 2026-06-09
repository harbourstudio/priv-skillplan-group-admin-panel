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
         * Checks if the user holds the 'grader' role
         */
        public static function is_grader($user_id = null) {
            $user_id = $user_id ?: get_current_user_id();
            if (!$user_id) return false;

            $user = get_userdata($user_id);
            return $user && in_array('grader', (array) $user->roles, true);
        }

        /**
         * Checks if the user is an 'administrators' (ACF) of an 'organization' post
         */
        public static function is_org_admin($org_id, $user_id = null) {
            $org_id  = (int) $org_id;
            $user_id = $user_id ?: get_current_user_id();
            if (!$org_id || !$user_id) return false;

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
         * Iterate 'organization' posts to find one that contains $group_id,
         * then delegate to is_org_admin() for the actual admin check
         */
        private static function is_org_admin_for_group($user_id, $group_id) {
            if (!function_exists('get_field')) return false;

            $orgs = get_posts(array(
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'fields'         => 'ids',
            ));

            foreach ($orgs as $org_id) {
                $raw_groups = get_field('groups', $org_id);
                foreach ((array) $raw_groups as $g) {
                    $g_id = $g instanceof \WP_Post ? $g->ID : intval($g);
                    if ($g_id === $group_id) {
                        return self::is_org_admin($org_id, $user_id);
                    }
                }
            }

            return false;
        }

        /**
         * Checks if the user is an 'administrator' of any published 'organization' post
         * Used for render-time visibility gates where no specific org/group is known yet
         */
        public static function is_any_org_admin($user_id = null) {
            $user_id = $user_id ?: get_current_user_id();
            if (!$user_id) return false;

            if (!function_exists('get_field')) return false;

            $orgs = get_posts(array(
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'fields'         => 'ids',
            ));

            foreach ($orgs as $org_id) {
                $raw_admins = get_field('administrators', $org_id);
                foreach ((array) $raw_admins as $admin) {
                    $admin_id = $admin instanceof \WP_User ? $admin->ID : intval($admin);
                    if ($admin_id === $user_id) return true;
                }
            }

            return false;
        }


        /**
         * Checks if the user can read the current group
         */
        public static function can_access_group($group_id, $user_id = null) {
            $group_id = (int) $group_id;
            if ($group_id <= 0) return false;

            $user_id = $user_id ?: get_current_user_id();
            if (!$user_id) return false;

            if (self::is_site_admin($user_id)) return true; // side-admins pass
            if (self::is_grader($user_id)) return true; // graders pass
            if (get_user_meta($user_id, "learndash_group_leaders_{$group_id}", true)) return true; // group-leader of this group passes

            return self::is_org_admin_for_group($user_id, $group_id); 
        }

        /**
         * Checks if the current user can read a specific user's data when no group context
         * is provided by the URL (e.g. /users/{user_id}/* endpoints).
         *
         * Allows access when:
         *  - current user is a site admin, OR
         *  - current user shares at least one group with the target — either as a leader
         *    of that group or as an admin of an organization containing it
         *    (delegated to can_access_group per matched group).
         *
         * NOTE: no self-access bypass. This plugin's data is scoped to staff
         * (site admins, org admins, group leaders, graders); a learner reading
         * their own data via these endpoints is not a supported access path.
         */
        public static function can_access_user($target_user_id, $user_id = null) {
            $target_user_id = (int) $target_user_id;
            $user_id       = $user_id ?: get_current_user_id();
            if (!$target_user_id || !$user_id) return false;

            if (self::is_site_admin($user_id)) return true; // site-admins pass

            if (!function_exists('learndash_get_users_group_ids')) return false;

            // checks if the current user can access ANY group the target belongs to.
            $target_group_ids = (array) learndash_get_users_group_ids($target_user_id);
            foreach ($target_group_ids as $group_id) {
                if (self::can_access_group($group_id, $user_id)) return true;
            }

            return false;
        }

        /**
         * Can the current user MANAGE users of $group_id?
         * Gate for member-write actions on a group: add/invite, remove,
         * cancel pending invite.
         *
         * Passes for: site admins, group-leaders of this group, and org admins
         * of the org containing this group.
         *
         * NOTE: graders are deliberately EXCLUDED here. Grading quiz attempts
         * is a separate capability handled by /attempts/{id}/grade with its
         * own gate (is_site_admin || is_grader). Graders need to grade, not
         * add/remove members.
         */
        public static function can_manage_members($group_id, $user_id = null) {
            $group_id = (int) $group_id;
            $user_id  = $user_id ?: get_current_user_id();
            if ($group_id <= 0 || !$user_id) return false;

            if (self::is_site_admin($user_id)) return true; // site admins pass

            if (get_user_meta($user_id, "learndash_group_leaders_{$group_id}", true)) return true; // group-leader of this group passes
            
            return self::is_org_admin_for_group($user_id, $group_id); // org admin of the org containing this group passes
        }

        /**
         * Returns true if the user is a group-leader of at least one group
         * (org-associated or standalone). Used by nav gates (e.g. the Groups
         * tab) so any leader can reach the dashboard to manage their group(s).
         */
        public static function leads_any_group($user_id = null) {
            $user_id = $user_id ?: get_current_user_id();
            if (!$user_id) return false;

            foreach (get_user_meta($user_id) as $meta_key => $_) {
                if (strpos($meta_key, 'learndash_group_leaders_') === 0) {
                    $g_id = (int) substr($meta_key, strlen('learndash_group_leaders_'));
                    if ($g_id > 0) return true;
                }
            }

            return false;
        }

        /**
         * Returns true if the group is associated to at least one organization
         */
        public static function is_group_in_any_org($group_id) {
            $group_id = (int) $group_id;
            if ($group_id <= 0 || !function_exists('get_field')) return false;

            $orgs = get_posts([
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
            ]);

            foreach ($orgs as $org) {
                $raw_groups = get_field('groups', $org->ID);
                foreach ((array) $raw_groups as $g) {
                    $g_id = $g instanceof \WP_Post ? $g->ID : intval($g);
                    if ($g_id === $group_id) return true;
                }
            }

            return false;
        }

        /**
         * Can the current user take ADMIN-level actions on $group_id
         * (archive, unarchive, rename)?
         *
         * Matrix:
         *  - Site admin: always.
         *  - Org admin of an org containing this group: always.
         *  - Group leader: ONLY if the group is standalone (not in any org).
         *    If an org owns the group, the org admin tier exists and group
         *    leaders defer to it.
         */
        public static function can_manage_group($group_id, $user_id = null) {
            $group_id = (int) $group_id;
            $user_id  = $user_id ?: get_current_user_id();
            if ($group_id <= 0 || !$user_id) return false;

            if (self::is_site_admin($user_id)) return true; // site-admins passes
            if (self::is_org_admin_for_group($user_id, $group_id)) return true; // org-admin/group-admin passes

            // if group is in an org, only org admins (handled above) passes
            if (self::is_group_in_any_org($group_id)) return false;

            // if standalone group, group-leader passes
            return (bool) get_user_meta($user_id, "learndash_group_leaders_{$group_id}", true);
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
