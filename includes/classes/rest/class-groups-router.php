<?php
/**
 * Groups Router
 *
 * Endpoints scoped to a specific LearnDash group ({group_id} in the URL).
 *
 * @package BYS_Groups
 * @since 1.1.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Groups_Router')) {
    class BYS_Groups_Groups_Router {

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
        }

        public function register_routes() {
            // ── Cluster A: group users + stats ─────────────────────────────

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/base-group-data', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_base_group_data'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/group-stats', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_base_group_stats'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/users/(?P<user_id>\d+)/remove', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'remove_group_user'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_manage_user_in_group($request['group_id'], $request['user_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/users/(?P<user_id>\d+)', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_group_user_info'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_manage_user_in_group($request['group_id'], $request['user_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/users', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_group_users'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            // ── Cluster B: group courses ───────────────────────────────────
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/courses/(?P<course_id>\d+)/add', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'add_group_course'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/courses/(?P<course_id>\d+)/remove', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'remove_group_course'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/courses/(?P<course_id>\d+)/toggle-required', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'toggle_required_course'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/courses', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_group_courses'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/course-completion-stats', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_group_course_completion_stats'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            // Sibling route — not group-scoped. Autocomplete picker over all
            // published LD courses; any authenticated user can use it.
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/all-courses', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_all_courses'],
                'permission_callback' => 'is_user_logged_in',
            ]);

            // ── Cluster C: group quizzes ───────────────────────────────────
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/quizzes/(?P<quiz_id>\d+)/attempts', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_group_quiz_attempts'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/quiz-submission-stats', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_group_quiz_submission_stats'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            // ── Cluster D: group archive ───────────────────────────────────
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/archive', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'archive_group'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/unarchive', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'unarchive_group'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            // ── Cluster E: group leaders ───────────────────────────────────
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/leaders/(?P<user_id>\d+)', [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [$this, 'remove_group_leader'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/leaders', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_group_leaders'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            // ── Cluster F: group invites ───────────────────────────────────
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/invite-bulk', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'bulk_user_addition'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/invites/(?P<invite_id>\d+)/cancel', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'cancel_invite'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/pending-invites', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_pending_invites'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/invite', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'invite_member'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            // ── Cluster G: group quiz-access + communications ──────────────
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/users/(?P<user_id>\d+)/notify-quiz-access', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'notify_user_quiz_access'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/users/(?P<user_id>\d+)/quiz-access', [
                'methods'             => 'GET, POST',
                'callback'            => [$this, 'user_quiz_access'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/quiz-access', [
                'methods'             => 'GET, POST',
                'callback'            => [$this, 'group_quiz_access'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/send-communication', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'send_group_communication'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
                'args' => [
                    'prompt_type'    => ['type' => 'string', 'required' => true],
                    'recipient_type' => ['type' => 'string', 'required' => true],
                    'recipient_ids'  => ['type' => 'array',  'required' => false],
                    'custom_subject' => ['type' => 'string', 'required' => false],
                    'custom_message' => ['type' => 'string', 'required' => false],
                ],
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/communication-log', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_group_communication_log'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/template/(?P<prompt_type>[\w-]+)', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_email_template'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);

            // Conditional recipients delegates to BYS_Groups_Conditional_Emails (separate class, stays put).
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/groups/(?P<group_id>\d+)/conditional-recipients', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => ['BYS_Groups_Conditional_Emails', 'rest_get_recipients'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_group($request['group_id']),
            ]);
        }

        // ─── REST callbacks: Cluster A ──────────────────────────────────────

        /**
         * GET /groups/{group_id}/base-group-data
         * Single-call dashboard bootstrap: returns hydrated users + courses
         * for the group. Replaces the legacy two-call pattern (user-stats
         * + courses) used by group-select. Does NOT compute the expensive
         * inactive-members count — that lives in /group-stats.
         */
        public function get_base_group_data($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) return new WP_Error('bad_request', 'Invalid group ID', ['status' => 400]);

            $auth_header = BYS_Groups_Auth::get_auth_header();
            if (!$auth_header) return new WP_Error('server_error', 'API credentials not configured', ['status' => 500]);

            // ── 1. Collect user IDs from LD's group-users endpoint (paginated)
            $user_ids = [];
            $page     = 1;
            $per_page = 100;

            do {
                $url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/users?_fields=id&per_page={$per_page}&page={$page}";
                $response = wp_remote_get($url, [
                    'headers'   => ['Authorization' => $auth_header],
                    'sslverify' => false,
                ]);

                if (is_wp_error($response)) return new WP_Error('server_error', $response->get_error_message(), ['status' => 500]);
                if (wp_remote_retrieve_response_code($response) !== 200) {
                    return new WP_Error('ld_api_failure', 'Failed to fetch users from LearnDash API', ['status' => 502]);
                }

                $page_users = json_decode(wp_remote_retrieve_body($response), true);
                if (!is_array($page_users) || empty($page_users)) break;

                foreach ($page_users as $u) {
                    $user_ids[] = intval($u['id']);
                }
                $page++;
            } while (count($page_users) === $per_page);

            // ── 2. Hydrate user objects (mirrors get_group_users shape)
            $users = [];
            foreach ($user_ids as $user_id) {
                $user = get_user_by('ID', $user_id);
                if (!$user) continue;

                $meta_values = [
                    intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                    intval(get_user_meta($user_id, 'learndash-last-login',          true) ?: 0),
                ];
                $last_login_timestamp = max($meta_values);
                $last_login_timestamp = $last_login_timestamp > 0 ? $last_login_timestamp : null;

                $enrolled_at_raw = get_user_meta($user_id, "learndash_group_{$group_id}_enrolled_at", true);

                $users[] = [
                    'id'           => $user->ID,
                    'first_name'   => get_user_meta($user_id, 'first_name', true) ?: '',
                    'last_name'    => get_user_meta($user_id, 'last_name', true) ?: '',
                    'display_name' => $user->display_name,
                    'email'        => $user->user_email,
                    'avatar'       => get_avatar_url($user_id, ['size' => 64]),
                    'enrolled_at'  => $enrolled_at_raw ? wp_date('c', (int) $enrolled_at_raw) : null,
                    'last_login'   => $last_login_timestamp ? wp_date('c', $last_login_timestamp) : null,
                    'status'       => $this->get_user_online_status($user_id),
                ];
            }

            // ── 3. Group's enrolled courses (mirrors get_group_courses shape)
            $courses = [];
            $courses_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/courses?_fields=id,title";
            $courses_response = wp_remote_get($courses_url, [
                'headers'   => ['Authorization' => $auth_header],
                'sslverify' => false,
            ]);
            // Source of truth for "is this course required for this group" lives
            // in _bys_required_course_ids post meta on the group post. Read once
            // and lookup-by-id below.
            $required_raw = get_post_meta($group_id, '_bys_required_course_ids', true);
            $required_ids = is_array($required_raw) ? array_map('intval', $required_raw) : [];
            if (!is_wp_error($courses_response) && wp_remote_retrieve_response_code($courses_response) === 200) {
                $raw_courses = json_decode(wp_remote_retrieve_body($courses_response), true);
                if (is_array($raw_courses)) {
                    $course_ids_collected = [];
                    foreach ($raw_courses as $course) {
                        $course_id = $course['id'] ?? null;
                        $shortname = $course_id ? get_post_meta($course_id, 'shortname', true) : '';
                        $courses[] = [
                            'id'        => $course_id,
                            'title'     => $course['title'] ?? 'Untitled',
                            'shortname' => $shortname ?: null,
                            'required'  => $course_id ? in_array(intval($course_id), $required_ids, true) : false,
                            // Filled in below from a single batched query so blocks
                            // don't fan out per-course /quiz-steps requests.
                            'quizzes_show_test_grading_config'   => [],
                            'quizzes_show_in_reporting'  => [],
                        ];
                        if ($course_id) $course_ids_collected[] = intval($course_id);
                    }

                    // Batch query: per-course grading + reporting quiz sets.
                    if (!empty($course_ids_collected)) {
                        $quiz_meta = $this->fetch_quiz_meta_by_course($course_ids_collected);
                        foreach ($courses as &$course_ref) {
                            $cid = intval($course_ref['id']);
                            $course_ref['quizzes_show_test_grading_config']  = $quiz_meta[$cid]['grading']   ?? [];
                            $course_ref['quizzes_show_in_reporting'] = $quiz_meta[$cid]['reporting'] ?? [];
                        }
                        unset($course_ref);
                    }
                }
            }

            return new WP_REST_Response([
                'group_id' => $group_id,
                'users'    => $users,
                'courses'  => $courses,
            ], 200);
        }

        public function get_base_group_stats($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) return new WP_Error('bad_request', 'Invalid group ID', ['status' => 400]);

            $auth_header = BYS_Groups_Auth::get_auth_header();
            if (!$auth_header) return new WP_Error('server_error', 'API credentials not configured', ['status' => 500]);

            // Paginate LD's group-users endpoint for IDs
            $user_ids = [];
            $page     = 1;
            $per_page = 100;
            do {
                $url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/users?_fields=id&per_page={$per_page}&page={$page}";
                $response = wp_remote_get($url, [
                    'headers'   => ['Authorization' => $auth_header],
                    'sslverify' => false,
                ]);
                if (is_wp_error($response)) return new WP_Error('server_error', $response->get_error_message(), ['status' => 500]);
                if (wp_remote_retrieve_response_code($response) !== 200) {
                    return new WP_Error('ld_api_failure', 'Failed to fetch users from LearnDash API', ['status' => 502]);
                }
                $page_users = json_decode(wp_remote_retrieve_body($response), true);
                if (!is_array($page_users) || empty($page_users)) break;
                foreach ($page_users as $u) {
                    $user_ids[] = intval($u['id']);
                }
                $page++;
            } while (count($page_users) === $per_page);

            // Inactive = no login meta at all. Known N+1, intentionally kept
            // isolated to this endpoint so only group-stats pays the cost.
            $inactive_members = 0;
            foreach ($user_ids as $user_id) {
                $login_meta = [
                    intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                    intval(get_user_meta($user_id, 'learndash-last-login',          true) ?: 0),
                ];
                if (max($login_meta) === 0) $inactive_members++;
            }

            return [
                'group_id'               => $group_id,
                'total_members'          => count($user_ids),
                'total_inactive_members' => $inactive_members,
                'user_ids'               => $user_ids,
            ];
        }


        /**
         * GET /groups/{group_id}/users?user_ids=1,2,3
         * Returns hydrated user records (first/last name, email, avatar, enrolled_at,
         * last_login, online status) for the supplied user_ids.
         *
         * The user_ids param is required — without it the response is an empty array.
         * Callers typically pass the array from a prior base-user-stats call.
         *
         * Known N+1: get_user_by + 3 get_user_meta calls per user. Phase 2 will
         * batch-load via a single $wpdb JOIN.
         */
        public function get_group_users($request) {
            $group_id       = intval($request['group_id']);
            $user_ids_param = $request->get_param('user_ids');

            if (!$group_id) return new WP_Error('bad_request', 'Invalid group ID', ['status' => 400]);

            $user_ids = [];
            if ($user_ids_param) {
                $user_ids = array_filter(array_map('intval', explode(',', $user_ids_param)));
            }

            if (empty($user_ids)) return [];

            $users = [];
            foreach ($user_ids as $user_id) {
                $user = get_user_by('ID', $user_id);
                if (!$user) continue;

                $meta_values = [
                    intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                    intval(get_user_meta($user_id, 'learndash-last-login',          true) ?: 0),
                ];
                $last_login_timestamp = max($meta_values);
                $last_login_timestamp = $last_login_timestamp > 0 ? $last_login_timestamp : null;

                $enrolled_at_raw = get_user_meta($user_id, "learndash_group_{$group_id}_enrolled_at", true);

                $users[] = [
                    'id'           => $user->ID,
                    'first_name'   => get_user_meta($user_id, 'first_name', true) ?: '',
                    'last_name'    => get_user_meta($user_id, 'last_name', true) ?: '',
                    'display_name' => $user->display_name,
                    'email'        => $user->user_email,
                    'avatar'       => get_avatar_url($user_id, ['size' => 64]),
                    'enrolled_at'  => $enrolled_at_raw ? wp_date('c', (int) $enrolled_at_raw) : null,
                    'last_login'   => $last_login_timestamp ? wp_date('c', $last_login_timestamp) : null,
                    'status'       => $this->get_user_online_status($user_id),
                ];
            }

            return $users;
        }

        /**
         * GET /groups/{group_id}/users/{user_id}
         * Returns detailed information for a single user in the group.
         * Different shape than get_group_users: includes group_enrolled_date and
         * avatar_url (vs. avatar), no enrolled_at in ISO format.
         */
        public function get_group_user_info($request) {
            $group_id = intval($request['group_id']);
            $user_id  = intval($request['user_id']);
            if (!$group_id || !$user_id) {
                return new WP_Error('bad_request', 'Invalid group ID or user ID', ['status' => 400]);
            }

            $user = get_user_by('ID', $user_id);
            if (!$user) return new WP_Error('not_found', 'User not found', ['status' => 404]);

            $group_enrolled_date = get_user_meta($user_id, "learndash_group_{$group_id}_enrolled_at", true);

            $meta_values = [
                intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                intval(get_user_meta($user_id, 'learndash-last-login',          true) ?: 0),
            ];
            $last_login_timestamp = max($meta_values);
            $last_login_timestamp = $last_login_timestamp > 0 ? $last_login_timestamp : null;

            return [
                'id'                  => $user->ID,
                'first_name'          => $user->first_name,
                'last_name'           => $user->last_name,
                'display_name'        => $user->display_name,
                'email'               => $user->user_email,
                'status'              => $this->get_user_online_status($user_id),
                'group_enrolled_date' => $group_enrolled_date ?: null,
                'last_login'          => $last_login_timestamp,
                'avatar_url'          => get_avatar_url($user_id, ['size' => 80]),
            ];
        }

        /**
         * POST /groups/{group_id}/users/{user_id}/remove
         * Removes a user from a LearnDash group. ld_update_group_access() handles
         * all LD-side cleanup (group meta, user role, etc.).
         */
        public function remove_group_user($request) {
            $group_id = intval($request['group_id']);
            $user_id  = intval($request['user_id']);
            if (!$group_id || !$user_id) {
                return new WP_Error('bad_request', 'Invalid group ID or user ID', ['status' => 400]);
            }

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new WP_Error('not_found', 'Group not found', ['status' => 404]);
            }

            ld_update_group_access($user_id, $group_id, true);

            return ['success' => true, 'user_id' => $user_id];
        }

        // ─── REST callbacks: Cluster B ──────────────────────────────────────

        /**
         * GET /groups/{group_id}/courses
         * Returns the group's enrolled courses (id, title, shortname) via the LD
         * REST API. Shortname comes from local post meta.
         */
        public function get_group_courses($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) return new WP_Error('bad_request', 'Invalid group ID', ['status' => 400]);

            $auth_header = BYS_Groups_Auth::get_auth_header();
            if (!$auth_header) return new WP_Error('server_error', 'API credentials not configured', ['status' => 500]);

            $url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/courses?_fields=id,title";
            $response = wp_remote_get($url, [
                'headers'   => ['Authorization' => $auth_header],
                'sslverify' => false,
            ]);

            if (is_wp_error($response)) return new WP_Error('server_error', $response->get_error_message(), ['status' => 500]);

            $status = wp_remote_retrieve_response_code($response);
            if ($status !== 200) {
                return new WP_Error('ld_api_failure', 'Failed to fetch courses from LearnDash API', ['status' => $status]);
            }

            $courses = json_decode(wp_remote_retrieve_body($response), true);

            // Look up which course IDs are flagged as required for this group.
            $required_raw = get_post_meta($group_id, '_bys_required_course_ids', true);
            $required_ids = is_array($required_raw) ? array_map('intval', $required_raw) : [];

            $formatted_courses = [];
            $course_ids_collected = [];
            if (is_array($courses)) {
                foreach ($courses as $course) {
                    $course_id = $course['id'] ?? null;
                    $shortname = $course_id ? get_post_meta($course_id, 'shortname', true) : '';
                    $formatted_courses[] = [
                        'id'        => $course_id,
                        'title'     => $course['title'] ?? 'Untitled',
                        'shortname' => $shortname ?: null,
                        'required'  => $course_id ? in_array(intval($course_id), $required_ids, true) : false,
                        'quizzes_show_test_grading_config'   => [],
                        'quizzes_show_in_reporting'  => [],
                    ];
                    if ($course_id) $course_ids_collected[] = intval($course_id);
                }

                if (!empty($course_ids_collected)) {
                    $quiz_meta = $this->fetch_quiz_meta_by_course($course_ids_collected);
                    foreach ($formatted_courses as &$c) {
                        $cid = intval($c['id']);
                        $c['quizzes_show_test_grading_config']  = $quiz_meta[$cid]['grading']   ?? [];
                        $c['quizzes_show_in_reporting'] = $quiz_meta[$cid]['reporting'] ?? [];
                    }
                    unset($c);
                }
            }

            return new WP_REST_Response($formatted_courses, 200);
        }

        /**
         * GET /groups/{group_id}/course-completion-stats[?course_ids=1,2,3]
         * Returns aggregate completed/incomplete counts across the group.
         *
         * Without ?course_ids: enumerates the group's courses via the LD API.
         * With ?course_ids: scopes the count to the supplied courses only.
         *
         * Known performance issue: nested user × course loop with one LD REST call
         * per pair (N*M HTTP calls). Flagged for Phase 2 caching/batching work.
         */
        public function get_group_course_completion_stats($request) {
            $group_id         = intval($request['group_id']);
            $course_ids_param = $request->get_param('course_ids');

            if (!$group_id) return new WP_Error('bad_request', 'Invalid group_id', ['status' => 400]);

            $auth_header = BYS_Groups_Auth::get_auth_header();
            if (!$auth_header) return new WP_Error('server_error', 'API credentials not configured', ['status' => 500]);

            // Fetch all user IDs in this group from LD API
            $url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/users?_fields=id";
            $response = wp_remote_get($url, [
                'headers'   => ['Authorization' => $auth_header],
                'timeout'   => 30,
                'sslverify' => false,
            ]);

            if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
                return new WP_Error('server_error', 'Failed to fetch group users', ['status' => 500]);
            }

            $group_users = json_decode(wp_remote_retrieve_body($response), true);
            if (!is_array($group_users) || empty($group_users)) {
                return ['total_completed' => 0, 'total_incomplete' => 0];
            }

            $user_ids = array_map(fn($u) => intval($u['id']), $group_users);

            // Resolve course IDs — explicit param wins, otherwise enumerate via LD API
            if (!empty($course_ids_param)) {
                $course_ids = array_filter(array_map('intval', explode(',', $course_ids_param)));
            } else {
                $group_courses = $this->fetch_group_courses_minimal($group_id, $auth_header);
                if ($group_courses === null) {
                    return new WP_Error('server_error', 'Failed to fetch group courses', ['status' => 500]);
                }
                $course_ids = array_map(fn($c) => intval($c['id']), $group_courses);
            }

            if (empty($course_ids)) {
                return ['total_completed' => 0, 'total_incomplete' => 0];
            }

            $total_completed  = 0;
            $total_incomplete = 0;

            // For each user × course, fetch progress_status from LD API.
            // This is the known N*M bottleneck — preserved verbatim; Phase 2 perf work.
            foreach ($user_ids as $user_id) {
                foreach ($course_ids as $course_id) {
                    $progress_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/course-progress/{$course_id}?_fields=progress_status";
                    $response = wp_remote_get($progress_url, [
                        'headers'   => ['Authorization' => $auth_header],
                        'timeout'   => 30,
                        'sslverify' => false,
                    ]);

                    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
                        continue; // Skip on individual failure rather than abort the aggregate
                    }

                    $progress = json_decode(wp_remote_retrieve_body($response), true);
                    if (!is_array($progress) || empty($progress)) {
                        $total_incomplete++;
                        continue;
                    }

                    if (($progress['progress_status'] ?? '') === 'completed') {
                        $total_completed++;
                    } else {
                        $total_incomplete++;
                    }
                }
            }

            return [
                'total_completed'  => $total_completed,
                'total_incomplete' => $total_incomplete,
            ];
        }

        /**
         * POST /groups/{group_id}/courses/{course_id}/add
         * Enrolls a course in the group via LD's helper. No-op if already enrolled.
         */
        public function add_group_course($request) {
            $group_id  = intval($request['group_id']);
            $course_id = intval($request['course_id']);
            if (!$group_id || !$course_id) return new WP_Error('bad_request', 'Invalid IDs', ['status' => 400]);

            ld_update_course_group_access($course_id, $group_id, false);
            return ['success' => true];
        }

        /**
         * POST /groups/{group_id}/courses/{course_id}/remove
         * Removes a course from the group AND drops it from the group's
         * required-courses list if present.
         */
        public function remove_group_course($request) {
            $group_id  = intval($request['group_id']);
            $course_id = intval($request['course_id']);
            if (!$group_id || !$course_id) return new WP_Error('bad_request', 'Invalid IDs', ['status' => 400]);

            ld_update_course_group_access($course_id, $group_id, true);

            // Drop from required-courses list to keep state consistent
            $ids = get_post_meta($group_id, '_bys_required_course_ids', true);
            if (is_array($ids)) {
                $ids = array_values(array_filter(array_map('intval', $ids), fn($id) => $id !== $course_id));
                update_post_meta($group_id, '_bys_required_course_ids', $ids);
            }

            return ['success' => true];
        }

        /**
         * POST /groups/{group_id}/courses/{course_id}/toggle-required
         * Toggles the course's presence in the group's _bys_required_course_ids meta.
         * Returns the new required state.
         */
        public function toggle_required_course($request) {
            $group_id  = intval($request['group_id']);
            $course_id = intval($request['course_id']);
            if (!$group_id || !$course_id) return new WP_Error('bad_request', 'Invalid IDs', ['status' => 400]);

            $ids = get_post_meta($group_id, '_bys_required_course_ids', true);
            $ids = is_array($ids) ? array_values(array_map('intval', array_filter($ids))) : [];

            $idx = array_search($course_id, $ids, true);
            if ($idx !== false) {
                array_splice($ids, $idx, 1);
                $required = false;
            } else {
                $ids[] = $course_id;
                $required = true;
            }

            update_post_meta($group_id, '_bys_required_course_ids', $ids);
            return ['success' => true, 'required' => $required];
        }

        /**
         * GET /all-courses[?search=]
         * Sibling autocomplete picker over all published LD courses.
         * Capped at 100 results. Used by group-course-config to add courses
         * to a group.
         */
        public function get_all_courses($request) {
            $search = sanitize_text_field($request->get_param('search') ?? '');

            $args = [
                'post_type'      => 'sfwd-courses',
                'post_status'    => 'publish',
                'posts_per_page' => 100,
                'orderby'        => 'title',
                'order'          => 'ASC',
                'no_found_rows'  => true,
            ];
            if ($search) $args['s'] = $search;

            $result = [];
            foreach (get_posts($args) as $course) {
                $result[] = [
                    'id'    => $course->ID,
                    'title' => $course->post_title,
                ];
            }
            return $result;
        }

        // ─── REST callbacks: Cluster C ──────────────────────────────────────

        /**
         * GET /groups/{group_id}/quizzes/{quiz_id}/attempts
         * Returns all attempts for a specific quiz from this group's members.
         * Flat list sorted by completion time descending, hydrated with user
         * display names and ungraded-status overrides.
         *
         * Per-attempt 'pass' is forced to null when the attempt contains any
         * question still pending manual grading (essay, assessment_answer, or
         * unscored free_answer) — keeps the modal badge showing "Ungraded"
         * rather than a premature pass/fail.
         */
        public function get_group_quiz_attempts($request) {
            $group_id = intval($request['group_id']);
            $quiz_id  = intval($request['quiz_id']);
            if (!$group_id || !$quiz_id) {
                return new WP_Error('bad_request', 'Invalid group_id or quiz_id', ['status' => 400]);
            }

            $user_ids = learndash_get_groups_user_ids($group_id);
            if (empty($user_ids)) return [];

            global $wpdb;
            $ld_table   = $wpdb->prefix . 'learndash_user_activity';
            $meta_table = $wpdb->prefix . 'learndash_user_activity_meta';

            // 1. Fetch attempt rows for this quiz scoped to the group's members
            $user_placeholders = implode(',', array_fill(0, count($user_ids), '%d'));
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT activity_id, user_id, activity_started, activity_completed
                 FROM {$ld_table}
                 WHERE activity_type = 'quiz'
                   AND post_id = %d
                   AND user_id IN ({$user_placeholders})
                 ORDER BY activity_completed DESC",
                ...array_merge([$quiz_id], $user_ids)
            ), ARRAY_A);

            if (empty($rows)) return [];

            // 2. Batch-fetch all relevant meta for these activity IDs
            $activity_ids     = array_column($rows, 'activity_id');
            $id_placeholders  = implode(',', array_fill(0, count($activity_ids), '%d'));
            $meta_keys        = ['pass', 'percentage', 'points', 'total_points', 'statistic_ref_id'];
            $key_placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));

            $meta_rows = $wpdb->get_results($wpdb->prepare(
                "SELECT activity_id, activity_meta_key, activity_meta_value
                 FROM {$meta_table}
                 WHERE activity_id IN ({$id_placeholders})
                   AND activity_meta_key IN ({$key_placeholders})",
                ...array_merge($activity_ids, $meta_keys)
            ), ARRAY_A);

            $meta_map = [];
            foreach ($meta_rows as $meta) {
                $aid = intval($meta['activity_id']);
                $meta_map[$aid][$meta['activity_meta_key']] = $meta['activity_meta_value'];
            }

            // 3. Hydrate user info for every distinct user_id in the result set
            $unique_user_ids = array_unique(array_column($rows, 'user_id'));
            $user_data = [];
            foreach ($unique_user_ids as $uid) {
                $user = get_userdata(intval($uid));
                $user_data[intval($uid)] = [
                    'first_name'   => $user ? ($user->first_name ?: '') : '',
                    'last_name'    => $user ? ($user->last_name  ?: '') : '',
                    'email'        => $user ? $user->user_email         : '',
                    'display_name' => $user ? $user->display_name       : 'Unknown User',
                ];
            }

            // 4. Batch-resolve which attempts contain ungraded questions.
            // Build statistic_ref_id → activity_id, then a single JOIN tells us
            // which refs include any essay/assessment/unscored-free_answer row.
            $ref_to_activity = [];
            foreach ($meta_map as $aid => $m) {
                if (!empty($m['statistic_ref_id'])) {
                    $ref_to_activity[intval($m['statistic_ref_id'])] = $aid;
                }
            }

            $ungraded_activity_ids = [];
            if (!empty($ref_to_activity)) {
                $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
                $question_table = LDLMS_DB::get_table_name('quiz_question');

                if ($stat_table && $question_table) {
                    $ref_placeholders = implode(',', array_fill(0, count($ref_to_activity), '%d'));
                    $ungraded_refs    = $wpdb->get_col($wpdb->prepare(
                        "SELECT DISTINCT s.statistic_ref_id
                         FROM {$stat_table} s
                         INNER JOIN {$question_table} q ON q.id = s.question_id
                         WHERE s.statistic_ref_id IN ({$ref_placeholders})
                           AND (
                               q.answer_type = 'essay'
                               OR q.answer_type = 'assessment_answer'
                               OR (q.answer_type = 'free_answer' AND s.correct_count = 0 AND s.incorrect_count = 0)
                           )",
                        ...array_keys($ref_to_activity)
                    ));

                    foreach ($ungraded_refs as $ref_id) {
                        $aid = $ref_to_activity[intval($ref_id)] ?? null;
                        if ($aid) $ungraded_activity_ids[] = $aid;
                    }
                }
            }

            // 5. Stitch everything into the response shape
            $result = [];
            foreach ($rows as $row) {
                $aid         = intval($row['activity_id']);
                $uid         = intval($row['user_id']);
                $meta        = $meta_map[$aid] ?? [];
                $is_ungraded = in_array($aid, $ungraded_activity_ids, true);

                $result[] = [
                    'activity_id'   => $aid,
                    'user_id'       => $uid,
                    'first_name'    => $user_data[$uid]['first_name']   ?? '',
                    'last_name'     => $user_data[$uid]['last_name']    ?? '',
                    'email'         => $user_data[$uid]['email']        ?? '',
                    'display_name'  => $user_data[$uid]['display_name'] ?? 'Unknown User',
                    'started_gmt'   => $row['activity_started']
                        ? gmdate('Y-m-d\TH:i:s', intval($row['activity_started']))
                        : null,
                    'completed_gmt' => $row['activity_completed']
                        ? gmdate('Y-m-d\TH:i:s', intval($row['activity_completed']))
                        : null,
                    'percentage'    => isset($meta['percentage']) ? floatval($meta['percentage']) : null,
                    'points_scored' => isset($meta['points']) ? floatval($meta['points']) : null,
                    'points_total'  => isset($meta['total_points']) ? floatval($meta['total_points']) : null,
                    // Ungraded overrides pass so the UI shows "Ungraded" rather than a premature pass/fail
                    'pass'          => $is_ungraded ? null : (isset($meta['pass']) ? (bool)intval($meta['pass']) : null),
                ];
            }

            return $result;
        }

        /**
         * GET /groups/{group_id}/quiz-submission-stats?quiz_ids=1,2,3
         * Returns per-quiz aggregate stats for the group's members:
         *   - total_submissions    — total attempt rows
         *   - attempted_users      — distinct users who submitted at least once
         *   - ungraded_count       — distinct attempts containing ungraded questions
         *   - last_submission_gmt  — most-recent completion timestamp
         *
         * Result includes a zero-filled row for every requested quiz_id even
         * when no attempts exist. Empty-group requests get zero-filled rows
         * rather than an error response.
         */
        public function get_group_quiz_submission_stats($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) return new WP_Error('bad_request', 'Invalid group ID', ['status' => 400]);

            $quiz_ids_param = $request->get_param('quiz_ids');
            if (empty($quiz_ids_param)) {
                return new WP_Error('bad_request', 'quiz_ids parameter required', ['status' => 400]);
            }

            $quiz_ids = array_filter(array_map('intval', explode(',', $quiz_ids_param)));
            if (empty($quiz_ids)) {
                return new WP_Error('bad_request', 'No valid quiz IDs provided', ['status' => 400]);
            }

            // Empty group → zero-fill every requested quiz_id (cheaper than an error)
            $user_ids = learndash_get_groups_user_ids($group_id);
            if (empty($user_ids)) {
                $result = [];
                foreach ($quiz_ids as $qid) {
                    $result[] = [
                        'quiz_id'             => $qid,
                        'total_submissions'   => 0,
                        'ungraded_count'      => 0,
                        'last_submission_gmt' => null,
                    ];
                }
                return $result;
            }

            global $wpdb;
            $ld_table       = $wpdb->prefix . 'learndash_user_activity';
            $meta_table     = $wpdb->prefix . 'learndash_user_activity_meta';
            $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
            $question_table = LDLMS_DB::get_table_name('quiz_question');

            $user_placeholders = implode(',', array_fill(0, count($user_ids), '%d'));
            $quiz_placeholders = implode(',', array_fill(0, count($quiz_ids), '%d'));

            // ── Per-quiz aggregate: total submissions, distinct submitters, latest timestamp ──
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT post_id AS quiz_id,
                        COUNT(*) AS total_submissions,
                        COUNT(DISTINCT CASE WHEN activity_completed > 0 THEN user_id END) AS attempted_users,
                        MAX(activity_completed) AS last_submission_ts
                 FROM {$ld_table}
                 WHERE activity_type = 'quiz'
                   AND user_id IN ({$user_placeholders})
                   AND post_id IN ({$quiz_placeholders})
                 GROUP BY post_id",
                ...array_merge($user_ids, $quiz_ids)
            ), ARRAY_A);

            $stats_map = [];
            foreach ($rows as $row) {
                $stats_map[intval($row['quiz_id'])] = [
                    'total_submissions'   => intval($row['total_submissions']),
                    'attempted_users'     => intval($row['attempted_users']),
                    'ungraded_count'      => 0,
                    'last_submission_gmt' => $row['last_submission_ts']
                        ? gmdate('Y-m-d\TH:i:s', intval($row['last_submission_ts']))
                        : null,
                ];
            }

            // ── Per-quiz ungraded count ──
            // One JOIN across activity → meta(statistic_ref_id) → quiz_statistic → quiz_question
            // counts distinct attempts that contain at least one essay / assessment /
            // unscored free_answer question. Single query for all requested quizzes.
            if ($stat_table && $question_table) {
                $ungraded_rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT a.post_id AS quiz_id,
                            COUNT(DISTINCT a.activity_id) AS ungraded_count
                     FROM {$ld_table} a
                     INNER JOIN {$meta_table} m
                         ON m.activity_id = a.activity_id
                         AND m.activity_meta_key = 'statistic_ref_id'
                     INNER JOIN {$stat_table} s
                         ON s.statistic_ref_id = CAST(m.activity_meta_value AS UNSIGNED)
                     INNER JOIN {$question_table} q
                         ON q.id = s.question_id
                     WHERE a.activity_type = 'quiz'
                       AND a.user_id IN ({$user_placeholders})
                       AND a.post_id IN ({$quiz_placeholders})
                       AND (
                           q.answer_type = 'essay'
                           OR q.answer_type = 'assessment_answer'
                           OR (q.answer_type = 'free_answer' AND s.correct_count = 0 AND s.incorrect_count = 0)
                       )
                     GROUP BY a.post_id",
                    ...array_merge($user_ids, $quiz_ids)
                ), ARRAY_A);

                foreach ($ungraded_rows as $row) {
                    $qid = intval($row['quiz_id']);
                    if (isset($stats_map[$qid])) {
                        $stats_map[$qid]['ungraded_count'] = intval($row['ungraded_count']);
                    }
                }
            }

            // Zero-fill every requested quiz_id so the frontend always sees a row
            $result = [];
            foreach ($quiz_ids as $qid) {
                $result[] = [
                    'quiz_id'             => $qid,
                    'total_submissions'   => $stats_map[$qid]['total_submissions'] ?? 0,
                    'attempted_users'     => $stats_map[$qid]['attempted_users'] ?? 0,
                    'ungraded_count'      => $stats_map[$qid]['ungraded_count'] ?? 0,
                    'last_submission_gmt' => $stats_map[$qid]['last_submission_gmt'] ?? null,
                ];
            }

            return $result;
        }

        // ─── REST callbacks: Cluster D ──────────────────────────────────────

        /**
         * POST /groups/{group_id}/archive
         * Sets the group's post_status to 'draft' and stamps _bys_archived_date
         * (consumed by /me/archived-groups to sort by most-recently archived).
         */
        public function archive_group($request) {
            $group_id = intval($request->get_param('group_id'));

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new WP_Error('not_found', 'Group not found', ['status' => 404]);
            }

            $result = wp_update_post([
                'ID'          => $group_id,
                'post_status' => 'draft',
            ], true);

            if (is_wp_error($result)) return new WP_Error('server_error', $result->get_error_message(), ['status' => 500]);

            update_post_meta($group_id, '_bys_archived_date', time());

            return ['success' => true, 'group_id' => $group_id];
        }

        /**
         * POST /groups/{group_id}/unarchive
         * Restores the group's post_status to 'publish' and clears the
         * _bys_archived_date stamp.
         */
        public function unarchive_group($request) {
            $group_id = intval($request->get_param('group_id'));

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new WP_Error('not_found', 'Group not found', ['status' => 404]);
            }

            $result = wp_update_post([
                'ID'          => $group_id,
                'post_status' => 'publish',
            ], true);

            if (is_wp_error($result)) return new WP_Error('server_error', $result->get_error_message(), ['status' => 500]);

            delete_post_meta($group_id, '_bys_archived_date');

            return ['success' => true, 'group_id' => $group_id];
        }

        // ─── REST callbacks: Cluster E ──────────────────────────────────────

        /**
         * GET /groups/{group_id}/leaders
         * Returns all users marked as group leaders for this group, with their
         * basic profile fields and an avatar URL.
         *
         * Leaders are identified by the LD user meta key learndash_group_leaders_{group_id}.
         */
        public function get_group_leaders($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) return new WP_Error('bad_request', 'Invalid group ID', ['status' => 400]);

            $leaders = get_users([
                'meta_key'   => 'learndash_group_leaders_' . $group_id,
                'meta_value' => $group_id,
            ]);

            $result = [];
            foreach ($leaders as $leader) {
                $result[] = [
                    'id'           => $leader->ID,
                    'display_name' => $leader->display_name,
                    'first_name'   => get_user_meta($leader->ID, 'first_name', true),
                    'last_name'    => get_user_meta($leader->ID, 'last_name', true),
                    'email'        => $leader->user_email,
                    'avatar'       => get_avatar_url($leader->ID, ['size' => 64]),
                ];
            }

            return $result;
        }

        /**
         * DELETE /groups/{group_id}/leaders/{user_id}
         * Removes a user's group-leader access via the LD helper.
         *
         * Authorization runs in permission_callback (site admin OR org admin
         * of the org containing this group). Group leaders deliberately cannot
         * demote peers.
         */
        public function remove_group_leader($request) {
            $group_id  = intval($request['group_id']);
            $target_id = intval($request['user_id']);

            if (!$group_id || !$target_id) {
                return new WP_Error('bad_request', 'Invalid parameters', ['status' => 400]);
            }

            // Third arg ($remove_access) MUST be true to actually remove.
            // Pre-existing bug in the monolith passed false here, which made LD
            // run the add branch — a silent no-op when the user already had the meta.
            ld_update_leader_group_access($target_id, $group_id, true);

            return ['success' => true];
        }

        // ─── REST callbacks: Cluster F ──────────────────────────────────────

        /**
         * POST /groups/{group_id}/invite
         * Body: { email, role, invited_by_user_id }
         *
         * If a WP user already exists with this email → enroll them in the group
         * directly. Otherwise → insert a pending invite row and send the email.
         */
        public function invite_member($request) {
            $group_id   = intval($request['group_id']);
            $body       = json_decode($request->get_body(), true);
            $email      = sanitize_email($body['email'] ?? '');
            $role       = in_array($body['role'] ?? '', ['learner', 'leader'], true)
                            ? $body['role']
                            : 'learner';
            $invited_by = intval($body['invited_by_user_id'] ?? 0);

            if (!$group_id || !is_email($email)) {
                return new WP_Error('bad_request', 'Invalid group_id or email', ['status' => 400]);
            }

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new WP_Error('not_found', 'Group not found', ['status' => 404]);
            }

            // Case 1: user already exists → enroll directly
            $existing_user = get_user_by('email', $email);
            if ($existing_user) {
                BYS_Groups_Invites::add_to_group($existing_user->ID, $group_id, $role);
                return [
                    'status'  => 'enrolled',
                    'user_id' => $existing_user->ID,
                    'email'   => $email,
                ];
            }

            // Case 2: no account → check for duplicate pending invite
            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_INVITES_TABLE;

            $existing = $wpdb->get_var($wpdb->prepare(
                "SELECT id FROM {$table} WHERE group_id = %d AND email = %s AND status = 'pending'",
                $group_id, $email
            ));

            if ($existing) {
                return new WP_Error('duplicate_invite', 'A pending invite already exists for this email.', ['status' => 409]);
            }

            // Insert invite row
            $wpdb->insert($table, [
                'group_id'   => $group_id,
                'email'      => $email,
                'role'       => $role,
                'status'     => 'pending',
                'invited_by' => $invited_by,
                'invited_at' => current_time('mysql'),
            ], ['%d', '%s', '%s', '%s', '%d', '%s']);

            $invite_id = $wpdb->insert_id;

            // Non-fatal: log email failures but still report invite creation as success
            $mail_result = BYS_Groups_Invites::send_invite_email($email, $group_id, $invited_by);
            if (is_wp_error($mail_result)) {
                error_log('[bys-groups] Invite email failed for ' . $email . ': ' . $mail_result->get_error_message());
            }

            return new WP_REST_Response([
                'status'    => 'invited',
                'invite_id' => $invite_id,
                'email'     => $email,
            ], 201);
        }

        /**
         * POST /groups/{group_id}/invite-bulk
         * Body: { emails: [...], role: 'learner'|'leader', dry_run: bool }
         *
         * Per-email outcome:
         *   - enrolled[] → user already exists, added to group
         *   - invited[]  → no account, pending invite created + email sent
         *   - failed[]   → invalid format or duplicate pending invite
         *
         * When dry_run is true: no DB writes, no emails sent. Used by the
         * group-add-member-modal to show a preview before the user confirms.
         */
        public function bulk_user_addition($request) {
            $group_id   = intval($request['group_id']);
            $body       = json_decode($request->get_body(), true);
            $emails     = isset($body['emails']) && is_array($body['emails']) ? $body['emails'] : [];
            $role       = in_array($body['role'] ?? '', ['learner', 'leader'], true) ? $body['role'] : 'learner';
            $dry_run    = isset($body['dry_run']) ? (bool) $body['dry_run'] : false;
            $invited_by = get_current_user_id();

            if (!$group_id) return new WP_Error('bad_request', 'Invalid group_id', ['status' => 400]);
            if (empty($emails)) return new WP_Error('bad_request', 'No emails provided', ['status' => 400]);

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new WP_Error('not_found', 'Group not found', ['status' => 404]);
            }

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_INVITES_TABLE;

            $enrolled = [];
            $invited  = [];
            $failed   = [];

            // Sanitize and deduplicate
            $emails = array_unique(array_map('sanitize_email', $emails));

            foreach ($emails as $email) {
                if (!is_email($email)) {
                    $failed[] = ['email' => $email, 'reason' => 'Invalid email format'];
                    continue;
                }

                // Case 1: existing user → enroll
                $existing_user = get_user_by('email', $email);
                if ($existing_user) {
                    if (!$dry_run) {
                        BYS_Groups_Invites::add_to_group($existing_user->ID, $group_id, $role);
                    }
                    $enrolled[] = ['email' => $email, 'user_id' => $existing_user->ID];
                    continue;
                }

                // Case 2: no account → check for duplicate pending invite
                $existing = $wpdb->get_var($wpdb->prepare(
                    "SELECT id FROM {$table} WHERE group_id = %d AND email = %s AND status = 'pending'",
                    $group_id, $email
                ));

                if ($existing) {
                    $failed[] = ['email' => $email, 'reason' => 'Pending invite already exists'];
                    continue;
                }

                // Insert + send email (or skip for dry_run)
                if (!$dry_run) {
                    $wpdb->insert($table, [
                        'group_id'   => $group_id,
                        'email'      => $email,
                        'role'       => $role,
                        'status'     => 'pending',
                        'invited_by' => $invited_by,
                        'invited_at' => current_time('mysql'),
                    ], ['%d', '%s', '%s', '%s', '%d', '%s']);

                    $invite_id   = $wpdb->insert_id;
                    $mail_result = BYS_Groups_Invites::send_invite_email($email, $group_id, $invited_by);
                    if (is_wp_error($mail_result)) {
                        error_log('[bys-groups] Invite email failed for ' . $email . ': ' . $mail_result->get_error_message());
                    }
                } else {
                    $invite_id = 0; // dry_run placeholder
                }

                $invited[] = ['email' => $email, 'invite_id' => $invite_id];
            }

            return [
                'enrolled' => $enrolled,
                'invited'  => $invited,
                'failed'   => $failed,
            ];
        }

        /**
         * GET /groups/{group_id}/pending-invites
         * Returns all pending invite rows for the group, newest first.
         */
        public function get_pending_invites($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) return new WP_Error('bad_request', 'Invalid group_id', ['status' => 400]);

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_INVITES_TABLE;

            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT id, email, role, invited_at FROM {$table}
                 WHERE group_id = %d AND status = 'pending'
                 ORDER BY invited_at DESC",
                $group_id
            ), ARRAY_A);

            return $rows ?: [];
        }

        /**
         * POST /groups/{group_id}/invites/{invite_id}/cancel
         * Deletes the pending invite row. The DELETE WHERE clause includes both
         * group_id and invite_id so cross-group cancellation is impossible
         * even if the URL is tampered with.
         */
        public function cancel_invite($request) {
            $group_id  = intval($request['group_id']);
            $invite_id = intval($request['invite_id']);

            if (!$group_id || !$invite_id) {
                return new WP_Error('bad_request', 'Invalid IDs', ['status' => 400]);
            }

            global $wpdb;
            $table   = $wpdb->prefix . BYS_GROUPS_INVITES_TABLE;
            $deleted = $wpdb->delete(
                $table,
                ['id' => $invite_id, 'group_id' => $group_id],
                ['%d', '%d']
            );

            if (!$deleted) return new WP_Error('not_found', 'Invite not found', ['status' => 404]);

            return ['success' => true];
        }

        // ─── REST callbacks: Cluster G ──────────────────────────────────────

        /**
         * GET|POST /groups/{group_id}/quiz-access
         * GET: returns the group's quiz-access date map (quiz_id → {start, end}).
         * POST: persists start/end dates for one quiz on the group.
         * Storage is owned by BYS_Groups_Quiz_Access (separate class).
         */
        public function group_quiz_access($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) return new WP_Error('bad_request', 'Invalid group_id', ['status' => 400]);

            if ('GET' === $request->get_method()) {
                $access_dates = BYS_Groups_Quiz_Access::get_group_quiz_access_dates($group_id);
                return $access_dates;
            }

            if ('POST' === $request->get_method()) {
                $quiz_id = intval($request->get_json_params()['quiz_id'] ?? 0);
                if (!$quiz_id) return new WP_Error('bad_request', 'Invalid quiz_id', ['status' => 400]);

                $start = sanitize_text_field($request->get_json_params()['start'] ?? '');
                $end   = sanitize_text_field($request->get_json_params()['end']   ?? '');

                BYS_Groups_Quiz_Access::save_group_quiz_access_dates($group_id, $quiz_id, $start, $end);
                return ['success' => true];
            }

            return new WP_Error('method_not_allowed', 'Error executing this request.', ['status' => 405]);
        }

        /**
         * GET|POST /groups/{group_id}/users/{user_id}/quiz-access
         * Per-user override of the group-level quiz-access window. Same shape
         * as group_quiz_access but scoped to a specific user.
         */
        public function user_quiz_access($request) {
            $group_id = intval($request['group_id']);
            $user_id  = intval($request['user_id']);
            if (!$group_id || !$user_id) {
                return new WP_Error('bad_request', 'Invalid group_id or user_id', ['status' => 400]);
            }

            if ('GET' === $request->get_method()) {
                $access_dates = BYS_Groups_Quiz_Access::get_user_quiz_access_dates($user_id, $group_id);
                return $access_dates;
            }

            if ('POST' === $request->get_method()) {
                $quiz_id = intval($request->get_json_params()['quiz_id'] ?? 0);
                if (!$quiz_id) return new WP_Error('bad_request', 'Invalid quiz_id', ['status' => 400]);

                $start = sanitize_text_field($request->get_json_params()['start'] ?? '');
                $end   = sanitize_text_field($request->get_json_params()['end']   ?? '');

                BYS_Groups_Quiz_Access::save_user_quiz_access_dates($user_id, $group_id, $quiz_id, $start, $end);
                return ['success' => true];
            }

            return new WP_Error('method_not_allowed', 'Error executing this request.', ['status' => 405]);
        }

        /**
         * POST /groups/{group_id}/users/{user_id}/notify-quiz-access
         * Sends a one-off email to the target user notifying them of their
         * per-user quiz-access window. Direct Postmark send (not via the
         * group-comms mailer) so no DB log row is written.
         *
         * NOTE: the original implementation referenced an undefined $sender_id
         * variable (line 381 of class-rest-api.php) — `$sender = get_user_by('ID', $sender_id)`
         * would always resolve to false, leaving the email's sender_email field
         * falling back to admin_email. Preserved verbatim per the "don't fix
         * downstream during a port" rule; flagged for dev team review.
         */
        public function notify_user_quiz_access($request) {
            $group_id = intval($request['group_id']);
            $user_id  = intval($request['user_id']);
            if (!$group_id || !$user_id) {
                return new WP_Error('bad_request', 'Invalid group_id or user_id', ['status' => 400]);
            }

            $body    = $request->get_json_params();
            $quiz_id = intval($body['quiz_id'] ?? 0);
            if (!$quiz_id) return new WP_Error('bad_request', 'Missing quiz_id', ['status' => 400]);

            $recipient = get_user_by('ID', $user_id);
            if (!$recipient || empty($recipient->user_email)) {
                return new WP_Error('not_found', 'Recipient not found', ['status' => 404]);
            }

            $access_dates = BYS_Groups_Quiz_Access::get_user_quiz_access_dates($user_id, $group_id);
            $window = $access_dates[$quiz_id] ?? [];
            $start  = $window['start'] ?? '';
            $end    = $window['end']   ?? '';

            $postmark_token = get_option('bys_postmark_token', '');
            if (empty($postmark_token)) {
                return new WP_Error('server_error', 'Postmark token not configured', ['status' => 500]);
            }

            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/emails/user-quiz-config.php';

            // BUG: $sender_id is never defined; preserved verbatim from legacy code.
            $sender    = get_user_by('ID', $sender_id);
            $quiz_post = get_post($quiz_id);

            $email = bys_get_quiz_access_notification_email([
                'recipient_name' => !empty($recipient->display_name) ? $recipient->display_name : $recipient->user_login,
                'site_name'      => get_bloginfo('name'),
                'site_url'       => home_url(),
                'quiz_title'     => $quiz_post ? get_the_title($quiz_post) : 'your quiz',
                'quiz_url'       => $quiz_post ? get_permalink($quiz_post) : home_url(),
                'start'          => $start,
                'end'            => $end,
                'sender_email'   => $sender ? $sender->user_email : get_bloginfo('admin_email'),
            ]);

            if (empty($email['subject']) || empty($email['html'])) {
                return new WP_Error('server_error', 'Failed to build email', ['status' => 500]);
            }

            $response = wp_remote_post('https://api.postmarkapp.com/email', [
                'headers' => [
                    'X-Postmark-Server-Token' => $postmark_token,
                    'Content-Type'            => 'application/json',
                    'Accept'                  => 'application/json',
                ],
                'body' => wp_json_encode([
                    'From'     => get_bloginfo('admin_email'),
                    'To'       => $recipient->user_email,
                    'Subject'  => $email['subject'],
                    'HtmlBody' => $email['html'],
                    'TextBody' => $email['plain'],
                    'Tag'      => 'user-quiz-access',
                    'Metadata' => [
                        'group_id'       => (string) $group_id,
                        'user_id'        => (string) $user_id,
                        'quiz_id'        => (string) $quiz_id,
                        'sender_user_id' => (string) $sender_id,
                    ],
                ]),
                'timeout'   => 30,
                'sslverify' => true,
            ]);

            if (is_wp_error($response)) {
                error_log('[notify_user_quiz_access] Postmark transport error: ' . $response->get_error_message());
                return new WP_Error('postmark_transport', 'Postmark API error: ' . $response->get_error_message(), ['status' => 502]);
            }

            $status_code   = wp_remote_retrieve_response_code($response);
            $response_body = json_decode(wp_remote_retrieve_body($response), true);

            if ($status_code !== 200 || (isset($response_body['ErrorCode']) && (int) $response_body['ErrorCode'] !== 0)) {
                $msg = $response_body['Message'] ?? 'Unknown Postmark error';
                error_log(sprintf(
                    '[notify_user_quiz_access] Postmark rejected — status %d, ErrorCode: %s, Message: %s',
                    $status_code,
                    $response_body['ErrorCode'] ?? 'n/a',
                    $msg
                ));
                return new WP_Error('postmark_rejected', $msg, ['status' => 502]);
            }

            return [
                'success'    => true,
                'message_id' => $response_body['MessageID'] ?? null,
            ];
        }

        /**
         * POST /groups/{group_id}/send-communication
         * Body: { prompt_type, recipient_type, recipient_ids[], custom_subject,
         *         custom_message, scheduled_at, condition{} }
         *
         * Delegates to BYS_Groups_Mailer::send_group_communication which handles
         * leader-permission validation, Postmark batch dispatch, and log-table writes.
         */
        public function send_group_communication($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) return new WP_Error('bad_request', 'Invalid group ID', ['status' => 400]);

            if (!get_current_user_id()) {
                return new WP_Error('not_logged_in', 'Not logged in', ['status' => 401]);
            }

            // Parse body — try JSON first, fall back to individual params for malformed JSON
            $body = $request->get_json_params();
            if (empty($body) || !is_array($body)) {
                $body = [
                    'prompt_type'    => $request->get_param('prompt_type'),
                    'recipient_type' => $request->get_param('recipient_type'),
                    'recipient_ids'  => $request->get_param('recipient_ids'),
                    'custom_subject' => $request->get_param('custom_subject'),
                    'custom_message' => $request->get_param('custom_message'),
                    'scheduled_at'   => $request->get_param('scheduled_at'),
                    'condition'      => $request->get_param('condition'),
                ];
            }

            $prompt_type    = sanitize_text_field($body['prompt_type'] ?? '');
            $recipient_type = sanitize_text_field($body['recipient_type'] ?? '');
            $recipient_ids  = isset($body['recipient_ids']) && is_array($body['recipient_ids'])
                                ? array_map('intval', $body['recipient_ids'])
                                : [];
            $custom_subject = sanitize_text_field($body['custom_subject'] ?? '');
            $custom_message = wp_kses_post($body['custom_message'] ?? '');
            $scheduled_at   = sanitize_text_field($body['scheduled_at'] ?? '');

            $condition = [];
            if ($recipient_type === 'condition' && isset($body['condition']) && is_array($body['condition'])) {
                $condition = [
                    'type'      => sanitize_key($body['condition']['type'] ?? ''),
                    'days'      => intval($body['condition']['days'] ?? 0),
                    'course_id' => intval($body['condition']['course_id'] ?? 0),
                    'quiz_id'   => intval($body['condition']['quiz_id'] ?? 0),
                ];
            }

            if (!$prompt_type || !$recipient_type) {
                return new WP_Error('bad_request', 'Missing prompt_type or recipient_type', ['status' => 400]);
            }

            // Custom prompts must include both subject and message
            if ($prompt_type === 'custom' && (empty($custom_subject) || empty($custom_message))) {
                return new WP_Error('bad_request', 'Custom prompts require both subject and message', ['status' => 400]);
            }

            // Conditional sends must include resolved recipients + a condition type
            if ($recipient_type === 'condition') {
                if (empty($recipient_ids)) {
                    return new WP_Error('bad_request', 'Conditional send requires resolved recipients', ['status' => 400]);
                }
                if (empty($condition['type'])) {
                    return new WP_Error('bad_request', 'Conditional send requires a condition type', ['status' => 400]);
                }
            }

            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-mailer.php';
            $mailer = new BYS_Groups_Mailer();

            $result = $mailer->send_group_communication(
                $group_id,
                $prompt_type,
                $recipient_type,
                $recipient_ids,
                $custom_subject,
                $custom_message,
                $scheduled_at,
                $condition
            );

            if (!empty($result['success'])) {
                return $result;
            }
            return new WP_Error('bad_request', $result['error'] ?? 'Send failed', ['status' => 400]);
        }

        /**
         * GET /groups/{group_id}/template/{prompt_type}
         * Returns the rendered subject/html/plain body for a prompt template,
         * with the group's name + site context substituted in. Used by the
         * send-modal preview pane.
         */
        public function get_email_template($request) {
            $group_id    = intval($request['group_id']);
            $prompt_type = sanitize_text_field($request['prompt_type']);
            if (!$group_id || !$prompt_type) {
                return new WP_Error('bad_request', 'Missing group_id or prompt_type', ['status' => 400]);
            }

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new WP_Error('not_found', 'Invalid group ID', ['status' => 404]);
            }

            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/emails/group-comms.php';

            $email = bys_get_comm_email($prompt_type, [
                'group_name'   => $group->post_title,
                'site_name'    => get_bloginfo('name'),
                'site_url'     => home_url(),
                'sender_email' => get_bloginfo('admin_email'),
            ]);

            if (empty($email['subject']) || empty($email['html'])) {
                return new WP_Error('not_found', 'Template not found', ['status' => 404]);
            }

            return [
                'subject' => $email['subject'],
                'html'    => $email['html'],
                'plain'   => $email['plain'],
            ];
        }

        /**
         * GET /groups/{group_id}/communication-log
         *
         * Returns paginated batches of outbound emails for the group, fused
         * from three sources:
         *   1. Postmark Messages/Outbound API (live delivery state)
         *   2. bys_group_communication_log table (DB rows for all batch members)
         *   3. Scheduled-but-not-yet-sent rows (delivery_status='scheduled', message_id=NULL)
         *
         * Aggregation rules:
         *   - all recipients failed       → 'failed'
         *   - all recipients scheduled    → 'scheduled'
         *   - any recipients failed +     → 'partial_failure'
         *     others delivered/pending
         *   - otherwise use live Postmark MessageEvents (delivered/bounced/spam/pending)
         */
        public function get_group_communication_log($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) return new WP_Error('bad_request', 'Invalid group ID', ['status' => 400]);

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new WP_Error('not_found', 'Group not found', ['status' => 404]);
            }

            $token = get_option('bys_postmark_token', '');
            if (empty($token)) {
                return new WP_Error('server_error', 'Postmark token not configured', ['status' => 500]);
            }

            $count  = 25;
            $offset = max(0, intval($request->get_param('offset') ?: 0));

            // Fetch outbound page from Postmark
            $postmark_url = add_query_arg(
                ['count' => $count, 'offset' => $offset],
                'https://api.postmarkapp.com/messages/outbound'
            );
            $response = wp_remote_get($postmark_url, [
                'headers' => [
                    'X-Postmark-Server-Token' => $token,
                    'Accept'                  => 'application/json',
                ],
                'timeout'   => 15,
                'sslverify' => true,
            ]);

            if (is_wp_error($response)) {
                return new WP_Error('server_error', 'Postmark API error: ' . $response->get_error_message(), ['status' => 500]);
            }

            $status = wp_remote_retrieve_response_code($response);
            $body   = json_decode(wp_remote_retrieve_body($response), true);

            if ($status !== 200) {
                $pm_error = $body['Message'] ?? 'Unknown Postmark error';
                return new WP_Error('postmark_error', 'Postmark returned ' . $status . ': ' . $pm_error, ['status' => 502]);
            }

            // Filter to message IDs that belong to this group
            $postmark_ids = array_column($body['Messages'] ?? [], 'MessageID');
            if (empty($postmark_ids)) {
                return [
                    'total'    => 0,
                    'messages' => [],
                    'offset'   => $offset,
                    'count'    => $count,
                ];
            }

            global $wpdb;
            $placeholders = implode(',', array_fill(0, count($postmark_ids), '%s'));

            // Resolve which batches in our log table are represented in the Postmark page.
            // We pull batch_ids first so we can include sibling rows with NULL message_id
            // (rejected sends — they share a batch_id with successful peers) in the aggregation.
            $batch_id_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT DISTINCT batch_id FROM {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . "
                     WHERE message_id IN ($placeholders) AND group_id = %d",
                    array_merge($postmark_ids, [$group_id])
                ),
                ARRAY_A
            );
            $batch_ids_in_postmark = array_filter(array_column((array) $batch_id_rows, 'batch_id'));

            $log_rows = [];
            if (!empty($batch_ids_in_postmark)) {
                $batch_placeholders = implode(',', array_fill(0, count($batch_ids_in_postmark), '%s'));
                $log_rows = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT message_id, batch_id, prompt_type, subject, delivery_status, bounce_type, sender_user_id, scheduled_at
                         FROM {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . "
                         WHERE batch_id IN ($batch_placeholders) AND group_id = %d",
                        array_merge($batch_ids_in_postmark, [$group_id])
                    ),
                    ARRAY_A
                );
            }

            // Authoritative batch → recipient count (includes failed/scheduled rows
            // with NULL message_id that would otherwise be invisible)
            $recipient_counts = [];
            $count_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT batch_id, COUNT(*) AS cnt
                     FROM {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . "
                     WHERE group_id = %d
                     GROUP BY batch_id",
                    $group_id
                ),
                ARRAY_A
            );
            foreach ((array) $count_rows as $cr) {
                $recipient_counts[$cr['batch_id']] = (int) $cr['cnt'];
            }

            // Scheduled-but-not-yet-sent rows are tracked separately (they have no
            // Postmark MessageID yet, so they don't appear in the outbound list).
            $scheduled_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT batch_id, prompt_type, subject, delivery_status, sender_user_id, scheduled_at, created_at
                     FROM {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . "
                     WHERE group_id = %d
                       AND delivery_status = 'scheduled'
                       AND message_id IS NULL
                     ORDER BY scheduled_at DESC
                     LIMIT %d",
                    $group_id,
                    $count
                ),
                ARRAY_A
            );

            if (empty($log_rows) && empty($scheduled_rows)) {
                return [
                    'total'    => 0,
                    'messages' => [],
                    'offset'   => $offset,
                    'count'    => $count,
                ];
            }

            // Index Postmark messages by ID for quick lookup
            $postmark_msgs_by_id = [];
            foreach ((array) ($body['Messages'] ?? []) as $msg) {
                $mid = $msg['MessageID'] ?? '';
                if (!empty($mid)) $postmark_msgs_by_id[$mid] = $msg;
            }

            // Group sent rows by batch_id
            $batches_by_id = [];
            foreach ($log_rows as $row) {
                $batch_id = $row['batch_id'];
                if (!isset($batches_by_id[$batch_id])) {
                    $batches_by_id[$batch_id] = [
                        'batch_id'           => $batch_id,
                        'message_ids'        => [],
                        'prompt_type'        => $row['prompt_type'],
                        'subject'            => $row['subject'],
                        'delivery_statuses'  => [],
                        'first_message_id'   => $row['message_id'],
                        'first_postmark_msg' => null,
                        'sender_user_id'     => $row['sender_user_id'],
                        'scheduled_at'       => $row['scheduled_at'],
                    ];
                }
                $batches_by_id[$batch_id]['message_ids'][]       = $row['message_id'];
                $batches_by_id[$batch_id]['delivery_statuses'][] = $row['delivery_status'] ?? 'pending';

                // Cache the first Postmark message for subject/sent_at extraction below
                if ($batches_by_id[$batch_id]['first_postmark_msg'] === null
                    && isset($postmark_msgs_by_id[$row['message_id']])) {
                    $batches_by_id[$batch_id]['first_postmark_msg'] = $postmark_msgs_by_id[$row['message_id']];
                }
            }

            // Fold in scheduled-only batches
            foreach ($scheduled_rows as $row) {
                $batch_id = $row['batch_id'];
                if (!isset($batches_by_id[$batch_id])) {
                    $batches_by_id[$batch_id] = [
                        'batch_id'           => $batch_id,
                        'message_ids'        => [],
                        'prompt_type'        => $row['prompt_type'],
                        'subject'            => $row['subject'],
                        'delivery_statuses'  => ['scheduled'],
                        'first_message_id'   => null,
                        'first_postmark_msg' => null,
                        'sender_user_id'     => $row['sender_user_id'],
                        'scheduled_at'       => $row['scheduled_at'],
                    ];
                }
            }

            $postmark_token_for_detail = get_option('bys_postmark_token', '');

            // Per-batch: resolve final delivery_status, subject, sent_at
            $messages = [];
            foreach ($batches_by_id as $batch_id => $batch) {
                $prompt_type      = $batch['prompt_type'];
                $postmark_msg     = $batch['first_postmark_msg'] ?? [];
                $subject          = !empty($batch['subject']) ? $batch['subject'] : ($postmark_msg['Subject'] ?? '(No subject)');
                $sent_at          = $postmark_msg['ReceivedAt'] ?? '';
                $first_message_id = $batch['first_message_id'];

                $delivery_status = 'pending';
                $postmark_detail = null;

                $has_failed       = in_array('failed', $batch['delivery_statuses'], true);
                $non_failed_count = count(array_filter($batch['delivery_statuses'], fn($s) => $s !== 'failed'));

                if ($has_failed && $non_failed_count === 0) {
                    // Every recipient failed at submit time (no Postmark delivery to fetch)
                    $delivery_status = 'failed';
                } elseif (count($batch['delivery_statuses']) > 0
                    && count($batch['delivery_statuses']) === count(array_filter($batch['delivery_statuses'], fn($s) => $s === 'scheduled'))) {
                    $delivery_status = 'scheduled';
                } elseif (!empty($postmark_token_for_detail) && !empty($first_message_id)) {
                    // Live status from Postmark MessageEvents
                    $postmark_detail = BYS_Groups_Postmark::fetch_message_detail($first_message_id, $postmark_token_for_detail);
                    if ($postmark_detail && isset($postmark_detail['MessageEvents'])) {
                        $status_info     = BYS_Groups_Postmark::extract_delivery_status_from_events($postmark_detail['MessageEvents']);
                        $delivery_status = $status_info['status'];
                    } elseif (!empty($batch['delivery_statuses'])) {
                        // Fallback to DB aggregate when the live fetch failed
                        if (in_array('bounced', $batch['delivery_statuses'])) {
                            $delivery_status = 'bounced';
                        } elseif (in_array('spam', $batch['delivery_statuses'])) {
                            $delivery_status = 'spam';
                        } elseif (in_array('scheduled', $batch['delivery_statuses'])) {
                            $delivery_status = 'pending';
                        } elseif (!in_array('pending', $batch['delivery_statuses'])) {
                            $delivery_status = 'delivered';
                        }
                    }
                }

                // Partial-failure overlay: some recipients failed at submit but others were accepted
                if ($has_failed && $non_failed_count > 0 && $delivery_status !== 'scheduled') {
                    $delivery_status = 'partial_failure';
                }

                // Late-bind subject + sent_at from the detail fetch if still missing
                if ($subject === '(No subject)' && !empty($postmark_detail['Subject'])) {
                    $subject = $postmark_detail['Subject'];
                }
                if (empty($sent_at) && !empty($postmark_detail['ReceivedAt'])) {
                    $sent_at = $postmark_detail['ReceivedAt'];
                }

                // Scheduled emails use scheduled_at (converted to local time); everything else uses sent_at
                $display_time = $delivery_status === 'scheduled'
                    ? $this->utc_to_local_datetime($batch['scheduled_at'])
                    : $sent_at;

                $messages[] = [
                    'batch_id'        => $batch_id,
                    'message_id'      => $first_message_id,
                    'subject'         => $subject,
                    'sent_at'         => $display_time,
                    'prompt_type'     => $prompt_type,
                    'badge_type'      => $prompt_type === 'custom' ? 'custom' : 'prompt',
                    'recipient_count' => $recipient_counts[$batch_id] ?? count($batch['message_ids']),
                    'delivery_status' => $delivery_status,
                    'sender_user_id'  => $batch['sender_user_id'],
                ];
            }

            return [
                'total'    => count($messages),
                'messages' => $messages,
                'offset'   => $offset,
                'count'    => $count,
            ];
        }

        // ─── Private helpers ────────────────────────────────────────────────

        /**
         * Determine a user's online status.
         *   'online'  — at least one active (non-expired) WordPress session
         *   'offline' — no active session but has a recorded login timestamp
         *   'never'   — no active session and no recorded login timestamp
         */
        private function get_user_online_status($user_id) {
            $sessions = WP_Session_Tokens::get_instance($user_id)->get_all();
            $now      = time();
            foreach ($sessions as $session) {
                if (!empty($session['expiration']) && $session['expiration'] > $now) {
                    return 'online';
                }
            }

            $meta_values = [
                intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                intval(get_user_meta($user_id, 'learndash-last-login',          true) ?: 0),
            ];
            return max($meta_values) > 0 ? 'offline' : 'never';
        }

        /**
         * Fetch the group's courses from LD with minimal fields (id, title).
         * Returns an array of [id, title] pairs, or null on any error.
         *
         * Internal-only — different shape than the public get_group_courses()
         * which adds shortname and wraps in the standard response envelope.
         */
        /**
         * Return a per-course map of quiz step data for both dashboard surfaces:
         *   - grading[]:   int[]                          (show_test_grading_config=1)
         *   - reporting[]: [{step_id, step_title}, ...]   (show_in_reporting=1)
         *
         * One batched SQL query LEFT JOINs both meta keys and filters to quizzes
         * that match at least one. The PHP loop then sorts each row into the
         * appropriate slot per course. Used by /base-group-data and
         * /groups/{id}/courses so neither block needs follow-up /quiz-steps calls.
         */
        private function fetch_quiz_meta_by_course(array $course_ids) {
            if (empty($course_ids)) return [];

            global $wpdb;
            $placeholders = implode(',', array_fill(0, count($course_ids), '%d'));
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT
                    p.ID            AS quiz_id,
                    p.post_title    AS quiz_title,
                    pm_course.meta_value   AS course_id,
                    pm_grading.meta_value  AS is_grading,
                    pm_reporting.meta_value AS is_reporting
                 FROM {$wpdb->posts} p
                 JOIN {$wpdb->postmeta} pm_course ON p.ID = pm_course.post_id
                      AND pm_course.meta_key = 'course_id'
                 LEFT JOIN {$wpdb->postmeta} pm_grading ON p.ID = pm_grading.post_id
                      AND pm_grading.meta_key = 'show_test_grading_config'
                 LEFT JOIN {$wpdb->postmeta} pm_reporting ON p.ID = pm_reporting.post_id
                      AND pm_reporting.meta_key = 'show_in_reporting'
                 WHERE p.post_type = 'sfwd-quiz'
                   AND p.post_status = 'publish'
                   AND pm_course.meta_value IN ($placeholders)
                   AND (pm_grading.meta_value = '1' OR pm_reporting.meta_value = '1')
                 ORDER BY p.menu_order ASC, p.ID ASC",
                ...array_map('intval', $course_ids)
            ));

            $out = [];
            foreach ($rows ?: [] as $row) {
                $cid = intval($row->course_id);
                if (!isset($out[$cid])) $out[$cid] = ['grading' => [], 'reporting' => []];

                if ($row->is_grading === '1') {
                    $out[$cid]['grading'][] = intval($row->quiz_id);
                }
                if ($row->is_reporting === '1') {
                    $out[$cid]['reporting'][] = [
                        'step_id'    => intval($row->quiz_id),
                        'step_title' => $row->quiz_title,
                    ];
                }
            }
            return $out;
        }

        private function fetch_group_courses_minimal($group_id, $auth_header) {
            $url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/courses?_fields=id,title";

            $response = wp_remote_get($url, [
                'headers'   => ['Authorization' => $auth_header],
                'timeout'   => 30,
                'sslverify' => false,
            ]);

            if (is_wp_error($response)) return null;
            if (wp_remote_retrieve_response_code($response) !== 200) return null;

            $courses = json_decode(wp_remote_retrieve_body($response), true);
            if (!is_array($courses)) return [];

            $result = [];
            foreach ($courses as $course) {
                if (!isset($course['id'])) continue;
                $title = $course['title'];
                if (is_array($title) && isset($title['rendered'])) {
                    $title = $title['rendered'];
                }
                $result[] = [
                    'id'    => intval($course['id']),
                    'title' => $title,
                ];
            }

            return $result;
        }

        /**
         * Convert a UTC datetime string to the site's local time for display.
         * Returns '' if the input is empty or unparseable.
         */
        private function utc_to_local_datetime($utc_datetime) {
            if (empty($utc_datetime)) return '';
            $timestamp = strtotime($utc_datetime);
            if (!$timestamp) return '';
            return wp_date('Y-m-d H:i:s', $timestamp);
        }
    }
}
