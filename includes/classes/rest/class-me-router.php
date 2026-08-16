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

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/me/tutorial-seen', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'mark_tutorial_seen'],
                'permission_callback' => 'is_user_logged_in',
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/me/member-groups', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_current_user_member_groups'],
                'permission_callback' => 'is_user_logged_in',
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/me/groups/(?P<group_id>\d+)/leave', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'leave_group'],
                'permission_callback' => function ($request) {
                    if (!is_user_logged_in()) return false;
                    $group_id = intval($request['group_id']);
                    $user_id  = get_current_user_id();
                    return function_exists('learndash_is_user_in_group')
                        ? (bool) learndash_is_user_in_group($user_id, $group_id)
                        : false;
                },
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
            // (cached org map — no per-request org scan)
            $org_admin_ids = [];
            foreach (BYS_Groups_Org_Map::all_org_ids() as $org_id) {
                if (!BYS_Groups_Org_Map::is_user_org_admin($org_id, $user_id)) continue;
                foreach (BYS_Groups_Org_Map::org_group_ids($org_id) as $g_id) {
                    $org_admin_ids[] = $g_id;
                }
            }

            $org_admin_set  = array_flip(array_unique($org_admin_ids));
            $accessible_ids = array_unique(array_merge($led_ids, $org_admin_ids));

            if (empty($accessible_ids)) return ['groups' => []];

            // One query for every group post the loop below will read.
            _prime_post_caches(array_values($accessible_ids), false, false);

            // Build response — only published groups. Capability flags per group:
            //  - can_manage_members: org-admin-of-group OR group-leader-of-group
            //  - can_manage_group:   org-admin-of-group, OR (group-leader AND
            //                        group is standalone — no org owns it).
            //                        Gates archive/unarchive/rename AND
            //                        leader-management UI.
            $led_set = array_flip(array_unique($led_ids));
            $user_groups = [];
            foreach ($accessible_ids as $group_id) {
                $group = get_post($group_id);
                if ($group && $group->post_type === 'groups' && $group->post_status === 'publish') {
                    $is_org_admin_here = isset($org_admin_set[$group_id]);
                    $is_group_leader   = isset($led_set[$group_id]);
                    // For non-org-admins, can_manage_group requires the group
                    // to NOT belong to any org (standalone) AND user to be a
                    // group leader of it.
                    $can_manage_group = $is_org_admin_here
                        || ($is_group_leader && !BYS_Groups_Permissions::is_group_in_any_org($group_id));

                    $user_groups[] = [
                        'id'                 => $group->ID,
                        'title'              => $group->post_title,
                        'is_org_admin'       => $is_org_admin_here,
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

            // Cached org map instead of a get_posts + per-org ACF scan.
            // Sort by title to preserve the original orderby=title response order.
            $org_entries = BYS_Groups_Org_Map::get_map()['orgs'];
            uasort($org_entries, fn($a, $b) => strcasecmp((string) $a['title'], (string) $b['title']));

            // Prime every org-owned group post in one query — the loop below
            // reads each group's title and status.
            $all_map_group_ids = [];
            foreach ($org_entries as $entry) {
                foreach ($entry['groups'] as $gid) {
                    $all_map_group_ids[] = $gid;
                }
            }
            if (!empty($all_map_group_ids)) {
                _prime_post_caches(array_values(array_unique($all_map_group_ids)), false, false);
            }

            $organizations = [];
            $claimed_ids   = []; // group IDs that belong to at least one org

            foreach ($org_entries as $org_id => $entry) {
                // Site admins are org admins; graders see everything but aren't org admins
                if ($is_site_admin) {
                    $is_admin = true;
                } elseif ($is_grader) {
                    $is_admin = false;
                } else {
                    $is_admin = in_array($user_id, $entry['admins'], true);
                }

                $groups              = [];
                $archived_candidates = [];
                $user_leads_a_group  = false;

                foreach ($entry['groups'] as $g_id) {
                    $g_post   = get_post($g_id);
                    $g_title  = $g_post ? $g_post->post_title  : '';
                    $g_status = $g_post ? $g_post->post_status : '';

                    if (!$g_id || !$g_title) continue;

                    $claimed_ids[] = $g_id;

                    if (!$user_leads_a_group && in_array($g_id, $all_led_ids, true)) {
                        $user_leads_a_group = true;
                    }

                    if ($g_status === 'publish') {
                        $groups[] = ['id' => $g_id, 'name' => $g_title];
                    } elseif ($g_status === 'draft') {
                        $archived_date = get_post_meta($g_id, '_bys_archived_date', true)
                            ?: get_post_modified_time('U', false, $g_id);
                        $archived_candidates[] = [
                            'id'            => $g_id,
                            'name'          => $g_title,
                            'archived_date' => (int) $archived_date,
                        ];
                    }
                }

                // Archived groups are visible to org admins, site admins, graders,
                // and any group leader who leads at least one group in this org.
                $can_see_archived = $is_admin || $is_site_admin || $is_grader || $user_leads_a_group;
                $archived_groups  = $can_see_archived ? $archived_candidates : [];

                if (!($is_site_admin || $is_grader) && !$is_admin && !$user_leads_a_group) continue;

                $organizations[] = [
                    'id'              => $org_id,
                    'name'            => $entry['title'],
                    'is_admin'        => $is_admin,
                    'groups'          => $groups,
                    'archived_groups' => $archived_groups,
                ];
            }

            // Groups not belonging to any organization — surfaced to:
            //   - Site admins: every standalone group (published + archived)
            //   - Non-site-admin group-leaders: only the standalone groups
            //     they personally lead (since they own those groups directly).
            // Org admins, graders, and unaffiliated users never receive this
            // list. The client hides the "Other Groups" section when both
            // arrays are empty.
            $ungrouped          = [];
            $ungrouped_archived = [];

            if ($is_site_admin) {
                $candidate_ids = get_posts([
                    'post_type'      => 'groups',
                    'post_status'    => ['publish', 'draft'],
                    'posts_per_page' => -1,
                    'fields'         => 'ids',
                ]);
                $candidate_ids = array_diff($candidate_ids, $claimed_ids);
            } elseif (!empty($all_led_ids)) {
                // Non-admin leaders see only their own standalone-led groups.
                $candidate_ids = array_diff($all_led_ids, $claimed_ids);
            } else {
                $candidate_ids = [];
            }

            foreach ($candidate_ids as $g_id) {
                $g_post = get_post($g_id);
                if (!$g_post || $g_post->post_type !== 'groups') continue;

                if ($g_post->post_status === 'publish') {
                    $ungrouped[] = ['id' => $g_id, 'name' => $g_post->post_title];
                } elseif ($g_post->post_status === 'draft') {
                    $archived_date = get_post_meta($g_id, '_bys_archived_date', true)
                        ?: get_post_modified_time('U', false, $g_id);
                    $ungrouped_archived[] = [
                        'id'            => $g_id,
                        'name'          => $g_post->post_title,
                        'archived_date' => (int) $archived_date,
                    ];
                }
            }

            return [
                'organizations'             => $organizations,
                'ungrouped_groups'          => $ungrouped,
                'ungrouped_archived_groups' => $ungrouped_archived,
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
            // - Site admin: every archived group on the site (including standalones)
            // - Org admin of org X: every group in org X (transitively across
            //   every org they administer)
            // - Group leader of group G in org X: every group in org X
            //   (so they see the whole org's archived set, not just G).
            //   Standalone groups are NOT visible to non-site-admins — the
            //   Other Groups section is site-admin territory; a leader who
            //   happens to lead a standalone group does not see it here.
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
                        $g_id = (int) substr($meta_key, strlen('learndash_group_leaders_'));
                        if ($g_id > 0) $led_ids[] = $g_id;
                    }
                }

                // Walk the cached org map to determine visibility scope.
                // Build two disjoint sets:
                //   - $org_admin_group_ids: groups the user can unarchive
                //     (they admin the containing org)
                //   - $org_member_group_ids: groups the user can see
                //     read-only (they lead at least one group in this org)
                // Standalone groups (not in any org) are explicitly EXCLUDED
                // from non-site-admin visibility — the Other Groups section
                // is site-admin territory. Leaders who happen to have a
                // stale learndash_group_leaders_* meta for a standalone
                // group do NOT see it here.
                $org_admin_group_ids  = [];
                $org_member_group_ids = [];

                foreach (BYS_Groups_Org_Map::get_map()['orgs'] as $entry) {
                    $is_org_admin_here = in_array($user_id, $entry['admins'], true);
                    $org_group_ids     = $entry['groups'];

                    $leads_any_in_org = !empty(array_intersect($led_ids, $org_group_ids));

                    if ($is_org_admin_here) {
                        $org_admin_group_ids = array_merge($org_admin_group_ids, $org_group_ids);
                    } elseif ($leads_any_in_org) {
                        $org_member_group_ids = array_merge($org_member_group_ids, $org_group_ids);
                    }
                }

                $visible_ids   = array_values(array_unique(array_merge($org_admin_group_ids, $org_member_group_ids)));
                $unarchive_set = array_flip(array_unique($org_admin_group_ids));
            }

            // Filter to actually-archived groups and shape the response.
            // can_unarchive uses the same matrix as can_manage_group:
            // site admin OR org admin of the containing org OR (group leader
            // AND group is standalone). Group leaders viewing org-owned
            // groups see them read-only.
            if (!empty($visible_ids)) {
                _prime_post_caches(array_values($visible_ids), false, false);
                update_postmeta_cache(array_values($visible_ids));
            }

            $archived_groups = [];
            foreach ($visible_ids as $group_id) {
                $group = get_post($group_id);
                if (!$group || $group->post_type !== 'groups' || $group->post_status !== 'draft') continue;

                $archived_date = get_post_meta($group_id, '_bys_archived_date', true)
                    ?: get_post_modified_time('U', false, $group_id);

                // Site admins can unarchive anything; org admins can unarchive
                // groups in orgs they administer. Group leaders viewing org-owned
                // groups see them read-only.
                $can_unarchive = $is_site_admin || isset($unarchive_set[$group_id]);

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

        /**
         * POST /me/tutorial-seen
         *
         * Marks the group dashboard onboarding tutorial as seen for the current user.
         * Called by the group-onboarding-modal block after the modal is closed on first visit.
         */
        public function mark_tutorial_seen($request) {
            $user_id = get_current_user_id();
            update_user_meta( $user_id, 'bys_group_tutorial_seen', true );
            return new WP_REST_Response( [ 'success' => true ], 200 );
        }

        /**
         * GET /me/member-groups
         *
         * Returns all published LearnDash groups the current user is enrolled in
         * as a member (not as a leader/admin). Each group is enriched with its
         * parent organization info when one exists.
         */
        public function get_current_user_member_groups($request) {
            $user_id = get_current_user_id();
            if (!$user_id) return ['groups' => []];

            $group_ids = learndash_get_users_group_ids($user_id);
            if (empty($group_ids)) return ['groups' => []];

            // One query for every group post read in the loop below; the
            // group → org resolution comes from the cached org map.
            _prime_post_caches(array_map('intval', (array) $group_ids), false, false);

            $groups = [];
            foreach ($group_ids as $group_id) {
                $post = get_post($group_id);
                if (!$post || $post->post_status !== 'publish') continue;

                $owning_orgs = BYS_Groups_Org_Map::orgs_for_group((int) $group_id);
                $org_id      = !empty($owning_orgs) ? $owning_orgs[0] : null;
                $org_title   = null;
                if ($org_id) {
                    $entry     = BYS_Groups_Org_Map::org_entry($org_id);
                    $org_title = $entry ? $entry['title'] : null;
                }

                $groups[] = [
                    'id'        => $group_id,
                    'title'     => $post->post_title,
                    'permalink' => get_permalink($group_id),
                    'org_id'    => $org_id,
                    'org_title' => $org_title,
                ];
            }

            // Sort: orged groups first (alpha by org then group name), then ungrouped alpha.
            usort($groups, function($a, $b) {
                if ($a['org_title'] && $b['org_title']) {
                    return strcmp($a['org_title'], $b['org_title']) ?: strcmp($a['title'], $b['title']);
                }
                if ($a['org_title']) return -1;
                if ($b['org_title']) return 1;
                return strcmp($a['title'], $b['title']);
            });

            return ['groups' => $groups];
        }

        /**
         * POST /me/groups/{group_id}/leave
         *
         * Removes the current user from the given LearnDash group.
         * Permission callback already verifies membership before this runs.
         */
        public function leave_group($request) {
            $group_id = intval($request['group_id']);
            $user_id  = get_current_user_id();

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new WP_Error('not_found', 'Group not found', ['status' => 404]);
            }

            ld_update_group_access($user_id, $group_id, true);

            return ['success' => true];
        }
    }
}
