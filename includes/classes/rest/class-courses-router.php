<?php
/**
 * Courses Router
 *
 * Course-content and quiz-attempt endpoints:
 *   GET  /courses/{id}/steps                         — hierarchical lesson/topic structure + quiz IDs
 *   GET  /courses/{id}/quiz-steps[?filter=grading]   — published quizzes filtered by show_in_reporting
 *                                                      (or show_test_grading_config when ?filter=grading)
 *   GET  /courses/{id}/quizzes                       — every published quiz attached to the course
 *   GET  /courses/{id}/quiz-progress-batch?user_ids= — batched per-user/per-quiz progress summary
 *
 *   GET  /attempts/{id}                              — single quiz attempt detail
 *   GET  /attempts/{id}/questions                    — per-question results for one attempt
 *   POST /attempts/{id}/grade                        — manually grade questions in an attempt
 *
 * @package BYS_Groups
 * @since 1.1.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Courses_Router')) {
    class BYS_Groups_Courses_Router {

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
            add_action('acf/save_post', [$this, 'invalidate_quiz_cache_on_save'], 20);
        }

        public function register_routes() {
            // ── /courses/{id}/* ────────────────────────────────────────────
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/courses/(?P<course_id>\d+)/quiz-steps', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_course_quiz_steps'],
                'permission_callback' => 'is_user_logged_in',
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/courses/(?P<course_id>\d+)/quizzes', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_course_quizzes'],
                'permission_callback' => 'is_user_logged_in',
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/courses/(?P<course_id>\d+)/quiz-progress-batch', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_course_quiz_progress_batch'],
                'permission_callback' => 'is_user_logged_in',
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/courses/(?P<course_id>\d+)/steps', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_course_steps'],
                'permission_callback' => 'is_user_logged_in',
            ]);

            // ── /attempts/{id}/* ───────────────────────────────────────────
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/attempts/(?P<activity_id>\d+)/questions', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_attempt_questions'],
                'permission_callback' => fn($request) => $this->can_access_attempt($request['activity_id']),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/attempts/(?P<activity_id>\d+)/grade', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'grade_attempt_questions'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::is_site_admin() || BYS_Groups_Permissions::is_grader(),
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/attempts/(?P<activity_id>\d+)', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_attempt_detail'],
                'permission_callback' => fn($request) => $this->can_access_attempt($request['activity_id']),
            ]);
        }

        // ─── Cache invalidation ─────────────────────────────────────────────

        /**
         * Clear quiz-steps cache when an sfwd-quiz post is saved (e.g. ACF toggles
         * show_in_reporting). Ensures REST responses reflect the change immediately.
         */
        public function invalidate_quiz_cache_on_save($post_id) {
            $post = get_post($post_id);
            if (!$post || $post->post_type !== 'sfwd-quiz') return;

            $course_id = get_post_meta($post_id, 'course_id', true);
            if ($course_id) {
                delete_transient("bys_quiz_steps_v4__{$course_id}");
                delete_transient("bys_quiz_steps_v4_grading_{$course_id}");
            }
        }

        // ─── Authorization helpers ──────────────────────────────────────────

        /**
         * Permission check for /attempts/{id} and /attempts/{id}/questions.
         * The actor must either share a group with the attempt's user (via
         * can_access_user) OR hold the grader role / be a site admin.
         * Markers may legitimately need to grade attempts from users outside
         * their own groups, hence the role-based bypass.
         */
        private function can_access_attempt($activity_id) {
            $activity_id = (int) $activity_id;
            if (!$activity_id) return false;

            // Site admin / grader bypass — no DB lookup needed.
            if (BYS_Groups_Permissions::is_site_admin() || BYS_Groups_Permissions::is_grader()) return true;

            // Otherwise: look up the attempt's user and check actor → user authz.
            global $wpdb;
            $user_id = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT user_id FROM {$wpdb->prefix}learndash_user_activity
                 WHERE activity_id = %d AND activity_type = 'quiz'",
                $activity_id
            ));

            if (!$user_id) return false;

            return BYS_Groups_Permissions::can_access_user($user_id);
        }

        // ─── REST callbacks: /courses/{id}/* ───────────────────────────────

        /**
         * GET /courses/{course_id}/steps
         * Returns hierarchical lessons → topics + a flat list of quiz IDs.
         * Source: LearnDash REST API (/ldlms/v2/sfwd-courses/{id}/steps?_fields=h,t).
         */
        public function get_course_steps($request) {
            $course_id = intval($request['course_id']);
            if (!$course_id) return new WP_Error('bad_request', 'Invalid course ID', ['status' => 400]);

            $auth_header = BYS_Groups_Auth::get_auth_header();
            if (!$auth_header) return new WP_Error('server_error', 'API credentials not configured', ['status' => 500]);

            $url = get_home_url() . "/wp-json/ldlms/v2/sfwd-courses/{$course_id}/steps?_fields=h,t";
            $response = wp_remote_get($url, [
                'headers'   => ['Authorization' => $auth_header],
                'sslverify' => false,
                'timeout'   => 60, // Large courses need the headroom
            ]);

            if (is_wp_error($response)) return new WP_Error('server_error', $response->get_error_message(), ['status' => 500]);

            $status = wp_remote_retrieve_response_code($response);
            if ($status !== 200) {
                return new WP_Error('ld_api_failure', 'Failed to fetch steps from LearnDash API', ['status' => $status]);
            }

            $data = json_decode(wp_remote_retrieve_body($response), true);

            // Hierarchical lessons → topics
            $h_lessons = $data['h']['sfwd-lessons'] ?? [];
            $lessons = [];
            foreach ($h_lessons as $lesson_id => $lesson_data) {
                $lesson      = get_post($lesson_id);
                $topics_data = $lesson_data['sfwd-topic'] ?? [];

                $lessons[] = [
                    'id'     => $lesson_id,
                    'title'  => $lesson ? $lesson->post_title : 'Undefined',
                    'topics' => array_map(function ($topic_id) {
                        $topic = get_post($topic_id);
                        return [
                            'id'    => $topic_id,
                            'title' => $topic ? $topic->post_title : 'Undefined',
                        ];
                    }, array_keys($topics_data)),
                ];
            }

            // Flat list of quiz IDs from the type-list format
            $quiz_ids = $data['t']['sfwd-quiz'] ?? [];

            return [
                'lessons'  => $lessons,
                'quiz_ids' => array_map('intval', $quiz_ids),
            ];
        }

        /**
         * GET /courses/{course_id}/quiz-steps[?filter=grading]
         * Returns published quizzes scoped by the show_in_reporting meta key
         * (or show_test_grading_config when ?filter=grading).
         * Cached as a 1-hour transient; cache invalidated when an sfwd-quiz
         * is saved via the acf/save_post hook above.
         */
        public function get_course_quiz_steps($request) {
            $course_id = intval($request['course_id']);
            if (!$course_id) return new WP_Error('bad_request', 'Invalid course ID', ['status' => 400]);

            $filter   = sanitize_key($request->get_param('filter') ?? '');
            $meta_key = ($filter === 'grading') ? 'show_test_grading_config' : 'show_in_reporting';

            $cache_key = "bys_quiz_steps_v4_{$filter}_{$course_id}";
            $cached    = get_transient($cache_key);
            if ($cached !== false) return $cached;

            global $wpdb;
            $steps = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID as step_id, p.post_title as step_title
                 FROM {$wpdb->posts} p
                 JOIN {$wpdb->postmeta} pm   ON p.ID = pm.post_id
                 JOIN {$wpdb->postmeta} pm_r ON p.ID = pm_r.post_id
                 WHERE pm.meta_key = 'course_id' AND pm.meta_value = %d
                 AND p.post_type = 'sfwd-quiz' AND p.post_status = 'publish'
                 AND pm_r.meta_key = %s AND pm_r.meta_value = '1'
                 ORDER BY p.menu_order ASC",
                $course_id,
                $meta_key
            ));

            $result = [];
            foreach ($steps ?: [] as $step) {
                $result[] = [
                    'step_id'    => intval($step->step_id),
                    'step_title' => $step->step_title,
                ];
            }

            set_transient($cache_key, $result, HOUR_IN_SECONDS);
            return $result;
        }

        /**
         * GET /courses/{course_id}/quizzes
         * Returns every published sfwd-quiz attached to a course, regardless of
         * show_in_reporting / show_test_grading_config flags. Distinct from
         * get_course_quiz_steps() which filters by those flags.
         */
        public function get_course_quizzes($request) {
            $course_id = intval($request['course_id']);
            if (!$course_id) return new WP_Error('bad_request', 'Invalid course ID', ['status' => 400]);

            $cache_key = "bys_course_quizzes_all_v1_{$course_id}";
            $cached    = get_transient($cache_key);
            if ($cached !== false) return $cached;

            global $wpdb;
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID as id, p.post_title as title
                 FROM {$wpdb->posts} p
                 JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
                 WHERE pm.meta_key = 'course_id' AND pm.meta_value = %d
                   AND p.post_type = 'sfwd-quiz' AND p.post_status = 'publish'
                 ORDER BY p.menu_order ASC, p.post_title ASC",
                $course_id
            ));

            $result = [];
            foreach ((array) $rows as $row) {
                $result[] = [
                    'id'    => intval($row->id),
                    'title' => $row->title,
                ];
            }

            set_transient($cache_key, $result, HOUR_IN_SECONDS);
            return $result;
        }

        /**
         * GET /courses/{course_id}/quiz-progress-batch?user_ids=1,2,3
         * Returns { user_id: { quiz_id: { total_attempts, percent_highest, pass_highest } } }
         * for the given users in this course. Two DB queries total regardless of
         * user/quiz count.
         *
         * NOTE: legacy auth gap — the actor can pass arbitrary user_ids and read
         * their quiz progress within the course. Preserved verbatim; flagged for
         * dev team review.
         */
        public function get_course_quiz_progress_batch($request) {
            $course_id      = intval($request['course_id']);
            $user_ids_param = $request->get_param('user_ids');

            if (!$course_id || !$user_ids_param) {
                return new WP_Error('bad_request', 'course_id and user_ids are required', ['status' => 400]);
            }

            $user_ids = array_values(array_unique(array_filter(array_map('intval', explode(',', $user_ids_param)))));
            if (empty($user_ids)) return [];

            global $wpdb;
            $activity_table = $wpdb->prefix . 'learndash_user_activity';
            $meta_table     = $wpdb->prefix . 'learndash_user_activity_meta';

            // All IDs are sanitized to integers, safe to inline
            $user_ids_str = implode(',', $user_ids);

            // Query 1: completed quiz activities for these users in this course
            $activities = $wpdb->get_results($wpdb->prepare(
                "SELECT a.activity_id, a.user_id, a.post_id AS quiz_id, a.activity_status
                 FROM {$activity_table} a
                 WHERE a.course_id   = %d
                   AND a.user_id    IN ({$user_ids_str})
                   AND a.activity_type      = 'quiz'
                   AND a.activity_completed > 0",
                $course_id
            ));

            if (empty($activities)) return [];

            // Query 2: percentage meta for all returned activity rows
            $activity_ids     = array_unique(array_map(fn($a) => intval($a->activity_id), $activities));
            $activity_ids_str = implode(',', $activity_ids);

            $metas = $wpdb->get_results(
                "SELECT activity_id, activity_meta_value
                 FROM {$meta_table}
                 WHERE activity_id     IN ({$activity_ids_str})
                   AND activity_meta_key = 'percentage'"
            );

            $pct_map = [];
            foreach ($metas as $meta) {
                $pct_map[intval($meta->activity_id)] = floatval($meta->activity_meta_value);
            }

            // Group: [user_id][quiz_id] = [ {pass, pct}, ... ]
            $grouped = [];
            foreach ($activities as $act) {
                $uid = intval($act->user_id);
                $qid = intval($act->quiz_id);
                $aid = intval($act->activity_id);
                $grouped[$uid][$qid][] = [
                    'pass' => intval($act->activity_status) === 1,
                    'pct'  => $pct_map[$aid] ?? 0.0,
                ];
            }

            // Summarize per user/quiz: best (highest %) attempt + total count
            $result = [];
            foreach ($grouped as $uid => $quizzes) {
                foreach ($quizzes as $qid => $attempts) {
                    $best = $attempts[0];
                    foreach ($attempts as $attempt) {
                        if ($attempt['pct'] > $best['pct']) $best = $attempt;
                    }
                    $result[$uid][$qid] = [
                        'total_attempts'  => count($attempts),
                        'percent_highest' => round($best['pct'], 2),
                        'pass_highest'    => $best['pass'],
                    ];
                }
            }

            return $result;
        }

        // ─── REST callbacks: /attempts/{id}/* ──────────────────────────────

        /**
         * GET /attempts/{activity_id}
         * Returns header-level detail for a single quiz attempt (user, quiz, course,
         * percentage, points, pass/fail, timestamps, attempt number).
         *
         * Override: if any question in this attempt is still ungraded (essay not
         * yet reviewed, or assessment/free_answer with no recorded result), pass
         * is forced to null so the UI shows "Ungraded" instead of a premature
         * pass/fail badge.
         */
        public function get_attempt_detail($request) {
            $activity_id = intval($request['activity_id']);
            if (!$activity_id) return new WP_Error('bad_request', 'Invalid activity_id', ['status' => 400]);

            global $wpdb;
            $ld_table   = $wpdb->prefix . 'learndash_user_activity';
            $meta_table = $wpdb->prefix . 'learndash_user_activity_meta';

            $row = $wpdb->get_row($wpdb->prepare(
                "SELECT activity_id, user_id, post_id, activity_started, activity_completed
                 FROM {$ld_table}
                 WHERE activity_id = %d AND activity_type = 'quiz'",
                $activity_id
            ), ARRAY_A);

            if (!$row) return new WP_Error('not_found', 'Attempt not found', ['status' => 404]);

            $uid     = intval($row['user_id']);
            $quiz_id = intval($row['post_id']);

            // Fetch the 6 meta values we need in one query
            $meta_keys        = ['pass', 'percentage', 'points', 'total_points', 'timespent', 'statistic_ref_id'];
            $key_placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));

            $meta_rows = $wpdb->get_results($wpdb->prepare(
                "SELECT activity_meta_key, activity_meta_value
                 FROM {$meta_table}
                 WHERE activity_id = %d AND activity_meta_key IN ({$key_placeholders})",
                ...array_merge([$activity_id], $meta_keys)
            ), ARRAY_A);

            $meta = [];
            foreach ($meta_rows as $m) {
                $meta[$m['activity_meta_key']] = $m['activity_meta_value'];
            }

            $user         = get_userdata($uid);
            $display_name = $user ? $user->display_name : 'Unknown User';

            $quiz_title   = get_the_title($quiz_id) ?: 'Unknown Quiz';
            $course_id    = learndash_get_course_id($quiz_id);
            $course_title = $course_id ? get_the_title($course_id) : '';

            // Attempt number: count of this user's attempts for this quiz up to and including this one
            $attempt_number = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$ld_table}
                 WHERE user_id = %d AND post_id = %d AND activity_type = 'quiz' AND activity_id <= %d",
                $uid, $quiz_id, $activity_id
            ));

            // Override pass when any question is still ungraded
            $statistic_ref_id = isset($meta['statistic_ref_id']) ? intval($meta['statistic_ref_id']) : 0;
            $pass_value       = isset($meta['pass']) ? (bool) intval($meta['pass']) : null;
            if ($statistic_ref_id && $this->attempt_has_ungraded_questions($statistic_ref_id)) {
                $pass_value = null;
            }

            return [
                'activity_id'    => $activity_id,
                'user_id'        => $uid,
                'display_name'   => $display_name,
                'quiz_id'        => $quiz_id,
                'quiz_title'     => $quiz_title,
                'course_id'      => $course_id ?: null,
                'course_title'   => $course_title,
                'started_gmt'    => $row['activity_started']
                    ? gmdate('Y-m-d\TH:i:s', intval($row['activity_started']))
                    : null,
                'completed_gmt'  => $row['activity_completed']
                    ? gmdate('Y-m-d\TH:i:s', intval($row['activity_completed']))
                    : null,
                'timespent'      => isset($meta['timespent']) ? intval($meta['timespent']) : null,
                'percentage'     => isset($meta['percentage']) ? floatval($meta['percentage']) : null,
                'points_scored'  => isset($meta['points']) ? floatval($meta['points']) : null,
                'points_total'   => isset($meta['total_points']) ? floatval($meta['total_points']) : null,
                'pass'           => $pass_value,
                'attempt_number' => $attempt_number,
            ];
        }

        /**
         * GET /attempts/{activity_id}/questions
         * Per-question results for one attempt: definition, user's answer, correct
         * answer, points earned/max, and a derived 'result' classification
         * (correct/incorrect/partial/ungraded).
         */
        public function get_attempt_questions($request) {
            $activity_id = intval($request['activity_id']);
            if (!$activity_id) return new WP_Error('bad_request', 'Invalid activity_id', ['status' => 400]);

            global $wpdb;
            $meta_table     = $wpdb->prefix . 'learndash_user_activity_meta';
            $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
            $question_table = LDLMS_DB::get_table_name('quiz_question');

            if (!$stat_table || !$question_table) {
                return new WP_Error('server_error', 'LearnDash statistics tables not available', ['status' => 500]);
            }

            // Resolve statistic_ref_id from activity meta
            $statistic_ref_id = $wpdb->get_var($wpdb->prepare(
                "SELECT activity_meta_value FROM {$meta_table}
                 WHERE activity_id = %d AND activity_meta_key = 'statistic_ref_id'",
                $activity_id
            ));

            if (!$statistic_ref_id) return [];

            // Per-question stats for this attempt
            $stat_rows = $wpdb->get_results($wpdb->prepare(
                "SELECT question_id, question_post_id, correct_count, incorrect_count, points, answer_data
                 FROM {$stat_table}
                 WHERE statistic_ref_id = %d",
                intval($statistic_ref_id)
            ), ARRAY_A);

            if (empty($stat_rows)) return [];

            // Question definitions (text, type, max points, sort order)
            $question_ids = array_map('intval', array_column($stat_rows, 'question_id'));
            $placeholders = implode(',', array_fill(0, count($question_ids), '%d'));
            $question_rows = $wpdb->get_results($wpdb->prepare(
                "SELECT id, title, question, answer_type, points AS max_points, sort, answer_data
                 FROM {$question_table}
                 WHERE id IN ({$placeholders})",
                ...$question_ids
            ), ARRAY_A);

            $question_map = [];
            foreach ($question_rows as $q) {
                $question_map[intval($q['id'])] = $q;
            }

            // Resolve WordPress post IDs for questions.
            // The stat table's question_post_id is 0 in many LD versions, and the LDLMS
            // question IDs don't match the legacy question_pro_id stored in WP post meta.
            // We instead fetch all sfwd-question posts for this quiz and match by title —
            // the LDLMS question title matches the sfwd-question post_title.
            $question_post_id_map = []; // keyed by trimmed question title

            $quiz_post_id = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT post_id FROM {$wpdb->prefix}learndash_user_activity
                 WHERE activity_id = %d AND activity_type = 'quiz'",
                $activity_id
            ));

            if ($quiz_post_id) {
                $sfwd_q_rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT p.ID, p.post_title
                     FROM {$wpdb->posts} p
                     INNER JOIN {$wpdb->postmeta} pm
                         ON  pm.post_id  = p.ID
                         AND pm.meta_key = 'quiz_id'
                         AND pm.meta_value = %d
                     WHERE p.post_type = 'sfwd-question'",
                    $quiz_post_id
                ), ARRAY_A);
                foreach ($sfwd_q_rows as $row) {
                    $question_post_id_map[trim($row['post_title'])] = intval($row['ID']);
                }
            }

            // Combine and classify per-question result
            $result = [];
            foreach ($stat_rows as $stat) {
                $qid  = intval($stat['question_id']);
                $qdef = $question_map[$qid] ?? null;

                $answer_type     = $qdef['answer_type'] ?? '';
                $points_max      = $qdef ? floatval($qdef['max_points']) : 0;
                $points_earned   = floatval($stat['points']);
                $correct_count   = intval($stat['correct_count']);
                $incorrect_count = intval($stat['incorrect_count']);

                if ($answer_type === 'essay') {
                    // LearnDash sets incorrect_count=1 on essays by default, so the
                    // sfwd-essays post status is LD's signal for graded/ungraded —
                    // but if our REST grading flow set answer_data['manually_graded']
                    // (which it always does on POST /attempts/{id}/grade) we trust
                    // that flag too, since wp_update_post on the essay post can fail
                    // silently when graded_id is missing or its status update is
                    // blocked. Without this fallback, points persist but the result
                    // badge stays "Ungraded" forever.
                    $essay_data       = json_decode($stat['answer_data'] ?? '', true);
                    $graded_id        = isset($essay_data['graded_id']) ? intval($essay_data['graded_id']) : 0;
                    $manually_graded  = !empty($essay_data['manually_graded']);
                    $essay_is_graded  = $manually_graded
                        || ($graded_id && get_post_status($graded_id) === 'graded');

                    if (!$essay_is_graded) {
                        $question_result = 'ungraded';
                    } elseif ($points_max > 0 && $points_earned >= $points_max) {
                        $question_result = 'correct';
                    } elseif ($points_earned > 0 && $points_earned < $points_max) {
                        $question_result = 'partial';
                    } else {
                        $question_result = 'incorrect';
                    }
                } elseif (in_array($answer_type, ['assessment_answer', 'free_answer'], true)
                          && $correct_count === 0 && $incorrect_count === 0) {
                    $question_result = 'ungraded';
                } elseif ($points_max > 0 && $points_earned >= $points_max) {
                    $question_result = 'correct';
                } elseif ($points_earned > 0 && $points_earned < $points_max) {
                    $question_result = 'partial';
                } else {
                    $question_result = 'incorrect';
                }

                $stat_answer_data = json_decode($stat['answer_data'] ?? '', true);
                $manually_graded  = !empty($stat_answer_data['manually_graded']);

                $result[] = [
                    'question_id'      => $qid,
                    'question_post_id' => intval($stat['question_post_id']),
                    'title'            => $qdef ? sanitize_text_field($qdef['title']) : '',
                    'question_text'    => $qdef ? wp_kses_post(apply_filters('the_content', $qdef['question'])) : '',
                    'answer_type'      => $answer_type,
                    'points_earned'    => $points_earned,
                    'points_max'       => $points_max,
                    'result'           => $question_result,
                    'manually_graded'  => $manually_graded,
                    'sort'             => $qdef ? intval($qdef['sort']) : 0,
                    'user_answers'     => $this->parse_question_answers(
                        $stat['answer_data'] ?? '',
                        $qdef['answer_data'] ?? '',
                        $answer_type
                    ),
                    'correct_answer'   => $this->parse_correct_answer(
                        $qdef['answer_data'] ?? '',
                        $answer_type,
                        intval($stat['question_post_id']) ?: ($question_post_id_map[trim($qdef['title'] ?? '')] ?? 0),
                        $qid
                    ),
                ];
            }

            // Sort by quiz question order
            usort($result, fn($a, $b) => $a['sort'] - $b['sort']);

            return $result;
        }

        /**
         * POST /attempts/{activity_id}/grade
         * Body: { "grades": [ { "question_id": N, "result": "correct|incorrect|partial|ungraded", "points": N } ] }
         *
         * For each grade:
         *   - update the LDLMS quiz_statistic row (correct/incorrect counts, points)
         *   - set manually_graded=true in the stat answer_data
         *   - for essay questions: sync sfwd-essays post status AND the LD admin's
         *     _sfwd-quizzes user meta via learndash_*_submitted_essay_data()
         *
         * Then recomputes totals and updates the activity meta (points, percentage,
         * pass — but only if no questions remain ungraded).
         */
        public function grade_attempt_questions($request) {
            $activity_id = intval($request['activity_id']);
            if (!$activity_id) return new WP_Error('bad_request', 'Invalid activity_id', ['status' => 400]);

            $body   = $request->get_json_params();
            $grades = isset($body['grades']) && is_array($body['grades']) ? $body['grades'] : [];

            if (empty($grades)) return new WP_Error('bad_request', 'No grades provided', ['status' => 400]);

            global $wpdb;
            $meta_table     = $wpdb->prefix . 'learndash_user_activity_meta';
            $ld_table       = $wpdb->prefix . 'learndash_user_activity';
            $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
            $question_table = LDLMS_DB::get_table_name('quiz_question');

            if (!$stat_table || !$question_table) {
                return new WP_Error('server_error', 'LearnDash statistics tables not available', ['status' => 500]);
            }

            $statistic_ref_id = intval($wpdb->get_var($wpdb->prepare(
                "SELECT activity_meta_value FROM {$meta_table}
                 WHERE activity_id = %d AND activity_meta_key = 'statistic_ref_id'",
                $activity_id
            )));

            if (!$statistic_ref_id) return new WP_Error('not_found', 'Attempt statistics not found', ['status' => 404]);

            // Quiz taker + sfwd-quiz post for this attempt
            $activity_row = $wpdb->get_row($wpdb->prepare(
                "SELECT post_id, user_id FROM {$ld_table}
                 WHERE activity_id = %d AND activity_type = 'quiz'",
                $activity_id
            ), ARRAY_A);

            $quiz_id      = intval($activity_row['post_id'] ?? 0);
            $quiz_user_id = intval($activity_row['user_id'] ?? 0);

            // Pass threshold from quiz settings (defaults to 80%)
            $pass_mark   = 80.0;
            $quiz_pro_id = 0; // WpProQuiz numeric id — used for essay post lookup
            if ($quiz_id) {
                $quiz_settings = get_post_meta($quiz_id, '_sfwd-quiz', true);
                if (isset($quiz_settings['sfwd-quiz_passMark'])) {
                    $pass_mark = floatval($quiz_settings['sfwd-quiz_passMark']);
                }
                $quiz_pro_id = intval(get_post_meta($quiz_id, 'quiz_pro_id', true));
            }

            $valid_results = ['correct', 'incorrect', 'partial', 'ungraded'];

            foreach ($grades as $grade) {
                $question_id = intval($grade['question_id'] ?? 0);
                $result      = sanitize_text_field($grade['result'] ?? '');

                if (!$question_id || !in_array($result, $valid_results, true)) continue;

                // One query: question definition + current stat answer_data
                $stat_row = $wpdb->get_row($wpdb->prepare(
                    "SELECT q.points AS points_max, q.answer_type, s.answer_data
                     FROM {$stat_table} s
                     LEFT JOIN {$question_table} q ON q.id = s.question_id
                     WHERE s.statistic_ref_id = %d AND s.question_id = %d",
                    $statistic_ref_id, $question_id
                ), ARRAY_A);

                if (!$stat_row) continue;

                $points_max  = floatval($stat_row['points_max']);
                $answer_type = $stat_row['answer_type'] ?? '';

                // Resolve counts + points based on result classification
                switch ($result) {
                    case 'correct':
                        $correct_count = 1; $incorrect_count = 0; $points_earned = $points_max;
                        break;
                    case 'incorrect':
                        $correct_count = 0; $incorrect_count = 1; $points_earned = 0;
                        break;
                    case 'partial':
                        $raw_points    = isset($grade['points']) ? floatval($grade['points']) : 0.0;
                        $points_earned = max(0.0, min($raw_points, $points_max));
                        $correct_count = 1; $incorrect_count = 0;
                        break;
                    case 'ungraded':
                    default:
                        $correct_count = 0; $incorrect_count = 0; $points_earned = 0;
                        break;
                }

                $wpdb->update(
                    $stat_table,
                    [
                        'correct_count'   => $correct_count,
                        'incorrect_count' => $incorrect_count,
                        'points'          => $points_earned,
                    ],
                    [
                        'statistic_ref_id' => $statistic_ref_id,
                        'question_id'      => $question_id,
                    ],
                    ['%d', '%d', '%f'],
                    ['%d', '%d']
                );

                // Persist manually_graded flag in answer_data
                $answer_data_arr                    = json_decode($stat_row['answer_data'] ?? '', true) ?: [];
                $answer_data_arr['manually_graded'] = true;
                $wpdb->update(
                    $stat_table,
                    ['answer_data' => wp_json_encode($answer_data_arr)],
                    ['statistic_ref_id' => $statistic_ref_id, 'question_id' => $question_id],
                    ['%s'],
                    ['%d', '%d']
                );

                // Essay sync: keep sfwd-essays post AND _sfwd-quizzes user meta in lockstep
                // with our grade. _sfwd-quizzes is what the LD admin reads for points/status.
                if ($answer_type === 'essay') {
                    $graded_id = isset($answer_data_arr['graded_id']) ? intval($answer_data_arr['graded_id']) : 0;
                    $essay_post = $graded_id ? get_post($graded_id) : null;

                    // Fallback: stat answer_data may not have graded_id (older quiz
                    // submissions, or LD edge cases). Look up the sfwd-essays post
                    // by quiz_pro_id + question_id (== question_pro_id) + author.
                    // If found, persist the discovered id back into answer_data so
                    // future grading saves skip this lookup.
                    if (!$essay_post && $quiz_pro_id && $question_id && $quiz_user_id) {
                        $found_id = (int) $wpdb->get_var($wpdb->prepare(
                            "SELECT p.ID
                               FROM {$wpdb->posts} p
                               INNER JOIN {$wpdb->postmeta} pm_quiz
                                       ON pm_quiz.post_id   = p.ID
                                      AND pm_quiz.meta_key  = 'quiz_id'
                                      AND pm_quiz.meta_value = %d
                               INNER JOIN {$wpdb->postmeta} pm_q
                                       ON pm_q.post_id   = p.ID
                                      AND pm_q.meta_key  = 'question_id'
                                      AND pm_q.meta_value = %d
                              WHERE p.post_type   = 'sfwd-essays'
                                AND p.post_author = %d
                              ORDER BY p.post_date DESC
                              LIMIT 1",
                            $quiz_pro_id, $question_id, $quiz_user_id
                        ));

                        if ($found_id) {
                            $graded_id  = $found_id;
                            $essay_post = get_post($found_id);

                            $answer_data_arr['graded_id'] = $found_id;
                            $wpdb->update(
                                $stat_table,
                                ['answer_data' => wp_json_encode($answer_data_arr)],
                                ['statistic_ref_id' => $statistic_ref_id, 'question_id' => $question_id],
                                ['%s'],
                                ['%d', '%d']
                            );
                        }
                    }

                    if ($essay_post) {
                        $new_status = ($result === 'ungraded') ? 'not_graded' : 'graded';
                        $new_points = ($result === 'ungraded') ? 0.0 : $points_earned;

                        wp_update_post(['ID' => $graded_id, 'post_status' => $new_status]);

                        // Prefer post_meta values when present (set by LD on submission);
                        // fall back to the parent-loop quiz_pro_id / stat row's question_id.
                        $essay_quiz_pro_id = intval(get_post_meta($graded_id, 'quiz_id', true)) ?: $quiz_pro_id;
                        $essay_question_pro_id = intval(get_post_meta($graded_id, 'question_id', true)) ?: $question_id;

                        if ($essay_quiz_pro_id && $essay_question_pro_id) {
                            $essay_ld_data = learndash_get_submitted_essay_data($essay_quiz_pro_id, $essay_question_pro_id, $essay_post);
                            if (is_array($essay_ld_data)) {
                                // Capture pre-update values to compute the deltas LD wants.
                                $original_status = isset($essay_ld_data['status']) ? (string) $essay_ld_data['status'] : '';
                                $original_points = isset($essay_ld_data['points_awarded']) ? floatval($essay_ld_data['points_awarded']) : 0.0;

                                // Step 1: write the per-essay 'graded' entry in _sfwd-quizzes.
                                $essay_ld_data['status']         = $new_status;
                                $essay_ld_data['points_awarded'] = $new_points;
                                learndash_update_submitted_essay_data($essay_quiz_pro_id, $essay_question_pro_id, $essay_post, $essay_ld_data);

                                // Step 2: propagate the grade change up to the quiz-level score
                                // (score / points / percentage / pass) in _sfwd-quizzes — which
                                // is what the LD admin Users view reads. Mirrors LD's own
                                // admin essay-edit flow (per-essay update first, then quiz-level
                                // delta) at class-learndash-admin-essay-edit.php save_essay_status_metabox_data().
                                // Without this, only the per-essay entry was updated and the LD
                                // admin's rollup score stayed stuck at the original submitted value.
                                $quiz_score_difference = 0;
                                if ($original_status !== $new_status) {
                                    if ($new_status === 'graded')          $quiz_score_difference = 1;
                                    elseif ($new_status === 'not_graded')  $quiz_score_difference = -1;
                                }

                                $updated_scoring = [
                                    'updated_question_score'    => $new_points,
                                    'points_awarded_difference' => $new_points - $original_points,
                                    'score_difference'          => $quiz_score_difference,
                                ];
                                learndash_update_quiz_data($essay_quiz_pro_id, $essay_question_pro_id, $updated_scoring, $essay_post);
                            }
                        }
                    }
                }
            }

            // Recompute attempt totals from all stat rows
            $stat_rows = $wpdb->get_results($wpdb->prepare(
                "SELECT s.points AS points_earned, q.points AS points_max,
                        q.answer_type, s.correct_count, s.incorrect_count, s.answer_data
                 FROM {$stat_table} s
                 LEFT JOIN {$question_table} q ON q.id = s.question_id
                 WHERE s.statistic_ref_id = %d",
                $statistic_ref_id
            ), ARRAY_A);

            $total_earned   = 0.0;
            $total_max      = 0.0;
            $has_ungraded   = false;
            $correct_total  = 0; // count of questions classified as correct/partial (for _sfwd-quizzes['score'])

            foreach ($stat_rows as $row) {
                $answer_type   = $row['answer_type'] ?? '';
                $total_max    += floatval($row['points_max']);
                $total_earned += floatval($row['points_earned']);
                if (intval($row['correct_count']) >= 1) $correct_total++;

                if ($answer_type === 'essay') {
                    $e_data    = json_decode($row['answer_data'] ?? '', true);
                    $graded_id = isset($e_data['graded_id']) ? intval($e_data['graded_id']) : 0;
                    $manually  = !empty($e_data['manually_graded']);
                    // Mirror the GET classifier's essay-graded test: post-status OR manually_graded
                    if (!$manually && (!$graded_id || get_post_status($graded_id) !== 'graded')) {
                        $has_ungraded = true;
                    }
                } elseif (
                    in_array($answer_type, ['assessment_answer', 'free_answer'], true)
                    && intval($row['correct_count']) === 0
                    && intval($row['incorrect_count']) === 0
                ) {
                    $has_ungraded = true;
                }
            }

            $percentage = $total_max > 0 ? ($total_earned / $total_max) * 100.0 : 0.0;
            $pass       = $has_ungraded ? null : ($percentage >= $pass_mark ? 1 : 0);

            // Upsert activity meta: points + percentage always, pass only if fully graded
            $meta_updates = ['points' => $total_earned, 'percentage' => $percentage];
            if (!$has_ungraded) $meta_updates['pass'] = $pass;

            foreach ($meta_updates as $key => $value) {
                $exists = (int) $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM {$meta_table}
                     WHERE activity_id = %d AND activity_meta_key = %s",
                    $activity_id, $key
                ));

                if ($exists) {
                    $wpdb->update(
                        $meta_table,
                        ['activity_meta_value' => $value],
                        ['activity_id' => $activity_id, 'activity_meta_key' => $key],
                        ['%s'],
                        ['%d', '%s']
                    );
                } else {
                    $wpdb->insert(
                        $meta_table,
                        [
                            'activity_id'         => $activity_id,
                            'activity_meta_key'   => $key,
                            'activity_meta_value' => $value,
                        ],
                        ['%d', '%s', '%s']
                    );
                }
            }

            // Direct _sfwd-quizzes user-meta sync — the LD admin Users-list summary
            // reads from this meta's per-attempt rollup (score / points / percentage /
            // pass). learndash_update_quiz_data attempts the same write but is gated
            // by essay_quiz_time match + has_graded + graded[qid][post_id] match,
            // which silently skip the update in edge cases (multi-attempt scenarios,
            // missing graded[] entries, etc.). We bypass the gates by matching the
            // attempt entry by statistic_ref_id (uniquely identifies one attempt)
            // and writing the just-recomputed absolute totals directly.
            if ($quiz_user_id && $statistic_ref_id) {
                $users_quiz_data = get_user_meta($quiz_user_id, '_sfwd-quizzes', true);
                if (is_array($users_quiz_data)) {
                    $synced = false;
                    foreach ($users_quiz_data as $idx => $entry) {
                        if (!isset($entry['statistic_ref_id'])
                            || intval($entry['statistic_ref_id']) !== $statistic_ref_id) {
                            continue;
                        }
                        $users_quiz_data[$idx]['score']      = $correct_total;
                        $users_quiz_data[$idx]['points']     = $total_earned;
                        $users_quiz_data[$idx]['percentage'] = round($percentage, 2);
                        if (!$has_ungraded) {
                            $users_quiz_data[$idx]['pass'] = (bool) $pass;
                        }
                        $synced = true;
                        break;
                    }
                    if ($synced) {
                        update_user_meta($quiz_user_id, '_sfwd-quizzes', $users_quiz_data);
                    }
                }
            }

            return [
                'success'       => true,
                'points_scored' => $total_earned,
                'points_total'  => $total_max,
                'percentage'    => $percentage,
                'pass'          => $pass,
            ];
        }

        // ─── Private helpers ────────────────────────────────────────────────

        /**
         * Returns true if the attempt has any questions still requiring manual grading.
         * Essays use sfwd-essays post_status; assessment/free_answer use the 0,0
         * correct/incorrect count pattern LD leaves when ungraded.
         */
        private function attempt_has_ungraded_questions($statistic_ref_id) {
            if (!$statistic_ref_id) return false;

            global $wpdb;
            $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
            $question_table = LDLMS_DB::get_table_name('quiz_question');

            if (!$stat_table || !$question_table) return false;

            // assessment_answer / free_answer: LD leaves these at correct=0,incorrect=0 when ungraded
            $count = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*)
                 FROM {$stat_table} s
                 INNER JOIN {$question_table} q ON q.id = s.question_id
                 WHERE s.statistic_ref_id = %d
                   AND q.answer_type IN ('assessment_answer', 'free_answer')
                   AND s.correct_count = 0 AND s.incorrect_count = 0",
                $statistic_ref_id
            ));

            if ($count > 0) return true;

            // Essays: LD sets incorrect_count=1 by default, so post_status is the only reliable signal
            $essay_answer_data = $wpdb->get_col($wpdb->prepare(
                "SELECT s.answer_data
                 FROM {$stat_table} s
                 INNER JOIN {$question_table} q ON q.id = s.question_id
                 WHERE s.statistic_ref_id = %d AND q.answer_type = 'essay'",
                $statistic_ref_id
            ));

            foreach ($essay_answer_data as $raw) {
                $data      = json_decode($raw, true);
                $graded_id = isset($data['graded_id']) ? intval($data['graded_id']) : 0;
                if (!$graded_id || get_post_status($graded_id) !== 'graded') {
                    return true;
                }
            }

            return false;
        }

        /**
         * Parse a user's answer from the stat table + the question's answer options
         * into a structured format for the frontend.
         *
         * Supported types:
         *   - single / multiple  → list of choices with is_correct + was_selected flags
         *   - free_answer / essay → plain user text
         *
         * Returns null for complex types (sort, matrix, cloze, assessment) where a
         * structured breakdown isn't yet implemented.
         */
        private function parse_question_answers($stat_answer_raw, $q_answer_raw, $answer_type) {

            // Choice-based (single / multiple)
            if (in_array($answer_type, ['single', 'multiple'], true)) {
                $q_options = @unserialize($q_answer_raw); // phpcs:ignore
                if (!is_array($q_options)) return null;

                $s_data = @unserialize($stat_answer_raw, ['allowed_classes' => false]); // phpcs:ignore
                if (!is_array($s_data)) $s_data = [];

                $choices = [];
                foreach ($q_options as $i => $opt) {
                    $text       = '';
                    $is_correct = false;
                    $is_html    = false;

                    if (is_object($opt) && !($opt instanceof \__PHP_Incomplete_Class)) {
                        if (method_exists($opt, 'getAnswer'))  $text       = $opt->getAnswer();
                        if (method_exists($opt, 'isCorrect'))  $is_correct = (bool) $opt->isCorrect();
                        if (method_exists($opt, 'isHtml'))     $is_html    = (bool) $opt->isHtml();
                    }

                    $was_selected = isset($s_data[$i]) && (int) $s_data[$i] === 1;

                    $choices[] = [
                        'text'         => $is_html ? wp_kses_post($text) : sanitize_text_field($text),
                        'is_html'      => $is_html,
                        'is_correct'   => $is_correct,
                        'was_selected' => $was_selected,
                    ];
                }

                return ['type' => 'choices', 'items' => $choices];
            }

            // Essay — LD stores {"graded_id": NNN} in answer_data; NNN is the sfwd-essays post holding the text
            if ($answer_type === 'essay') {
                $data      = json_decode($stat_answer_raw, true);
                $graded_id = isset($data['graded_id']) ? intval($data['graded_id']) : 0;
                if ($graded_id) {
                    $essay_post = get_post($graded_id);
                    if ($essay_post && !empty($essay_post->post_content)) {
                        return ['type' => 'text', 'user_text' => wp_kses_post($essay_post->post_content)];
                    }
                }
                return null; // Submitted but no content available yet
            }

            // Free-text / cloze (fill-in-the-blank, auto-graded)
            if (in_array($answer_type, ['free_answer', 'cloze_answer'], true)) {
                $s_data = @unserialize($stat_answer_raw, ['allowed_classes' => false]); // phpcs:ignore

                if (is_array($s_data)) {
                    $text = implode(', ', array_filter(array_map('strval', $s_data), 'strlen'));
                } elseif (is_string($s_data) && $s_data !== '') {
                    $text = $s_data;
                } else {
                    // Fallback: try JSON (LD sometimes stores ["answer"] JSON)
                    $j_data = json_decode($stat_answer_raw, true);
                    if (is_array($j_data)) {
                        $text = implode(', ', array_filter(array_map('strval', $j_data), 'strlen'));
                    } else {
                        $text = is_string($stat_answer_raw) ? $stat_answer_raw : '';
                    }
                }

                if ($text === '') return null;
                return ['type' => 'text', 'user_text' => wp_kses_post($text)];
            }

            return null;
        }

        /**
         * Extract the expected correct answer(s) for a question.
         *
         *   - single / multiple : deserialise answer_data, return options where isCorrect() is true
         *   - cloze_answer      : deserialise answer_data, format {word}/[a|b] template for display
         *   - free_answer       : all listed options are valid — return all
         *   - essay             : no programmatic answer; look up 'essay_answer_key' post meta
         */
        private function parse_correct_answer($q_answer_raw, $answer_type, $question_post_id = 0, $question_id = 0) {

            // Choice-based (single / multiple)
            if (in_array($answer_type, ['single', 'multiple'], true)) {
                $q_options = @unserialize($q_answer_raw); // phpcs:ignore
                if (!is_array($q_options)) return null;

                $correct = [];
                foreach ($q_options as $opt) {
                    if (!is_object($opt) || ($opt instanceof \__PHP_Incomplete_Class)) continue;
                    if (!method_exists($opt, 'isCorrect') || !$opt->isCorrect()) continue;
                    $text    = method_exists($opt, 'getAnswer') ? $opt->getAnswer() : '';
                    $is_html = method_exists($opt, 'isHtml')    && $opt->isHtml();
                    if ($text !== '') {
                        $correct[] = [
                            'text'    => $is_html ? wp_kses_post($text) : sanitize_text_field($text),
                            'is_html' => $is_html,
                        ];
                    }
                }

                return $correct ?: null;
            }

            // Cloze / fill-in-the-blank
            // The question's answer_data holds the full template, e.g. "{41.34} tonnes"
            // or "I {play} [football|soccer]". Format for display.
            if ($answer_type === 'cloze_answer') {
                $q_options = @unserialize($q_answer_raw); // phpcs:ignore
                if (!is_array($q_options)) return null;

                $correct = [];
                foreach ($q_options as $opt) {
                    if (!is_object($opt) || ($opt instanceof \__PHP_Incomplete_Class)) continue;
                    $template = method_exists($opt, 'getAnswer') ? $opt->getAnswer() : '';
                    if ($template === '') continue;

                    // {word} and {[a|b]} → word / alternatives (required blank)
                    $formatted = preg_replace_callback(
                        '/\{(\[([^\]]+)\]|([^}]+))\}/',
                        function ($m) {
                            $inner = $m[2] !== '' ? $m[2] : $m[3];
                            return str_replace('|', ' / ', $inner);
                        },
                        $template
                    );
                    // Remaining [a|b] outside braces → alternatives
                    $formatted = preg_replace_callback(
                        '/\[([^\]]+)\]/',
                        fn($m) => str_replace('|', ' / ', $m[1]),
                        $formatted
                    );

                    $correct[] = [
                        'text'    => sanitize_text_field($formatted),
                        'is_html' => false,
                    ];
                }

                return $correct ?: null;
            }

            // Free-answer: every option is a valid correct answer
            if ($answer_type === 'free_answer') {
                $q_options = @unserialize($q_answer_raw); // phpcs:ignore
                if (!is_array($q_options)) return null;

                $correct = [];
                foreach ($q_options as $opt) {
                    if (!is_object($opt) || ($opt instanceof \__PHP_Incomplete_Class)) continue;
                    $text = method_exists($opt, 'getAnswer') ? $opt->getAnswer() : '';
                    if ($text !== '') {
                        $correct[] = [
                            'text'    => nl2br(esc_html($text)),
                            'is_html' => true,
                        ];
                    }
                }

                return $correct ?: null;
            }

            // Essay — look for instructor-set answer key on the sfwd-question post
            if ($answer_type === 'essay' && $question_post_id) {
                $answer_key = get_post_meta($question_post_id, 'essay_answer_key', true);
                if ($answer_key) {
                    return [['text' => wp_kses_post(nl2br($answer_key)), 'is_html' => true]];
                }
            }

            return null;
        }
    }
}
