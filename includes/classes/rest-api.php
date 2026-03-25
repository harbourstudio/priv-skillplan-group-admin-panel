<?php
/**
 * Rest API plugin class.
 *
 * Notes: LearnDash may be abbreviated as LD in code comments across plugin classes
 *
 * @package BYS_Groups
 * @since 1.0.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Rest_API')) {
    class BYS_Groups_Rest_API {

        private $namespace = 'bys-groups/v1';

        public function __construct() {
            $this->init();
        }

        /**
         * Initialize REST API
         */
        private function init() {
            add_action('rest_api_init', array($this, 'register_routes'));
        }

        /**
         * Get validated auth header for LD API requests
         */
        private function get_validated_auth_header() {
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/auth.php';
            $auth_header = BYS_Groups_Auth::get_auth_header();

            if (!$auth_header) {
                return new \WP_REST_Response(array('error' => 'API credentials not configured'), 500);
            }

            return $auth_header;
        }

        /**
         * Register REST routes
         */
        public function register_routes() {

            // currentUserGroups
            register_rest_route($this->namespace, '/me/groups', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_current_user_groups'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupBaseUsersStats
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/base-user-stats', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_base_users_stats'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupUsers
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/users', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_users'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupUserInfo
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/users/(?P<user_id>\d+)', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_user_info'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupCourses
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/courses', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_courses'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupUserCourseProgress
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/course-progress', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_user_course_progress'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // courseQuizSteps (more specific route, register first)
            register_rest_route($this->namespace, '/courses/(?P<course_id>\d+)/quiz-steps', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_course_quiz_steps'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // courseHierarchialBreakdown
            register_rest_route($this->namespace, '/courses/(?P<course_id>\d+)/steps', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_course_steps'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // userQuizAttempts
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/quiz-attempts', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_quiz_attempts'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));
        }

       
            

        public function check_user_permission($request) {
            // check for Authorization header (basic auth)
            $auth_header = $request->get_header('Authorization');
            if ($auth_header && strpos($auth_header, 'Basic ') === 0) {
                return true;
            }
            // fallback: require user to be logged in
            return is_user_logged_in();
        }

        /**
         * Get all LD groups the current user is a leader of.
         *
         * LD stores group leadership as user meta with key format:
         * learndash_group_leaders_{group_id} => group_id
         */
        public function get_current_user_groups($request) {
            $user_id = get_current_user_id();

            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Not logged in'), 401);
            }

            // extract all group IDs from user meta keys
            $user_group_metas = get_user_meta($user_id);
            $led_group_ids = array();

            foreach ($user_group_metas as $meta_key => $meta_values) {
                // look for meta keys matching learndash_group_leaders_{group_id}
                if (strpos($meta_key, 'learndash_group_leaders_') === 0) {
                    $group_id = intval(str_replace('learndash_group_leaders_', '', $meta_key));
                    if ($group_id > 0) {
                        $led_group_ids[] = $group_id;
                    }
                }
            }

            if (empty($led_group_ids)) {
                return new \WP_REST_Response(array('groups' => array()), 200);
            }

            // build response with group post data
            $user_groups = array();
            foreach ($led_group_ids as $group_id) {
                $group = get_post($group_id);
                if ($group && $group->post_type === 'groups') {
                    $user_groups[] = array(
                        'id'    => $group->ID,
                        'title' => $group->post_title
                    );
                }
            }

            return new \WP_REST_Response(array('groups' => $user_groups), 200);
        }


        public function get_group_base_users_stats($request) {
            $group_id = intval($request['group_id']);

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result; // Return error response
            }
            $auth_header = $auth_result;

            // Fetch group users from LD API
            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/users?&_fields=id";

            $response = wp_remote_get($ld_api_url, array(
                'headers' => array(
                    'Authorization' => $auth_header,
                ),
                'sslverify' => false,
            ));

            if (is_wp_error($response)) {
                return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
            }

            $status = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);

            if ($status !== 200) {
                return new \WP_REST_Response(array('error' => 'Failed to fetch users from LearnDash API', 'status' => $status), $status);
            }

            $group_users = json_decode($body, true);
            if (!is_array($group_users)) {
                $group_users = array();
            }

            $total_members = count($group_users);
            $inactive_members = 0;

            // Count inactive members by checking user meta
            $user_ids = array();
            foreach ($group_users as $user_data) {
                $user_id = intval($user_data['id']);
                $user_ids[] = $user_id;
                $last_login = get_user_meta($user_id, '_ld_notifications_last_login', true);
                if (empty($last_login)) {
                    $inactive_members++;
                }
            }

            // Return stats
            return new \WP_REST_Response(array(
                'group_id'               => $group_id,
                'total_members'          => $total_members,
                'total_inactive_members' => $inactive_members,
                'user_ids'               => $user_ids,
            ), 200);
        }

        public function get_group_users($request) {
            $group_id = intval($request['group_id']);
            $user_ids_param = $request->get_param('user_ids');

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // Parse user_ids from comma-separated param
            $user_ids = array();
            if ($user_ids_param) {
                $user_ids = array_map('intval', explode(',', $user_ids_param));
                $user_ids = array_filter($user_ids);
            }

            if (empty($user_ids)) {
                return new \WP_REST_Response(array(), 200);
            }

            // Fetch user data from WordPress
            $users = array();
            $current_time = current_time('timestamp');
            foreach ($user_ids as $user_id) {
                $user = get_user_by('ID', $user_id);
                if ($user) {
                    // Check multiple login meta keys and use the most recent one
                    $meta_values = array(
                        '_ld_notifications_last_login' => intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                        'learndash-last-login' => intval(get_user_meta($user_id, 'learndash-last-login', true) ?: 0),
                        'last_login' => intval(get_user_meta($user_id, 'last_login', true) ?: 0),
                    );

                    // Find the most recent login timestamp (highest value)
                    $last_login_timestamp = max($meta_values);
                    $last_login_timestamp = $last_login_timestamp > 0 ? $last_login_timestamp : null;

                    // Calculate status based on last_login
                    $status = 'never'; // default: never logged in
                    if ($last_login_timestamp) {
                        $time_diff = $current_time - $last_login_timestamp;
                        $hours_ago = $time_diff / 3600;
                        if ($hours_ago <= 24) {
                            $status = 'online';
                        } else {
                            $status = 'offline';
                        }
                    }

                    $users[] = array(
                        'id'                  => $user->ID,
                        'display_name'        => $user->display_name,
                        'email'               => $user->user_email,
                        'last_login'          => $last_login_timestamp ? wp_date('c', $last_login_timestamp) : null,
                        'status'              => $status,
                        '_debug_meta_values'  => $meta_values, // For debugging - remove after verification
                    );
                }
            }

            return new \WP_REST_Response($users, 200);
        }

        /**
         * Get detailed information for a single user in a group
         */
        public function get_group_user_info($request) {
            $group_id = intval($request['group_id']);
            $user_id = intval($request['user_id']);

            if (!$group_id || !$user_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID or user ID'), 400);
            }

            // Verify user exists and belongs to group
            $user = get_user_by('ID', $user_id);
            if (!$user) {
                return new \WP_REST_Response(array('error' => 'User not found'), 404);
            }

            // Get user's group enrollment date
            $group_enrolled_date = get_user_meta($user_id, "learndash_group_{$group_id}_enrolled_at", true);

            // Check multiple login meta keys and use the most recent one
            $meta_values = array(
                '_ld_notifications_last_login' => intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                'learndash-last-login' => intval(get_user_meta($user_id, 'learndash-last-login', true) ?: 0),
                'last_login' => intval(get_user_meta($user_id, 'last_login', true) ?: 0),
            );

            // Find the most recent login timestamp (highest value)
            $last_login_timestamp = max($meta_values);
            $last_login_timestamp = $last_login_timestamp > 0 ? $last_login_timestamp : null;

            // Calculate status based on last_login (same logic as reporting block)
            $current_time = current_time('timestamp');
            $status = 'never'; // default: never logged in
            if ($last_login_timestamp) {
                $time_diff = $current_time - $last_login_timestamp;
                $hours_ago = $time_diff / 3600;
                if ($hours_ago <= 24) {
                    $status = 'online';
                } else {
                    $status = 'offline';
                }
            }

            $user_data = array(
                'id'                   => $user->ID,
                'first_name'           => $user->first_name,
                'last_name'            => $user->last_name,
                'display_name'         => $user->display_name,
                'email'                => $user->user_email,
                'status'               => $status,
                'group_enrolled_date'  => $group_enrolled_date ?: null,
                'last_login'           => $last_login_timestamp,
            );

            return new \WP_REST_Response($user_data, 200);
        }

        public function get_group_courses($request) {
            $group_id = intval($request['group_id']);

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result; // Return error response
            }
            $auth_header = $auth_result;

            // call to get group courses
            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/courses?_fields=id,title";

            $response = wp_remote_get($ld_api_url, array(
                'headers' => array(
                    'Authorization' => $auth_header,
                ),
                'sslverify' => false,
            ));

            if (is_wp_error($response)) {
                return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
            }

            $status = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);

            if ($status !== 200) {
                return new \WP_REST_Response(array('error' => 'Failed to fetch courses from LearnDash API', 'status' => $status), $status);
            }

            $courses = json_decode($body, true);

            // extract just id and title from each course
            $formatted_courses = array();
            if (is_array($courses)) {
                foreach ($courses as $course) {
                    $formatted_courses[] = array(
                        'id'    => $course['id'] ?? null,
                        'title' => $course['title'] ?? 'Untitled',
                    );
                }
            }

            return new \WP_REST_Response($formatted_courses, 200);
        }

        /**
         * Get hierarchal lessons and topics data for a course
         */
        public function get_course_steps($request) {
            $course_id = intval($request['course_id']);

            if (!$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid course ID'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result; // Return error response
            }
            $auth_header = $auth_result;

            // Fetch steps from LD API
            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/sfwd-courses/{$course_id}/steps?_fields=h";

            $response = wp_remote_get($ld_api_url, array(
                'headers' => array(
                    'Authorization' => $auth_header,
                ),
                'sslverify' => false,
                'timeout'   => 60, // Increase timeout to 60 seconds for large courses
            ));

            if (is_wp_error($response)) {
                return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
            }

            $status = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);

            if ($status !== 200) {
                return new \WP_REST_Response(array('error' => 'Failed to fetch steps from LearnDash API', 'status' => $status), $status);
            }

            $data = json_decode($body, true);

            // NOTE: this is parsing data based on the type=h (type=hierarchal) structure of that LD endpoint (added to url as _fields=h)
            $h_lessons = $data['h']['sfwd-lessons'] ?? array();
            $lessons = array();

            foreach ($h_lessons as $lesson_id => $lesson_data) {
                $lesson = get_post($lesson_id);
                $topics_data = $lesson_data['sfwd-topic'] ?? array();

                $lessons[] = array(
                    'id'     => $lesson_id,
                    'title'  => $lesson ? $lesson->post_title : 'Undefined',
                    'topics' => array_map(function ($topic_id) {
                        $topic = get_post($topic_id);
                        return array(
                            'id'    => $topic_id,
                            'title' => $topic ? $topic->post_title : 'Undefined',
                        );
                    }, array_keys($topics_data)),
                );
            }

            return new \WP_REST_Response($lessons, 200);
        }

        /**
         * Get user course progress for specific courses
         * Fetches progress, completion, enrollment, and step data from user meta and activity table
         */
        public function get_group_user_course_progress($request) {
            $user_id = intval($request['user_id']);
            $course_ids_param = $request->get_param('course_ids'); // comma-separated: 1,2,3

            if (!$user_id || !$course_ids_param) {
                return new \WP_REST_Response(array('error' => 'Invalid user ID or course_ids'), 400);
            }

            // Parse course IDs
            $course_ids = array_map('intval', explode(',', $course_ids_param));
            $course_ids = array_filter($course_ids);

            if (empty($course_ids)) {
                return new \WP_REST_Response(array(), 200);
            }

            // Query user's course progress from user meta
            $progress_data = get_user_meta($user_id, '_sfwd-course_progress', true);
            $progress_map = array();

            if (!empty($progress_data) && is_array($progress_data)) {
                foreach ($progress_data as $course_id => $course_progress) {
                    if (is_array($course_progress) && isset($course_progress['status'])) {
                        $progress_map[intval($course_id)] = array(
                            'status'    => $course_progress['status'],
                            'completed' => intval($course_progress['completed'] ?? 0),
                            'total'     => intval($course_progress['total'] ?? 0),
                        );
                    }
                }
            }

            // Batch query for completion dates from activity table
            global $wpdb;
            $completion_map = array();

            if (!empty($course_ids)) {
                $placeholders = implode(',', array_fill(0, count($course_ids), '%d'));
                $query_args = array_merge([$user_id], $course_ids);

                $query = $wpdb->prepare(
                    "SELECT course_id, activity_completed
                     FROM {$wpdb->prefix}learndash_user_activity
                     WHERE user_id = %d AND course_id IN ($placeholders) AND activity_type = 'course' AND activity_status = 1",
                    ...$query_args
                );

                $rows = $wpdb->get_results($query);
                if (!empty($rows)) {
                    foreach ($rows as $row) {
                        $completion_map[intval($row->course_id)] = intval($row->activity_completed);
                    }
                }
            }

            // Build result with enriched data
            $result = array();
            foreach ($course_ids as $course_id) {
                $course_progress = $progress_map[$course_id] ?? array('status' => 'not_started', 'completed' => 0, 'total' => 0);

                // Get enrollment date from user meta
                $enrolled_ts = get_user_meta($user_id, "learndash_course_{$course_id}_enrolled_at", true);
                $enrolled_at = $enrolled_ts ? wp_date('c', intval($enrolled_ts)) : null;

                // Get completion date from activity table
                $completed_ts = $completion_map[$course_id] ?? null;
                $date_completed = $completed_ts ? wp_date('c', intval($completed_ts)) : null;

                $result[] = array(
                    'course_id'       => $course_id,
                    'progress_status' => $course_progress['status'],
                    'steps_completed' => $course_progress['completed'],
                    'steps_total'     => $course_progress['total'],
                    'enrolled_at'     => $enrolled_at,
                    'date_completed'  => $date_completed,
                );
            }

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Get quiz steps for a course
         * Returns first 3 quizzes in a course with caching
         */
        public function get_course_quiz_steps($request) {
            $course_id = intval($request['course_id']);

            if (!$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid course ID'), 400);
            }

            // Check transient cache
            $cache_key = "bys_quiz_steps_{$course_id}";
            $cached = get_transient($cache_key);
            if ($cached !== false) {
                return new \WP_REST_Response($cached, 200);
            }

            // Query for quiz steps in this course
            global $wpdb;
            $steps = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID as step_id, p.post_title as step_title
                 FROM {$wpdb->posts} p
                 JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
                 WHERE pm.meta_key = 'course_id' AND pm.meta_value = %d
                 AND p.post_type = 'sfwd-quiz' AND p.post_status = 'publish'
                 ORDER BY p.menu_order ASC
                 LIMIT 3",
                $course_id
            ));

            if (!$steps) {
                $steps = array();
            }

            // Convert to array of objects with correct keys
            $result = array();
            foreach ($steps as $step) {
                $result[] = array(
                    'step_id'    => intval($step->step_id),
                    'step_title' => $step->step_title,
                );
            }

            // Cache for 1 hour
            set_transient($cache_key, $result, HOUR_IN_SECONDS);

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Get quiz attempts for a user in a course
         * Returns the best attempt (highest percentage) for each quiz with configured pass threshold
         */
        public function get_user_quiz_attempts($request) {
            $user_id = intval($request['user_id']);
            $course_id = intval($request->get_param('course_id'));

            if (!$user_id || !$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid user_id or course_id'), 400);
            }

            // Query quiz attempts from activity table with points data, ordered by highest percentage first
            global $wpdb;
            $attempts = $wpdb->get_results($wpdb->prepare(
                "SELECT a.activity_id, a.post_id as quiz_id, a.activity_completed as completed,
                        CAST(m1.activity_meta_value AS UNSIGNED) as percentage,
                        CAST(m2.activity_meta_value AS UNSIGNED) as points,
                        CAST(m3.activity_meta_value AS UNSIGNED) as total_points
                 FROM {$wpdb->prefix}learndash_user_activity a
                 LEFT JOIN {$wpdb->prefix}learndash_user_activity_meta m1
                   ON a.activity_id = m1.activity_id AND m1.activity_meta_key = 'percentage'
                 LEFT JOIN {$wpdb->prefix}learndash_user_activity_meta m2
                   ON a.activity_id = m2.activity_id AND m2.activity_meta_key = 'points'
                 LEFT JOIN {$wpdb->prefix}learndash_user_activity_meta m3
                   ON a.activity_id = m3.activity_id AND m3.activity_meta_key = 'total_points'
                 WHERE a.user_id = %d AND a.course_id = %d AND a.activity_type = 'quiz'
                 ORDER BY a.post_id ASC, CAST(m1.activity_meta_value AS UNSIGNED) DESC",
                $user_id, $course_id
            ));

            if (!$attempts) {
                $attempts = array();
            }

            // Build result array with best attempt per quiz and configured pass threshold
            $result = array();
            $seen_quizzes = array();

            foreach ($attempts as $attempt) {
                $quiz_id = intval($attempt->quiz_id);

                // Skip if we've already recorded the best attempt for this quiz
                if (isset($seen_quizzes[$quiz_id])) {
                    continue;
                }

                $percentage = intval($attempt->percentage ?? 0);
                $points = intval($attempt->points ?? 0);
                $total_points = intval($attempt->total_points ?? 0);

                // Get the quiz's configured passing percentage
                $passing_meta = get_post_meta($quiz_id, '_sfwd-quiz_passingpercentage', true);
                $passing_percentage = !empty($passing_meta) ? intval($passing_meta) : 80;

                $result[] = array(
                    'quiz_id'           => $quiz_id,
                    'percentage'        => $percentage,
                    'points'            => $points,
                    'total_points'      => $total_points,
                    'passing_threshold' => $passing_percentage,
                    'pass'              => $percentage >= $passing_percentage,
                    'completed'         => intval($attempt->completed ?? 0),
                );

                $seen_quizzes[$quiz_id] = true;
            }

            return new \WP_REST_Response($result, 200);
        }
    }
}