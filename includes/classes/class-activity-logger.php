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
            add_action('gform_after_submission_16', [$this, 'on_profile_update'], 10, 2);

            // ACCOUNT SETTINGS FORM UPDATE (GF form#15)
            add_action('gform_after_submission_15', [$this, 'on_account_settings_update'], 10, 2);

            add_action('learndash_course_completed', [$this, 'on_certificate_earned'], 10, 1);


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
         * HELPER METHODS
         * ============================
         */

         /**
         * Fetch data from LD API
         * 
         * To be used by any callback methods callign LD API 
         */
        private function fetch_from_learndash_api($endpoint) {
            $auth_header = BYS_Groups_Auth::get_auth_header();
            if (!$auth_header) {
                error_log('Activity Logger: LD API auth not configured');
                return null;
            }

            $ld_api_url = get_home_url() . '/wp-json/ldlms/v2' . $endpoint;

            $response = wp_remote_get($ld_api_url, [
                'headers' => [
                    'Authorization' => $auth_header,
                ],
                'timeout'   => 30,
                'sslverify' => false,
            ]);

            if (is_wp_error($response)) {
                error_log('Activity Logger: LD API error - ' . $response->get_error_message());
                return null;
            }

            $status = wp_remote_retrieve_response_code($response);
            if ($status !== 200) {
                error_log('Activity Logger: LD API returned status ' . $status);
                return null;
            }

            $body = wp_remote_retrieve_body($response);
            
            // Try to find JSON in the response (strip out any PHP warnings/output)
            if (preg_match('/\[.*\]/s', $body, $matches)) {
                $body = $matches[0];
            } elseif (preg_match('/\{.*\}/s', $body, $matches)) {
                $body = $matches[0];
            }
            
            $decoded = json_decode($body, true);
            if ($decoded === null) {
                error_log('Activity Logger: JSON decode failed - ' . json_last_error_msg());
                error_log('Body start: ' . substr($body, 0, 100));
                return null;
            }

            return $decoded;
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

        public function on_profile_update($entry, $form){
            $user_id = isset($entry['created_by']) ? intval($entry['created_by']) : get_current_user_id();
            
            if (!$user_id) {
                return;
            }
            
            $this->log_activity(
                user_id:      $user_id,
                activity:     'profile_update',
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

        public function on_account_settings_update($entry, $form) {
            $user_id = isset($entry['created_by']) ? intval($entry['created_by']) : get_current_user_id();
            
            if (!$user_id) {
                return;
            }
            
            $this->log_activity(
                user_id:      $user_id,
                activity:     'account_settings_update',
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

        public function on_certificate_earned($course_data) {
            $user_id = intval($course_data['user']->ID ?? 0);
            $course_id = intval($course_data['course']->ID ?? 0);
            
            if (!$user_id || !$course_id) {
                return;
            }

            // Fetch data of the specified course from LD API (includes certificate_id and awarded_certificate_url)
            $api_data = $this->fetch_from_learndash_api("/users/{$user_id}/courses?include={$course_id}");

            if (!$api_data || !is_array($api_data) || empty($api_data)) {
                return;
            }

            // Get first (and only) course from array
            $course = $api_data[0];

            // Verify certificate exists
            if (empty($course['certificate'])) {
                return;
            }

            $course_title = $course['title']['rendered'] ?? 'Unknown Course';

            $this->log_activity(
                user_id:      $user_id,
                activity:     'certificate_earned',
                initiated_by: 'system',
                object_id:    $course_id,
                object_title: $course_title,
                object_type:  'course',
                meta:         [
                    'certificate_id'        => intval($course['certificate'] ?? 0),
                    'awarded_certificate_url' => $course['awarded_certificate_url'] ?? null,
                ]
            );
        }
    }
}