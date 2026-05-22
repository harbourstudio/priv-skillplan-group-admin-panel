import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';

jQuery(document).ready(($) => {
  const $block  = $('.wp-block-bys-groups-group-ungraded-quiz-alert').first();
  if (!$block.length) return;

  const $alert  = $block.find('#ungraded-quiz-alert');
  const $count  = $alert.find('.ungraded-alert__count');
  const $seeAll = $alert.find('.ungraded-alert__btn');

  // ── Core logic ──────────────────────────────────────────────────────────────

  async function updateAlert(groupId, courses) {
    if (!Array.isArray(courses) || !courses.length) return;

    // Quiz IDs whose show_test_grading_config is true are pre-baked into each
    // course by /base-group-data. Flatten the union — these are the only
    // quizzes that can ever have ungraded attempts.
    const allQuizIds = courses.flatMap((c) => Array.isArray(c.quizzes_show_test_grading_config) ? c.quizzes_show_test_grading_config : []);
    if (!allQuizIds.length) return;

    let totalUngraded = 0;
    try {
      const statsArray = await api.get(endpoints.groupQuizSubmissionStats(groupId, allQuizIds));
      if (Array.isArray(statsArray)) {
        statsArray.forEach(s => { totalUngraded += (s.ungraded_count || 0); });
      }
    } catch (err) {
      console.error('[group-ungraded-quiz-alert] Failed to fetch submission stats:', err);
      return;
    }

    if (totalUngraded === 0) return;

    $count.text(totalUngraded);
    $alert.removeClass('hidden');
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  $(document).on('bys:groupSelected', function(_, data) {
    // Reset on group change
    $alert.addClass('hidden');
    $count.text('');
    updateAlert(data.groupId, store.getCourses() || []);
  });

  // Fast first paint from store cache (sessionStorage-rehydrated across page navs).
  const cachedGroupId = store.getCurrentGroup();
  const cachedCourses = store.getCourses();
  if (cachedGroupId !== null && cachedCourses !== null) {
    updateAlert(cachedGroupId, cachedCourses);
  }
});
