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
                // 'permission_callback' => array($this, 'check_user_permission'),
                'permission_callback' => '__return_true',
            ));

            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/stats', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_stats'),
                'permission_callback' => '__return_true',
            ));
        }

        public function check_user_permission() {
            if (!is_user_logged_in()) {
                return false;
            }
            return true;
        }

        public function get_current_user_groups($request) {
            // $user_id = get_current_user_id();
            $user_id=27;
            
            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Not logged in'), 401);
            }
            
            $args = array(
                'post_type'      => 'groups',
                'posts_per_page' => -1
            );

            $all_groups = get_posts($args);
            $user_groups = array();

            foreach ($all_groups as $group) {
                $group_leaders_key = 'learndash_group_leaders_' . $group->ID;
                $is_leader = get_user_meta($user_id, $group_leaders_key, true);
                
                if ($is_leader) {
                    $user_groups[] = array(
                        'id'    => $group->ID,
                        'title' => $group->post_title
                    );
                }
            }

            return new \WP_REST_Response(array('groups' => $user_groups), 200);
        }

        public function get_group_stats($request) {
            $group_id = intval($request['group_id']);

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // Debug: Log all meta keys for this group
            error_log('DEBUG: Group ' . $group_id . ' meta keys:');
            $all_meta = get_post_meta($group_id);
            foreach ($all_meta as $key => $value) {
                error_log('  ' . $key . ' => ' . json_encode($value));
            }

            // Get group members directly from LearnDash post meta
            $group_users_key = 'learndash_group_users_' . $group_id;
            $member_ids = get_post_meta($group_id, $group_users_key, true);
            $member_ids = is_array($member_ids) ? $member_ids : array();
            $total_members = count($member_ids);

            // Get courses assigned to the group
            // LearnDash stores course-group relationships via post meta on courses
            // Need to query courses that reference this group
            global $wpdb;

            // Query: find all sfwd-course posts that have this group in their _groups meta
            $query = $wpdb->prepare(
                "SELECT p.ID FROM {$wpdb->posts} p
                 INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
                 WHERE p.post_type = %s AND pm.meta_key = %s AND pm.meta_value LIKE %s",
                'sfwd-courses',
                '_groups',
                '%i:' . $group_id . ';%'
            );

            $course_ids = $wpdb->get_col($query);
            $course_ids = array_map('intval', $course_ids);
            $total_courses = count($course_ids);

            // Debug
            error_log('DEBUG: Group ' . $group_id . ' courses: ' . json_encode($course_ids));

            // Count completed vs incomplete courses for group members
            $completed_count = 0;
            $incomplete_count = 0;

            foreach ($member_ids as $member_id) {
                foreach ($course_ids as $course_id) {
                    // Check LearnDash course progress meta
                    // The format is: course_{$course_id}_completed
                    $progress_key = 'course_' . $course_id . '_completed';
                    $completion_date = get_user_meta($member_id, $progress_key, true);

                    if ($completion_date) {
                        $completed_count++;
                    } else {
                        $incomplete_count++;
                    }
                }
            }

            return new \WP_REST_Response(array(
                'group_id'             => $group_id,
                'total_members'        => $total_members,
                'total_courses'        => $total_courses,
                'completed_courses'    => $completed_count,
                'incomplete_courses'   => $incomplete_count,
            ), 200);
        }
    }
}