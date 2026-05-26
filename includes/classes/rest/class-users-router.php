<?php
/**
 * Users Router
 *
 * Subject-referential endpoints scoped to a specific user ID:
 *   GET  /users/{id}/courses                          — enrolled course list
 *   GET  /users/{id}/course-progress                  — per-course progress for selected course IDs
 *   GET  /users/{id}/course-progress-steps/{course_id}— per-step progress within a course
 *   GET  /users/{id}/quiz-progress                    — quiz-progress summary across all courses
 *   GET  /users/{id}/quiz-attempts/{quiz_id}          — detailed attempts for one quiz
 *   GET  /users/{id}/activity                         — merged activity feed (custom DB + GamiPress + GF + LD)
 *   POST /users/{id}/activity/view-certificate        — log a certificate view event
 *
 * Authorization: every endpoint requires the actor to either BE the target user,
 * be a site admin, or share a group with the target (as a group leader or as an
 * admin of an organization containing one of the target's groups). Enforced by
 * BYS_Groups_Permissions::can_access_user() via the shared permission_callback.
 *
 * @package BYS_Groups
 * @since 1.1.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Users_Router')) {
    class BYS_Groups_Users_Router {

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
        }

        public function register_routes() {
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/users/(?P<user_id>\d+)/courses', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_user_courses'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_user($request['user_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/users/(?P<user_id>\d+)/course-progress', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_user_course_progress'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_user($request['user_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/users/(?P<user_id>\d+)/course-progress-steps/(?P<course_id>\d+)', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_user_course_steps_progress'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_user($request['user_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/users/(?P<user_id>\d+)/quiz-progress', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_user_quiz_progress_summary'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_user($request['user_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/users/(?P<user_id>\d+)/quiz-attempts/(?P<quiz_id>\d+)', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_user_quiz_attempts'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_user($request['user_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/users/(?P<user_id>\d+)/activity', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_user_activity'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_user($request['user_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/users/(?P<user_id>\d+)/activity/view-certificate', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'log_certificate_view'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::can_access_user($request['user_id']),
            ]);
        }

        // ─── REST callbacks ─────────────────────────────────────────────────

        /**
         * GET /users/{user_id}/courses
         * Returns every published course the user is enrolled in (site-wide).
         *
         * Optional query param ?include=progress bundles per-course progress
         * (status, steps_completed, steps_total, enrolled_at, date_completed,
         * date_completed_gmt) into each course object — same shape as the
         * standalone /users/{user_id}/course-progress endpoint. Consolidates
         * what was previously 1 + N round trips (list + per-course progress)
         * into a single request.
         */
        public function get_user_courses($request) {
            $user_id = intval($request['user_id']);
            if (!$user_id) return new WP_Error('bad_request', 'Invalid user ID', ['status' => 400]);

            $course_ids = learndash_user_get_enrolled_courses($user_id);
            $courses = [];
            foreach ($course_ids as $course_id) {
                $post = get_post($course_id);
                if (!$post || $post->post_status !== 'publish') continue;
                $shortname = get_post_meta($course_id, 'shortname', true);
                $courses[] = [
                    'id'        => $course_id,
                    'title'     => $post->post_title,
                    'shortname' => $shortname ?: null,
                ];
            }

            // Optional: bundle progress data into each course when ?include=progress
            if ($request->get_param('include') === 'progress' && !empty($courses)) {
                $progress_by_course = $this->compute_user_course_progress(
                    $user_id,
                    array_column($courses, 'id')
                );
                foreach ($courses as &$course) {
                    $course['progress'] = $progress_by_course[$course['id']] ?? null;
                }
                unset($course);
            }

            return $courses;
        }

        /**
         * GET /users/{user_id}/course-progress?course_ids=1,2,3
         * Returns per-course progress data for each requested course as a flat array.
         */
        public function get_user_course_progress($request) {
            $user_id          = intval($request['user_id']);
            $course_ids_param = $request->get_param('course_ids');

            if (!$user_id || !$course_ids_param) {
                return new WP_Error('bad_request', 'Invalid user ID or course_ids', ['status' => 400]);
            }

            $course_ids = array_filter(array_map('intval', explode(',', $course_ids_param)));
            if (empty($course_ids)) return [];

            $progress_by_course = $this->compute_user_course_progress($user_id, $course_ids);

            // Flat-array shape preserved for back-compat. Each row includes course_id.
            $result = [];
            foreach ($course_ids as $course_id) {
                $row = $progress_by_course[$course_id];
                $row['course_id'] = $course_id;
                $result[] = $row;
            }
            return $result;
        }

        /**
         * Compute per-course progress for a user across the given course IDs.
         * Returns a course_id => progress map. Shared by get_user_courses
         * (when ?include=progress) and get_user_course_progress.
         *
         * Progress fields: progress_status, steps_completed, steps_total,
         * enrolled_at, date_completed, date_completed_gmt.
         */
        private function compute_user_course_progress($user_id, array $course_ids) {
            if (empty($course_ids)) return [];

            // Course-level progress from user meta (single read)
            $progress_data = get_user_meta($user_id, '_sfwd-course_progress', true);
            $progress_map  = [];
            if (!empty($progress_data) && is_array($progress_data)) {
                foreach ($progress_data as $cid => $cp) {
                    if (is_array($cp) && isset($cp['status'])) {
                        $progress_map[intval($cid)] = [
                            'status'    => $cp['status'],
                            'completed' => intval($cp['completed'] ?? 0),
                            'total'     => intval($cp['total'] ?? 0),
                        ];
                    }
                }
            }

            // Batch-fetch start + completion timestamps from LD activity table.
            // No activity_status filter so we get in-progress rows too — that
            // row's activity_started is the canonical "date_started" timestamp
            // LD's own REST API exposes, and is the right source for enrolled_at
            // for group-enrolled users (the learndash_course_{id}_enrolled_at
            // user meta is only set for direct enrolment).
            global $wpdb;
            $activity_map = [];
            $placeholders = implode(',', array_fill(0, count($course_ids), '%d'));
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT course_id, activity_started, activity_completed
                 FROM {$wpdb->prefix}learndash_user_activity
                 WHERE user_id = %d AND course_id IN ($placeholders) AND activity_type = 'course'",
                ...array_merge([$user_id], $course_ids)
            ));
            foreach ($rows ?: [] as $row) {
                $activity_map[intval($row->course_id)] = [
                    'started'   => intval($row->activity_started),
                    'completed' => intval($row->activity_completed),
                ];
            }

            $out = [];
            foreach ($course_ids as $course_id) {
                $cp = $progress_map[$course_id] ?? ['status' => 'not_started', 'completed' => 0, 'total' => 0];

                // Canonical step total comes from the course's live step structure,
                // not the user's cached snapshot (which goes stale when course
                // content changes). Matches what LD's REST API returns.
                $steps_total = function_exists('learndash_get_course_steps_count')
                    ? intval(learndash_get_course_steps_count($course_id))
                    : $cp['total'];

                $activity = $activity_map[$course_id] ?? null;
                $started_ts   = $activity['started']   ?? 0;
                $completed_ts = $activity['completed'] ?? 0;

                // Prefer activity_started for enrolled_at; fall back to the
                // user-meta enrolment timestamp (set on direct enrolment only).
                if (!$started_ts) {
                    $started_ts = intval(get_user_meta($user_id, "learndash_course_{$course_id}_enrolled_at", true) ?: 0);
                }

                $enrolled_at        = $started_ts   > 0 ? wp_date('c', $started_ts)              : null;
                $date_completed     = $completed_ts > 0 ? wp_date('c', $completed_ts)            : null;
                $date_completed_gmt = $completed_ts > 0 ? gmdate('Y-m-d H:i:s', $completed_ts)   : null;

                $out[$course_id] = [
                    'progress_status'    => $cp['status'],
                    'steps_completed'    => $cp['completed'],
                    'steps_total'        => $steps_total,
                    'enrolled_at'        => $enrolled_at,
                    'date_completed'     => $date_completed,
                    'date_completed_gmt' => $date_completed_gmt,
                ];
            }

            return $out;
        }

        /**
         * GET /users/{user_id}/course-progress-steps/{course_id}
         * Returns every step (lesson/topic/quiz) for the user in the course,
         * with completion status, last_accessed_gmt, time_spent_seconds, and
         * custom visit counts (bys_topic_visits_*).
         *
         * Fetches paginated step data from the LD REST API, then enriches via
         * three batch $wpdb queries (no N+1).
         */
        public function get_user_course_steps_progress($request) {
            $user_id   = intval($request['user_id']);
            $course_id = intval($request['course_id']);
            if (!$user_id || !$course_id) {
                return new WP_Error('bad_request', 'Invalid user_id or course_id', ['status' => 400]);
            }

            $auth_header = BYS_Groups_Auth::get_auth_header();
            if (!$auth_header) return new WP_Error('server_error', 'API credentials not configured', ['status' => 500]);

            // Fetch all paginated steps from LD API
            $all_steps = [];
            $page      = 1;
            $per_page  = 100;
            while (true) {
                $url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/course-progress/{$course_id}/steps?per_page={$per_page}&page={$page}";
                $response = wp_remote_get($url, [
                    'headers'   => ['Authorization' => $auth_header],
                    'timeout'   => 30,
                    'sslverify' => false,
                ]);

                if (is_wp_error($response)) {
                    return new WP_Error('server_error', $response->get_error_message(), ['status' => 500]);
                }
                $status = wp_remote_retrieve_response_code($response);
                if ($status !== 200) {
                    return new WP_Error('ld_api_failure', 'Failed to fetch course steps progress from LearnDash API', ['status' => $status]);
                }

                $data = json_decode(wp_remote_retrieve_body($response), true);
                if (!is_array($data) || empty($data)) break;

                $all_steps = array_merge($all_steps, $data);
                if (count($data) < $per_page) break;
                $page++;
            }

            // Enrich steps via batch DB queries
            if (!empty($all_steps)) {
                global $wpdb;
                $ld_table   = $wpdb->prefix . 'learndash_user_activity';
                $meta_table = $wpdb->prefix . 'learndash_user_activity_meta';

                // 1. Activity rows for topics/lessons in this user+course
                $activity_rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT post_id, activity_id, activity_started, activity_completed, activity_updated
                     FROM {$ld_table}
                     WHERE user_id = %d AND course_id = %d AND activity_type IN ('topic','lesson')
                     ORDER BY activity_updated DESC",
                    $user_id, $course_id
                ), ARRAY_A);

                // Keep most-recent row per step
                $activity_map = [];
                foreach ($activity_rows as $row) {
                    $pid = intval($row['post_id']);
                    if (!isset($activity_map[$pid])) $activity_map[$pid] = $row;
                }

                // 2. Timespent + count meta (Uncanny Owl xAPI)
                $meta_map     = [];
                $activity_ids = array_column($activity_rows, 'activity_id');
                if (!empty($activity_ids)) {
                    $placeholders = implode(',', array_fill(0, count($activity_ids), '%d'));
                    $meta_rows = $wpdb->get_results($wpdb->prepare(
                        "SELECT activity_id, meta_key, meta_value
                         FROM {$meta_table}
                         WHERE activity_id IN ({$placeholders}) AND meta_key IN ('timespent','count')",
                        ...$activity_ids
                    ), ARRAY_A);
                    foreach ($meta_rows as $m) {
                        $meta_map[intval($m['activity_id'])][$m['meta_key']] = $m['meta_value'];
                    }
                }

                // 3. Custom visit counts (bys_topic_visits_{post_id})
                $step_ids  = array_keys($activity_map);
                $visit_map = [];
                if (!empty($step_ids)) {
                    $key_placeholders = implode(',', array_fill(0, count($step_ids), '%s'));
                    $meta_keys_needed = array_map(fn($id) => 'bys_topic_visits_' . $id, $step_ids);
                    $visit_rows = $wpdb->get_results($wpdb->prepare(
                        "SELECT meta_key, meta_value FROM {$wpdb->usermeta}
                         WHERE user_id = %d AND meta_key IN ({$key_placeholders})",
                        $user_id, ...$meta_keys_needed
                    ), ARRAY_A);
                    foreach ($visit_rows as $vr) {
                        $pid_from_key = intval(str_replace('bys_topic_visits_', '', $vr['meta_key']));
                        $visit_map[$pid_from_key] = intval($vr['meta_value']);
                    }
                }

                foreach ($all_steps as &$step) {
                    $pid = intval($step['step']);
                    if (!isset($activity_map[$pid])) continue;

                    $act  = $activity_map[$pid];
                    $meta = $meta_map[intval($act['activity_id'])] ?? [];

                    if (!empty($act['activity_updated'])) {
                        $step['last_accessed_gmt'] = gmdate('Y-m-d\TH:i:s', intval($act['activity_updated']));
                    }

                    // time_spent_seconds — prefer Uncanny Owl meta, fall back to (completed - started)
                    if (isset($meta['timespent']) && intval($meta['timespent']) > 0) {
                        $step['time_spent_seconds'] = intval($meta['timespent']);
                    } elseif (!empty($act['activity_completed']) && !empty($act['activity_started'])) {
                        $diff = intval($act['activity_completed']) - intval($act['activity_started']);
                        if ($diff > 0) $step['time_spent_seconds'] = $diff;
                    }

                    if (isset($visit_map[$pid]) && $visit_map[$pid] > 0) {
                        $step['visits'] = $visit_map[$pid];
                    }
                }
                unset($step);
            }

            return $all_steps;
        }

        /**
         * GET /users/{user_id}/quiz-progress
         * Returns a summary row per quiz the user has attempted, with highest/latest
         * scores. Queries LD activity table for quiz IDs, then LD REST for per-quiz
         * attempt detail.
         */
        public function get_user_quiz_progress_summary($request) {
            $user_id = intval($request['user_id']);
            if (!$user_id) return new WP_Error('bad_request', 'user_id parameter required', ['status' => 400]);

            $auth_header = BYS_Groups_Auth::get_auth_header();
            if (!$auth_header) return new WP_Error('server_error', 'API credentials not configured', ['status' => 500]);

            global $wpdb;
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT DISTINCT post_id AS quiz_id, course_id
                 FROM {$wpdb->prefix}learndash_user_activity
                 WHERE user_id = %d AND activity_type = 'quiz'",
                $user_id
            ), ARRAY_A);

            if (empty($rows)) return [];

            // Build quiz_id → course_id map (first-seen course per quiz)
            $quiz_course_map = [];
            foreach ($rows as $row) {
                $quiz_id   = intval($row['quiz_id']);
                $course_id = intval($row['course_id']);
                if ($quiz_id > 0 && !isset($quiz_course_map[$quiz_id])) {
                    $quiz_course_map[$quiz_id] = $course_id;
                }
            }

            $result = [];
            foreach ($quiz_course_map as $quiz_id => $course_id) {
                $url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/quiz-progress?quiz={$quiz_id}";
                $response = wp_remote_get($url, [
                    'headers'   => ['Authorization' => $auth_header],
                    'timeout'   => 60,
                    'sslverify' => false,
                ]);

                if (is_wp_error($response)) {
                    error_log('[BYS Groups] Quiz progress fetch failed for quiz ' . $quiz_id . ': ' . $response->get_error_message());
                    continue;
                }
                $status = wp_remote_retrieve_response_code($response);
                if ($status !== 200) {
                    error_log('[BYS Groups] Quiz progress API returned status ' . $status . ' for quiz ' . $quiz_id);
                    continue;
                }

                $attempts = json_decode(wp_remote_retrieve_body($response), true);
                if (!is_array($attempts) || empty($attempts)) continue;

                $quiz         = get_post($quiz_id);
                $title        = $quiz ? $quiz->post_title : 'Quiz #' . $quiz_id;
                $course_post  = $course_id ? get_post($course_id) : null;
                $course_title = $course_post ? $course_post->post_title : ($course_id ? 'Course #' . $course_id : '');

                // Sort attempts descending by completion time
                usort($attempts, function ($a, $b) {
                    return strtotime($b['completed'] ?? 0) - strtotime($a['completed'] ?? 0);
                });

                $latest_attempt  = $attempts[0];
                $highest_attempt = $attempts[0];
                foreach ($attempts as $attempt) {
                    if (floatval($attempt['percentage'] ?? 0) > floatval($highest_attempt['percentage'] ?? 0)) {
                        $highest_attempt = $attempt;
                    }
                }

                $result[] = [
                    'id'                    => $quiz_id,
                    'quiz_id'               => $quiz_id,
                    'title'                 => $title,
                    'parent_course_id'      => $course_id,
                    'parent_course_title'   => $course_title,
                    'total_attempts'        => count($attempts),
                    'percent_highest'       => floatval($highest_attempt['percentage'] ?? 0),
                    'percent_latest'        => floatval($latest_attempt['percentage'] ?? 0),
                    'points_scored_highest' => floatval($highest_attempt['points_scored'] ?? 0),
                    'points_total_highest'  => floatval($highest_attempt['points_total'] ?? 0),
                    'points_scored_latest'  => floatval($latest_attempt['points_scored'] ?? 0),
                    'points_total_latest'   => floatval($latest_attempt['points_total'] ?? 0),
                    'pass_highest'          => (bool)($highest_attempt['pass'] ?? false),
                    'pass_latest'           => (bool)($latest_attempt['pass'] ?? false),
                    'latest_timestamp'      => $latest_attempt['completed'] ?? null,
                ];
            }

            usort($result, function ($a, $b) {
                return strtotime($b['latest_timestamp'] ?? 0) - strtotime($a['latest_timestamp'] ?? 0);
            });

            return $result;
        }

        /**
         * GET /users/{user_id}/quiz-attempts/{quiz_id}
         * Returns the full list of attempts for one quiz, normalized and sorted
         * by completion time descending.
         */
        public function get_user_quiz_attempts($request) {
            $user_id = intval($request['user_id']);
            $quiz_id = intval($request['quiz_id']);
            if (!$user_id || !$quiz_id) {
                return new WP_Error('bad_request', 'user_id and quiz_id parameters required', ['status' => 400]);
            }

            $auth_header = BYS_Groups_Auth::get_auth_header();
            if (!$auth_header) return new WP_Error('server_error', 'API credentials not configured', ['status' => 500]);

            $url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/quiz-progress?quiz={$quiz_id}";
            $response = wp_remote_get($url, [
                'headers'   => ['Authorization' => $auth_header],
                'timeout'   => 60,
                'sslverify' => false,
            ]);

            if (is_wp_error($response)) return new WP_Error('server_error', $response->get_error_message(), ['status' => 500]);

            $status = wp_remote_retrieve_response_code($response);
            if ($status !== 200) {
                return new WP_Error('ld_api_failure', 'Failed to fetch quiz attempts from LearnDash API', ['status' => $status]);
            }

            $attempts = json_decode(wp_remote_retrieve_body($response), true);
            if (!is_array($attempts)) $attempts = [];

            $normalized = [];
            foreach ($attempts as $attempt) {
                $normalized[] = [
                    'id'            => $attempt['id'] ?? null,
                    'completed'     => $attempt['completed'] ?? null,
                    'percentage'    => floatval($attempt['percentage'] ?? 0),
                    'pass'          => (bool)($attempt['pass'] ?? false),
                    'points_scored' => floatval($attempt['points_scored'] ?? 0),
                    'points_total'  => floatval($attempt['points_total'] ?? 0),
                ];
            }

            usort($normalized, function ($a, $b) {
                return strtotime($b['completed'] ?? 0) - strtotime($a['completed'] ?? 0);
            });

            return $normalized;
        }

        /**
         * GET /users/{user_id}/activity
         *
         * Returns a merged, paginated activity feed combining four sources:
         *   - Custom bys_user_activity table (course_enrolled, certificate_viewed, etc.)
         *   - GamiPress earnings (achievement_earned)
         *   - Gravity Forms submissions (profile_update, account_settings_update)
         *   - LearnDash activity table (lesson/topic/quiz completion)
         *
         * Supports filters: activity[], object_type[], date_from, date_to, per_page, page.
         * If ?course_id is set, short-circuits to get_user_course_last_activity().
         */
        public function get_user_activity($request) {
            $user_id = intval($request['user_id']);
            if (!$user_id) return new WP_Error('bad_request', 'Invalid user ID', ['status' => 400]);

            // ?course_id present → return only the last-activity timestamp for that course
            $course_id = intval($request->get_param('course_id') ?? 0);
            if ($course_id) {
                return $this->get_user_course_last_activity($user_id, $course_id);
            }

            // Normalize filter params to arrays
            $activity_filters = $this->normalize_array_param($request->get_param('activity'));
            $object_type_filters = $this->normalize_array_param($request->get_param('object_type'));

            $date_from = sanitize_text_field($request->get_param('date_from') ?? '');
            $date_to   = sanitize_text_field($request->get_param('date_to') ?? '');
            $per_page  = min(intval($request->get_param('per_page') ?? 20), 100);
            $page      = max(intval($request->get_param('page') ?? 1), 1);
            if ($per_page < 1) $per_page = 20;

            global $wpdb;
            $where_clauses = [$wpdb->prepare("user_id = %d", $user_id)];

            if (!empty($activity_filters)) {
                $placeholders = implode(',', array_fill(0, count($activity_filters), '%s'));
                $where_clauses[] = $wpdb->prepare("activity IN ({$placeholders})", ...$activity_filters);
            }

            $skip_db_query = false;
            if (!empty($object_type_filters)) {
                // Object types NOT stored in the custom bys_user_activity table — sourced from external APIs.
                // 'course' rows DO live in the custom table (course_enrolled, certificate_viewed, etc).
                $non_db_types    = ['achievement', 'form', 'lesson', 'topic', 'quiz'];
                $db_object_types = array_filter($object_type_filters, fn($t) => !in_array($t, $non_db_types));
                if (!empty($db_object_types)) {
                    $placeholders = implode(',', array_fill(0, count($db_object_types), '%s'));
                    $where_clauses[] = $wpdb->prepare("object_type IN ({$placeholders})", ...$db_object_types);
                } else {
                    $skip_db_query = true;
                }
            }

            if (!empty($date_from)) $where_clauses[] = $wpdb->prepare("DATE(created_at) >= %s", $date_from);
            if (!empty($date_to))   $where_clauses[] = $wpdb->prepare("DATE(created_at) <= %s", $date_to);

            $rows = [];
            if (!$skip_db_query) {
                $where = implode(' AND ', $where_clauses);
                $table = $wpdb->prefix . BYS_GROUPS_USER_ACTIVITY_TABLE;
                $rows = $wpdb->get_results(
                    "SELECT id, activity, initiated_by, object_id, object_title, object_type, meta, created_at
                     FROM {$table}
                     WHERE {$where}",
                    ARRAY_A
                );
            }

            $items = [];
            foreach ($rows as $row) {
                $object_type = $row['object_type'] ?? '';
                $object_id   = intval($row['object_id']);
                $meta        = !empty($row['meta']) ? json_decode($row['meta'], true) : [];

                // Enrich lesson/topic entries with last_accessed timestamp from LD
                if (in_array($object_type, ['lesson', 'topic']) && $object_id > 0) {
                    $last_accessed = $this->get_last_accessed_timestamp($user_id, $object_id, $object_type);
                    if ($last_accessed) $meta['last_accessed'] = $last_accessed;
                }

                $items[] = [
                    'id'           => intval($row['id']),
                    'activity'     => $row['activity'],
                    'initiated_by' => $row['initiated_by'] ?? '',
                    'object_id'    => $object_id,
                    'object_title' => $row['object_title'] ?? '',
                    'object_type'  => $object_type,
                    'meta'         => $meta,
                    'created_at'   => $row['created_at'],
                ];
            }

            // GamiPress achievements — fetch unless filtered out
            $should_fetch_gamipress = (
                (empty($activity_filters) || in_array('achievement_earned', $activity_filters))
                && (empty($object_type_filters) || in_array('achievement', $object_type_filters))
            );
            if ($should_fetch_gamipress) {
                $gamipress_items = $this->get_gamipress_achievements($user_id, $date_from, $date_to);
                if ($gamipress_items) $items = array_merge($items, $gamipress_items);
            }

            // Gravity Forms submissions — fetch unless filtered out
            $should_fetch_gf = (
                (empty($activity_filters)
                    || in_array('profile_update', $activity_filters)
                    || in_array('account_settings_update', $activity_filters))
                && (empty($object_type_filters) || in_array('form', $object_type_filters))
            );
            if ($should_fetch_gf) {
                $gf_items = $this->get_gravity_forms_submissions($user_id, $date_from, $date_to);
                if ($gf_items) $items = array_merge($items, $gf_items);
            }

            // LD activity — fetch unless filtered out
            $ld_sourced_slugs = ['lesson_completed', 'topic_completed', 'quiz_submitted', 'quiz_completed'];
            $ld_object_types  = ['lesson', 'topic', 'quiz'];
            $should_fetch_ld = (
                (empty($activity_filters) || !empty(array_intersect($activity_filters, $ld_sourced_slugs)))
                && (empty($object_type_filters) || !empty(array_intersect($object_type_filters, $ld_object_types)))
            );
            if ($should_fetch_ld) {
                $ld_items = $this->get_learndash_activity($user_id, $date_from, $date_to, $activity_filters, $object_type_filters);
                if ($ld_items) $items = array_merge($items, $ld_items);
            }

            // Sort merged items by created_at desc
            usort($items, function ($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });

            // Paginate
            $total           = count($items);
            $offset          = ($page - 1) * $per_page;
            $paginated_items = array_slice($items, $offset, $per_page);

            // Convert created_at to RFC3339 for response
            foreach ($paginated_items as &$item) {
                $item['created_at'] = mysql_to_rfc3339($item['created_at']);
            }
            unset($item);

            $pages = $per_page > 0 ? ceil($total / $per_page) : 0;

            return [
                'total' => $total,
                'pages' => $pages,
                'items' => $paginated_items,
            ];
        }

        /**
         * POST /users/{user_id}/activity/view-certificate
         * Logs a certificate view event within a 30-minute window via transient.
         * Fetches certificate detail (id, url) from the LD API to enrich the meta.
         */
        public function log_certificate_view($request) {
            $user_id   = intval($request['user_id']);
            $course_id = intval($request->get_param('course_id') ?? 0);
            if (!$user_id || !$course_id) return new WP_Error('bad_request', 'Invalid user_id or course_id', ['status' => 400]);

            $user = get_user_by('ID', $user_id);
            if (!$user) return new WP_Error('not_found', 'User not found', ['status' => 404]);

            // Prevent duplicate logs within 30 minutes
            $cache_key = "bys_cert_viewed_{$user_id}_{$course_id}";
            if (get_transient($cache_key)) {
                return ['message' => 'Certificate view already logged within 30 minutes'];
            }

            $course_title = get_the_title($course_id);

            // Fetch certificate details from LD API (best-effort enrichment)
            $cert_id          = null;
            $awarded_cert_url = null;
            $auth_header      = BYS_Groups_Auth::get_auth_header();
            if ($auth_header) {
                $url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/courses?include={$course_id}";
                $response = wp_remote_get($url, [
                    'headers'   => ['Authorization' => $auth_header],
                    'timeout'   => 30,
                    'sslverify' => false,
                ]);

                if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                    $body = wp_remote_retrieve_body($response);
                    // Defensive: LD sometimes wraps its JSON in extra output
                    if (preg_match('/\[.*\]/s', $body, $matches)) {
                        $body = $matches[0];
                    } elseif (preg_match('/\{.*\}/s', $body, $matches)) {
                        $body = $matches[0];
                    }
                    $data = json_decode($body, true);
                    if (is_array($data) && !empty($data)) {
                        $course = $data[0];
                        $cert_id          = intval($course['certificate'] ?? 0);
                        $awarded_cert_url = $course['awarded_certificate_url'] ?? null;
                    }
                }
            }

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_USER_ACTIVITY_TABLE;
            $wpdb->insert(
                $table,
                [
                    'user_id'      => $user_id,
                    'activity'     => 'certificate_viewed',
                    'initiated_by' => 'self',
                    'object_id'    => $course_id,
                    'object_title' => $course_title ?: null,
                    'object_type'  => 'course',
                    'meta'         => json_encode([
                        'viewed_at'               => current_time('mysql'),
                        'certificate_id'          => $cert_id,
                        'awarded_certificate_url' => $awarded_cert_url,
                    ]),
                    'created_at'   => current_time('mysql'),
                ],
                ['%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s']
            );

            set_transient($cache_key, true, 30 * MINUTE_IN_SECONDS);

            return ['message' => 'Certificate view logged'];
        }

        // ─── Private helpers ────────────────────────────────────────────────

        /**
         * Coerce a REST param to an array of sanitized strings, dropping empty values.
         * Handles the three common shapes: array, single string, or null/missing.
         */
        private function normalize_array_param($value) {
            if (is_string($value)) $value = [$value];
            if (!is_array($value)) return [];
            $value = array_map('sanitize_text_field', $value);
            return array_filter($value);
        }

        /**
         * Returns RFC3339 timestamp of the user's most recent activity on a lesson/topic.
         * Used by get_user_activity() to enrich lesson/topic items with last_accessed.
         */
        private function get_last_accessed_timestamp($user_id, $post_id, $object_type) {
            $activity_type = ($object_type === 'topic') ? 'topic' : 'lesson';

            $activity = learndash_get_user_activity([
                'user_id'       => $user_id,
                'post_id'       => $post_id,
                'activity_type' => $activity_type,
            ]);

            if (!$activity) return null;

            $timestamp = $activity->activity_updated ?: $activity->activity_completed ?: $activity->activity_started;
            if ($timestamp <= 0) return null;

            return mysql_to_rfc3339(date('Y-m-d H:i:s', $timestamp));
        }

        /**
         * Subroute of get_user_activity when ?course_id is set.
         * Returns just the user's last activity timestamp for the given course.
         */
        private function get_user_course_last_activity($user_id, $course_id) {
            try {
                if (function_exists('learndash_get_user_activity')) {
                    $activity = learndash_get_user_activity([
                        'user_id'   => intval($user_id),
                        'course_id' => intval($course_id),
                    ]);
                    if ($activity && isset($activity->activity_updated)) {
                        return ['last_activity_gmt' => $activity->activity_updated];
                    }
                } else {
                    error_log('[BYS Groups] learndash_get_user_activity function not found');
                }
            } catch (\Exception $e) {
                error_log('[BYS Groups] Error getting user last activity: ' . $e->getMessage());
                return new WP_Error('server_error', $e->getMessage(), ['status' => 500]);
            }

            return ['last_activity_gmt' => null];
        }

        /**
         * Fetch GamiPress achievement earnings via the gamipress-user-earnings REST endpoint,
         * cross-referenced with gamipress-logs to determine trigger type (system vs admin award).
         * Returns activity-shaped items ready for the merged feed.
         */
        private function get_gamipress_achievements($user_id, $date_from = '', $date_to = '') {
            $user_id = intval($user_id);
            if (!$user_id) return [];

            $base_url = get_home_url() . '/wp-json/wp/v2/gamipress-user-earnings';
            $url = add_query_arg([
                'user_id'  => $user_id,
                'per_page' => 100,
                'orderby'  => 'date',
                'order'    => 'desc',
            ], $base_url);

            $auth_header  = BYS_Groups_Auth::get_auth_header();
            $request_args = ['timeout' => 10, 'sslverify' => false];
            if ($auth_header) $request_args['headers'] = ['Authorization' => $auth_header];

            $response = wp_remote_get($url, $request_args);
            if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) return [];

            $earnings = json_decode(wp_remote_retrieve_body($response), true);
            if (!is_array($earnings)) return [];

            // Fetch matching logs to derive trigger_type (used for initiated_by classification)
            $logs_url = add_query_arg([
                'user_id'  => $user_id,
                'type'     => 'achievement_award',
                'per_page' => 100,
                'orderby'  => 'date',
                'order'    => 'desc',
            ], get_home_url() . '/wp-json/wp/v2/gamipress-logs');

            $logs_response = wp_remote_get($logs_url, $request_args);
            $logs_by_date  = [];
            if (!is_wp_error($logs_response) && wp_remote_retrieve_response_code($logs_response) === 200) {
                $logs = json_decode(wp_remote_retrieve_body($logs_response), true);
                if (is_array($logs)) {
                    foreach ($logs as $log) {
                        $logs_by_date[$log['date']] = $log;
                    }
                }
            }

            $items = [];
            foreach ($earnings as $earning) {
                if (($earning['post_type'] ?? '') !== 'badge') continue;

                $earning_date = $earning['date'] ?? null;
                if (!$earning_date) continue;

                if ($date_from && strtotime($earning_date) < strtotime($date_from)) continue;
                if ($date_to && strtotime($earning_date) > strtotime($date_to . ' 23:59:59')) continue;

                $trigger_type = $logs_by_date[$earning_date]['trigger_type'] ?? 'gamipress_earned_achievement';

                if ($trigger_type !== 'gamipress_award_achievement' && $trigger_type !== 'gamipress_earned_achievement') {
                    continue;
                }

                $initiated_by = ($trigger_type === 'gamipress_award_achievement') ? 'admin' : 'system';

                $items[] = [
                    'id'           => 0,
                    'activity'     => 'achievement_earned',
                    'initiated_by' => $initiated_by,
                    'object_id'    => intval($earning['post_id'] ?? 0),
                    'object_title' => $earning['title'] ?? 'Achievement Earned',
                    'object_type'  => 'achievement',
                    'meta'         => [
                        'gamipress_earning' => [
                            'earning_id'  => $earning['id'] ?? null,
                            'title'       => $earning['title'] ?? null,
                            'post_type'   => $earning['post_type'] ?? null,
                            'points'      => $earning['points'] ?? null,
                            'points_type' => $earning['points_type'] ?? null,
                            'date'        => $earning['date'] ?? null,
                        ],
                    ],
                    'created_at'   => date('Y-m-d H:i:s', strtotime($earning_date)),
                ];
            }

            return $items;
        }

        /**
         * Fetch Gravity Forms submissions for the user across mapped forms.
         * Form ID → activity slug mapping: 16=profile_update, 15=account_settings_update.
         */
        private function get_gravity_forms_submissions($user_id, $date_from = '', $date_to = '') {
            $user_id = intval($user_id);
            if (!$user_id) return [];

            $form_map = [
                16 => 'profile_update',
                15 => 'account_settings_update',
            ];

            $auth_header  = BYS_Groups_Auth::get_auth_header();
            $request_args = ['timeout' => 10, 'sslverify' => false];
            if ($auth_header) $request_args['headers'] = ['Authorization' => $auth_header];

            $items = [];
            foreach ($form_map as $form_id => $activity_slug) {
                $url = add_query_arg([
                    'search'  => json_encode([
                        'field_filters' => [
                            ['key' => 'created_by', 'value' => $user_id],
                        ],
                    ]),
                    'sorting' => json_encode(['key' => 'date_created', 'direction' => 'DESC']),
                    'paging'  => json_encode(['page_size' => 100]),
                ], get_home_url() . "/wp-json/gf/v2/forms/{$form_id}/entries");

                $response = wp_remote_get($url, $request_args);
                if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) continue;

                $data = json_decode(wp_remote_retrieve_body($response), true);
                if (!is_array($data)) continue;

                $entries = $data['entries'] ?? (is_array($data) ? $data : []);
                foreach ($entries as $entry) {
                    $entry_date = $entry['date_created'] ?? null;
                    if (!$entry_date) continue;
                    if ($date_from && strtotime($entry_date) < strtotime($date_from)) continue;
                    if ($date_to && strtotime($entry_date) > strtotime($date_to . ' 23:59:59')) continue;

                    // Extract numeric-keyed fields (GF field data)
                    $field_data = [];
                    foreach ($entry as $key => $value) {
                        if (is_numeric($key) && $value !== '' && $value !== null) {
                            $field_data[$key] = $value;
                        }
                    }

                    $items[] = [
                        'id'           => 0,
                        'activity'     => $activity_slug,
                        'initiated_by' => 'self',
                        'object_id'    => $form_id,
                        'object_title' => $entry['form_title'] ?? '',
                        'object_type'  => 'form',
                        'meta'         => [
                            'entry_id' => intval($entry['id'] ?? 0),
                            'form_id'  => $form_id,
                            'fields'   => $field_data,
                        ],
                        'created_at'   => date('Y-m-d H:i:s', strtotime($entry_date)),
                    ];
                }
            }

            return $items;
        }

        /**
         * Fetch LD activity (lessons/topics/quizzes) directly from wp_learndash_user_activity.
         * Filters by date and activity/object_type filters. Quiz rows also pull score meta
         * in a single batch query.
         */
        private function get_learndash_activity($user_id, $date_from = '', $date_to = '', $activity_filters = [], $object_type_filters = []) {
            $user_id = intval($user_id);
            if (!$user_id) return [];

            // Map BYS activity slugs and object_type filters to LD activity_type values
            $ld_slug_to_type = [
                'lesson_completed' => 'lesson',
                'topic_completed'  => 'topic',
                'quiz_submitted'   => 'quiz',
                'quiz_completed'   => 'quiz',
            ];
            $ld_object_type_to_type = [
                'lesson' => 'lesson',
                'topic'  => 'topic',
                'quiz'   => 'quiz',
            ];

            // Determine which LD types to query based on filters
            $ld_activity_types_needed = [];
            $all_ld_types = ['lesson', 'topic', 'quiz'];
            if (!empty($activity_filters)) {
                foreach ($activity_filters as $slug) {
                    if (isset($ld_slug_to_type[$slug])) {
                        $ld_activity_types_needed[] = $ld_slug_to_type[$slug];
                    }
                }
                $ld_activity_types_needed = array_unique($ld_activity_types_needed);
                if (empty($ld_activity_types_needed)) return [];
            } elseif (!empty($object_type_filters)) {
                foreach ($object_type_filters as $ot) {
                    if (isset($ld_object_type_to_type[$ot])) {
                        $ld_activity_types_needed[] = $ld_object_type_to_type[$ot];
                    }
                }
                $ld_activity_types_needed = array_unique($ld_activity_types_needed);
                if (empty($ld_activity_types_needed)) return [];
            } else {
                $ld_activity_types_needed = $all_ld_types;
            }

            global $wpdb;
            $where_clauses = [$wpdb->prepare("a.user_id = %d", $user_id)];

            $type_placeholders = implode(',', array_fill(0, count($ld_activity_types_needed), '%s'));
            $where_clauses[] = $wpdb->prepare(
                "a.activity_type IN ({$type_placeholders})",
                ...$ld_activity_types_needed
            );

            // Only completed activity counts (lessons/topics need activity_status = 1; quizzes just need completed > 0)
            $where_clauses[] = "(
                (a.activity_type IN ('lesson','topic') AND a.activity_status = 1 AND a.activity_completed > 0)
                OR (a.activity_type = 'quiz' AND a.activity_completed > 0)
            )";

            if (!empty($date_from)) {
                $where_clauses[] = $wpdb->prepare("a.activity_completed >= %d", strtotime($date_from . ' 00:00:00'));
            }
            if (!empty($date_to)) {
                $where_clauses[] = $wpdb->prepare("a.activity_completed <= %d", strtotime($date_to . ' 23:59:59'));
            }

            $where    = implode(' AND ', $where_clauses);
            $ld_table = $wpdb->prefix . 'learndash_user_activity';

            $rows = $wpdb->get_results(
                "SELECT a.activity_id, a.user_id, a.post_id, a.course_id,
                        a.activity_type, a.activity_status,
                        a.activity_started, a.activity_completed, a.activity_updated,
                        p.post_title
                 FROM {$ld_table} a
                 LEFT JOIN {$wpdb->posts} p ON p.ID = a.post_id
                 WHERE {$where}
                 ORDER BY a.activity_completed DESC",
                ARRAY_A
            );

            if (empty($rows)) return [];

            // For quiz rows, batch-fetch score/percentage/pass/timespent/points meta
            $quiz_activity_ids = [];
            foreach ($rows as $row) {
                if ($row['activity_type'] === 'quiz') $quiz_activity_ids[] = intval($row['activity_id']);
            }

            $quiz_meta_map = [];
            if (!empty($quiz_activity_ids)) {
                $meta_table       = $wpdb->prefix . 'learndash_user_activity_meta';
                $id_placeholders  = implode(',', array_fill(0, count($quiz_activity_ids), '%d'));
                $meta_keys        = ['score', 'percentage', 'pass', 'timespent', 'points', 'total_points', 'count'];
                $key_placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));

                $meta_rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT activity_id, activity_meta_key, activity_meta_value
                     FROM {$meta_table}
                     WHERE activity_id IN ({$id_placeholders})
                     AND activity_meta_key IN ({$key_placeholders})",
                    ...array_merge($quiz_activity_ids, $meta_keys)
                ), ARRAY_A);

                foreach ($meta_rows as $mr) {
                    $aid = intval($mr['activity_id']);
                    if (!isset($quiz_meta_map[$aid])) $quiz_meta_map[$aid] = [];
                    $quiz_meta_map[$aid][$mr['activity_meta_key']] = $mr['activity_meta_value'];
                }
            }

            $items = [];
            foreach ($rows as $row) {
                $type        = $row['activity_type'];
                $post_id     = intval($row['post_id']);
                $course_id   = intval($row['course_id']);
                $title       = $row['post_title'] ?? '';
                $activity_id = intval($row['activity_id']);
                $timestamp   = intval($row['activity_completed']);
                $dt          = date('Y-m-d H:i:s', $timestamp);

                if ($type === 'lesson') {
                    $items[] = [
                        'id'           => 0,
                        'activity'     => 'lesson_completed',
                        'initiated_by' => 'system',
                        'object_id'    => $post_id,
                        'object_title' => $title,
                        'object_type'  => 'lesson',
                        'meta'         => ['course_id' => $course_id],
                        'created_at'   => $dt,
                    ];
                } elseif ($type === 'topic') {
                    $items[] = [
                        'id'           => 0,
                        'activity'     => 'topic_completed',
                        'initiated_by' => 'system',
                        'object_id'    => $post_id,
                        'object_title' => $title,
                        'object_type'  => 'topic',
                        'meta'         => ['course_id' => $course_id],
                        'created_at'   => $dt,
                    ];
                } elseif ($type === 'quiz') {
                    $meta_raw = $quiz_meta_map[$activity_id] ?? [];
                    $meta = [
                        'course_id'    => $course_id,
                        'score'        => intval($meta_raw['score'] ?? 0),
                        'points'       => intval($meta_raw['points'] ?? 0),
                        'total_points' => intval($meta_raw['total_points'] ?? 0),
                        'percentage'   => floatval($meta_raw['percentage'] ?? 0),
                        'timespent'    => intval($meta_raw['timespent'] ?? 0),
                        'pass'         => filter_var($meta_raw['pass'] ?? false, FILTER_VALIDATE_BOOLEAN),
                    ];

                    // Emit both quiz_submitted and quiz_completed unless filtered
                    $include_submitted = empty($activity_filters) || in_array('quiz_submitted', $activity_filters);
                    $include_completed = empty($activity_filters) || in_array('quiz_completed', $activity_filters);

                    if ($include_submitted) {
                        $items[] = [
                            'id'           => 0,
                            'activity'     => 'quiz_submitted',
                            'initiated_by' => 'self',
                            'object_id'    => $post_id,
                            'object_title' => $title,
                            'object_type'  => 'quiz',
                            'meta'         => $meta,
                            'created_at'   => $dt,
                        ];
                    }
                    if ($include_completed) {
                        $items[] = [
                            'id'           => 0,
                            'activity'     => 'quiz_completed',
                            'initiated_by' => 'system',
                            'object_id'    => $post_id,
                            'object_title' => $title,
                            'object_type'  => 'quiz',
                            'meta'         => $meta,
                            'created_at'   => $dt,
                        ];
                    }
                }
            }

            return $items;
        }
    }
}
