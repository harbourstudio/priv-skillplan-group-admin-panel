import { api, endpoints } from '../_shared/api-client.js';
import { formatDate } from '../_shared/helpers.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-quizzing').first();
  if (!$block.length) return;

  const $skeleton = $block.find('#group-quizzing-skeleton');
  const $coursesList = $block.find('#group-quizzing-courses-list');
  const courseTemplate = $block.find('#group-quizzing-course-template')[0];
  const quizTemplate = $block.find('#group-quizzing-quiz-template')[0];

  async function renderCourses(groupId, courses) {
    $coursesList.empty();

    if (!Array.isArray(courses) || courses.length === 0) {
      console.log('[group-quizzing] No courses in payload');
      return;
    }

    // Fetch quiz steps for all courses upfront (needed for count, filtering, and stats query)
    const quizStepsByCourse = {};
    await Promise.all(courses.map(async (course) => {
      try {
        const steps = await api.get(endpoints.courseQuizSteps(course.id));
        quizStepsByCourse[course.id] = Array.isArray(steps) ? steps : [];
      } catch (err) {
        console.error(`[group-quizzing] Failed to fetch quiz steps for course ${course.id}:`, err);
        quizStepsByCourse[course.id] = [];
      }
    }));

    // Gather all quiz IDs across all courses and fetch submission stats in one request
    const allQuizIds = Object.values(quizStepsByCourse).flat().map(s => s.step_id);
    let submissionStats = {}; // keyed by quiz_id

    if (allQuizIds.length > 0) {
      try {
        const statsArray = await api.get(endpoints.groupQuizSubmissionStats(groupId, allQuizIds));
        if (Array.isArray(statsArray)) {
          statsArray.forEach(s => { submissionStats[s.quiz_id] = s; });
        }
      } catch (err) {
        console.error('[group-quizzing] Failed to fetch quiz submission stats:', err);
      }
    }

    $skeleton.addClass('hidden');

    let courseNum = 0;
    courses.forEach((course) => {
      const quizSteps = quizStepsByCourse[course.id];

      // Skip courses with no quizzes
      if (!quizSteps.length) return;

      courseNum++;

      const courseNode = courseTemplate.content.cloneNode(true);
      const $course = $(courseNode);
      const courseId = `hs-quiz-course-heading-${courseNum}`;
      const contentId = `hs-quiz-course-collapse-${courseNum}`;

      const $accordion = $course.find('.hs-accordion');
      const $toggle = $course.find('.hs-accordion-toggle');
      const $accordionContent = $course.find('.accordion-content__inner');

      $accordion.attr('id', courseId).attr('data-course-id', course.id);
      $toggle.attr('aria-controls', contentId);
      $course.find('.hs-accordion-content').attr('id', contentId).attr('aria-labelledby', courseId);

      const courseTitle = typeof course.title === 'string' ? course.title : course.title?.rendered || 'Untitled';
      $course.find('.accordion-toggle__course-name').text(courseTitle);
      $course.find('.quiz-count-value').text(quizSteps.length);

      // Latest submission across all quizzes in this course
      const courseLastTs = quizSteps.reduce((latest, quiz) => {
        const ts = submissionStats[quiz.step_id]?.last_submission_gmt;
        if (!ts) return latest;
        return !latest || ts > latest ? ts : latest;
      }, null);
      $course.find('.accordion-toggle__date .date-value').text(formatDate(courseLastTs));

      // Lazy-render quiz rows on first open
      let quizzesRendered = false;
      $toggle.on('click', function() {
        if (quizzesRendered) return;
        quizzesRendered = true;
        $accordionContent.empty();

        quizSteps.forEach((quiz) => {
          const quizNode = quizTemplate.content.cloneNode(true);
          const $quiz = $(quizNode);
          const stats = submissionStats[quiz.step_id];

          $quiz.find('.quiz-row__name').text(quiz.step_title);
          $quiz.find('.quiz-row__last-submission .date-value').text(
            formatDate(stats?.last_submission_gmt)
          );

          // Open attempts modal on click — no user pre-filter
          $quiz.find('.quiz-row').on('click', function() {
            $(window).trigger('bysQuizAttemptsOpen', [{
              groupId: groupId,
              quizId: quiz.step_id,
              quizTitle: quiz.step_title,
              parentCourse: courseTitle,
            }]);
          });

          $accordionContent.append($quiz);
        });
      });

      $coursesList.append($course);
    });
  }

  $(document).on('bys:groupSelected', function(_, data) {
    renderCourses(data.groupId, data.courses);
  });

  if (window.bysGroupData?.courses) {
    renderCourses(window.bysGroupData.groupId, window.bysGroupData.courses);
  }
});
