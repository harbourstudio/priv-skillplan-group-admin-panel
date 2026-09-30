<?php
/**
 * Time Tracking Migration
 *
 * One-time backfill: copies legacy Uncanny CourseTimer `uo_timer_*` usermeta
 * rows into the new bys_groups_time_tracking table.
 * Idempotent; skips existing rows.
 *
 * Callable two ways:
 *   - WP-CLI:  wp bys-groups migrate-time-tracking [--dry-run] [--batch=<n>]
 *   - Admin:   BYS_Groups_Admin_Settings runs it via a temporary button on
 *              the Time Tracking section of the plugin settings page.
 *
 * Core loop lives in run(). __invoke() is a thin CLI wrapper.
 *
 * @package BYS_Groups
 */

if (!defined('ABSPATH')) return;

if (!class_exists('BYS_Groups_Time_Tracking_Migration')) {
    class BYS_Groups_Time_Tracking_Migration {

        /**
         * WP-CLI entry point. Thin wrapper around run() that formats CLI output
         * (opening line, progress bar, summary, success/warning).
         *
         * ## OPTIONS
         *
         * [--batch=<n>]
         * : Number of rows per batch. Default 1000.
         *
         * [--dry-run]
         * : Report what would be migrated without writing anything.
         *
         * @when after_wp_load
         */
        public function __invoke($args, $assoc_args) {
            $batch_size = isset($assoc_args['batch']) ? max(1, (int) $assoc_args['batch']) : 1000;
            $dry_run    = !empty($assoc_args['dry-run']);

            WP_CLI::line($dry_run
                ? '[DRY RUN] No changes will be written.'
                : 'Backfilling bys_groups_time_tracking from uo_timer_* usermeta...');

            $progress = null;
            $result = $this->run($dry_run, $batch_size, function ($ctx) use (&$progress) {
                if ($ctx['event'] === 'start') {
                    if ($ctx['total'] === 0) return;
                    WP_CLI::line(sprintf('Found %d uo_timer_* rows to process.', $ctx['total']));
                    $progress = \WP_CLI\Utils\make_progress_bar('Migrating', $ctx['total']);
                } elseif ($ctx['event'] === 'tick' && $progress) {
                    $progress->tick();
                } elseif ($ctx['event'] === 'finish' && $progress) {
                    $progress->finish();
                }
            });

            if ($result['processed'] === 0) {
                WP_CLI::success('No uo_timer_* rows found. Nothing to migrate.');
                return;
            }

            WP_CLI::line('');
            WP_CLI::line(sprintf('Processed:    %d', $result['processed']));
            WP_CLI::line(sprintf('Inserted:     %d', $result['inserted']));
            WP_CLI::line(sprintf('Skipped:      %d (row already existed)', $result['skipped']));
            WP_CLI::line(sprintf('Unparseable:  %d (bad meta_key format or invalid values)', $result['unparseable']));
            WP_CLI::line(sprintf('Elapsed:      %.2f seconds', $result['elapsed_seconds']));

            if ($dry_run) {
                WP_CLI::warning('Dry run — no rows were actually inserted. Re-run without --dry-run to commit.');
            } else {
                WP_CLI::success('Backfill complete.');
            }
        }

        /**
         * Core migration loop. Callable from any context (CLI or admin UI).
         * All I/O is via the optional $on_progress callback — no direct
         * WP_CLI or echo calls, so it's safe under HTTP requests.
         *
         * @param bool          $dry_run     True to skip writes but still count.
         * @param int           $batch_size  Rows per SELECT batch. Default 1000.
         * @param callable|null $on_progress Callback receiving an array with
         *     'event' (start|tick|finish) and 'total' (on start).
         * @return array{processed:int, inserted:int, skipped:int, unparseable:int, elapsed_seconds:float}
         */
        public function run($dry_run = false, $batch_size = 1000, $on_progress = null) {
            $start_ts = microtime(true);

            global $wpdb;
            $tt_table = $wpdb->prefix . BYS_GROUPS_TIME_TRACKING_TABLE;
            $prefix   = 'uo_timer_';

            $total = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->usermeta} WHERE meta_key LIKE %s",
                $prefix . '%'
            ));

            if (is_callable($on_progress)) {
                call_user_func($on_progress, ['event' => 'start', 'total' => $total]);
            }

            if ($total === 0) {
                return [
                    'processed'       => 0,
                    'inserted'        => 0,
                    'skipped'         => 0,
                    'unparseable'     => 0,
                    'elapsed_seconds' => microtime(true) - $start_ts,
                ];
            }

            $inserted    = 0;
            $skipped     = 0;
            $unparseable = 0;
            $offset      = 0;

            while (true) {
                $rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT user_id, meta_key, meta_value
                     FROM {$wpdb->usermeta}
                     WHERE meta_key LIKE %s
                     ORDER BY umeta_id
                     LIMIT %d OFFSET %d",
                    $prefix . '%', max(1, (int) $batch_size), $offset
                ), ARRAY_A);

                if (empty($rows)) break;

                foreach ($rows as $row) {
                    $r = $this->migrate_row($row, $prefix, $tt_table, $dry_run);
                    if ($r === 'inserted')      $inserted++;
                    elseif ($r === 'skipped')   $skipped++;
                    else                        $unparseable++;

                    if (is_callable($on_progress)) {
                        call_user_func($on_progress, ['event' => 'tick']);
                    }
                }

                $offset += count($rows);
            }

            if (is_callable($on_progress)) {
                call_user_func($on_progress, ['event' => 'finish']);
            }

            return [
                'processed'       => $total,
                'inserted'        => $inserted,
                'skipped'         => $skipped,
                'unparseable'     => $unparseable,
                'elapsed_seconds' => microtime(true) - $start_ts,
            ];
        }

        /**
         * Parse one uo_timer_* row, look up its LD activity timestamps if any,
         * and INSERT IGNORE into the new table.
         *
         * Returns: 'inserted', 'skipped' (row already existed), or 'unparseable'.
         */
        private function migrate_row($row, $prefix, $tt_table, $dry_run) {
            $user_id = (int) $row['user_id'];
            $seconds = (int) $row['meta_value'];
            $suffix  = substr($row['meta_key'], strlen($prefix));
            $parts   = explode('_', $suffix);

            if (count($parts) !== 2) return 'unparseable';

            $course_id = (int) $parts[0];
            $post_id   = (int) $parts[1];

            if ($user_id < 1 || $course_id < 1 || $post_id < 1 || $seconds < 1) {
                return 'unparseable';
            }

            if ($dry_run) return 'inserted';

            global $wpdb;

            $activity = $wpdb->get_row($wpdb->prepare(
                "SELECT activity_started, activity_updated
                 FROM {$wpdb->prefix}learndash_user_activity
                 WHERE user_id = %d AND post_id = %d
                   AND activity_type IN ('topic','lesson','quiz','course')
                 ORDER BY activity_updated DESC
                 LIMIT 1",
                $user_id, $post_id
            ), ARRAY_A);

            $now_gmt        = gmdate('Y-m-d H:i:s');
            $first_started  = ($activity && !empty($activity['activity_started']))
                ? gmdate('Y-m-d H:i:s', (int) $activity['activity_started'])
                : $now_gmt;
            $last_updated   = ($activity && !empty($activity['activity_updated']))
                ? gmdate('Y-m-d H:i:s', (int) $activity['activity_updated'])
                : $now_gmt;

            $result = $wpdb->query($wpdb->prepare(
                "INSERT IGNORE INTO {$tt_table}
                    (user_id, course_id, post_id, seconds_total, first_started_gmt, last_updated_gmt)
                 VALUES (%d, %d, %d, %d, %s, %s)",
                $user_id, $course_id, $post_id, $seconds, $first_started, $last_updated
            ));

            if ($result === false) return 'unparseable';
            return $result > 0 ? 'inserted' : 'skipped';
        }
    }

    // Only register the CLI command when running under WP-CLI. The class
    // itself is always loaded (for the admin-settings button).
    if (defined('WP_CLI') && WP_CLI) {
        WP_CLI::add_command('bys-groups migrate-time-tracking', 'BYS_Groups_Time_Tracking_Migration');
    }
}
