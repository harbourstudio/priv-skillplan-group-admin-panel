import { api, endpoints } from '../_shared/api-client.js';
import { formatScore, formatDate, formatTime, formatDuration } from '../_shared/helpers.js';

jQuery(document).ready(($) => {
  const params     = new URLSearchParams(window.location.search);
  const activityId = params.get('attempt_id');
  const groupId    = params.get('group_id');

  const $block   = $('.wp-block-bys-groups-user-quiz-attempt-header').first();
  const $loading = $block.find('.attempt-header__loading');
  const $content = $block.find('.attempt-header__content');
  const $error   = $block.find('.attempt-header__error');

  if (!activityId) {
    $loading.addClass('hidden');
    $error.removeClass('hidden').text('No attempt ID provided.');
    return;
  }

  (async () => {
    try {
      const attempt = await api.get(endpoints.attemptDetail(activityId));

      // ── Row 1 ──────────────────────────────────────────────────────────────

      $block.find('.attempt-header__quiz-title').text(attempt.quiz_title);

      const $badge = $block.find('.attempt-header__badge');
      if (attempt.pass === null) {
        $badge.addClass('status-badge--ungraded').text('Ungraded');
      } else if (attempt.pass) {
        $badge.addClass('status-badge--pass').text('Pass');
      } else {
        $badge.addClass('status-badge--fail').text('Fail');
      }

      $block.find('.attempt-header__score').text(
        formatScore(attempt.percentage, attempt.points_scored, attempt.points_total)
      );

      // ── Row 2 ──────────────────────────────────────────────────────────────

      $block.find('.attempt-header__user-name').text(attempt.display_name);
      $block.find('.attempt-header__attempt-number').text(`Attempt ${attempt.attempt_number}`);
      $block.find('.attempt-header__submitted').text(formatDate(attempt.completed_gmt));
      $block.find('.attempt-header__start-time').text(formatTime(attempt.started_gmt));
      $block.find('.attempt-header__end-time').text(formatTime(attempt.completed_gmt));
      $block.find('.attempt-header__timespent').text(formatDuration(attempt.timespent));

      // Dispatch attempt data so the sidebar can wire up its modal trigger buttons
      $(window).trigger('bysAttemptLoaded', [{ attempt, groupId }]);

      $loading.addClass('hidden');
      $content.removeClass('hidden');

    } catch (err) {
      console.error('[user-quiz-attempt-header] Failed to fetch attempt:', err);
      $loading.addClass('hidden');
      $error.removeClass('hidden');
    }
  })();
});
