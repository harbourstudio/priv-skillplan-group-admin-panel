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
    }
}