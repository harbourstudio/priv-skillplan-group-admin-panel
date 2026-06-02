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
                        'can_manage_group'   => $is_site_admin,
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
            //  - can_manage_group:   org-admin-of-group, OR (group-leader AND
            //                        group is standalone — no org owns it).
            //                        Used for archive/unarchive/rename UI gating.
            $led_set = array_flip(array_unique($led_ids));
            $user_groups = [];
            foreach ($accessible_ids as $group_id) {
                $group = get_post($group_id);
                if ($group && $group->post_type === 'groups' && $group->post_status === 'publish') {
                    $is_org_admin_here   = isset($org_admin_set[$group_id]);
                    $is_group_leader     = isset($led_set[$group_id]);
                    // For non-org-admins, can_manage_group requires the group
                    // to NOT belong to any org (standalone) AND user to be a
                    // group leader of it.
                    $can_manage_group = $is_org_admin_here
                        || ($is_group_leader && !BYS_Groups_Permissions::is_group_in_any_org($group_id));

                    $user_groups[] = [
                        'id'                 => $group->ID,
                        'title'              => $group->post_title,
                        'is_org_admin'       => $is_org_admin_here,
                        'can_manage_leaders' => $is_org_admin_here, // org admins only
                        'can_manage_members' => $is_org_admin_here || $is_group_leader,
                        'can_manage_group'   => $can_manage_group,
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

            // Groups not belonging to any organization — site-admin-only.
            // Org admins and group leaders never receive this list (the client
            // also hides the "Other Groups" section when the array is empty).
            $ungrouped = [];
            if ($is_site_admin) {
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
            if (!$user_id) return ['groups' => []];

            $is_site_admin = BYS_Groups_Permissions::is_site_admin($user_id);

            // Build the set of group IDs this user is allowed to SEE.
            // - Site admin: every archived group on the site
            // - Org admin of org X: every group in org X (transitively all of
            //   their orgs)
            // - Group leader of group G in org X: every group in org X
            //   (so they see the whole org's archived set, not just G), plus
            //   any standalone groups they directly lead
            //
            // The `can_unarchive` flag emitted per row is stricter — only
            // site admins and org admins of the containing org can flip
            // the post_status back to 'publish'. Group leaders see the row
            // read-only.
            $visible_ids = [];

            if ($is_site_admin) {
                $visible_ids = get_posts([
                    'post_type'      => 'groups',
                    'post_status'    => 'draft',
                    'posts_per_page' => -1,
                    'fields'         => 'ids',
                ]);
            } else {
                $led_ids = [];
                foreach (get_user_meta($user_id) as $meta_key => $_meta_values) {
                    if (strpos($meta_key, 'learndash_group_leaders_') === 0) {
                        $g_id = intval(str_replace('learndash_group_leaders_', '', $meta_key));
                        if ($g_id > 0) $led_ids[] = $g_id;
                    }
                }

                // Walk every org once. If the user is either an admin of the
                // org OR leads any group in it, they see the whole org's
                // groups. Capture per-org admin flag so we can mark
                // can_unarchive correctly below.
                $orgs = get_posts([
                    'post_type'      => 'organization',
                    'post_status'    => 'publish',
                    'posts_per_page' => -1,
                ]);

                $org_admin_group_ids = []; // groups in orgs the user administers
                foreach ($orgs as $org) {
                    $raw_admins = get_field('administrators', $org->ID);
                    $admin_ids  = [];
                    foreach ((array) $raw_admins as $admin) {
                        $admin_ids[] = $admin instanceof \WP_User ? $admin->ID : intval($admin);
                    }
                    $is_org_admin_here = in_array($user_id, $admin_ids, true);

                    $raw_groups = get_field('groups', $org->ID);
                    $org_group_ids = [];
                    foreach ((array) $raw_groups as $g) {
                        $g_id = $g instanceof \WP_Post ? $g->ID : intval($g);
                        if ($g_id > 0) $org_group_ids[] = $g_id;
                    }

                    $leads_any_in_org = !empty(array_intersect($led_ids, $org_group_ids));

                    if ($is_org_admin_here) {
                        // Org admins see and can unarchive all groups in the org.
                        $visible_ids        = array_merge($visible_ids, $org_group_ids);
                        $org_admin_group_ids = array_merge($org_admin_group_ids, $org_group_ids);
                    } elseif ($leads_any_in_org) {
                        // Group leaders see all groups in their org (read-only).
                        $visible_ids = array_merge($visible_ids, $org_group_ids);
                    }
                }

                // Standalone groups the user leads (not in any org)
                $visible_ids = array_merge($visible_ids, $led_ids);
                $visible_ids = array_values(array_unique(array_map('intval', $visible_ids)));

                $unarchive_set = array_flip(array_unique($org_admin_group_ids));
            }

            // Filter to actually-archived groups and shape the response.
            // can_unarchive uses the same matrix as can_manage_group:
            // site admin OR org admin of the containing org OR (group leader
            // AND group is standalone). Group leaders viewing org-owned
            // groups see them read-only.
            $archived_groups = [];
            foreach ($visible_ids as $group_id) {
                $group = get_post($group_id);
                if (!$group || $group->post_type !== 'groups' || $group->post_status !== 'draft') continue;

                $archived_date = get_post_meta($group_id, '_bys_archived_date', true)
                    ?: get_post_modified_time('U', false, $group_id);

                $can_unarchive = $is_site_admin;
                if (!$can_unarchive && isset($unarchive_set[$group_id])) {
                    $can_unarchive = true; // org admin of the containing org
                }
                if (!$can_unarchive && !$is_site_admin) {
                    // Standalone-group fallback: a group leader of a group
                    // that no org claims may unarchive it.
                    $is_leader_here = (bool) get_user_meta($user_id, "learndash_group_leaders_{$group_id}", true);
                    if ($is_leader_here && !BYS_Groups_Permissions::is_group_in_any_org($group_id)) {
                        $can_unarchive = true;
                    }
                }

                $archived_groups[] = [
                    'id'            => $group->ID,
                    'title'         => $group->post_title,
                    'archived_date' => (int) $archived_date,
                    'can_unarchive' => $can_unarchive,
                ];
            }

            // Sort newest-first by archive date for consistent ordering.
            usort($archived_groups, fn($a, $b) => $b['archived_date'] <=> $a['archived_date']);

            return ['groups' => $archived_groups];
        }
    }
}
