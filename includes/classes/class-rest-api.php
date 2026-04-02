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

            // userCourseStepsProgress - all steps progress for a user in a course (lessons, topics, quizzes)
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/course-progress-steps/(?P<course_id>\d+)', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_course_steps_progress'),
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

            // Fetch all group users from LD API (paginated — LD defaults to 10 per page)
            $group_users = array();
            $page        = 1;
            $per_page    = 100;

            do {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/users?_fields=id&per_page={$per_page}&page={$page}";

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
                $body   = wp_remote_retrieve_body($response);

                if ($status !== 200) {
                    return new \WP_REST_Response(array('error' => 'Failed to fetch users from LearnDash API', 'status' => $status), $status);
                }

                $page_users = json_decode($body, true);
                if (!is_array($page_users) || empty($page_users)) {
                    break;
                }

                $group_users = array_merge($group_users, $page_users);
                $page++;
            } while (count($page_users) === $per_page);

            $total_members = count($group_users);
            $inactive_members = 0;

            // Count inactive members by checking user meta
            $user_ids = array();
            foreach ($group_users as $user_data) {
                $user_id = intval($user_data['id']);
                $user_ids[] = $user_id;
                $last_login = get_user_meta($user_id, 'learndash_last_login', true);
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
                        'id'           => $user->ID,
                        'first_name'   => get_user_meta($user_id, 'first_name', true) ?: '',
                        'last_name'    => get_user_meta($user_id, 'last_name', true) ?: '',
                        'display_name' => $user->display_name,
                        'email'        => $user->user_email,
                        'last_login'   => $last_login_timestamp ? wp_date('c', $last_login_timestamp) : null,
                        'status'       => $status,
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

            // extract id, title, and shortname (custom meta) from each course
            $formatted_courses = array();
            if (is_array($courses)) {
                foreach ($courses as $course) {
                    $course_id = $course['id'] ?? null;
                    $shortname = $course_id ? get_post_meta($course_id, 'shortname', true) : '';
                    $formatted_courses[] = array(
                        'id'        => $course_id,
                        'title'     => $course['title'] ?? 'Untitled',
                        'shortname' => $shortname ?: null,
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
                $date_completed_gmt = $completed_ts ? gmdate('Y-m-d H:i:s', intval($completed_ts)) : null;

                $result[] = array(
                    'course_id'           => $course_id,
                    'progress_status'     => $course_progress['status'],
                    'steps_completed'     => $course_progress['completed'],
                    'steps_total'         => $course_progress['total'],
                    'enrolled_at'         => $enrolled_at,
                    'date_completed'      => $date_completed,
                    'date_completed_gmt'  => $date_completed_gmt,
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
         * Get last accessed timestamp for a lesson or topic
         *
         * Queries LearnDash user activity to find when the user last accessed the given object
         * Returns RFC3339 formatted timestamp or null if never accessed
         */
        private function get_last_accessed_timestamp($user_id, $post_id, $object_type) {
            // Map object_type to LearnDash activity_type
            $activity_type = ($object_type === 'topic') ? 'topic' : 'lesson';

            // Query LearnDash activity
            $activity = learndash_get_user_activity([
                'user_id'       => $user_id,
                'post_id'       => $post_id,
                'activity_type' => $activity_type,
            ]);

            if (!$activity) {
                return null;
            }

            // Use activity_updated if available (most recent activity update)
            // Fall back to activity_completed or activity_started
            $timestamp = $activity->activity_updated ?: $activity->activity_completed ?: $activity->activity_started;

            if ($timestamp <= 0) {
                return null;
            }

            // Convert Unix timestamp to RFC3339 format
            return mysql_to_rfc3339(date('Y-m-d H:i:s', $timestamp));
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

            // Check if course_id is provided - if so, return last activity for that course only
            $course_id = intval($request->get_param('course_id') ?? 0);
            if ($course_id) {
                return $this->get_user_course_last_activity($user_id, $course_id);
            }

            // Handle multiple activity filters (activity[]=val1&activity[]=val2)
            $activity_filters = $request->get_param('activity');
            if (is_string($activity_filters)) {
                $activity_filters = array($activity_filters);
            } elseif (!is_array($activity_filters)) {
                $activity_filters = array();
            }
            $activity_filters = array_map('sanitize_text_field', $activity_filters);
            $activity_filters = array_filter($activity_filters); // Remove empty values

            $date_from = sanitize_text_field($request->get_param('date_from') ?? '');
            $date_to = sanitize_text_field($request->get_param('date_to') ?? '');
            $per_page = min(intval($request->get_param('per_page') ?? 20), 100);
            $page = max(intval($request->get_param('page') ?? 1), 1);

            if ($per_page < 1) $per_page = 20;

            // Fetch custom table activities
            $where_clauses = array(
                $wpdb->prepare("user_id = %d", $user_id)
            );

            if (!empty($activity_filters)) {
                $placeholders = implode(',', array_fill(0, count($activity_filters), '%s'));
                $where_clauses[] = $wpdb->prepare("activity IN ({$placeholders})", ...$activity_filters);
            }

            // Handle object_type[] filters (resource type)
            $object_type_filters = $request->get_param('object_type');
            if (is_string($object_type_filters)) {
                $object_type_filters = array($object_type_filters);
            } elseif (!is_array($object_type_filters)) {
                $object_type_filters = array();
            }
            $object_type_filters = array_map('sanitize_text_field', $object_type_filters);
            $object_type_filters = array_filter($object_type_filters);

            $skip_db_query = false;

            if (!empty($object_type_filters)) {
                // Object types now sourced exclusively from external APIs, NOT the custom DB table:
                // - 'achievement' → GamiPress REST API
                // - 'form'        → Gravity Forms REST API
                // - 'lesson'      → wp_learndash_user_activity (direct $wpdb query)
                // - 'topic'       → wp_learndash_user_activity (direct $wpdb query)
                // - 'quiz'        → wp_learndash_user_activity (direct $wpdb query)
                // Note: 'course' still has DB rows: course_enrolled, course_unenrolled, certificate_earned, certificate_viewed
                $non_db_types = ['achievement', 'form', 'lesson', 'topic', 'quiz'];
                $db_object_types = array_filter($object_type_filters, fn($t) => !in_array($t, $non_db_types));
                if (!empty($db_object_types)) {
                    $placeholders = implode(',', array_fill(0, count($db_object_types), '%s'));
                    $where_clauses[] = $wpdb->prepare("object_type IN ({$placeholders})", ...$db_object_types);
                } else {
                    // If all object_type filters were excluded from DB, skip DB query entirely
                    $skip_db_query = true;
                }
            }

            if (!empty($date_from)) {
                $where_clauses[] = $wpdb->prepare("DATE(created_at) >= %s", $date_from);
            }

            if (!empty($date_to)) {
                $where_clauses[] = $wpdb->prepare("DATE(created_at) <= %s", $date_to);
            }

            $rows = array();

            if (!$skip_db_query) {
                $where = implode(" AND ", $where_clauses);
                $table = $wpdb->prefix . BYS_GROUPS_USER_ACTIVITY_TABLE;

                $rows = $wpdb->get_results(
                    "SELECT id, activity, initiated_by, object_id, object_title, object_type, meta, created_at
                     FROM {$table}
                     WHERE {$where}",
                    ARRAY_A
                );
            }

            $items = array();
            foreach ($rows as $row) {
                $activity_slug = $row['activity'];
                $object_type = $row['object_type'] ?? '';
                $object_id = intval($row['object_id']);
                $meta = !empty($row['meta']) ? json_decode($row['meta'], true) : array();

                // Enrich lesson/topic entries with last_accessed timestamp from LearnDash
                if (in_array($object_type, ['lesson', 'topic']) && $object_id > 0) {
                    $last_accessed = $this->get_last_accessed_timestamp($user_id, $object_id, $object_type);
                    if ($last_accessed) {
                        $meta['last_accessed'] = $last_accessed;
                    }
                }

                $items[] = array(
                    'id'              => intval($row['id']),
                    'activity'        => $activity_slug,
                    'initiated_by'    => $row['initiated_by'] ?? '',
                    'object_id'       => $object_id,
                    'object_title'    => $row['object_title'] ?? '',
                    'object_type'     => $object_type,
                    'meta'            => $meta,
                    'created_at'      => $row['created_at'],
                );
            }

            // Fetch and transform GamiPress achievement logs if:
            // 1. No activity filter OR achievement_earned is in activity filters
            // 2. No object_type filter OR 'achievement' is in object_type filters
            $should_fetch_gamipress = (
                (empty($activity_filters) || in_array('achievement_earned', $activity_filters))
                && (empty($object_type_filters) || in_array('achievement', $object_type_filters))
            );
            if ($should_fetch_gamipress) {
                $gamipress_items = $this->get_gamipress_achievements($user_id, $date_from, $date_to);
                if ($gamipress_items) {
                    $items = array_merge($items, $gamipress_items);
                }
            }

            // Fetch Gravity Forms submissions if not filtered away by activity or object_type
            $should_fetch_gf = (
                (empty($activity_filters) || in_array('profile_update', $activity_filters) || in_array('account_settings_update', $activity_filters))
                && (empty($object_type_filters) || in_array('form', $object_type_filters))
            );

            if ($should_fetch_gf) {
                $gf_items = $this->get_gravity_forms_submissions($user_id, $date_from, $date_to);
                if ($gf_items) {
                    $items = array_merge($items, $gf_items);
                }
            }

            // Fetch LearnDash activity from wp_learndash_user_activity if:
            // 1. No activity filter OR at least one LD-sourced slug is in activity filters
            // 2. No object_type filter OR at least one LD-managed type (lesson/topic/quiz) is in object_type filters
            $ld_sourced_slugs = ['lesson_completed', 'topic_completed', 'quiz_submitted', 'quiz_completed'];
            $ld_object_types  = ['lesson', 'topic', 'quiz'];

            $should_fetch_ld = (
                (empty($activity_filters) || !empty(array_intersect($activity_filters, $ld_sourced_slugs)))
                && (empty($object_type_filters) || !empty(array_intersect($object_type_filters, $ld_object_types)))
            );

            if ($should_fetch_ld) {
                $ld_items = $this->get_learndash_activity($user_id, $date_from, $date_to, $activity_filters, $object_type_filters);
                if ($ld_items) {
                    $items = array_merge($items, $ld_items);
                }
            }

            // Sort by created_at descending
            usort($items, function ($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });

            // Apply pagination to merged results
            $total = count($items);
            $offset = ($page - 1) * $per_page;
            $paginated_items = array_slice($items, $offset, $per_page);

            // Convert created_at to RFC3339 format for API response
            foreach ($paginated_items as &$item) {
                $item['created_at'] = mysql_to_rfc3339($item['created_at']);
            }

            $pages = $per_page > 0 ? ceil($total / $per_page) : 0;

            return new \WP_REST_Response(array(
                'total' => $total,
                'pages' => $pages,
                'items' => $paginated_items,
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

            // Prevent duplicate logs within 30 minutes
            $cache_key = "bys_cert_viewed_{$user_id}_{$course_id}";
            if (get_transient($cache_key)) {
                return new \WP_REST_Response(array('message' => 'Certificate view already logged within 30 minutes'), 200);
            }

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

            set_transient($cache_key, true, 30 * MINUTE_IN_SECONDS);

            return new \WP_REST_Response(array('message' => 'Certificate view logged'), 200);
        }

        /**
         * Fetch GamiPress achievement logs and transform to activity log format
         *
         * @param int $user_id User ID
         * @param string $date_from Optional start date (YYYY-MM-DD format)
         * @param string $date_to Optional end date (YYYY-MM-DD format)
         * @return array Transformed GamiPress achievement items
         */
        private function get_gamipress_achievements($user_id, $date_from = '', $date_to = '') {
            $user_id = intval($user_id);
            if (!$user_id) {
                return array();
            }

            $items = array();

            // Fetch achievements from gamipress-user-earnings endpoint (has post_id and title)
            $base_url = get_home_url() . '/wp-json/wp/v2/gamipress-user-earnings';
            $args = array(
                'user_id' => $user_id,
                'per_page' => 100,
                'orderby' => 'date',
                'order'   => 'desc'
            );

            $url = add_query_arg($args, $base_url);

            $auth_header = BYS_Groups_Auth::get_auth_header();
            $request_args = array(
                'timeout'   => 10,
                'sslverify' => false,
            );

            if ($auth_header) {
                $request_args['headers'] = array('Authorization' => $auth_header);
            }

            $response = wp_remote_get($url, $request_args);

            if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
                return array();
            }

            $body = wp_remote_retrieve_body($response);
            $earnings = json_decode($body, true);

            if (!is_array($earnings)) {
                return array();
            }

            // Now fetch the logs to get trigger_type (which determines initiated_by)
            $logs_base_url = get_home_url() . '/wp-json/wp/v2/gamipress-logs';
            $logs_args = array(
                'user_id' => $user_id,
                'type'    => 'achievement_award',
                'per_page' => 100,
                'orderby' => 'date',
                'order'   => 'desc'
            );

            $logs_url = add_query_arg($logs_args, $logs_base_url);

            $logs_response = wp_remote_get($logs_url, $request_args);

            $logs_by_date = array();
            if (!is_wp_error($logs_response) && wp_remote_retrieve_response_code($logs_response) === 200) {
                $logs_body = wp_remote_retrieve_body($logs_response);
                $logs = json_decode($logs_body, true);
                if (is_array($logs)) {
                    // Index logs by date for quick lookup
                    foreach ($logs as $log) {
                        $logs_by_date[$log['date']] = $log;
                    }
                }
            }

            foreach ($earnings as $earning) {
                // Only include badge post_type
                if (($earning['post_type'] ?? '') !== 'badge') {
                    continue;
                }

                // Parse earning date
                $earning_date = $earning['date'] ?? null;
                if (!$earning_date) {
                    continue;
                }

                // Filter by date range if provided
                if ($date_from && strtotime($earning_date) < strtotime($date_from)) {
                    continue;
                }
                if ($date_to && strtotime($earning_date) > strtotime($date_to . ' 23:59:59')) {
                    continue;
                }

                // Get trigger_type from matching log entry
                $trigger_type = 'gamipress_earned_achievement'; // default
                if (isset($logs_by_date[$earning_date])) {
                    $trigger_type = $logs_by_date[$earning_date]['trigger_type'] ?? 'gamipress_earned_achievement';
                }

                // Only include these specific trigger_type
                if ($trigger_type !== 'gamipress_award_achievement' && $trigger_type !== 'gamipress_earned_achievement') {
                    continue;
                }

                // Determine initiated_by based on trigger type
                $initiated_by = ($trigger_type === 'gamipress_award_achievement') ? 'admin' : 'system';

                // Extract achievement details from earning
                $achievement_id = intval($earning['post_id'] ?? 0);
                $achievement_title = $earning['title'] ?? 'Achievement Earned';

                // Build metadata
                $meta = array(
                    'gamipress_earning' => array(
                        'earning_id'   => $earning['id'] ?? null,
                        'title'        => $earning['title'] ?? null,
                        'post_type'    => $earning['post_type'] ?? null,
                        'points'       => $earning['points'] ?? null,
                        'points_type'  => $earning['points_type'] ?? null,
                        'date'         => $earning['date'] ?? null,
                    ),
                );

                $mysql_date = date('Y-m-d H:i:s', strtotime($earning_date));

                $items[] = array(
                    'id'              => 0, // GamiPress items don't have ID in custom table (handled by REST API)
                    'activity'        => 'achievement_earned',
                    'initiated_by'    => $initiated_by,
                    'object_id'       => $achievement_id,
                    'object_title'    => $achievement_title,
                    'object_type'     => 'achievement',
                    'meta'            => $meta,
                    'created_at'      => $mysql_date,
                );
            }

            return $items;
        }

        /**
         * Fetch Gravity Forms submissions from REST API
         * Mirrors the GamiPress pattern: query GF API instead of logging to custom table
         * Maps form IDs to activity slugs (16 → profile_update, 15 → account_settings_update)
         */
        private function get_gravity_forms_submissions($user_id, $date_from = '', $date_to = '') {
            $user_id = intval($user_id);
            if (!$user_id) {
                return array();
            }

            // Map form ID → activity slug
            $form_map = array(
                16 => 'profile_update',
                15 => 'account_settings_update',
            );

            $auth_header = BYS_Groups_Auth::get_auth_header();

            $request_args = array(
                'timeout'   => 10,
                'sslverify' => false,
            );
            if ($auth_header) {
                $request_args['headers'] = array('Authorization' => $auth_header);
            }

            $items = array();

            foreach ($form_map as $form_id => $activity_slug) {
                $args = array(
                    'search'  => json_encode(array(
                        'field_filters' => array(
                            array('key' => 'created_by', 'value' => $user_id)
                        )
                    )),
                    'sorting' => json_encode(array('key' => 'date_created', 'direction' => 'DESC')),
                    'paging'  => json_encode(array('page_size' => 100)),
                );

                $url = add_query_arg($args, get_home_url() . "/wp-json/gf/v2/forms/{$form_id}/entries");

                $response = wp_remote_get($url, $request_args);

                if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
                    continue;
                }

                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);

                if (!is_array($data)) {
                    continue;
                }

                $entries = $data['entries'] ?? (is_array($data) ? $data : array());

                foreach ($entries as $entry) {
                    $entry_date = $entry['date_created'] ?? null;
                    if (!$entry_date) {
                        continue;
                    }

                    // Apply date range filters
                    if ($date_from && strtotime($entry_date) < strtotime($date_from)) {
                        continue;
                    }
                    if ($date_to && strtotime($entry_date) > strtotime($date_to . ' 23:59:59')) {
                        continue;
                    }

                    // Extract field values (numeric keys are field data)
                    $field_data = array();
                    foreach ($entry as $key => $value) {
                        if (is_numeric($key) && $value !== '' && $value !== null) {
                            $field_data[$key] = $value;
                        }
                    }

                    $items[] = array(
                        'id'           => 0,
                        'activity'     => $activity_slug,
                        'initiated_by' => 'self',
                        'object_id'    => $form_id,
                        'object_title' => $entry['form_title'] ?? '',
                        'object_type'  => 'form',
                        'meta'         => array(
                            'entry_id' => intval($entry['id'] ?? 0),
                            'form_id'  => $form_id,
                            'fields'   => $field_data,
                        ),
                        'created_at'   => date('Y-m-d H:i:s', strtotime($entry_date)),
                    );
                }
            }

            return $items;
        }

        /**
         * Fetch LearnDash activity directly from wp_learndash_user_activity table.
         */
        private function get_learndash_activity($user_id, $date_from = '', $date_to = '', $activity_filters = [], $object_type_filters = []) {
            global $wpdb;

            $user_id = intval($user_id);
            if (!$user_id) {
                return [];
            }

            // Map BYS activity slugs to LD activity_type values
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
                // Only include LD types that match the requested activity slugs
                foreach ($activity_filters as $slug) {
                    if (isset($ld_slug_to_type[$slug])) {
                        $ld_activity_types_needed[] = $ld_slug_to_type[$slug];
                    }
                }
                $ld_activity_types_needed = array_unique($ld_activity_types_needed);
                if (empty($ld_activity_types_needed)) {
                    return []; // No LD-sourced activities match filter
                }
            } elseif (!empty($object_type_filters)) {
                // Get LD types from object_type filter
                foreach ($object_type_filters as $ot) {
                    if (isset($ld_object_type_to_type[$ot])) {
                        $ld_activity_types_needed[] = $ld_object_type_to_type[$ot];
                    }
                }
                $ld_activity_types_needed = array_unique($ld_activity_types_needed);
                if (empty($ld_activity_types_needed)) {
                    return [];
                }
            } else {
                $ld_activity_types_needed = $all_ld_types;
            }

            $where_clauses = [
                $wpdb->prepare("a.user_id = %d", $user_id),
            ];

            $type_placeholders = implode(',', array_fill(0, count($ld_activity_types_needed), '%s'));
            $where_clauses[] = $wpdb->prepare(
                "a.activity_type IN ({$type_placeholders})",
                ...$ld_activity_types_needed
            );

            // Completed status filter
            $where_clauses[] = "(
                (a.activity_type IN ('lesson','topic') AND a.activity_status = 1 AND a.activity_completed > 0)
                OR (a.activity_type = 'quiz' AND a.activity_completed > 0)
            )";

            // Date range filters
            if (!empty($date_from)) {
                $ts_from = strtotime($date_from . ' 00:00:00');
                $where_clauses[] = $wpdb->prepare("a.activity_completed >= %d", $ts_from);
            }
            if (!empty($date_to)) {
                $ts_to = strtotime($date_to . ' 23:59:59');
                $where_clauses[] = $wpdb->prepare("a.activity_completed <= %d", $ts_to);
            }

            $where = implode(' AND ', $where_clauses);
            $ld_table = $wpdb->prefix . 'learndash_user_activity';

            // Fetch activity rows — join posts table for object title
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

            if (empty($rows)) {
                return [];
            }

            // For quiz rows: batch-fetch meta (score, percentage, pass, timespent, points)
            $quiz_activity_ids = [];
            foreach ($rows as $row) {
                if ($row['activity_type'] === 'quiz') {
                    $quiz_activity_ids[] = intval($row['activity_id']);
                }
            }

            $quiz_meta_map = [];
            if (!empty($quiz_activity_ids)) {
                $meta_table = $wpdb->prefix . 'learndash_user_activity_meta';
                $id_placeholders = implode(',', array_fill(0, count($quiz_activity_ids), '%d'));
                $meta_keys = ['score', 'percentage', 'pass', 'timespent', 'points', 'total_points', 'count'];
                $key_placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));

                $meta_rows = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT activity_id, activity_meta_key, activity_meta_value
                         FROM {$meta_table}
                         WHERE activity_id IN ({$id_placeholders})
                         AND activity_meta_key IN ({$key_placeholders})",
                        ...array_merge($quiz_activity_ids, $meta_keys)
                    ),
                    ARRAY_A
                );

                foreach ($meta_rows as $meta_row) {
                    $aid = intval($meta_row['activity_id']);
                    if (!isset($quiz_meta_map[$aid])) {
                        $quiz_meta_map[$aid] = [];
                    }
                    $quiz_meta_map[$aid][$meta_row['activity_meta_key']] = $meta_row['activity_meta_value'];
                }
            }

            $items = [];

            foreach ($rows as $row) {
                $type    = $row['activity_type'];
                $post_id = intval($row['post_id']);
                $course_id = intval($row['course_id']);
                $title   = $row['post_title'] ?? '';
                $activity_id = intval($row['activity_id']);

                if ($type === 'lesson') {
                    $timestamp = intval($row['activity_completed']);
                    $items[] = [
                        'id'           => 0,
                        'activity'     => 'lesson_completed',
                        'initiated_by' => 'system',
                        'object_id'    => $post_id,
                        'object_title' => $title,
                        'object_type'  => 'lesson',
                        'meta'         => ['course_id' => $course_id],
                        'created_at'   => date('Y-m-d H:i:s', $timestamp),
                    ];
                } elseif ($type === 'topic') {
                    $timestamp = intval($row['activity_completed']);
                    $items[] = [
                        'id'           => 0,
                        'activity'     => 'topic_completed',
                        'initiated_by' => 'system',
                        'object_id'    => $post_id,
                        'object_title' => $title,
                        'object_type'  => 'topic',
                        'meta'         => ['course_id' => $course_id],
                        'created_at'   => date('Y-m-d H:i:s', $timestamp),
                    ];
                } elseif ($type === 'quiz') {
                    $timestamp = intval($row['activity_completed']);
                    $meta_raw  = $quiz_meta_map[$activity_id] ?? [];
                    $meta = [
                        'course_id'    => $course_id,
                        'score'        => intval($meta_raw['score'] ?? 0),
                        'points'       => intval($meta_raw['points'] ?? 0),
                        'total_points' => intval($meta_raw['total_points'] ?? 0),
                        'percentage'   => floatval($meta_raw['percentage'] ?? 0),
                        'timespent'    => intval($meta_raw['timespent'] ?? 0),
                        'pass'         => filter_var($meta_raw['pass'] ?? false, FILTER_VALIDATE_BOOLEAN),
                    ];
                    $dt = date('Y-m-d H:i:s', $timestamp);

                    // Emit quiz_submitted if filter includes it or no filter
                    $include_submitted = empty($activity_filters) || in_array('quiz_submitted', $activity_filters);
                    // Emit quiz_completed if filter includes it or no filter
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

        /**
         * Get last activity timestamp for user in a specific course
         * Uses LearnDash native function learndash_get_user_activity()
         */
        private function get_user_course_last_activity($user_id, $course_id) {
            try {
                // Use LearnDash native function to get last activity
                if (function_exists('learndash_get_user_activity')) {
                    $activity = learndash_get_user_activity(array(
                        'user_id'   => intval($user_id),
                        'course_id' => intval($course_id)
                    ));

                    if ($activity && isset($activity->activity_updated)) {
                        // activity_updated is a MySQL GMT timestamp string
                        $last_activity_gmt = $activity->activity_updated;

                        return new \WP_REST_Response(array(
                            'last_activity_gmt' => $last_activity_gmt
                        ), 200);
                    }
                } else {
                    error_log('[BYS Groups] learndash_get_user_activity function not found');
                }
            } catch (\Exception $e) {
                error_log('[BYS Groups] Error getting user last activity: ' . $e->getMessage());
                return new \WP_REST_Response(array('error' => $e->getMessage()), 500);
            }

            return new \WP_REST_Response(array('last_activity_gmt' => null), 200);
        }

        /**
         * Get all steps progress for a user in a course
         * Fetches lessons, topics, and quizzes with their completion status
         * Handles pagination to get all steps (not just first 10)
         */
        public function get_user_course_steps_progress($request) {
            $user_id = intval($request['user_id']);
            $course_id = intval($request['course_id']);

            if (!$user_id || !$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid user_id or course_id'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result;
            }
            $auth_header = $auth_result;

            // Fetch all steps progress for user in course using LD API endpoint
            // The LD API paginates by default, so we need to fetch all pages
            $all_steps = array();
            $page = 1;
            $per_page = 100; // Request max per page to minimize API calls

            while (true) {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/course-progress/{$course_id}/steps?per_page={$per_page}&page={$page}";

                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array('Authorization' => $auth_header),
                    'timeout' => 30,
                    'sslverify' => false,
                ));

                if (is_wp_error($response)) {
                    return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
                }

                $status = wp_remote_retrieve_response_code($response);
                $body = wp_remote_retrieve_body($response);

                if ($status !== 200) {
                    return new \WP_REST_Response(array('error' => 'Failed to fetch course steps progress from LearnDash API', 'status' => $status), $status);
                }

                $data = json_decode($body, true);

                if (!is_array($data) || empty($data)) {
                    break; // No more pages
                }

                $all_steps = array_merge($all_steps, $data);

                // Check if there are more pages
                if (count($data) < $per_page) {
                    break; // Last page
                }

                $page++;
            }

            return new \WP_REST_Response($all_steps, 200);
        }
    }
}