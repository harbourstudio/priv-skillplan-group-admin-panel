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
            add_shortcode('bys_time_tracking_total', [$this, 'shortcode_total']);

            // Wipe our tracker rows when an admin uses LD's "Delete user data"
            // checkbox on the user profile screen. personal_options_update fires
            // when a user edits themselves; edit_user_profile_update fires when
            // an admin edits another user. LD only shows the checkbox on admin
            // edits, but binding both matches Uncanny CourseTimer's pattern.
            add_action('personal_options_update',  [$this, 'handle_user_data_reset']);
            add_action('edit_user_profile_update', [$this, 'handle_user_data_reset']);
        }

        /**
         * Shortcode [bys_time_tracking_total user_id="123"]
         *
         * Returns a user's total tracked active time across LD posts
         * (defined in LD_CONTENT_TYPES); formatted as "Xh Ym". Sums all rows for
         * that user in a single indexed query.
         * Returns empty string on invalid user_id.
         * 
         * Usage: do_shortcode('[bys_time_tracking_total user_id="123"]')
         */
        public function shortcode_total($atts) {
            $atts = shortcode_atts(['user_id' => 0], $atts, 'bys_time_tracking_total');
            $user_id = (int) $atts['user_id'];
            if ($user_id < 1) return '';

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_TIME_TRACKING_TABLE;
            $seconds = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COALESCE(SUM(seconds_total), 0) FROM {$table} WHERE user_id = %d",
                $user_id
            ));

            $h = (int) floor($seconds / 3600);
            $m = (int) floor(($seconds % 3600) / 60);
            return sprintf('%dh %dm', $h, $m);
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
         * Wipe the given user's tracker rows when the LD "Delete user data"
         * checkbox is ticked on the user profile screen.
         *
         * Guarded by:
         * - manage_options capability (only admins can trigger)
         * - the $_POST['learndash_delete_user_data'] value matching the user
         *   being edited (the checkbox posts the target user_id as its value)
         *
         * Deletes:
         * - Rows in the new bys_groups_time_tracking table.
         * - Legacy uo_timer_* meta (so a reset clears history from either
         *   source, whether or not Uncanny CourseTimer is still active).
         * - Legacy course_timer_completed_* meta (same reason — mirrors
         *   Uncanny's own cleanup so orphaned rows don't accumulate after
         *   the module is deactivated).
         */
        public function handle_user_data_reset($user_id) {
            if (!current_user_can('manage_options')) return;

            $user = get_user_by('id', $user_id);
            if (empty($user->ID)) return;

            $ld_delete = filter_input(INPUT_POST, 'learndash_delete_user_data');
            if (empty($ld_delete) || (int) $ld_delete !== (int) $user->ID) return;

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_TIME_TRACKING_TABLE;

            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$table} WHERE user_id = %d",
                $user_id
            ));

            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$wpdb->usermeta} WHERE user_id = %d AND meta_key LIKE %s",
                $user_id, 'uo_timer_%'
            ));

            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$wpdb->usermeta} WHERE user_id = %d AND meta_key LIKE %s",
                $user_id, 'course_timer_completed_%'
            ));
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
