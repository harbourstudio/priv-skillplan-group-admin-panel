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
         * Register REST routes
         */
        public function register_routes() {

            register_rest_route($this->namespace, '/me/groups', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_current_user_groups'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/stats', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_base_group_users_stats'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/users', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_users'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/courses', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_courses'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/users/(?P<user_id>\d+)/courses', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_course_progress'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/users/(?P<user_id>\d+)', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_details'),
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


        public function get_base_group_users_stats($request) {
            $group_id = intval($request['group_id']);

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // get group members from post meta
            $group_users_key = 'learndash_group_users_' . $group_id;
            $member_ids = get_post_meta($group_id, $group_users_key, true);
            $member_ids = is_array($member_ids) ? $member_ids : array();
            $total_members = count($member_ids);

            // count inactive members
            $inactive_members = 0;
            foreach ($member_ids as $member_id) {
                $member_id = intval($member_id);
                $last_login = get_user_meta($member_id, 'last_login', true);
                if (empty($last_login)) {
                    $inactive_members++;
                }
            }

            // return member info
            return new \WP_REST_Response(array(
                'group_id'                => $group_id,
                'total_members'           => $total_members,
                'member_ids'              => $member_ids,
                'total_inactive_members'  => $inactive_members,
            ), 200);
        }

        public function get_group_users($request) {
            $group_id = intval($request['group_id']);

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // get group members
            $group_users_key = 'learndash_group_users_' . $group_id;
            $member_ids = get_post_meta($group_id, $group_users_key, true);
            $member_ids = is_array($member_ids) ? $member_ids : array();

            // fetch user data
            $users = array();
            foreach ($member_ids as $user_id) {
                $user_id = intval($user_id);
                $user = get_user_by('ID', $user_id);

                if ($user) {
                    // check if user has ever logged in
                    $last_login = get_user_meta($user_id, 'last_login', true);
                    $has_logged_in = !empty($last_login);

                    $users[] = array(
                        'id'             => $user->ID,
                        'display_name'   => $user->display_name,
                        'email'          => $user->user_email,
                        'has_logged_in'  => $has_logged_in,
                        'enrolled_courses' => array(), // Placeholder
                    );
                }
            }

            return new \WP_REST_Response($users, 200);
        }

        public function get_group_courses($request) {
            $group_id = intval($request['group_id']);

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // get group courses using basic auth
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/auth.php';
            $auth_header = BYS_Groups_Auth::get_auth_header();

            if (!$auth_header) {
                return new \WP_REST_Response(array('error' => 'API credentials not configured'), 500);
            }

            // call to get group courses
            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/courses?per_page=100";

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

        public function get_user_course_progress($request) {
            $group_id = intval($request['group_id']);
            $user_id = intval($request['user_id']);

            if (!$group_id || !$user_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID or user ID'), 400);
            }

            // get courses for the group
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/auth.php';
            $auth_header = BYS_Groups_Auth::get_auth_header();

            $course_progress = array();

            if ($auth_header) {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/courses?per_page=100";
                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array(
                        'Authorization' => $auth_header,
                    ),
                    'sslverify' => false,
                ));

                if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                    $courses = json_decode(wp_remote_retrieve_body($response), true);

                    if (is_array($courses)) {
                        foreach ($courses as $course) {
                            $course_id = intval($course['id'] ?? 0);
                            if (!$course_id) continue;

                            // get user course progress
                            $progress_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/course-progress/{$course_id}";
                            $progress_response = wp_remote_get($progress_url, array(
                                'headers' => array(
                                    'Authorization' => $auth_header,
                                ),
                                'sslverify' => false,
                            ));

                            $status = 'none';
                            $percentage = 0;
                            $enrolled_date = '';
                            $completed_date = '';

                            if (!is_wp_error($progress_response) && wp_remote_retrieve_response_code($progress_response) === 200) {
                                $progress_data = json_decode(wp_remote_retrieve_body($progress_response), true);

                                if (is_array($progress_data)) {
                                    // progress_status field
                                    $progress_status = $progress_data['progress_status'] ?? '';

                                    if ($progress_status === 'completed') {
                                        $status = 'completed';
                                        $percentage = 100;
                                    } elseif ($progress_status === 'in_progress') {
                                        $status = 'partial';
                                        // steps_completed / steps_total
                                        $steps_completed = intval($progress_data['steps_completed'] ?? 0);
                                        $steps_total = intval($progress_data['steps_total'] ?? 0);
                                        if ($steps_total > 0) {
                                            $percentage = intval(($steps_completed / $steps_total) * 100);
                                            // cap at 100% in case of multiple completions or course changes
                                            $percentage = min(100, $percentage);
                                        }
                                    }

                                    // enrollment/start date
                                    if (isset($progress_data['date_started'])) {
                                        $enrolled_date = $progress_data['date_started'];
                                    } elseif (isset($progress_data['date_started_gmt'])) {
                                        $enrolled_date = $progress_data['date_started_gmt'];
                                    }

                                    // completion date (only if completed)
                                    if (!empty($progress_data['date_completed'])) {
                                        $completed_date = $progress_data['date_completed'];
                                    } elseif (!empty($progress_data['date_completed_gmt'])) {
                                        $completed_date = $progress_data['date_completed_gmt'];
                                    }
                                }
                            }

                            $course_progress[] = array(
                                'course_id'     => $course_id,
                                'status'        => $status,
                                'percentage'    => $percentage,
                                'enrolled_date' => $enrolled_date,
                                'completed_date' => $completed_date,
                            );
                        }
                    }
                }
            }

            return new \WP_REST_Response($course_progress, 200);
        }

        public function get_user_details($request) {
            $group_id = intval($request['group_id']);
            $user_id = intval($request['user_id']);

            if (!$group_id || !$user_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID or user ID'), 400);
            }

            // get user object
            $user = get_user_by('ID', $user_id);

            if (!$user) {
                return new \WP_REST_Response(array('error' => 'User not found'), 404);
            }

            // get user meta
            $first_name = get_user_meta($user_id, 'first_name', true);
            $last_name = get_user_meta($user_id, 'last_name', true);

            // last_login user meta (stored as array with timestamp)
            $last_login_meta = get_user_meta($user_id, 'last_login', true);
            $last_login = '';
            if (!empty($last_login_meta)) {
                // get the first element if array
                if (is_array($last_login_meta)) {
                    $last_login = !empty($last_login_meta[0]) ? $last_login_meta[0] : '';
                } else {
                    $last_login = $last_login_meta;
                }
            }
            $has_logged_in = !empty($last_login);

            // get user's group enrollment date (when user was added to the group)
            // stored as learndash_group_{group_id}_enrolled_at in user meta
            $group_enrolled_key = "learndash_group_{$group_id}_enrolled_at";
            $group_enrolled_meta = get_user_meta($user_id, $group_enrolled_key, true);
            $group_enrolled_date = '';

            if (!empty($group_enrolled_meta)) {
                // get first element if array (note: unix timestamp)
                if (is_array($group_enrolled_meta)) {
                    $timestamp = !empty($group_enrolled_meta[0]) ? intval($group_enrolled_meta[0]) : 0;
                } else {
                    $timestamp = intval($group_enrolled_meta);
                }

                // convert unix
                if ($timestamp > 0) {
                    $group_enrolled_date = wp_date('c', $timestamp);
                }
            }

            return new \WP_REST_Response(array(
                'id'                  => $user->ID,
                'first_name'          => $first_name,
                'last_name'           => $last_name,
                'display_name'        => $user->display_name,
                'email'               => $user->user_email,
                'last_login'          => $last_login,
                'has_logged_in'       => $has_logged_in,
                'group_enrolled_date' => $group_enrolled_date,
            ), 200);
        }
    }
}