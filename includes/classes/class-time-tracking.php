<?php
/**
 * Time Tracking (frontend enqueue + config)
 *
 * Enqueues the client-side active-time tracker on LD content pages
 * for logged-in users. Localizes runtime config (course/post IDs, update
 * interval, idle threshold, redirect URL, modal copy) as
 * window.bysTimeTracking.
 *
 * The tracker POSTs deltas to the /me/time-tracking REST endpoint
 * registered by BYS_Groups_Time_Tracking_Router.
 *
 * @package BYS_Groups
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Time_Tracking')) {
    class BYS_Groups_Time_Tracking {

        const LD_CONTENT_TYPES = ['sfwd-courses', 'sfwd-lessons', 'sfwd-topic', 'sfwd-quiz'];

        public function __construct() {
            add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        }

        /**
         * Enqueue tracker JS + CSS on LD content pages for logged-in users.
         */
        public function enqueue_assets() {
            if (!is_user_logged_in()) return;
            if (!is_singular(self::LD_CONTENT_TYPES)) return;

            $post = get_queried_object();
            if (!$post instanceof WP_Post) return;

            $post_id   = (int) $post->ID;
            $course_id = $this->resolve_course_id($post_id, $post->post_type);
            if ($course_id < 1 || $post_id < 1) return;

            wp_enqueue_style(
                'bys-groups-time-tracking',
                BYS_GROUPS_PLUGIN_URL . 'assets/css/time-tracking.css',
                [],
                BYS_GROUPS_VERSION
            );

            wp_enqueue_script(
                'bys-groups-time-tracking',
                BYS_GROUPS_PLUGIN_URL . 'assets/js/time-tracking.js',
                ['bys-groups-auth'],
                BYS_GROUPS_VERSION,
                true
            );

            $config = [
                'restUrl'        => rest_url('bys-groups/v1/me/time-tracking'),
                'courseId'       => $course_id,
                'postId'         => $post_id,
                'updateInterval' => $this->get_update_interval(),
                'idleThreshold'  => $this->get_idle_threshold(),
                'redirectUrl'    => $this->get_idle_redirect_url(),
            ];

            wp_add_inline_script(
                'bys-groups-time-tracking',
                'window.bysTimeTracking = ' . wp_json_encode($config) . ';',
                'before'
            );
        }

        /**
         * For sfwd-courses, the post IS the course. For lesson/topic/quiz,
         * fall back to LD's own resolver.
         */
        private function resolve_course_id($post_id, $post_type) {
            if ('sfwd-courses' === $post_type) {
                return $post_id;
            }
            if (function_exists('learndash_get_course_id')) {
                return (int) learndash_get_course_id($post_id);
            }
            return 0;
        }

        /**
         * -----------------------------------------------------
         * Helpers that reads the time tracker config
         * from plugin settings. See BYS_Groups_Admin_Settings.
         * -----------------------------------------------------
         */
        private function get_update_interval() {
            $val = (int) get_option('bys_groups_time_tracking_update_interval', 0);
            return $val > 0 ? $val : BYS_GROUPS_TIME_TRACKING_UPDATE_INTERVAL_DEFAULT;
        }

        private function get_idle_threshold() {
            $val = (int) get_option('bys_groups_time_tracking_idle_threshold', 0);
            return $val > 0 ? $val : BYS_GROUPS_TIME_TRACKING_IDLE_THRESHOLD_DEFAULT;
        }

        private function get_idle_redirect_url() {
            $stored = (string) get_option('bys_groups_time_tracking_idle_redirect_url', '');
            return '' !== $stored ? $stored : home_url();
        }
    }
}
