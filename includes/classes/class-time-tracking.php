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

            // ─── Cleanup hooks for user course-progress resets ─────────────────
            // Various admin actions can be used to wipe a learner's progress
            // Each writes different data and needs its own handlers.

            // (A) LD's "Delete user data" checkbox — nukes ALL courses for
            // the user. Handled by handle_user_data_reset().
            add_action('personal_options_update',  [$this, 'handle_user_data_reset']);
            add_action('edit_user_profile_update', [$this, 'handle_user_data_reset']);

            // (B) LD's per-course progress edits
            // LD writes the new state straight into the
            // _sfwd-course_progress user_meta blob and DOESN'T fire a
            // hook we can use — so we diff the meta:
            // -- priority  0 → snapshot the meta BEFORE LD writes
            // -- priority 20 → read the meta AFTER LD wrote, compare
            //
            // If any course's `completed` count dropped between the two,
            // we know the admin cleared progress and we wipe
            // that course's tracker rows.
            add_action('personal_options_update',  [$this, 'snapshot_sfwd_progress'], 0);
            add_action('edit_user_profile_update', [$this, 'snapshot_sfwd_progress'], 0);
            add_action('personal_options_update',  [$this, 'detect_course_progress_regression'], 20);
            add_action('edit_user_profile_update', [$this, 'detect_course_progress_regression'], 20);

            // (C) Tin Canny's per-course "Purge Resume Records" dropdown.
            add_action('personal_options_update',  [$this, 'handle_tincanny_course_purge']);
            add_action('edit_user_profile_update', [$this, 'handle_tincanny_course_purge']);
        }

        /**
         * Holds a pre-save copy of _sfwd-course_progress across the two
         * hook priorities (0 and 20) that make up the diff.
         *
         * Set by snapshot_sfwd_progress(); read + cleared by
         * detect_course_progress_regression(). Lives only for the
         * duration of one HTTP request — a fresh request will re-populate.
         *
         * @var array<int, array<string, mixed>>|null
         */
        private $sfwd_progress_snapshot = null;

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
         * Wipe this module's tracker rows when the LD "Delete user data"
         * checkbox is ticked on the user profile screen.
         *
         * Scoped to data this module wrote — the bys_groups_time_tracking
         * table only. Legacy Uncanny CourseTimer meta (uo_timer_* and
         * course_timer_completed_*) is left alone; Uncanny's own module owns
         * cleanup of its own data.
         *
         * Guarded by:
         * - manage_options capability (only admins can trigger)
         * - the $_POST['learndash_delete_user_data'] value matching the user
         *   being edited (the checkbox posts the target user_id as its value)
         */
        public function handle_user_data_reset($user_id) {
            if (!current_user_can('manage_options')) return;

            $user = get_user_by('id', $user_id);
            if (empty($user->ID)) return;

            $ld_delete = isset($_POST['learndash_delete_user_data'])
                ? sanitize_text_field(wp_unslash($_POST['learndash_delete_user_data']))
                : '';
            if ('' === $ld_delete || (int) $ld_delete !== (int) $user->ID) return;

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_TIME_TRACKING_TABLE;

            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$table} WHERE user_id = %d",
                $user_id
            ));
        }

        /**
         * Step 1/2: capture _sfwd-course_progress before LD's handler
         * modifies it.
         *
         * Stashes the current value on $this->sfwd_progress_snapshot so
         * detect_course_progress_regression() can compare after LD writes.
         * Runs at priority 0 on the profile-update actions so we get in
         * first — LD's own handler is at priority 1.
         */
        public function snapshot_sfwd_progress($user_id) {
            $current = get_user_meta((int) $user_id, '_sfwd-course_progress', true);
            $this->sfwd_progress_snapshot = is_array($current) ? $current : [];
        }

        /**
         * Step 2/2: compare the snapshot to the freshly-saved meta and
         * wipe tracker rows for every course the admin cleared.
         *
         * Runs at priority 20 so LD, Tin Canny, and any other plugin have
         * finished writing before we read the "new" state.
         */
        public function detect_course_progress_regression($user_id) {
            // Pull the snapshot captured by snapshot_sfwd_progress() at
            // priority 0. Null it out so a subsequent request starts fresh.
            $old = is_array($this->sfwd_progress_snapshot) ? $this->sfwd_progress_snapshot : [];
            $this->sfwd_progress_snapshot = null;

            // Read the post-save meta
            $new_meta = get_user_meta((int) $user_id, '_sfwd-course_progress', true);
            $new = is_array($new_meta) ? $new_meta : [];

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_TIME_TRACKING_TABLE;

            $regressed_course_ids = [];

            // Case 1: course still exists in the meta, but its `completed`
            // count dropped between snapshot and now.
            foreach ($new as $course_id => $course_new) {
                $course_id = (int) $course_id;
                if ($course_id < 1 || !is_array($course_new)) continue;

                $completed_new = (int) ($course_new['completed'] ?? 0);
                $completed_old = isset($old[$course_id]['completed'])
                    ? (int) $old[$course_id]['completed']
                    : 0;

                if ($completed_new < $completed_old) {
                    $regressed_course_ids[] = $course_id;
                }
            }

            // Case 2: course was in the pre-save snapshot but has vanished
            // from the meta entirely (admin cleared/removed enrollment).
            foreach ($old as $course_id => $course_old) {
                $course_id = (int) $course_id;
                if ($course_id < 1) continue;
                if (isset($new[$course_id])) continue;

                $regressed_course_ids[] = $course_id;
            }

            if (empty($regressed_course_ids)) return;

            $regressed_course_ids = array_values(array_unique($regressed_course_ids));
            $placeholders         = implode(',', array_fill(0, count($regressed_course_ids), '%d'));

            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$table} WHERE user_id = %d AND course_id IN ({$placeholders})",
                ...array_merge([(int) $user_id], $regressed_course_ids)
            ));
        }

        /**
         * Wipe our tracker rows for one course when the admin uses Tin
         * Canny's per-course purge dropdown on the profile screen.
         *
         * Tin Canny is Uncanny's SCORM/xAPI reporting plugin. It renders a
         * "Purge Course-specific Resume Records" dropdown on the WP user
         * profile screen. When submitted, it clears its own tables
         * directly and DOESN'T fire a hook we can piggyback on — so we
         * detect the POST field it submits and mirror the wipe:
         * $_POST['purge_course_resume_records']  =  the target course_id
         *
         * The dropdown's default option is "— No Action —" and submits
         * as "0", which we skip.
         */
        public function handle_tincanny_course_purge($user_id) {
            if (!current_user_can('manage_options')) return;

            $user = get_user_by('id', $user_id);
            if (empty($user->ID)) return;

            // Read the target course_id from Tin Canny's own POST field.
            // "0" is the "— No Action —" placeholder and means "don't purge".
            $course_id = isset($_POST['purge_course_resume_records'])
                ? (int) $_POST['purge_course_resume_records']
                : 0;
            if ($course_id < 1) return;

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_TIME_TRACKING_TABLE;

            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$table} WHERE user_id = %d AND course_id = %d",
                $user_id, $course_id
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
