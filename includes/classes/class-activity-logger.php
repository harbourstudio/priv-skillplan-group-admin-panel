<?php
/**
 * Activity Logger Class
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
            // System events
            add_action('wp_login', [$this, 'on_user_login'], 10, 2);
            
            // Gravity Form events
            add_action('gform_after_submission_16', [$this, 'on_profile_update'], 10, 2);
            add_action('gform_after_submission_15', [$this, 'on_account_settings_update'], 10, 2);
            
            // Learndash events
            add_action('learndash_course_completed', [$this, 'on_certificate_earned'], 10, 1);
            add_action('learndash_lesson_completed', [$this, 'on_lesson_completed'], 10, 1);
            add_action('learndash_topic_completed', [$this, 'on_topic_completed'], 10, 1);
            add_action('template_redirect', [$this, 'on_page_view'], 10);
            add_action('learndash_update_course_access', [$this, 'on_course_access_update'], 10, 4);
            
            // Learndash Quiz events
            add_action('learndash_quiz_submitted', [$this, 'on_quiz_submitted'], 10, 2);
            add_action('learndash_quiz_completed', [$this, 'on_quiz_completed'], 10, 2);
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

            // Extract JSON from response (may contain PHP warnings/output)
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

        /**
         * Log lesson completion event
         *
         * Triggered by: learndash_lesson_completed hook
         * Captures: Full lesson data from LearnDash including progress, steps completed, etc.
         */
        public function on_lesson_completed($lesson_data) {
            if (empty($lesson_data) || !is_array($lesson_data)) {
                return;
            }

            $user_id = intval($lesson_data['user']->ID ?? 0);
            $course_id = intval($lesson_data['course']->ID ?? 0);
            $lesson_id = intval($lesson_data['lesson']->ID ?? 0);

            if (!$user_id || !$lesson_id) {
                return;
            }

            $lesson_title = $lesson_data['lesson']->post_title ?? 'Unknown Lesson';

            $this->log_activity(
                user_id:      $user_id,
                activity:     'lesson_completed',
                initiated_by: 'system',
                object_id:    $lesson_id,
                object_title: $lesson_title,
                object_type:  'lesson',
                meta:         [
                    'course_id'   => $course_id,
                    'lesson_data' => $lesson_data,
                ]
            );
        }

        /**
         * Log topic completion event
         *
         * Triggered by: learndash_topic_completed hook
         * Captures: Full topic data including parent lesson, course, progress metrics
         */
        public function on_topic_completed($topic_data) {
            if (empty($topic_data) || !is_array($topic_data)) {
                return;
            }

            $user_id = intval($topic_data['user']->ID ?? 0);
            $course_id = intval($topic_data['course']->ID ?? 0);
            $lesson_id = intval($topic_data['lesson']->ID ?? 0);
            $topic_id = intval($topic_data['topic']->ID ?? 0);

            if (!$user_id || !$topic_id) {
                return;
            }

            $topic_title = $topic_data['topic']->post_title ?? 'Unknown Topic';

            $this->log_activity(
                user_id:      $user_id,
                activity:     'topic_completed',
                initiated_by: 'system',
                object_id:    $topic_id,
                object_title: $topic_title,
                object_type:  'topic',
                meta:         [
                    'course_id'   => $course_id,
                    'lesson_id'   => $lesson_id,
                    'topic_data'  => $topic_data,
                ]
            );
        }

        /**
         * Log quiz submission event
         *
         * Triggered by: learndash_quiz_submitted hook
         * Captures: Quiz results after submission
         */
        public function on_quiz_submitted($quiz_data, $current_user) {
            if (empty($quiz_data) || !is_array($quiz_data)) {
                return;
            }

            $user_id = intval($current_user->ID ?? 0);

            // The key is 'quiz' not 'quiz_id' in the quiz_data array
            $quiz_id = $quiz_data['quiz'] ?? 0;
            if (is_object($quiz_id) && isset($quiz_id->ID)) {
                $quiz_id = intval($quiz_id->ID);
            } else {
                $quiz_id = intval($quiz_id);
            }

            $course_id = $quiz_data['course'] ?? 0;
            if (is_object($course_id) && isset($course_id->ID)) {
                $course_id = intval($course_id->ID);
            } else {
                $course_id = intval($course_id);
            }

            if (!$user_id || !$quiz_id) {
                return;
            }

            $quiz_title = get_the_title($quiz_id) ?: 'Unknown Quiz';

            // Note: define preferred data to include in metadata
            $meta = [
                'course_id'     => $course_id,
                'score'         => intval($quiz_data['score'] ?? 0),
                'points'        => intval($quiz_data['points'] ?? 0),
                'total_points'  => intval($quiz_data['total_points'] ?? 0),
                'percentage'    => floatval($quiz_data['percentage'] ?? 0),
                'timespent'     => intval($quiz_data['timespent'] ?? 0),
                'pass'          => (bool) ($quiz_data['pass'] ?? false),
            ];

            $this->log_activity(
                user_id:      $user_id,
                activity:     'quiz_submitted',
                initiated_by: 'self',
                object_id:    $quiz_id,
                object_title: $quiz_title,
                object_type:  'quiz',
                meta:         $meta
            );
        }

        /**
         * Log quiz completion event
         *
         * Triggered by: learndash_quiz_completed hook
         * Captures: Full quiz data when user completes taking a quiz
         */
        public function on_quiz_completed($quiz_data, $user) {
            if (empty($quiz_data) || !is_array($quiz_data)) {
                return;
            }

            $user_id = intval($user->ID ?? 0);

            // Note: key is 'quiz' not 'quiz_id' in the quiz_data array
            $quiz_id = $quiz_data['quiz'] ?? 0;
            if (is_object($quiz_id) && isset($quiz_id->ID)) {
                $quiz_id = intval($quiz_id->ID);
            } else {
                $quiz_id = intval($quiz_id);
            }

            $course_id = $quiz_data['course'] ?? 0;
            if (is_object($course_id) && isset($course_id->ID)) {
                $course_id = intval($course_id->ID);
            } else {
                $course_id = intval($course_id);
            }

            if (!$user_id || !$quiz_id) {
                return;
            }

            $quiz_title = get_the_title($quiz_id) ?: 'Unknown Quiz';

            // Note: define preferred data to include in metadata
            $meta = [
                'course_id'     => $course_id,
                'score'         => intval($quiz_data['score'] ?? 0),
                'points'        => intval($quiz_data['points'] ?? 0),
                'total_points'  => intval($quiz_data['total_points'] ?? 0),
                'percentage'    => floatval($quiz_data['percentage'] ?? 0),
                'timespent'     => intval($quiz_data['timespent'] ?? 0),
                'pass'          => (bool) ($quiz_data['pass'] ?? false),
            ];

            $this->log_activity(
                user_id:      $user_id,
                activity:     'quiz_completed',
                initiated_by: 'system',
                object_id:    $quiz_id,
                object_title: $quiz_title,
                object_type:  'quiz',
                meta:         $meta
            );
        }

        /**
         * Log course enrollment/unenrollment event
         *
         * Triggered by: learndash_update_course_access hook
         * Captures: Course enrollment status change with user, course, and access data
         */
        public function on_course_access_update($user_id, $course_id, $access_list, $remove) {
            $user_id = intval($user_id);
            $course_id = intval($course_id);

            if (!$user_id || !$course_id) {
                return;
            }

            $activity = $remove ? 'course_unenrolled' : 'course_enrolled';
            $course_title = get_the_title($course_id) ?: 'Unknown Course';

            $this->log_activity(
                user_id:      $user_id,
                activity:     $activity,
                initiated_by: 'system',
                object_id:    $course_id,
                object_title: $course_title,
                object_type:  'course',
                meta:         [
                    'access_list' => $access_list,
                    'action'      => $remove ? 'removed' : 'added',
                ]
            );
        }

        /**
         * Log page view for topics, lessons, and quizzes
         *
         * Triggered by: template_redirect hook
         * Detects when user accesses a topic, lesson, or quiz page and logs the visit
         * Also fetches LearnDash activity data to capture session timing
         */
        public function on_page_view() {
            // Only track logged-in users
            if (!is_user_logged_in()) {
                return;
            }

            // Detect if viewing a topic or lesson page
            if (!is_singular(['sfwd-topic', 'sfwd-lessons'])) {
                return;
            }

            global $post;
            $user_id = get_current_user_id();
            $post_id = intval($post->ID);
            $post_type = $post->post_type;

            // Check transient to prevent duplicate logs
            $transient_key = 'bys_page_view_' . $user_id . '_' . $post_id;
            if (get_transient($transient_key)) {
                return; // Already logged a visit for this within transient window
            }

            // Determine activity type and object type based on post type
            if ($post_type === 'sfwd-lessons') {
                $activity_type = 'lesson';
                $object_type = 'lesson';
            } elseif ($post_type === 'sfwd-topic') {
                $activity_type = 'topic';
                $object_type = 'topic';
            }

            // Get the course ID for this post
            $course_id = 0;
            if ($post_type === 'sfwd-topic') {
                // Get parent lesson, then course
                $lesson_id = learndash_get_lesson_id($post_id);
                if ($lesson_id) {
                    $course_id = learndash_get_course_id($lesson_id);
                }
            } else {
                // Get course directly for lesson
                $course_id = learndash_get_course_id($post_id);
            }

            if (!$course_id) {
                return; // Not part of a valid course structure
            }

            $post_title = get_the_title($post_id);

            // Fetch LearnDash activity data for this user/topic/lesson
            $ld_activity = learndash_get_user_activity([
                'user_id'       => $user_id,
                'post_id'       => $post_id,
                'activity_type' => $activity_type,
                'course_id'     => $course_id,
            ]);

            $meta = [
                'course_id'       => $course_id,
                'activity_type'   => $activity_type,
            ];

            // If LearnDash has activity data, enrich metadata with session times
            if ($ld_activity) {
                $meta['ld_activity'] = [
                    'activity_started'   => intval($ld_activity->activity_started),
                    'activity_completed' => intval($ld_activity->activity_completed),
                    'activity_updated'   => intval($ld_activity->activity_updated),
                    'activity_status'    => (bool) $ld_activity->activity_status,
                ];
            }

            $activity = $post_type === 'sfwd-topic' ? 'topic_visited' : 'lesson_visited';

            $this->log_activity(
                user_id:      $user_id,
                activity:     $activity,
                initiated_by: 'self',
                object_id:    $post_id,
                object_title: $post_title,
                object_type:  $object_type,
                meta:         $meta
            );

            // Set transient for 30 mins
            set_transient($transient_key, true, 30 * MINUTE_IN_SECONDS);
        }
    }
}