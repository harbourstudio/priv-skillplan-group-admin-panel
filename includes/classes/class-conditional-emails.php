<?php
/**
 * Conditional Emails — recipient resolution and per-condition email bodies
 * for the "Meets condition" recipient mode in the group communication send modal.
 *
 * @package BYS_Groups
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('BYS_Groups_Conditional_Emails')) {
    class BYS_Groups_Conditional_Emails {

        /**
         * REST entry point.
         * POST /bys-groups/v1/groups/{group_id}/conditional-recipients
         * Body: { condition, days?, course_id?, quiz_id? }
         */
        public static function rest_get_recipients($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            $user_id = get_current_user_id();
            if (!$user_id || !self::is_user_group_leader($user_id, $group_id)) {
                return new \WP_REST_Response(array('error' => 'User is not a leader of this group'), 403);
            }

            $body = $request->get_json_params();
            if (empty($body) || !is_array($body)) {
                $body = array(
                    'condition' => $request->get_param('condition'),
                    'days'      => $request->get_param('days'),
                    'course_id' => $request->get_param('course_id'),
                    'quiz_id'   => $request->get_param('quiz_id'),
                );
            }

            $condition = sanitize_key($body['condition'] ?? '');
            $args = array(
                'days'      => intval($body['days'] ?? 0),
                'course_id' => intval($body['course_id'] ?? 0),
                'quiz_id'   => intval($body['quiz_id'] ?? 0),
            );

            $valid = self::validate_condition_args($condition, $args);
            if (is_wp_error($valid)) {
                return new \WP_REST_Response(array('error' => $valid->get_error_message()), 400);
            }

            $recipients = self::resolve_recipients($group_id, $condition, $args);

            return new \WP_REST_Response(array(
                'recipients' => $recipients,
                'count'      => count($recipients),
            ), 200);
        }

        /**
         * Public dispatch — resolve matching users for the given condition.
         *
         * @return array Array of [{ user_id, display_name, email }]
         */
        public static function resolve_recipients($group_id, $condition, $args = array()) {
            $user_ids = self::get_group_user_ids($group_id);
            if (empty($user_ids)) {
                return array();
            }

            switch ($condition) {
                case 'outstanding_login':
                    $matched = self::filter_outstanding_login($user_ids);
                    break;
                case 'inactive_days':
                    $matched = self::filter_inactive_days($user_ids, intval($args['days'] ?? 0));
                    break;
                case 'outstanding_course_access':
                    $matched = self::filter_outstanding_course_access($user_ids, intval($args['course_id'] ?? 0));
                    break;
                case 'outstanding_quiz_completed':
                    $matched = self::filter_outstanding_quiz_completed($user_ids, intval($args['quiz_id'] ?? 0));
                    break;
                case 'outstanding_course_completed':
                    $matched = self::filter_outstanding_course_completed($user_ids, intval($args['course_id'] ?? 0));
                    break;
                case 'registered_for_days':
                    $matched = self::filter_registered_for_days($user_ids, intval($args['days'] ?? 0));
                    break;
                case 'enrolled_for_days':
                    $matched = self::filter_enrolled_for_days($user_ids, intval($args['course_id'] ?? 0), intval($args['days'] ?? 0));
                    break;
                case 'course_completed':
                    $matched = self::filter_course_completed($user_ids, intval($args['course_id'] ?? 0));
                    break;
                default:
                    return array();
            }

            return self::hydrate_users($matched);
        }

        /* ============================================================
         * Filters — each returns an array of user_ids matching condition
         * ============================================================ */

        private static function filter_outstanding_login($user_ids) {
            $matched = array();
            foreach ($user_ids as $uid) {
                if (self::get_last_login_ts($uid) === 0) {
                    $matched[] = $uid;
                }
            }
            return $matched;
        }

        private static function filter_inactive_days($user_ids, $days) {
            if ($days < 1) return array();
            $now = current_time('timestamp');
            $threshold = $days * DAY_IN_SECONDS;
            $matched = array();
            foreach ($user_ids as $uid) {
                $last = self::get_last_login_ts($uid);
                if ($last === 0 || ($now - $last) > $threshold) {
                    $matched[] = $uid;
                }
            }
            return $matched;
        }

        private static function filter_outstanding_course_access($user_ids, $course_id) {
            if (!$course_id) return array();
            $matched = array();
            foreach ($user_ids as $uid) {
                $progress = get_user_meta($uid, '_sfwd-course_progress', true);
                if (!is_array($progress) || !isset($progress[$course_id])) {
                    $matched[] = $uid;
                }
            }
            return $matched;
        }

        private static function filter_outstanding_quiz_completed($user_ids, $quiz_id) {
            if (!$quiz_id || empty($user_ids)) return array();

            global $wpdb;
            $placeholders = implode(',', array_fill(0, count($user_ids), '%d'));
            $params = array_merge(array($quiz_id), array_map('intval', $user_ids));

            $completed_ids = $wpdb->get_col($wpdb->prepare(
                "SELECT DISTINCT user_id FROM {$wpdb->prefix}learndash_user_activity
                 WHERE activity_type = 'quiz'
                   AND post_id = %d
                   AND activity_completed > 0
                   AND user_id IN ($placeholders)",
                $params
            ));

            $completed_ids = array_map('intval', (array) $completed_ids);
            return array_values(array_diff(array_map('intval', $user_ids), $completed_ids));
        }

        private static function filter_outstanding_course_completed($user_ids, $course_id) {
            if (!$course_id) return array();
            $matched = array();
            foreach ($user_ids as $uid) {
                if (!function_exists('learndash_course_completed')) {
                    break;
                }
                if (!learndash_course_completed($uid, $course_id)) {
                    $matched[] = $uid;
                }
            }
            return $matched;
        }

        private static function filter_registered_for_days($user_ids, $days) {
            if ($days < 1 || empty($user_ids)) return array();

            $cutoff = gmdate('Y-m-d H:i:s', current_time('timestamp', true) - ($days * DAY_IN_SECONDS));
            $query = new \WP_User_Query(array(
                'include'    => array_map('intval', $user_ids),
                'fields'     => 'ID',
                'number'     => -1,
                'date_query' => array(
                    array(
                        'column' => 'user_registered',
                        'before' => $cutoff,
                    ),
                ),
            ));

            return array_map('intval', (array) $query->get_results());
        }

        private static function filter_enrolled_for_days($user_ids, $course_id, $days) {
            if (!$course_id || $days < 1 || empty($user_ids)) return array();
            $now = current_time('timestamp');
            $cutoff = $now - ($days * DAY_IN_SECONDS);
            $enrolled_ts = self::get_enrollment_timestamps($user_ids, $course_id);

            $matched = array();
            foreach ($user_ids as $uid) {
                $uid = intval($uid);
                $ts = $enrolled_ts[$uid] ?? 0;
                if ($ts > 0 && $ts <= $cutoff) {
                    $matched[] = $uid;
                }
            }
            return $matched;
        }

        /**
         * Resolve the enrollment timestamp for each user in a course.
         * Uses two LearnDash-native sources, in priority order:
         *   1. course_{id}_access_from user_meta  — LD's per-user explicit access grant
         *   2. learndash_user_activity table       — earliest activity_started for activity_type='course'
         *
         * @return array Map of user_id => timestamp (0 if no LD data exists for this user/course)
         */
        private static function get_enrollment_timestamps($user_ids, $course_id) {
            global $wpdb;
            $user_ids = array_map('intval', $user_ids);
            $out = array_fill_keys($user_ids, 0);

            // Source 1: user_meta course_{id}_access_from
            foreach ($user_ids as $uid) {
                $ts = intval(get_user_meta($uid, 'course_' . $course_id . '_access_from', true));
                if ($ts > 0) {
                    $out[$uid] = $ts;
                }
            }

            // Source 2 (fallback): LearnDash activity table — earliest activity_started for the course
            $missing = array_keys(array_filter($out, function ($ts) { return $ts === 0; }));
            if (!empty($missing)) {
                $placeholders = implode(',', array_fill(0, count($missing), '%d'));
                $params = array_merge(array($course_id), $missing);
                $rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT user_id, MIN(activity_started) AS started
                     FROM {$wpdb->prefix}learndash_user_activity
                     WHERE activity_type = 'course'
                       AND course_id = %d
                       AND activity_started > 0
                       AND user_id IN ($placeholders)
                     GROUP BY user_id",
                    $params
                ));
                foreach ((array) $rows as $row) {
                    $out[intval($row->user_id)] = intval($row->started);
                }
            }

            return $out;
        }

        private static function filter_course_completed($user_ids, $course_id) {
            if (!$course_id) return array();
            $matched = array();
            foreach ($user_ids as $uid) {
                if (!function_exists('learndash_course_completed')) {
                    break;
                }
                if (learndash_course_completed($uid, $course_id)) {
                    $matched[] = $uid;
                }
            }
            return $matched;
        }

        /* ============================================================
         * Helpers
         * ============================================================ */

        private static function get_group_user_ids($group_id) {
            if (!function_exists('learndash_get_groups_user_ids')) {
                return array();
            }
            $ids = learndash_get_groups_user_ids($group_id);
            return is_array($ids) ? array_map('intval', $ids) : array();
        }

        /**
         * Mirrors the 3-key max pattern from class-rest-api.php:75-84.
         */
        private static function get_last_login_ts($user_id) {
            return max(
                intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                intval(get_user_meta($user_id, 'learndash-last-login', true) ?: 0),
                intval(get_user_meta($user_id, 'last_login', true) ?: 0)
            );
        }

        private static function hydrate_users($user_ids) {
            $out = array();
            foreach ($user_ids as $uid) {
                $u = get_userdata(intval($uid));
                if (!$u || empty($u->user_email)) {
                    continue;
                }
                $out[] = array(
                    'user_id'      => intval($u->ID),
                    'display_name' => !empty($u->display_name) ? $u->display_name : $u->user_login,
                    'email'        => $u->user_email,
                );
            }
            return $out;
        }

        private static function is_user_group_leader($user_id, $group_id) {
            return !empty(get_user_meta($user_id, 'learndash_group_leaders_' . $group_id, true));
        }

        private static function validate_condition_args($condition, $args) {
            switch ($condition) {
                case 'outstanding_login':
                    return true;
                case 'inactive_days':
                case 'registered_for_days':
                    if (intval($args['days']) < 1) {
                        return new \WP_Error('invalid_days', 'Days must be a positive integer');
                    }
                    return true;
                case 'outstanding_course_access':
                case 'outstanding_course_completed':
                case 'course_completed':
                    if (intval($args['course_id']) < 1) {
                        return new \WP_Error('invalid_course', 'A valid course_id is required');
                    }
                    return true;
                case 'outstanding_quiz_completed':
                    if (intval($args['quiz_id']) < 1) {
                        return new \WP_Error('invalid_quiz', 'A valid quiz_id is required');
                    }
                    return true;
                case 'enrolled_for_days':
                    if (intval($args['course_id']) < 1 || intval($args['days']) < 1) {
                        return new \WP_Error('invalid_args', 'A valid course_id and positive days value are required');
                    }
                    return true;
                default:
                    return new \WP_Error('invalid_condition', 'Unknown condition');
            }
        }
    }
}
