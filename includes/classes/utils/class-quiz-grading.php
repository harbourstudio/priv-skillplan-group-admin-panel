<?php
/**
 * Quiz grading utility.
 *
 * Single source of truth for classifying whether a quiz attempt still contains
 * questions that require manual grading.
 * 
 * Used by the single-attempt detail routes (courses-router) AND the batched
 * dashboard routes (groups-router), so the "graded" vs "ungraded" state
 * shown across the UI can't disagree with itself.
 *
 * LD Context: When a user submits a quiz, LD writes to several tables. We only
 * need a few of them:
 *
 *   wp_learndash_user_activity            One row per quiz attempt. Holds
 *                                         activity_id, user_id, the quiz
 *                                         post_id, and timestamps.
 *
 *   wp_learndash_user_activity_meta       Key/value store for each attempt.
 *                                         The key we care about is
 *                                         'statistic_ref_id' — LD's link
 *                                         from the attempt to its
 *                                         per-question rows.
 *
 *   wp_learndash_pro_quiz_statistic       One row per question *within* an
 *                                         attempt. Holds correct_count,
 *                                         incorrect_count, points earned,
 *                                         and an answer_data JSON blob.
 *
 *   wp_learndash_pro_quiz_question        The question definition itself.
 *                                         The important field for us is
 *                                         answer_type ('essay', 'single',
 *                                         'free_answer', etc.).
 *
 *   wp_posts (post_type='sfwd-essays')    Essay answers are stored as their
 *                                         own custom-post-type post. When a
 *                                         grader finishes marking one,
 *                                         LD flips post_status to 'graded'.
 *
 * LD Questions types that need manual grading: essay, assessment_answer, free_answer
 *
 * @package BYS_Groups
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Quiz_Grading')) {
    class BYS_Groups_Quiz_Grading {

        /**
         * Given a set of quiz attempts, return the ones that still have at
         * least one question waiting to be marked.
         *
         *  essay:
         *  Graded if EITHER
         *      (a) answer_data.manually_graded is true — our plugin's own
         *      backup flag, see note below; OR
         *      (b) the sfwd-essays post pointed to by answer_data.graded_id has post_status = 'graded'
         *
         *  Why not use correct_count/incorrect_count? LD sets incorrect_count = 1
         *  on essays the moment the user submits.
         * 
         *  Why the manually_graded fallback? When this plugin's grade endpoint
         *  marks an essay, it tries to update the sfwd-essays post's status
         *  via wp_update_post(), which can silently fail (post missing, hooks
         *  blocking the transition, etc). To ensure a  successful DB grade save,
         *  the grader also writes manually_graded: true into the stat row's answer_data JSON.
         *
         *  assessment_answer / free_answer:
         *  Graded whenever correct_count and incorrect_count aren't both
         *  zero. LD leaves those two counters at (0,0) until something
         *  (LD's auto-scoring, or a grader) touches them.
         *
         * @param array<int,int> $stat_ref_to_activity  Map of statistic_ref_id to activity_id
         * @return array<int> Activity IDs with at least one ungraded question
         */
        public static function activities_with_ungraded_questions(array $stat_ref_to_activity) {
            if (empty($stat_ref_to_activity)) return [];

            global $wpdb;

            // Returns [] if LD's table registry isn't finished yet
            $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
            $question_table = LDLMS_DB::get_table_name('quiz_question');
            if (!$stat_table || !$question_table) return [];

            $ref_ids      = array_map('intval', array_keys($stat_ref_to_activity));
            $placeholders = implode(',', array_fill(0, count($ref_ids), '%d'));

            // Query 1 of 2: pull the per-question stat rows for every attempt in scope,
            // BUT only for question-types that might need manual grading
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT s.statistic_ref_id, s.correct_count, s.incorrect_count,
                        s.answer_data, q.answer_type
                 FROM {$stat_table} s
                 INNER JOIN {$question_table} q ON q.id = s.question_id
                 WHERE s.statistic_ref_id IN ({$placeholders})
                   AND q.answer_type IN ('essay', 'assessment_answer', 'free_answer')",
                ...$ref_ids
            ), ARRAY_A);

            if (empty($rows)) return [];

            // An essay's answer_data JSON looks like:
            //   {"graded_id": 13750}                             (submitted)
            //   {"graded_id": 13750, "manually_graded": true}    (marked by our UI)
            //
            // graded_id points at the sfwd-essays post that holds the
            // essay text. We need each of those posts' post_status to
            // decide whether the essay has been marked. Collect all the
            // graded_ids first to batch-fetch in one query
            $essay_graded_ids = [];
            foreach ($rows as $row) {
                if ($row['answer_type'] !== 'essay') continue;
                $data      = json_decode($row['answer_data'] ?? '', true);
                $graded_id = isset($data['graded_id']) ? intval($data['graded_id']) : 0;
                if ($graded_id) $essay_graded_ids[$graded_id] = true;
            }

            // Query 2 of 2: Look up post_status for every essay post from Query 1, in a
            // single indexed IN() query. Result is stored as { post_id => post_status }
            $graded_status_map = [];
            if (!empty($essay_graded_ids)) {
                $ids = array_keys($essay_graded_ids);
                $ph  = implode(',', array_fill(0, count($ids), '%d'));
                $post_rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT ID, post_status FROM {$wpdb->posts} WHERE ID IN ({$ph})",
                    ...$ids
                ), ARRAY_A);
                foreach ($post_rows as $p) {
                    $graded_status_map[intval($p['ID'])] = $p['post_status'];
                }
            }

            // ── Classify ────────────────────────────────────────────────
            // Walk the stat rows once. Mark the whole attempt as ungraded as soon
            // we hit one ungraded question. Skip remaining rows via isset() guard
            // since the minimum of one ungraded question is already satisifed
            $ungraded = [];
            foreach ($rows as $row) {
                $ref = intval($row['statistic_ref_id']);
                $aid = $stat_ref_to_activity[$ref] ?? null;
                if (!$aid || isset($ungraded[$aid])) continue;

                $type = $row['answer_type'];

                if ($type === 'essay') {
                    $data      = json_decode($row['answer_data'] ?? '', true);
                    $graded_id = isset($data['graded_id']) ? intval($data['graded_id']) : 0;
                    $manually  = !empty($data['manually_graded']);

                    // manually_graded wins outright. Otherwise defer to
                    // the sfwd-essays post_status. If graded_id is missing
                    // OR the post itself is missing, we treat the essay as ungraded
                    $is_graded = $manually
                        || ($graded_id && ($graded_status_map[$graded_id] ?? '') === 'graded');
                    if (!$is_graded) $ungraded[$aid] = true;

                } elseif ($type === 'assessment_answer' || $type === 'free_answer') {
                    if (intval($row['correct_count']) === 0 && intval($row['incorrect_count']) === 0) {
                        $ungraded[$aid] = true;
                    }
                }
            }

            return array_keys($ungraded);
        }

        /**
         * Single-attempt convenience wrapper. Returns true if this specific
         * attempt still has at least one question waiting for a grader.
         */
        public static function attempt_has_ungraded_questions($statistic_ref_id) {
            $statistic_ref_id = intval($statistic_ref_id);
            if (!$statistic_ref_id) return false;

            $ungraded = self::activities_with_ungraded_questions([$statistic_ref_id => 1]);
            return !empty($ungraded);
        }
    }
}
