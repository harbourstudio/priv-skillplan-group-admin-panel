<?php
/**
 * Me Router
 *
 * Endpoints scoped to the currently authenticated user:
 *   GET /me/groups           — groups the user leads or admins
 *   GET /me/organizations    — organizations + their groups
 *   GET /me/archived-groups  — draft-status groups the user leads
 *
 * @package BYS_Groups
 * @since 1.1.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Me_Router')) {
    class BYS_Groups_Me_Router {

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
        }

        public function register_routes() {
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/me/groups', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_current_user_groups'],
                'permission_callback' => 'is_user_logged_in',
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/me/organizations', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_current_user_organizations'],
                'permission_callback' => 'is_user_logged_in',
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/me/archived-groups', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_current_user_archived_groups'],
                'permission_callback' => 'is_user_logged_in',
            ]);
        }

        /**
         * GET /me/groups
         * Returns all LD groups the current user can access.
         *
         * Access rules:
         *  - Site admins and graders: every published group
         *  - Group leaders: groups via learndash_group_leaders_{group_id} user meta
         *  - Org admins: groups in any ACF organization where the user is an administrator
         */
        public function get_current_user_groups($request) {
            $user_id = get_current_user_id();
            if (!$user_id) return ['groups' => []];

            // Site admins and graders see every published group
            $is_grader     = BYS_Groups_Permissions::is_grader($user_id);
            $is_site_admin = BYS_Groups_Permissions::is_site_admin($user_id);
            if ($is_site_admin || $is_grader) {
                $all_groups = get_posts([
                    'post_type'      => 'groups',
                    'post_status'    => 'publish',
                    'posts_per_page' => -1,
                    'orderby'        => 'title',
                    'order'          => 'ASC',
                ]);
                $user_groups = [];
                foreach ($all_groups as $group) {
                    // Site admins can do everything; graders can manage nothing.
                    $user_groups[] = [
                        'id'                 => $group->ID,
                        'title'              => $group->post_title,
                        'is_org_admin'       => !$is_grader, // graders can't act as org admins
                        'can_manage_leaders' => $is_site_admin,
                        'can_manage_members' => $is_site_admin,
                    ];
                }
                return ['groups' => $user_groups];
            }

            // Collect group IDs via LD group leader meta
            $led_ids = [];
            foreach (get_user_meta($user_id) as $meta_key => $meta_values) {
                if (strpos($meta_key, 'learndash_group_leaders_') === 0) {
                    $group_id = intval(str_replace('learndash_group_leaders_', '', $meta_key));
                    if ($group_id > 0) {
                        $led_ids[] = $group_id;
                    }
                }
            }

            // Collect group IDs from organizations where this user is an admin
            $org_admin_ids = [];
            $all_orgs = get_posts([
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'fields'         => 'ids',
            ]);
            foreach ($all_orgs as $org_id) {
                $raw_admins = get_field('administrators', $org_id);
                $admin_ids  = [];
                foreach ((array) $raw_admins as $admin) {
                    $admin_ids[] = $admin instanceof \WP_User ? $admin->ID : intval($admin);
                }
                if (!in_array($user_id, $admin_ids, true)) continue;

                $raw_groups = get_field('groups', $org_id);
                foreach ((array) $raw_groups as $group) {
                    $g_id = $group instanceof \WP_Post ? $group->ID : intval($group);
                    if ($g_id > 0) {
                        $org_admin_ids[] = $g_id;
                    }
                }
            }

            $org_admin_set  = array_flip(array_unique($org_admin_ids));
            $accessible_ids = array_unique(array_merge($led_ids, $org_admin_ids));

            if (empty($accessible_ids)) return ['groups' => []];

            // Build response — only published groups. Capability flags per group:
            //  - can_manage_members: org-admin-of-group OR group-leader-of-group
            //  - can_manage_leaders: org-admin-of-group ONLY (group-leaders excluded)
            $led_set = array_flip(array_unique($led_ids));
            $user_groups = [];
            foreach ($accessible_ids as $group_id) {
                $group = get_post($group_id);
                if ($group && $group->post_type === 'groups' && $group->post_status === 'publish') {
                    $is_org_admin_here   = isset($org_admin_set[$group_id]);
                    $is_group_leader     = isset($led_set[$group_id]);
                    $user_groups[] = [
                        'id'                 => $group->ID,
                        'title'              => $group->post_title,
                        'is_org_admin'       => $is_org_admin_here,
                        'can_manage_leaders' => $is_org_admin_here, // org admins only
                        'can_manage_members' => $is_org_admin_here || $is_group_leader,
                    ];
                }
            }

            return ['groups' => $user_groups];
        }

        /**
         * GET /me/organizations
         *
         * Returns all organizations the user is an admin of or leads a group in,
         * plus any groups they lead that don't belong to any organization.
         *
         * NOTE: uses is_grader() per the same convention as get_current_user_groups().
         */
        public function get_current_user_organizations($request) {
            $user_id = get_current_user_id();

            $is_site_admin = BYS_Groups_Permissions::is_site_admin($user_id);
            $is_grader     = BYS_Groups_Permissions::is_grader($user_id);

            // Collect every group ID the current user leads (via LD group leader meta)
            $all_led_ids = [];
            if (!($is_site_admin || $is_grader)) {
                foreach (get_user_meta($user_id) as $meta_key => $meta_values) {
                    if (strpos($meta_key, 'learndash_group_leaders_') === 0) {
                        $g_id = intval(str_replace('learndash_group_leaders_', '', $meta_key));
                        if ($g_id > 0) $all_led_ids[] = $g_id;
                    }
                }
            }

            $all_orgs = get_posts([
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'orderby'        => 'title',
                'order'          => 'ASC',
            ]);

            $organizations = [];
            $claimed_ids   = []; // group IDs that belong to at least one org

            foreach ($all_orgs as $org) {
                // Site admins are org admins; graders see everything but aren't org admins
                if ($is_site_admin) {
                    $is_admin = true;
                } elseif ($is_grader) {
                    $is_admin = false;
                } else {
                    $raw_admins = get_field('administrators', $org->ID);
                    $admin_ids  = [];
                    foreach ((array) $raw_admins as $admin) {
                        $admin_ids[] = $admin instanceof \WP_User ? $admin->ID : intval($admin);
                    }
                    $is_admin = in_array($user_id, $admin_ids, true);
                }

                // Resolve group IDs — ACF may return WP_Post objects or raw IDs
                $raw_groups         = get_field('groups', $org->ID);
                $groups             = [];
                $archived_groups    = [];
                $user_leads_a_group = false;

                foreach ((array) $raw_groups as $group) {
                    if ($group instanceof \WP_Post) {
                        $g_id     = $group->ID;
                        $g_title  = $group->post_title;
                        $g_status = $group->post_status;
                    } else {
                        $g_id    = intval($group);
                        $g_post  = get_post($g_id);
                        $g_title  = $g_post ? $g_post->post_title  : '';
                        $g_status = $g_post ? $g_post->post_status : '';
                    }

                    if (!$g_id || !$g_title) continue;

                    $claimed_ids[] = $g_id;

                    if (!$user_leads_a_group && in_array($g_id, $all_led_ids, true)) {
                        $user_leads_a_group = true;
                    }

                    if ($g_status === 'publish') {
                        $groups[] = ['id' => $g_id, 'name' => $g_title];
                    } elseif ($g_status === 'draft' && $is_admin) {
                        $archived_date = get_post_meta($g_id, '_bys_archived_date', true)
                            ?: get_post_modified_time('U', false, $g_id);
                        $archived_groups[] = [
                            'id'            => $g_id,
                            'name'          => $g_title,
                            'archived_date' => (int) $archived_date,
                        ];
                    }
                }

                if (!($is_site_admin || $is_grader) && !$is_admin && !$user_leads_a_group) continue;

                $organizations[] = [
                    'id'              => $org->ID,
                    'name'            => $org->post_title,
                    'is_admin'        => $is_admin,
                    'groups'          => $groups,
                    'archived_groups' => $archived_groups,
                ];
            }

            // Groups not belonging to any organization
            $ungrouped = [];
            if ($is_site_admin || $is_grader) {
                // Site admins and graders see all published groups not claimed by an org
                $all_groups = get_posts([
                    'post_type'      => 'groups',
                    'post_status'    => 'publish',
                    'posts_per_page' => -1,
                    'fields'         => 'ids',
                ]);
                foreach (array_diff($all_groups, $claimed_ids) as $g_id) {
                    $g_post = get_post($g_id);
                    if ($g_post) {
                        $ungrouped[] = ['id' => $g_id, 'name' => $g_post->post_title];
                    }
                }
            } else {
                foreach (array_diff($all_led_ids, $claimed_ids) as $g_id) {
                    $g_post = get_post($g_id);
                    if ($g_post && $g_post->post_type === 'groups' && $g_post->post_status === 'publish') {
                        $ungrouped[] = ['id' => $g_id, 'name' => $g_post->post_title];
                    }
                }
            }

            return [
                'organizations'    => $organizations,
                'ungrouped_groups' => $ungrouped,
            ];
        }

        /**
         * GET /me/archived-groups
         *
         * Returns all draft-status groups the current user leads, with the
         * timestamp from when the group was archived (falls back to post_modified
         * for groups archived before the meta key was introduced).
         *
         * NOTE: accepts an optional ?user_id= query param that bypasses the
         * current_user check. Any authenticated user can query any other user's
         * archived groups.
         */
        public function get_current_user_archived_groups($request) {
            $user_id = intval($request->get_param('user_id')) ?: get_current_user_id();

            if (!$user_id) {
                return ['groups' => []];
            }

            $led_group_ids = [];
            foreach (get_user_meta($user_id) as $meta_key => $meta_values) {
                if (strpos($meta_key, 'learndash_group_leaders_') === 0) {
                    $group_id = intval(str_replace('learndash_group_leaders_', '', $meta_key));
                    if ($group_id > 0) {
                        $led_group_ids[] = $group_id;
                    }
                }
            }

            $archived_groups = [];
            foreach ($led_group_ids as $group_id) {
                $group = get_post($group_id);
                if (!$group || $group->post_type !== 'groups' || $group->post_status !== 'draft') {
                    continue;
                }

                $archived_date = get_post_meta($group_id, '_bys_archived_date', true);
                if (!$archived_date) {
                    $archived_date = get_post_modified_time('U', false, $group_id);
                }

                $archived_groups[] = [
                    'id'            => $group->ID,
                    'title'         => $group->post_title,
                    'archived_date' => (int) $archived_date,
                ];
            }

            return ['groups' => $archived_groups];
        }
    }
}
