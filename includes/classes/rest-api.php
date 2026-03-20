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
                'callback'            => array($this, 'get_group_stats'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/users', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_users'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));
        }

        public function check_user_permission($request) {
            // Check for nonce in X-WP-Nonce header
            $nonce = isset($_SERVER['HTTP_X_WP_NONCE']) ? $_SERVER['HTTP_X_WP_NONCE'] : null;

            // Also check for nonce in query parameter (for testing)
            if (!$nonce && isset($_GET['_wpnonce'])) {
                $nonce = $_GET['_wpnonce'];
            }

            // Verify nonce
            if (!$nonce || !wp_verify_nonce($nonce, 'wp_rest')) {
                return false;
            }

            // User must be logged in
            return is_user_logged_in();
        }

        public function get_current_user_groups($request) {
            $user_id = 27; // TODO: Replace with get_current_user_id() when auth is properly set up

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

            // Return only the basic info the server can provide
            // Frontend will fetch LearnDash API data directly since it has auth

            // Get group members from post meta
            $group_users_key = 'learndash_group_users_' . $group_id;
            $member_ids = get_post_meta($group_id, $group_users_key, true);
            $member_ids = is_array($member_ids) ? $member_ids : array();
            $total_members = count($member_ids);

            // Count inactive members
            $inactive_members = 0;
            foreach ($member_ids as $member_id) {
                $member_id = intval($member_id);
                $last_login = get_user_meta($member_id, 'last_login', true);
                if (empty($last_login)) {
                    $inactive_members++;
                }
            }

            // Return member info and let frontend fetch course data from LearnDash API
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

            // Get group members
            $group_users_key = 'learndash_group_users_' . $group_id;
            $member_ids = get_post_meta($group_id, $group_users_key, true);
            $member_ids = is_array($member_ids) ? $member_ids : array();

            // Fetch user data
            $users = array();
            foreach ($member_ids as $user_id) {
                $user_id = intval($user_id);
                $user = get_user_by('ID', $user_id);

                if ($user) {
                    // Check if user has ever logged in
                    $last_login = get_user_meta($user_id, 'last_login', true);
                    $has_logged_in = !empty($last_login);

                    $users[] = array(
                        'id'             => $user->ID,
                        'display_name'   => $user->display_name,
                        'email'          => $user->user_email,
                        'has_logged_in'  => $has_logged_in,
                        'enrolled_courses' => array(), // Placeholder for now
                    );
                }
            }

            return new \WP_REST_Response($users, 200);
        }
    }
}