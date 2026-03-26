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
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-auth.php';
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

            // groupCourseCompletionStats
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/course-completion-stats', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_course_completion_stats'),
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

            // userQuizProgress - user's summary of all quizzes in group courses
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/quiz-progress', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_quiz_progress_summary'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // userQuizAttempts - detailed attempts for a specific quiz
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/quiz-attempts/(?P<quiz_id>\d+)', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_quiz_attempts'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // userActivity - activity log for a user
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/activity', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_activity'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // logCertificateView - log when user views a certificate
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/log-certificate-view', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'log_certificate_view'),
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
         * Get course completion stats for entire group via LD API
         * Totals completed/incomplete counts across all users
         */
        public function get_group_course_completion_stats($request) {
            $group_id = intval($request['group_id']);
            $course_ids_param = $request->get_param('course_ids');

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group_id'), 400);
            }

            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result;
            }
            $auth_header = $auth_result;

            // fetch all user IDs in this group from LD API
            $ld_users_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/users?_fields=id";
            $response = wp_remote_get($ld_users_url, array(
                'headers'   => array('Authorization' => $auth_header),
                'timeout'   => 30,
                'sslverify' => false,
            ));

            if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
                return new \WP_REST_Response(array('error' => 'Failed to fetch group users'), 500);
            }

            $group_users = json_decode(wp_remote_retrieve_body($response), true);
            if (!is_array($group_users) || empty($group_users)) {
                return new \WP_REST_Response(array('total_completed' => 0, 'total_incomplete' => 0), 200);
            }

            $user_ids = array_map(function($u) { return intval($u['id']); }, $group_users);

            // Resolve course IDs — either from param or fetch from LD API
            if (!empty($course_ids_param)) {
                $course_ids = array_filter(array_map('intval', explode(',', $course_ids_param)));
            } else {
                $group_courses = $this->get_group_courses_internal($group_id, $auth_header);
                if (is_a($group_courses, 'WP_REST_Response')) {
                    return $group_courses;
                }
                $course_ids = array_map(function($c) { return intval($c['id']); }, $group_courses);
            }

            if (empty($course_ids)) {
                return new \WP_REST_Response(array('total_completed' => 0, 'total_incomplete' => 0), 200);
            }

            $total_completed = 0;
            $total_incomplete = 0;

            // For each user × course, fetch progress_status from LD API
            foreach ($user_ids as $user_id) {
                foreach ($course_ids as $course_id) {
                    $ld_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/course-progress/{$course_id}?_fields=progress_status";

                    $response = wp_remote_get($ld_url, array(
                        'headers'   => array('Authorization' => $auth_header),
                        'timeout'   => 30,
                        'sslverify' => false,
                    ));

                    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
                        continue; // Skip if request fails
                    }

                    $progress = json_decode(wp_remote_retrieve_body($response), true);
                    if (!is_array($progress) || empty($progress)) {
                        $total_incomplete++;
                        continue;
                    }

                    $status = $progress['progress_status'] ?? '';
                    if ($status === 'completed') {
                        $total_completed++;
                    } else {
                        $total_incomplete++;
                    }
                }
            }

            return new \WP_REST_Response(array(
                'total_completed'  => $total_completed,
                'total_incomplete' => $total_incomplete,
            ), 200);
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

            // Fetch steps from LD API with hierarchical and type-list formats
            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/sfwd-courses/{$course_id}/steps?_fields=h,t";

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

            // Parse hierarchical structure for lessons/topics
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

            // Extract quiz IDs from type-list format (t.sfwd-quiz)
            $quiz_ids = $data['t']['sfwd-quiz'] ?? array();

            return new \WP_REST_Response(array(
                'lessons' => $lessons,
                'quiz_ids' => array_map('intval', $quiz_ids),
            ), 200);
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
        /**
         * Get quiz progress summary for all quizzes in group courses
         * Optional: Pass course_ids to avoid server-side fetch
         * Format: ?course_ids=1,2,3 (comma-separated course IDs)
         */
        public function get_user_quiz_progress_summary($request) {
            $user_id = intval($request['user_id']);
            $group_id = intval($request->get_param('group_id'));
            $course_ids_param = $request->get_param('course_ids');

            if (!$user_id || !$group_id) {
                return new \WP_REST_Response(array('error' => 'user_id and group_id parameters required'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result;
            }
            $auth_header = $auth_result;

            // If course_ids provided, use them directly; otherwise fetch from server
            if (!empty($course_ids_param)) {
                $course_ids = array_map('intval', array_filter(explode(',', $course_ids_param)));
                if (empty($course_ids)) {
                    return new \WP_REST_Response(array('error' => 'Invalid course_ids parameter'), 400);
                }
            } else {
                // Fetch group courses via internal call
                $group_courses = $this->get_group_courses_internal($group_id, $auth_header);
                if (is_a($group_courses, 'WP_REST_Response')) {
                    return $group_courses;
                }

                if (empty($group_courses)) {
                    return new \WP_REST_Response(array(), 200);
                }

                $course_ids = array_map(function($course) { return intval($course['id']); }, $group_courses);
            }

            // Build course ID -> title map for later lookup (fetch titles if needed)
            $course_map = array();

            // If course_ids were provided, we still need titles from LD API
            if (!empty($course_ids_param)) {
                // Fetch course titles from LD API
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/courses?_fields=id,title";
                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array('Authorization' => $auth_header),
                    'timeout'   => 30,
                    'sslverify' => false,
                ));

                if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                    $courses = json_decode(wp_remote_retrieve_body($response), true);
                    if (is_array($courses)) {
                        foreach ($courses as $course) {
                            $title = $course['title'];
                            if (is_array($title) && isset($title['rendered'])) {
                                $title = $title['rendered'];
                            }
                            $course_map[intval($course['id'])] = $title;
                        }
                    }
                }
            } else {
                // Build map from already-fetched courses
                foreach ($group_courses as $course) {
                    $course_map[$course['id']] = $course['title'];
                }
            }

            // Collect all quiz IDs from all courses
            $all_quiz_ids = array();
            $quiz_course_map = array(); // quiz_id -> course_id (for parent course reference)

            foreach ($course_ids as $course_id) {

                // Fetch course steps to get quiz IDs
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/sfwd-courses/{$course_id}/steps?_fields=h,t";

                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array(
                        'Authorization' => $auth_header,
                    ),
                    'timeout'   => 60,
                    'sslverify' => false,
                ));

                if (is_wp_error($response)) {
                    error_log('[BYS Groups] Course steps fetch failed for course ' . $course_id . ': ' . $response->get_error_message());
                    continue;
                }

                $status = wp_remote_retrieve_response_code($response);
                if ($status !== 200) {
                    error_log('[BYS Groups] Course steps API returned status ' . $status . ' for course ' . $course_id);
                    continue;
                }

                $body = wp_remote_retrieve_body($response);
                $steps_data = json_decode($body, true);

                // Extract quiz IDs from type-list format (t.sfwd-quiz)
                $quiz_ids = $steps_data['t']['sfwd-quiz'] ?? array();
                foreach ($quiz_ids as $quiz_id) {
                    $quiz_id = intval($quiz_id);
                    if ($quiz_id > 0) {
                        $all_quiz_ids[$quiz_id] = true;
                        // Map quiz to course (for parent course reference)
                        if (!isset($quiz_course_map[$quiz_id])) {
                            $quiz_course_map[$quiz_id] = $course_id;
                        }
                    }
                }
            }

            if (empty($all_quiz_ids)) {
                return new \WP_REST_Response(array(), 200);
            }

            // Fetch quiz attempts for each quiz ID
            $result = array();
            foreach (array_keys($all_quiz_ids) as $quiz_id) {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/quiz-progress?quiz={$quiz_id}";

                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array(
                        'Authorization' => $auth_header,
                    ),
                    'timeout'   => 60,
                    'sslverify' => false,
                ));

                if (is_wp_error($response)) {
                    error_log('[BYS Groups] Quiz progress fetch failed for quiz ' . $quiz_id . ': ' . $response->get_error_message());
                    continue;
                }

                $status = wp_remote_retrieve_response_code($response);
                if ($status !== 200) {
                    error_log('[BYS Groups] Quiz progress API returned status ' . $status . ' for quiz ' . $quiz_id);
                    continue;
                }

                $body = wp_remote_retrieve_body($response);
                $attempts = json_decode($body, true);

                if (!is_array($attempts) || empty($attempts)) {
                    continue;
                }

                // Get quiz title
                $quiz = get_post($quiz_id);
                $title = $quiz ? $quiz->post_title : 'Quiz #' . $quiz_id;

                // Get parent course ID and title
                $parent_course_id = $quiz_course_map[$quiz_id] ?? 0;
                $parent_course_title = $course_map[$parent_course_id] ?? 'Course #' . $parent_course_id;

                // Sort by completed timestamp descending to get latest
                usort($attempts, function ($a, $b) {
                    $ts_a = strtotime($a['completed'] ?? 0);
                    $ts_b = strtotime($b['completed'] ?? 0);
                    return $ts_b - $ts_a;
                });

                $latest_attempt = $attempts[0];

                // Find highest percentage
                $highest_attempt = $attempts[0];
                foreach ($attempts as $attempt) {
                    $percentage = floatval($attempt['percentage'] ?? 0);
                    if ($percentage > floatval($highest_attempt['percentage'] ?? 0)) {
                        $highest_attempt = $attempt;
                    }
                }

                $result[] = array(
                    'id'                      => $quiz_id,
                    'quiz_id'                 => $quiz_id,
                    'title'                   => $title,
                    'parent_course_id'        => $parent_course_id,
                    'parent_course_title'     => $parent_course_title,
                    'total_attempts'          => count($attempts),
                    'percent_highest'         => floatval($highest_attempt['percentage'] ?? 0),
                    'percent_latest'          => floatval($latest_attempt['percentage'] ?? 0),
                    'points_scored_highest'   => floatval($highest_attempt['points_scored'] ?? 0),
                    'points_total_highest'    => floatval($highest_attempt['points_total'] ?? 0),
                    'points_scored_latest'    => floatval($latest_attempt['points_scored'] ?? 0),
                    'points_total_latest'     => floatval($latest_attempt['points_total'] ?? 0),
                    'pass_highest'            => (bool)($highest_attempt['pass'] ?? false),
                    'pass_latest'             => (bool)($latest_attempt['pass'] ?? false),
                    'latest_timestamp'        => $latest_attempt['completed'] ?? null,
                );
            }

            // Sort by latest_timestamp descending (most recent first)
            usort($result, function ($a, $b) {
                $ts_a = strtotime($a['latest_timestamp'] ?? 0);
                $ts_b = strtotime($b['latest_timestamp'] ?? 0);
                return $ts_b - $ts_a;
            });

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Get all attempts for a specific quiz
         */
        public function get_user_quiz_attempts($request) {
            $user_id = intval($request['user_id']);
            $quiz_id = intval($request['quiz_id']);

            if (!$user_id || !$quiz_id) {
                return new \WP_REST_Response(array('error' => 'user_id and quiz_id parameters required'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result;
            }
            $auth_header = $auth_result;

            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/quiz-progress?quiz={$quiz_id}";

            $response = wp_remote_get($ld_api_url, array(
                'headers' => array(
                    'Authorization' => $auth_header,
                ),
                'timeout'   => 60,
                'sslverify' => false,
            ));

            if (is_wp_error($response)) {
                return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
            }

            $status = wp_remote_retrieve_response_code($response);
            if ($status !== 200) {
                return new \WP_REST_Response(array('error' => 'Failed to fetch quiz attempts from LearnDash API', 'status' => $status), $status);
            }

            $body = wp_remote_retrieve_body($response);
            $attempts = json_decode($body, true);

            if (!is_array($attempts)) {
                $attempts = array();
            }

            // Normalize attempt data to include score breakdown
            $normalized = array();
            foreach ($attempts as $attempt) {
                $normalized[] = array(
                    'id'              => $attempt['id'] ?? null,
                    'completed'       => $attempt['completed'] ?? null,
                    'percentage'      => floatval($attempt['percentage'] ?? 0),
                    'pass'            => (bool)($attempt['pass'] ?? false),
                    'points_scored'   => floatval($attempt['points_scored'] ?? 0),
                    'points_total'    => floatval($attempt['points_total'] ?? 0),
                );
            }

            // Sort by completed timestamp descending (most recent first)
            usort($normalized, function ($a, $b) {
                $ts_a = strtotime($a['completed'] ?? 0);
                $ts_b = strtotime($b['completed'] ?? 0);
                return $ts_b - $ts_a;
            });

            return new \WP_REST_Response($normalized, 200);
        }

        /**
         * Internal helper to fetch group courses (reusable by other endpoints)
         * Returns array of course objects with id and title
         */
        private function get_group_courses_internal($group_id, $auth_header) {
            // Fetch group users from LD API
            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/courses?_fields=id,title";

            $response = wp_remote_get($ld_api_url, array(
                'headers' => array(
                    'Authorization' => $auth_header,
                ),
                'timeout'   => 30,
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
            if (!is_array($courses)) {
                $courses = array();
            }

            // Ensure each course has both id and title
            $result = array();
            foreach ($courses as $course) {
                if (isset($course['id'])) {
                    $course_title = $course['title'];
                    if (is_array($course_title) && isset($course_title['rendered'])) {
                        $course_title = $course_title['rendered'];
                    }

                    $result[] = array(
                        'id'    => intval($course['id']),
                        'title' => $course_title,
                    );
                }
            }

            return $result;
        }

        /**
         * Get user activity log with pagination and filtering
         */
        public function get_user_activity($request) {
            global $wpdb;

            $user_id = intval($request['user_id']);
            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Invalid user ID'), 400);
            }

            $activity_filter = sanitize_text_field($request->get_param('activity') ?? '');
            $date_from = sanitize_text_field($request->get_param('date_from') ?? '');
            $date_to = sanitize_text_field($request->get_param('date_to') ?? '');
            $per_page = min(intval($request->get_param('per_page') ?? 20), 100);
            $page = max(intval($request->get_param('page') ?? 1), 1);

            if ($per_page < 1) $per_page = 20;

            $activity_labels = array(
                'user_login'              => 'Logged In',
                'profile_update'          => 'Updated Profile',
                'account_settings_update' => 'Updated Account Settings',
                'certificate_earned'      => 'Earned a Certificate',
                'certificate_viewed'      => 'Viewed a Certificate',
            );

            $where_clauses = array(
                $wpdb->prepare("user_id = %d", $user_id)
            );

            if (!empty($activity_filter)) {
                $where_clauses[] = $wpdb->prepare("activity = %s", $activity_filter);
            }

            if (!empty($date_from)) {
                $where_clauses[] = $wpdb->prepare("DATE(created_at) >= %s", $date_from);
            }

            if (!empty($date_to)) {
                $where_clauses[] = $wpdb->prepare("DATE(created_at) <= %s", $date_to);
            }

            $where = implode(" AND ", $where_clauses);
            $table = $wpdb->prefix . BYS_GROUPS_USER_ACTIVITY_TABLE;

            $total = intval($wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE {$where}"));

            $offset = ($page - 1) * $per_page;
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT id, activity, initiated_by, object_id, object_title, object_type, meta, created_at
                     FROM {$table}
                     WHERE {$where}
                     ORDER BY created_at DESC
                     LIMIT %d OFFSET %d",
                    $per_page,
                    $offset
                ),
                ARRAY_A
            );

            $items = array();
            foreach ($rows as $row) {
                $activity_slug = $row['activity'];
                $items[] = array(
                    'id'              => intval($row['id']),
                    'activity'        => $activity_slug,
                    'activity_label'  => $activity_labels[$activity_slug] ?? ucwords(str_replace('_', ' ', $activity_slug)),
                    'initiated_by'    => $row['initiated_by'] ?? '',
                    'object_id'       => intval($row['object_id']),
                    'object_title'    => $row['object_title'] ?? '',
                    'object_type'     => $row['object_type'] ?? '',
                    'meta'            => !empty($row['meta']) ? json_decode($row['meta'], true) : array(),
                    'created_at'      => mysql_to_rfc3339($row['created_at']),
                );
            }

            $pages = $per_page > 0 ? ceil($total / $per_page) : 0;

            return new \WP_REST_Response(array(
                'total' => $total,
                'pages' => $pages,
                'items' => $items,
            ), 200);
        }

        /**
         * Log certificate view event via REST API
         *
         * Called by certificate-link-tracker.js when user clicks a certificate link
         */
        public function log_certificate_view($request) {
            global $wpdb;

            $user_id = intval($request['user_id']);
            $course_id = intval($request->get_param('course_id') ?? 0);

            if (!$user_id || !$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid user_id or course_id'), 400);
            }

            $user = get_user_by('ID', $user_id);
            if (!$user) {
                return new \WP_REST_Response(array('error' => 'User not found'), 404);
            }

            // Prevent duplicate logs within 12 hours
            $cache_key = "cert_viewed_{$user_id}_{$course_id}";
            // if (get_transient($cache_key)) {
            //     return new \WP_REST_Response(array('message' => 'Already logged within 12 hours'), 200);
            // }

            $course_title = get_the_title($course_id);
            $table = $wpdb->prefix . BYS_GROUPS_USER_ACTIVITY_TABLE;

            // Fetch certificate details from LD API
            $cert_id = null;
            $awarded_cert_url = null;
            $auth_header = $this->get_validated_auth_header();
            if ($auth_header && !is_wp_error($auth_header)) {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/courses?include={$course_id}";
                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array('Authorization' => $auth_header),
                    'timeout' => 30,
                    'sslverify' => false,
                ));

                if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                    $body = wp_remote_retrieve_body($response);
                    if (preg_match('/\[.*\]/s', $body, $matches)) {
                        $body = $matches[0];
                    } elseif (preg_match('/\{.*\}/s', $body, $matches)) {
                        $body = $matches[0];
                    }
                    $data = json_decode($body, true);
                    if (is_array($data) && !empty($data)) {
                        $course = $data[0];
                        $cert_id = intval($course['certificate'] ?? 0);
                        $awarded_cert_url = $course['awarded_certificate_url'] ?? null;
                    }
                }
            }

            $wpdb->insert(
                $table,
                array(
                    'user_id'      => $user_id,
                    'activity'     => 'certificate_viewed',
                    'initiated_by' => 'self',
                    'object_id'    => $course_id,
                    'object_title' => $course_title ?: null,
                    'object_type'  => 'course',
                    'meta'         => json_encode(array(
                        'viewed_at'              => current_time('mysql'),
                        'certificate_id'        => $cert_id,
                        'awarded_certificate_url' => $awarded_cert_url,
                    )),
                    'created_at'   => current_time('mysql'),
                ),
                array('%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s')
            );

            set_transient($cache_key, true, 12 * HOUR_IN_SECONDS);

            return new \WP_REST_Response(array('message' => 'Certificate view logged'), 200);
        }
    }
}