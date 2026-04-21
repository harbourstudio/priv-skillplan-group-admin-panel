import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
  const $block  = $('.wp-block-bys-groups-group-ungraded-quiz-alert').first();
  if (!$block.length) return;

  const $alert  = $block.find('#ungraded-quiz-alert');
  const $count  = $alert.find('.ungraded-alert__count');
  const $seeAll = $alert.find('.ungraded-alert__btn');

  // ── Core logic ──────────────────────────────────────────────────────────────

  async function updateAlert(groupId, courses) {
    if (!Array.isArray(courses) || !courses.length) return;

    // Fetch quiz steps for all courses in parallel
    const quizStepsByCourse = {};
    await Promise.all(courses.map(async (course) => {
      try {
        const steps = await api.get(endpoints.courseQuizSteps(course.id));
        quizStepsByCourse[course.id] = Array.isArray(steps) ? steps : [];
      } catch {
        quizStepsByCourse[course.id] = [];
      }
    }));

    const allQuizIds = Object.values(quizStepsByCourse).flat().map(s => s.step_id);
    if (!allQuizIds.length) return;

    // Fetch submission stats (already cached if group-quizzing block ran first)
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
    updateAlert(data.groupId, data.courses);
  });

  if (window.bysGroupData?.courses) {
    updateAlert(window.bysGroupData.groupId, window.bysGroupData.courses);
  }
});
