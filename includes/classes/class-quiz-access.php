<?php
/**
 * BYS_Groups_Quiz_Access
 *
 * Owns two per-user quiz overrides that layer on top of LD:
 *  1. Access-window: start/end datetimes that gate when a sfwd-quiz
 *  can be taken at both group-level and user-level 
 *  2. Granted repeats: additional retakes awarded to a user, added on top
 *  of the quiz's global `sfwd-quiz_repeats` setting.
 *
 * @package BYS_Groups
 * @since 1.0.0
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Quiz_Access')) {
    class BYS_Groups_Quiz_Access {
        const GROUP_QUIZ_ACCESS_META = '_bys_quiz_access';
        const GROUP_USER_QUIZ_ACCESS_META = '_bys_user_quiz_access_';
        const USER_QUIZ_GRANTED_REPEATS_META = '_bys_quiz_granted_repeats_';
        // Attempts count snapshotted the moment a repeats are granted. Consumption is
        // is measured forward from this baseline so a user's historical over-base
        // attempts don't retroactively consume new grants
        const USER_QUIZ_GRANTED_REPEATS_BASELINE_META = '_bys_quiz_granted_repeats_baseline_';

        public function __construct() {
            // Apply the group/user-level start/end access window on top of
            // LD's own lesson-access date logic.
            add_filter('ld_lesson_access_from', array($this, 'apply_quiz_access_dates'), 10, 3);

            // When the access window is closed, swap LD's quiz content for
            // our custom "quiz-unavailable" template.
            add_filter('learndash_content', array($this, 'display_gated_quiz'), 1, 2);

            // Per-user override of the quiz's retake limit. Two filters
            // cover both paths LD uses:
            // - learndash_allowed_repeats: read by the deprecated `learndash_can_attempt_again()` helper
            // - learndash_quiz_attempts: the modern gate used by the [ld_quiz] shortcode
            add_filter('learndash_allowed_repeats', array($this, 'apply_user_granted_repeats'), 10, 3);
            add_filter('learndash_quiz_attempts', array($this, 'apply_user_granted_repeats_to_quiz_attempts'), 10, 4);
        }

        /**
         * Filter for `learndash_allowed_repeats` (LD's deprecated path).
         * Composes the user's granted repeats onto the quiz's global `sfwd-quiz_repeats`
         * value. Unlimited quizzes (base 0/empty) are left alone.
         */
        public function apply_user_granted_repeats($repeats, $user_id, $quiz_id) {
            $grant = self::get_user_quiz_granted_repeats((int) $user_id, (int) $quiz_id);
            if ($grant <= 0) {
                return $repeats;
            }
            $base = (int) $repeats;
            return $base > 0 ? $base + $grant : $repeats;
        }

        /**
         * Filter for `learndash_quiz_attempts` (LD's modern gate used by
         * the [ld_quiz] shortcode to decide whether the Start/Restart
         * button renders). We authoritatively recompute `$attempts_left`
         * rather than composing with LD's own inputs — LD's `$attempts_count`
         * is course-scoped and silently drops `_sfwd-quizzes` rows without a
         * matching `course` field, which makes it under-report for our
         * purposes. Sourcing the count via `learndash_get_user_quiz_attempt`
         * keeps the gate aligned with what `get_user_quiz_attempts_summary`
         * shows the leader.
         *
         * base_left = max(0, base - attempts) — untouched base capacity
         * grant_used = max(0, attempts - baseline) — attempts since grant awarded
         * grant_left = max(0, grant - grant_used) — granted repeats still available
         *
         * The baseline (see USER_QUIZ_GRANTED_REPEATS_BASELINE_META) is what
         * lets a fresh grant work for a learner who has already exceeded
         * base, so that their historical over-base attempts don't retroactively
         * consume the new grant.
         *
         * @param bool|int $attempts_left  LD's initial verdict (ignored).
         * @param int      $attempts_count LD's course-scoped count (ignored).
         * @param int      $user_id
         * @param int      $quiz_id
         * @return bool|int  1 if allowed, 0 if locked.
         */
        public function apply_user_granted_repeats_to_quiz_attempts($attempts_left, $attempts_count, $user_id, $quiz_id) {
            $quiz_settings = learndash_get_setting((int) $quiz_id);
            $repeats = isset($quiz_settings['repeats']) ? trim((string) $quiz_settings['repeats']) : '';
            if ('' === $repeats) {
                return $attempts_left; // Unlimited quiz — nothing to enforce.
            }

            $grant    = self::get_user_quiz_granted_repeats((int) $user_id, (int) $quiz_id);
            $baseline = self::get_user_quiz_granted_repeats_baseline((int) $user_id, (int) $quiz_id);
            $attempts_count = self::count_user_quiz_attempts($user_id, $quiz_id);

            $base       = (int) $repeats;
            $base_left  = max(0, $base - $attempts_count);
            $grant_used = max(0, $attempts_count - $baseline);
            $grant_left = max(0, $grant - $grant_used);

            $has_budget = ($base_left > 0) || ($grant_left > 0);

            return $has_budget ? 1 : 0;
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

            // Only apply to sfwd-quiz with show_test_grading_config post meta as true (1)
            $show_test_grading_config = get_post_meta($quiz_id, 'show_test_grading_config', true);
            if (empty($show_test_grading_config) || '1' !== $show_test_grading_config) {
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

            // Only apply to sfwd-quiz with show_test_grading_config post meta as true (1)
            $show_test_grading_config = get_post_meta( $quiz_id, 'show_test_grading_config', true );
            if (empty($show_test_grading_config) || '1' !== $show_test_grading_config) {
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

        /**
         * Read the leader-set granted-repeats total for this user + quiz.
         * Returns 0 when nothing has been granted (or the meta row was
         * deleted by a full revoke).
         */
        public static function get_user_quiz_granted_repeats($user_id, $quiz_id) {
            $value = get_user_meta((int) $user_id, self::USER_QUIZ_GRANTED_REPEATS_META . (int) $quiz_id, true);
            return $value === '' ? 0 : max(0, (int) $value);
        }

        /**
         * Save the leader-set granted-repeats total. Also maintains a
         * "baseline" — the learner's attempts count at the moment the
         * current grant was awarded. The baseline is what lets us tell
         * whether a later attempt was consumed against a granted repeat
         * or was part of the learner's pre-grant history.
         *
         * Returns the previous stored total so callers can diff old vs
         * new (the notify email uses this to describe what changed).
         *
         * How the baseline reacts to each save — three cases:
         *
         *  1. First grant awarded to a user who has none
         *      ($previous = 0, $count > 0)
         *      Snapshot the baseline to the user's current attempts count.
         *      Anything the learner has done up to this point si treated as
         *      history and does not consume new grants.
         *
         *  2. Adjusting a grant that's already active
         *      ($previous > 0, $count > 0 — leader adds or subtracts)
         *      Baseline is left alone. Attempts taken since the original
         *      award continue to count against the grant total.
         *
         *  3. Fully revoking all grants
         *      ($previous > 0, $count = 0)
         *      Delete both the grant and baseline meta rows. If the leader
         *      awards a new grant, case #1 fires and a fresh baseline is snapshotted
         */
        public static function save_user_quiz_granted_repeats($user_id, $quiz_id, $count) {
            $user_id  = (int) $user_id;
            $quiz_id  = (int) $quiz_id;
            $count    = max(0, (int) $count);
            $previous = self::get_user_quiz_granted_repeats($user_id, $quiz_id);

            $grant_key    = self::USER_QUIZ_GRANTED_REPEATS_META . $quiz_id;
            $baseline_key = self::USER_QUIZ_GRANTED_REPEATS_BASELINE_META . $quiz_id;

            if ($count === 0) {
                delete_user_meta($user_id, $grant_key);
                delete_user_meta($user_id, $baseline_key);
            } else {
                update_user_meta($user_id, $grant_key, $count);

                // Snapshot only on 0
                if ($previous === 0) {
                    $attempts_count = self::count_user_quiz_attempts($user_id, $quiz_id);
                    update_user_meta($user_id, $baseline_key, $attempts_count);
                }
            }

            return $previous;
        }

        /**
         * Count the user's attempts on this quiz. Sourced via
         * `learndash_get_user_quiz_attempt` so the value stays consistent
         * with what `get_user_quiz_attempts_summary` and the gate filter
         * observe (course-irrespective).
         */
        private static function count_user_quiz_attempts($user_id, $quiz_id) {
            if (!function_exists('learndash_get_user_quiz_attempt')) return 0;
            $attempts = learndash_get_user_quiz_attempt((int) $user_id, ['quiz' => (int) $quiz_id]);
            return is_array($attempts) ? count($attempts) : 0;
        }

        /**
         * Read the granted-repeats baseline for this user + quiz.
         * Returns 0 when no baseline has been snapshotted.
         */
        public static function get_user_quiz_granted_repeats_baseline($user_id, $quiz_id) {
            $value = get_user_meta((int) $user_id, self::USER_QUIZ_GRANTED_REPEATS_BASELINE_META . (int) $quiz_id, true);
            return $value === '' ? 0 : max(0, (int) $value);
        }

        /**
         * Snapshot of the user's LD attempt history + our per-user granted
         * repeats, shaped for the group-user-quiz-config block's info panel.
         *
         * Returns:
         *   total_attempts            (int)    — attempts already logged
         *   last_attempt_utc          (string) — ISO 8601 UTC of most recent attempt, or ''
         *   granted_repeats           (int)    — stored total awarded by the leader
         *   granted_repeats_remaining (int)    — display-side computation:
         *                                        stored total minus attempts logged
         *                                        AFTER the grant baseline. Lets the
         *                                        leader see what's actually still
         *                                        available to the learner.
         *   granted_repeats_baseline  (int)    — attempts count snapshotted when the
         *                                        current grant series began, or 0 if
         *                                        no series is active
         *   global_repeats            (int)    — LD's own `sfwd-quiz_repeats` value
         *   repeats_unlimited         (bool)   — true when global_repeats is 0/empty
         */
        public static function get_user_quiz_attempts_summary($user_id, $quiz_id) {
            $user_id = (int) $user_id;
            $quiz_id = (int) $quiz_id;

            // Attempts history (from LD)
            $total_attempts   = 0;
            $last_attempt_utc = '';

            if (function_exists('learndash_get_user_quiz_attempt')) {
                $attempts = learndash_get_user_quiz_attempt($user_id, ['quiz' => $quiz_id]);
                if (is_array($attempts)) {
                    $total_attempts = count($attempts);

                    $latest_ts = 0;
                    foreach ($attempts as $attempt) {
                        $ts = 0;
                        if (isset($attempt['time'])) {
                            $ts = (int) $attempt['time'];
                        } elseif (isset($attempt['completed'])) {
                            $ts = (int) $attempt['completed'];
                        }
                        if ($ts > $latest_ts) {
                            $latest_ts = $ts;
                        }
                    }

                    if ($latest_ts > 0) {
                        // LD attempt timestamps are Unix (UTC).
                        $last_attempt_utc = gmdate('c', $latest_ts);
                    }
                }
            }

            // Quiz base capacity (from LD post meta)
            $quiz_meta      = get_post_meta($quiz_id, '_sfwd-quiz', true);
            $global_repeats = is_array($quiz_meta) && isset($quiz_meta['sfwd-quiz_repeats'])
                ? (int) $quiz_meta['sfwd-quiz_repeats']
                : 0;
            $repeats_unlimited = $global_repeats <= 0;

            // Granted repeats + remaining
            $grant    = self::get_user_quiz_granted_repeats($user_id, $quiz_id);
            $baseline = self::get_user_quiz_granted_repeats_baseline($user_id, $quiz_id);

            // Consumption is measured forward from the baseline, NOT from
            // the quiz's base allowance. Any attempts the learner had
            // BEFORE the grant was awarded are grandfathered so they don't
            // consume fresh grant. Unlimited quizzes never consume grants at all.
            $grant_used      = $repeats_unlimited
                ? 0
                : max(0, $total_attempts - $baseline);
            $grant_remaining = max(0, $grant - $grant_used);

            return [
                'total_attempts'            => $total_attempts,
                'last_attempt_utc'          => $last_attempt_utc,
                'granted_repeats'           => $grant,
                'granted_repeats_remaining' => $grant_remaining,
                'granted_repeats_baseline'  => $baseline,
                'global_repeats'            => $global_repeats,
                'repeats_unlimited'         => $repeats_unlimited,
            ];
        }
    }
}
