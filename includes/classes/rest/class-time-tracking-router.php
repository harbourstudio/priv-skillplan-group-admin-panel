<?php
/**
 * Time Tracking Router
 *
 * Endpoints for the custom active-time tracker
 * POST /me/time-tracking — record an active-time delta for the current
 * user on the given LD post.
 * Server increments the (user_id, course_id, post_id) row on the custom
 * bys_groups_time_tracking table.
 *
 * @package BYS_Groups
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Time_Tracking_Router')) {
    class BYS_Groups_Time_Tracking_Router {

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
        }

        public function register_routes() {
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/me/time-tracking', [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'record_delta'],
                'permission_callback' => 'is_user_logged_in'
            ]);
        }

        /**
         * POST /me/time-tracking endpoint handler
         */
        public function record_delta($request) {

            // Extract payload
            $user_id = get_current_user_id();
            $course_id = intval($request->get_param('course_id'));
            $post_id = intval($request->get_param('post_id'));
            $delta_seconds = intval($request->get_param('delta_seconds'));
            
            if ($user_id < 1 || $course_id < 1 || $post_id < 1 || $delta_seconds < 1) {
                return new WP_Error('bad_request', 'Invalid payload', ['status' => 400]);
            }

            $update_interval = $this->get_update_interval();
            // caps delta the server will accept
            $max_delta = $update_interval + 30;
            // minimum wait between accepted writes for the same [user,course,post]
            $throttle = max(15, (int) floor($update_interval/2));

            if ($delta_seconds > $max_delta) {
                return new WP_Error('bad_request', 'delta_seconds exceeds maximum', ['status' => 400]);
            }

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_TIME_TRACKING_TABLE;

            // Throttle: skip if the last update for this row is within the throttle window
            $last_updated = $wpdb->get_var($wpdb->prepare(
                "SELECT last_updated_gmt FROM {$table}
                 WHERE user_id = %d AND course_id = %d AND post_id = %d
                 LIMIT 1",
                $user_id, $course_id, $post_id
            ));

            if ($last_updated) {
                $last_ts = strtotime($last_updated . ' UTC');
                if ($last_ts && (time() - $last_ts) < $throttle) {
                    return new WP_REST_Response(null, 429, ['Retry-After' => $throttle]);
                }
            }

            $now_gmt = gmdate('Y-m-d H:i:s');

            // On INSERT, first_started_gmt = last_updated_gmt = now.
            // On UPDATE, first_started_gmt is untouched; seconds_total accumulates by incoming delta_seconds
            $wpdb->query($wpdb->prepare(
                "INSERT INTO {$table}
                    (user_id, course_id, post_id, seconds_total, first_started_gmt, last_updated_gmt)
                 VALUES (%d, %d, %d, %d, %s, %s)
                 ON DUPLICATE KEY UPDATE
                    seconds_total    = seconds_total + VALUES(seconds_total),
                    last_updated_gmt = VALUES(last_updated_gmt)",
                $user_id, $course_id, $post_id, $delta_seconds, $now_gmt, $now_gmt
            ));

            return new WP_REST_Response(null, 204);
        }

        // Read the plugin settings for update interval value from wp_options. Fallback to constant default otherwise.
        private function get_update_interval() {
            $val = (int) get_option('bys_groups_time_tracking_update_interval', 0);

            return $val > 0 ? $val : BYS_GROUPS_TIME_TRACKING_UPDATE_INTERVAL_DEFAULT;
        }
       
    }
}