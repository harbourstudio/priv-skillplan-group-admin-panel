import { api, endpoints } from '../_shared/api-client.js';
import { LOADING } from '../_shared/loading.js';
import { formatDateTime } from '../_shared/helpers.js';
import { createTooltip, destroyTooltip } from '../_shared/tooltip.js';

// Status label mapping (reusable)
const STATUS_LABELS = {
  'completed': 'Completed',
  'in_progress': 'In Progress',
  'not_started': 'Not Started'
};

// Helper to build tooltip content from progress data
function buildTooltipContent(progressData) {
  if (!progressData) return '';
  const parts = [];
  if (progressData.date_started_gmt) parts.push(`Started: ${formatDateTime(progressData.date_started_gmt)}`);
  if (progressData.date_completed_gmt) parts.push(`Completed: ${formatDateTime(progressData.date_completed_gmt)}`);
  return parts.join(' | ');
}

jQuery(document).ready(async ($) => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get('group_id');
  const userId = params.get('user_id');

  if (!groupId || !userId) {
    console.error('[user-progress] Missing group_id or user_Id URL parameter');
    return;
  }

  const $block = $('.wp-block-bys-groups-user-progress').first();
  const $coursesList = $block.find('#user-progress-courses-list');
  const courseTemplate = $block.find('#user-progress-course-template')[0];
  const sfwdLessonTemplate = $block.find('#user-progress-lesson-template')[0];
  const sfwdTopicTemplate = $block.find('#user-progress-topic-template')[0];

  // Track completed topics across all opened courses for user-stats coordination
  let topicsCompletedCount = 0;

  try {
    const courses = await api.get(endpoints.groupCourses(groupId));

    if (!Array.isArray(courses) || courses.length === 0) {
      console.log('[user-progress] No courses found for group:', groupId);
      return;
    }

    // Cache data globally
    window.bysGroupsCache = window.bysGroupsCache || {};
    window.bysGroupsCache.groupId = groupId;
    window.bysGroupsCache.courses = courses;

    // Render course shells with deferred structure loading
    courses.forEach((course, courseIndex) => {
      const courseNode = courseTemplate.content.cloneNode(true);
      const $course = $(courseNode);
      const courseNum = courseIndex + 1;

      // Set course name
      const courseTitle = typeof course.title === 'string' ? course.title : course.title?.rendered || 'Untitled';

      // Build DOM references once
      const $accordion = $course.find('.hs-accordion');
      const $toggle = $course.find('.hs-accordion-toggle');
      const $accordionContent = $course.find('.accordion-content__inner');
      const courseId = `hs-course-heading-${courseNum}`;
      const contentId = `hs-course-collapse-${courseNum}`;

      // Set course name and accordion structure
      $course.find('.accordion-toggle__course-name').html(courseTitle);
      $accordion.attr('id', courseId).attr('data-course-id', course.id);
      $toggle.attr('aria-controls', contentId);
      $course.find('.hs-accordion-content').attr('id', contentId).attr('aria-labelledby', courseId);

      // Set loading placeholder
      $accordionContent.html('<p>Click to load course structure...</p>');

      // Fetch course-level completion data asynchronously
      api.get(endpoints.groupUserCourseProgress(userId, course.id))
        .then(courseProgress => {
          if (!Array.isArray(courseProgress) || !courseProgress.length) return;

          const progress = courseProgress[0];
          const $stepsCompleted = $toggle.find('.course-steps-completed');
          const $stepsTotal = $toggle.find('.course-steps-total');
          const $completionBadge = $toggle.find('.accordion-toggle__completion .completion-badge');
          const $dateElement = $toggle.find('.accordion-toggle__date');

          // Update course header
          $stepsCompleted.html(progress.steps_completed || 0);
          $stepsTotal.html(progress.steps_total || 0);
          $completionBadge.addClass(`completion-badge--${progress.progress_status}`);
          $completionBadge.text(STATUS_LABELS[progress.progress_status] || progress.progress_status);

          // Update date: completed or last activity
          if (progress.progress_status === 'completed' && progress.date_completed_gmt) {
            $dateElement.html(formatDateTime(progress.date_completed_gmt));
          } else if (progress.progress_status !== 'not_started') {
            api.get(endpoints.userCourseActivity(userId, course.id))
              .then(activityData => {
                if (activityData?.last_activity_gmt) {
                  $dateElement.html(formatDateTime(activityData.last_activity_gmt));
                }
              })
              .catch(err => console.warn(`[user-progress] Failed to fetch course activity for course ${course.id}:`, err));
          }
        })
        .catch(err => console.error(`[user-progress] Failed to fetch course progress for course ${course.id}:`, err));

      // Fetch and render course structure on-demand
      let structureLoaded = false;
      $toggle.on('click', async function() {
        if (structureLoaded) return;
        structureLoaded = true;
        $accordionContent.html(LOADING);

        try {
          const courseData = await api.get(endpoints.courseHierarchialBreakdown(course.id));
          const modules = courseData.lessons || courseData;
          const quizIds = courseData.quiz_ids || [];

          // Cache quiz IDs
          if (quizIds.length) {
            window.bysGroupsCache.courseQuizzes ??= {};
            window.bysGroupsCache.courseQuizzes[course.id] = quizIds;
          }

          // Fetch steps progress in single request
          const stepsResponse = await api.get(endpoints.userCourseStepsProgress(userId, course.id));
          const courseProgressSteps = Array.isArray(stepsResponse) ? stepsResponse : stepsResponse?.data || [];

          // Map steps by ID for quick lookup
          const stepsMap = Object.fromEntries(
            courseProgressSteps.map(step => [step.step, step])
          );

          $accordionContent.empty();

          if (!Array.isArray(modules) || !modules.length) {
            $accordionContent.html('<p>No modules found.</p>');
            return;
          }

          // Render lessons with nested topics
          for (const lesson of modules) {
            const lessonNode = sfwdLessonTemplate.content.cloneNode(true);
            const $lesson = $(lessonNode);
            const lessonData = stepsMap[lesson.id];
            const lessonStatus = lessonData?.step_status || 'not_started';

            $lesson.find('.lesson__name').html(lesson.title);
            $lesson.attr('data-lesson-id', lesson.id);

            const $lessonBadge = $lesson.find('.lesson__completion .completion-badge');
            $lessonBadge.addClass(`completion-badge--${lessonStatus}`).attr('data-status', lessonStatus);

            const lessonTooltip = buildTooltipContent(lessonData);
            if (lessonTooltip) $lessonBadge.attr('data-tooltip', lessonTooltip);

            const $tbody = $lesson.find('tbody');

            // Render topics
            if (Array.isArray(lesson.topics)) {
              for (const topic of lesson.topics) {
                const topicNode = sfwdTopicTemplate.content.cloneNode(true);
                const $topic = $(topicNode);
                const topicData = stepsMap[topic.id];
                const topicStatus = topicData?.step_status || 'not_started';

                $topic.find('.topic-name').html(topic.title);
                $topic.attr('data-topic-id', topic.id);

                const $topicBadge = $topic.find('.completion-badge');
                $topicBadge.addClass(`completion-badge--${topicStatus}`).attr('data-status', topicStatus);

                const topicTooltip = buildTooltipContent(topicData);
                if (topicTooltip) $topicBadge.attr('data-tooltip', topicTooltip);

                // Count completed topics (post_type === 'sfwd-topic' with step_status === 'completed')
                if (topicData?.post_type === 'sfwd-topic' && topicStatus === 'completed') {
                  topicsCompletedCount++;
                }

                $tbody.append($topic);
              }
            }

            $accordionContent.append($lesson);
          }

          // Write topics completed count to cache and notify user-stats block
          window.bysGroupsCache ??= {};
          window.bysGroupsCache.topicsCompleted = topicsCompletedCount;
          jQuery(window).trigger('bys:statsUpdated', [{ key: 'total_topics_completed', value: topicsCompletedCount }]);

          // Attach tooltip handlers
          $accordionContent.on('mouseenter', '[data-tooltip]', function() {
            createTooltip($(this), $(this).attr('data-tooltip'));
          }).on('mouseleave', '[data-tooltip]', destroyTooltip);

        } catch (err) {
          console.error(`[user-progress] Failed to fetch course structure for course ${course.id}:`, err);
          $accordionContent.html('<p>Failed to load course structure.</p>');
        }
      });

      $coursesList.append($course);
    });

  } catch (err) {
    console.error('[user-progress] Failed to fetch courses:', err);
  }
});
