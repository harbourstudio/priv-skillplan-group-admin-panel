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

        /**
         * Session-presence tracker — NOT a wp_login event tracker.
         *
         * `wp_login` only fires when a user submits the login form, so any
         * meta written from it goes stale the moment the user becomes
         * cookie-authenticated. We refresh this key on every authenticated
         * request instead — see track_user_session_activity() for the write
         * and get_last_active_ts() for the read.
         */
        const ACTIVE_META_KEY         = 'bys_last_active_ts';
        const ACTIVE_THROTTLE_SECONDS = 300; // 5 min

        public function __construct() {
            $this->register_hooks();
        }

        private function register_hooks() {
            // System events
            add_action('wp_login',  [$this, 'on_user_login'],  10, 2);
            add_action('wp_logout', [$this, 'on_user_logout'], 1); // Priority 1 (before default 10) to capture before session destroyed
            // Session-presence tracker (see ACTIVE_META_KEY docblock above).
            add_action('init', [$this, 'track_user_session_activity']);
            // Learndash events
            add_action('learndash_course_completed',      [$this, 'on_certificate_earned'],   10, 1);
            add_action('template_redirect',               [$this, 'on_page_view'],            10);
            add_action('learndash_update_course_access',  [$this, 'on_course_access_update'], 10, 4);

            // (visit counter is now incremented directly in on_page_view)
        }

        /**
         * Hook handler for `init`. Skips background contexts (cron, CLI)
         * and stamps ACTIVE_META_KEY for the current user, throttled to
         * one write per ACTIVE_THROTTLE_SECONDS.
         */
        public function track_user_session_activity() {
            if (wp_doing_cron()) return;
            if (defined('WP_CLI') && WP_CLI) return;

            $user_id = get_current_user_id();
            if (!$user_id) return;

            $now  = time();
            $last = (int) get_user_meta($user_id, self::ACTIVE_META_KEY, true);
            if ($now - $last < self::ACTIVE_THROTTLE_SECONDS) return;

            update_user_meta($user_id, self::ACTIVE_META_KEY, $now);
        }

        /**
         * Plugin-wide "when was this user last active" reader. Returns the
         * max() across three sources, in descending order of reliability:
         *
         *   1. ACTIVE_META_KEY  — session-presence tracker (written by
         *      track_user_session_activity() on every authenticated request).
         *   2. learndash_user_activity table — real LD engagement events
         *      (survives cookie-auth, but only LD-context interactions).
         *   3. Legacy wp_login-fired meta union — can be very stale; kept
         *      as last resort so pre-tracker accounts still register SOME
         *      signal.
         *
         * Returns 0 when no source has any data for this user.
         */
        public static function get_last_active_ts($user_id) {
            $user_id = (int) $user_id;
            if ($user_id <= 0) return 0;

            return max(
                (int) get_user_meta($user_id, self::ACTIVE_META_KEY, true),
                self::get_ld_activity_ts($user_id),
                // fallback — wp_login-fired keys
                (int) get_user_meta($user_id, '_ld_notifications_last_login', true),
                (int) get_user_meta($user_id, 'learndash-last-login',         true),
                (int) get_user_meta($user_id, 'last_login',                   true)
            );
        }

        /**
         * Internal: max() of activity_started / _updated / _completed for
         * this user in learndash_user_activity. One indexed query.
         */
        private static function get_ld_activity_ts($user_id) {
            global $wpdb;
            $ts = $wpdb->get_var($wpdb->prepare(
                "SELECT GREATEST(
                    COALESCE(MAX(activity_started),   0),
                    COALESCE(MAX(activity_updated),   0),
                    COALESCE(MAX(activity_completed), 0)
                 )
                 FROM {$wpdb->prefix}learndash_user_activity
                 WHERE user_id = %d",
                (int) $user_id
            ));
            return (int) $ts;
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
                object_id:    0,
                object_title: null,
                object_type:  null
            );
        }

        /**
         * Log user logout event
         *
         * Triggered by: wp_logout hook (called as user is logging out, before session is destroyed)
         * Captures: When user explicitly logs out
         */
        public function on_user_logout($user_id = null) {
            // If user_id not provided by hook, get current user
            if (!$user_id) {
                $user_id = get_current_user_id();
            }

            $user_id = intval($user_id);

            if (!$user_id) {
                return;
            }

            $this->log_activity(
                user_id:      $user_id,
                activity:     'user_logout',
                initiated_by: 'self',
                object_id:    0,
                object_title: null,
                object_type:  null
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
            $user_id  = get_current_user_id();
            $post_id  = intval($post->ID);
            $post_type = $post->post_type;

            // Increment per-topic visit counter on every page load.
            // Done before the transient check so every navigation to this topic
            // is counted, even within the 30-minute activity-dedup window.
            if ($post_type === 'sfwd-topic') {
                $meta_key = 'bys_topic_visits_' . $post_id;
                $current  = intval(get_user_meta($user_id, $meta_key, true));
                update_user_meta($user_id, $meta_key, $current + 1);
            }

            // Check transient to prevent duplicate activity-log entries
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