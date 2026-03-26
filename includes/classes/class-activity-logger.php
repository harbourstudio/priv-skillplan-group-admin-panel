<?php
/**
 * Activity Logger Class
 * 
 * Listens to various hooks to capture user activities (WordPress, LearnDash, GamiPress, and Gravity Forms)
 * Extracts relevant event data and logs each activity to the custom database table for fetching and display by the user-activity block
 *  
 * @package BYS_Groups
 * @since 1.0.0
 */


if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Activity_Logger')) {

    class BYS_Groups_Activity_Logger {
        public function __construct() {
            $this->register_hooks();
        }

        private function register_hooks() {
            // WIP: add add_action() calls 
        }

        private function log_activity($user_id, $activity, $initiated_by, $object_id, $object_title, $object_type, $meta = []) {
            global $wpdb;
            
            $wpdb->insert(
                $wpdb->prefix . BYS_GROUPS_USER_ACTIVITY_TABLE,
                [
                    'user_id'      => intval($user_id),
                    'activity'     => sanitize_text_field($activity),
                    'initiated_by' => sanitize_text_field($initiated_by),
                    'object_id'    => intval($object_id),
                    'object_title' => sanitize_text_field($object_title),
                    'object_type'  => sanitize_text_field($object_type),
                    'meta'         => json_encode($meta),
                    'created_at'   => current_time('mysql'),
                ],
                [
                    '%d', '%s', '%d', '%s', '%s', '%s', '%s', '%s'  // Format specifiers
                ]
            );
        }

        /**
         * ============================
         * Hook Callbacks
         * ============================
         */
        

    }
}