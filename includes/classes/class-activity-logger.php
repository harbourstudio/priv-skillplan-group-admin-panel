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
        
        private $current_user_before_logout = null;

        private function register_hooks() {
            // WIP: add add_action() calls
            
            // LOGIN EVENT
            add_action('wp_login', [$this, 'on_user_login'], 10, 2);
            
            // // Capture user ID BEFORE logout fires (priority 1 = runs first)
            // add_action('wp_logout', [$this, 'capture_user_before_logout'], 1);
            // // Log logout AFTER user is captured (priority 100 = runs last)
            // // add_action('wp_logout', [$this, 'on_user_logout'], 100);
            
            // MY PROFILE FORM UPDATE (GF form#16) 
            add_action('gform_after_submission_16', [$this, 'on_profile_form_submitted'], 10, 2);

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
                    'object_title' => !empty($object_title) ? sanitize_text_field($object_title) : null,
                    'object_type'  => !empty($object_type) ? sanitize_text_field($object_type) : null,
                    'meta'         => !empty($meta) ? json_encode($meta) : null,
                    'created_at'   => current_time('mysql'),
                ],
                [
                    '%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s'
                ]
            );
        }


        /**
         * ============================
         * Hook Callback Methods
         * ============================
         */

        public function on_user_login($user_login, $user) {
            $this->log_activity(
                user_id:      $user->ID,
                activity:     'user_login',
                initiated_by: 'self',
                object_id:    0, // not applicable
                object_title: null, // not applicable
                object_type:  null // not applicable
            );
        }

        // public function capture_user_before_logout() {
        //     $this->current_user_before_logout = get_current_user_id();
        // }
        
        // public function on_user_logout() {
        //     $user_id = $this->current_user_before_logout;
            
        //     if (!$user_id) {
        //         return;
        //     }
            
        //     $this->log_activity(
        //         user_id:      $user_id,
        //         activity:     'user_logout',
        //         initiated_by: 'self',
        //         object_id:    0, // not applicable
        //         object_title: null, // not applicable
        //         object_type:  null // not applicable
        //     );
        // }

        public function on_profile_form_submitted($entry, $form) {
            $user_id = isset($entry['created_by']) ? intval($entry['created_by']) : get_current_user_id();
            
            if (!$user_id) {
                return;
            }
            
            $this->log_activity(
                user_id:      $user_id,
                activity:     'profile_updated',
                initiated_by: 'self',
                object_id:    intval($form['id']), // use form ID
                object_title: 'Gravity Form: ' .$form['title'], // use form title
                object_type:  'form',
                meta:         [
                    'entry_id' => intval($entry['id']),
                    'form_id'  => intval($form['id']),
                ]
            );
        }

    }
}