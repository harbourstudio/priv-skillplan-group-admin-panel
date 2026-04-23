<?php
/**
 * BYS_Groups_Quiz_Access
 *
 * Hooks into LD's access control to enforce custom start/end access dates for specific sfwd-quiz at the sfwd-group and group-user levels
 *
 * @package BYS_Groups
 * @since 1.0.0
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Quiz_Access')) {
    class BYS_Groups_Quiz_Access {
        const GROUP_QUIZ_ACCESS_META = '_bys_quiz_access';
        const GROUP_USER_QUIZ_ACCESS_META = '_bys_user_quiz_access_';

        public function __construct() {
            // apply the custom start/end date
            add_filter('ld_lesson_access_from', array($this, 'apply_quiz_access_dates'), 10, 3);

            // hooks into learndash_content to show a gated quiz view by using a custom 'quiz-unavailable' template
            add_filter('learndash_content', array($this, 'display_gated_quiz'), 1, 2);
        }

        /**
         * Handle conditions for displaying a gated quiz view
         * If quiz access is closed, render custom 'quiz unavailable' template instead of regular quiz content
         */
        public function display_gated_quiz($content, $post) {

            // only apply to sfwd-quiz
            if ('sfwd-quiz' !== get_post_type($post)) {
                return $content;
            }

            $quiz_id = $post->ID;
            $user_id = get_current_user_id();

            if (!$user_id) {
                return $content;
            }

            // Don't show gated quiz to admin/editors
            $user = get_userdata($user_id);
            $roles = $user->roles;
            if (array_intersect($roles, ['administrator', 'editor'])) {
                return $content;
            }

            // Only apply to sfwd-quiz with show_in_reporting post meta as true (1)
            $show_in_reporting = get_post_meta($quiz_id, 'show_in_reporting', true);
            if (empty($show_in_reporting) || '1' !== $show_in_reporting) {
                return $content;
            }

            // Get all sfwd-group this user belongs to
            $group_ids = learndash_get_users_group_ids($user_id);

            if (empty($group_ids)) {
                return $content;
            }

            /**
             * Check if any of this user's groups have access dates that will enable quiz access to the user (most permissive)
             */
            $any_group_allows = false;
            $block_date = null;

            foreach($group_ids as $group_id) {
                $access_date = $this->get_applicable_access_dates($group_id, $quiz_id, $user_id);

                if($access_date) {
                    $access_allowed = $this->is_access_open($access_date);

                    if ($access_allowed) {
                        $any_group_allows = true;
                        break;
                    } else {
                        $access_time = $this->get_next_available_date($access_date);
                        if ( null === $block_date || $access_time < $block_date ) {
                            $block_date = $access_time;
                        }
                    }
                }
            }

            // if any of the user's groups allow access, return quiz content as-is
            if ($any_group_allows) {
                return $content;
            }

            // if quiz has a custom access date but it's closed, deliver gated quiz view
            if (null !== $block_date) {
                return $this->render_gated_quiz_layout($post, $user_id);
            }

            return $content;
        }

        /**
         * Parse ISO 8601 UTC datetime string to Unix timestamp
         * Handles formats with/without milliseconds and seconds
         */
        private function parse_utc_datetime( $datetime_str ) {
            if (empty($datetime_str)) {
                return null;
            }

            $dt = \DateTime::createFromFormat('Y-m-d\TH:i:s.u\Z', $datetime_str, new \DateTimeZone('UTC') );
            if (!$dt) {
                $dt = \DateTime::createFromFormat('Y-m-d\TH:i:s\Z', $datetime_str, new \DateTimeZone('UTC'));
            }
            if (!$dt) {
                $dt = \DateTime::createFromFormat('Y-m-d\TH:i\Z', $datetime_str, new \DateTimeZone('UTC'));
            }

            return $dt ? $dt->getTimestamp() : null;
        }

        /**
         * Check if the window for quiz access dates is currently open
         * Access dates are stored as ISO 8601 UTC strings
         */
        public function is_access_open($access_date) {
            $now = time(); // current UTC timestamp
            $start = $this->parse_utc_datetime( $access_date['start'] ?? null );
            $end = $this->parse_utc_datetime( $access_date['end'] ?? null );

            // block if before start or after end
            if (($start && $now < $start) || ($end && $now > $end)) {
                return false;
            }

            return true;
        }

        /**
         * Get the next available access date for a quiz
         * Access dates are stored as ISO 8601 UTC strings
         */
        public function get_next_available_date($access_date) {
            $now = time(); // current UTC timestamp
            $start = $this->parse_utc_datetime( $access_date['start'] ?? null );
            $end = $this->parse_utc_datetime( $access_date['end'] ?? null );

            // time now is past end date, return PHP_INT_MAX
            if ( $end && $now > $end ) {
                return PHP_INT_MAX;
            }

            // time now is before start date, return start date
            if ( $start && $now < $start ) {
                return $start;
            }

            return null;
        }

        /**
         * Render the gated quiz layout with sidebar, header overview, and alert
         */
        public function render_gated_quiz_layout($post, $user_id) {
            $quiz_id = $post->ID;
            $group_ids = learndash_get_users_group_ids($user_id);

            // Compute quiz status info for the header (used in template)
            $attempts_array = learndash_get_user_quiz_attempt($user_id, ['quiz' => $quiz_id]);
            $status = bys_get_quiz_status($attempts_array);

            // Find the blocking access date and generate message
            $blocking_access_date = null;
            foreach ($group_ids as $group_id) {
                $access_date = $this->get_applicable_access_dates($group_id, $quiz_id, $user_id);
                if ($access_date && !$this->is_access_open($access_date)) {
                    $blocking_access_date = $access_date;
                    break;
                }
            }

            // Generate unavailability message (used in template)
            $message = $blocking_access_date ? $this->get_unavailable_message($blocking_access_date) : 'This quiz is no longer available.';

            // Render the unavailable template with required variables
            ob_start();
            include plugin_dir_path( __FILE__ ) . '../../templates/quiz-unavailable.php';
            return ob_get_clean();
        }

        /**
         * Generate the unavailable message from access date
         * Access dates are stored as ISO 8601 UTC. We convert to site timezone for display.
         */
        private function get_unavailable_message($access_date) {
            $datetime_format = apply_filters('bys_quiz_access_datetime_format', ' F j, Y, g:i a');

            $start_time = '';
            $start_ts = $this->parse_utc_datetime( $access_date['start'] ?? null );
            if ($start_ts) {
                $start_time = wp_date($datetime_format, $start_ts);
            }

            $end_time = '';
            $end_ts = $this->parse_utc_datetime( $access_date['end'] ?? null );
            if ($end_ts) {
                $end_time = wp_date($datetime_format, $end_ts);
            }

            if (!empty($start_time) && !empty($end_time)) {
                return sprintf(
                    'This quiz is not available. This quiz is accessible from <strong>%s</strong> to <strong>%s</strong>.',
                    $start_time,
                    $end_time
                );
            } elseif (!empty($start_time)) {
                return sprintf(
                    'This quiz is not available. This quiz will be available from <strong>%s</strong>.',
                    $start_time
                );
            } elseif (!empty($end_time)) {
                return sprintf(
                    'This quiz is not available. This quiz was available until <strong>%s</strong>.',
                    $end_time
                );
            }

            return 'This quiz is no longer available.';
        }

        /**
         * Apply group/group-user quiz access dates to LD's access filter
         */
        public function apply_quiz_access_dates($access_from, $quiz_id, $user_id) {

            // Only apply to sfwd-quiz post type
            if ('sfwd-quiz' !== get_post_type($quiz_id)) {
                return $access_from;
            }

            // Only apply to sfwd-quiz with show_in_reporting post meta as true (1)
            $show_in_reporting = get_post_meta( $quiz_id, 'show_in_reporting', true );
            if (empty($show_in_reporting) || '1' !== $show_in_reporting) {
                return $access_from;
            }

            // Don't enforce for administrators/editor role
            $user = get_userdata($user_id);
            $roles = $user->roles;

            if ($user && array_intersect($roles, ['administrator', 'editor'])) {
                return $access_from;
            }

            // Get all sfwd-group this user belongs to
            $group_ids = learndash_get_users_group_ids($user_id);
            if (empty($group_ids)) {
                return $access_from;
            }

            // Apply most-permissive: quiz is accessible if ANY group's allow access
            $block_date = null;
            $any_group_allows = false;

            foreach ($group_ids as $group_id) {
                $access_date = $this->get_applicable_access_dates($group_id, $quiz_id, $user_id);

                if ($access_date) {
                    $access_time = $this->compute_access_from( $access_date);

                    if (null === $access_time) {
                        // this group allows access — we can return immediately
                        $any_group_allows = true;
                        break;
                    } else {
                        // this group blocks access — track the most restrictive block time
                        if ( null === $block_date || $access_time < $block_date ) {
                            $block_date = $access_time;
                        }
                    }
                }
            }

            // No access dates found; fall through to LD's native setting
            if (null === $block_date && !$any_group_allows) {
                return $access_from;
            }

            // If any group allows access, return available
            if ($any_group_allows) {
                return null;
            }

            // If at least one group had an access date, return the most restrictive block time
            if (null !== $block_date) {
                return $block_date;
            }

            return $access_from;
        }

        /**
         * Get the applicable access dates for this quiz
         * User override takes precedence over group access dates
         */
        private function get_applicable_access_dates($group_id, $quiz_id, $user_id) {
            // 1. Check user-level override first (highest precedence)
            $user_access_dates = get_user_meta( $user_id, self::GROUP_USER_QUIZ_ACCESS_META . $group_id, true );
            if (is_array($user_access_dates) && isset($user_access_dates[$quiz_id])) {
                return $user_access_dates[$quiz_id];
            }

            // 2. Fall back to group-level access dates
            $group_access_dates = get_post_meta( $group_id, self::GROUP_QUIZ_ACCESS_META, true );
            if (is_array($group_access_dates) && isset($group_access_dates[$quiz_id])) {
                return $group_access_dates[$quiz_id];
            }

            return null;
        }

        /**
         * Compute the access timestamp from access_date array
         * Access dates are stored as ISO 8601 UTC strings
         */
        private function compute_access_from($access_date) {
            $now = time(); // Unix timestamp (always UTC)
            $start = $this->parse_utc_datetime($access_date['start'] ?? null);
            $end = $this->parse_utc_datetime($access_date['end'] ?? null);

            // time now is past end date, return PHP_INT_MAX
            if ( $end && $now > $end ) {
                return PHP_INT_MAX;
            }

            // time now is before start date, return start
            if ( $start && $now < $start ) {
                return $start;
            }

            // within the access dates or no dates set — available now
            return null;
        }

        /**
         * Get a sfwd-group's quiz access dates
         */
        public static function get_group_quiz_access_dates( $group_id ) {
            $access_date = get_post_meta($group_id, self::GROUP_QUIZ_ACCESS_META, true);
            return is_array($access_date) ? $access_date : array();
        }

        /**
         * Save a group quiz access dates
         */
        public static function save_group_quiz_access_dates($group_id, $quiz_id, $start = '', $end = '') {
            $access_date = self::get_group_quiz_access_dates($group_id);

            if (empty($start) && empty($end)) {
                // remove date if both are empty
                unset($access_date[$quiz_id]);
            } else {
                // save dates
                $access_date[$quiz_id] = array(
                    'start' => $start,
                    'end'   => $end,
                );
            }

            update_post_meta($group_id, self::GROUP_QUIZ_ACCESS_META, $access_date);
        }

        /**
         * Get a user's quiz access dates override for a specific group
         */
        public static function get_user_quiz_access_dates($user_id, $group_id) {
            $access_dates = get_user_meta($user_id, self::GROUP_USER_QUIZ_ACCESS_META . $group_id, true);
            return is_array($access_dates) ? $access_dates : array();
        }

        /**
         * Save a user's quiz access dates override for a specific group
         */
        public static function save_user_quiz_access_dates($user_id, $group_id, $quiz_id, $start = '', $end = '') {
            $access_dates = self::get_user_quiz_access_dates($user_id, $group_id);

            if (empty($start) && empty($end)) {
                // remove date if both are empty
                unset($access_dates[$quiz_id]);
            } else {
                // save dates
                $access_dates[$quiz_id] = array(
                    'start' => $start,
                    'end'   => $end,
                );
            }

            update_user_meta($user_id, self::GROUP_USER_QUIZ_ACCESS_META . $group_id, $access_dates);
        }
    }
}
