import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(async ($) => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get('group_id');
  const userId = params.get('user_id');

  if (!groupId || !userId) {
    console.error('[user-progress] Missing group_id or user_Id URL parameter');
    return;
  }

  const $block = $('.wp-block-bys-groups-user-progress').first(); // only one block instance per page
  const $coursesList = $block.find('#user-progress-courses-list');

  // Template references (sfwd-lesson and sfwd-topic templates)
  const courseTemplate = $block.find('#user-progress-course-template')[0];
  const sfwdLessonTemplate = $block.find('#user-progress-lesson-template')[0];
  const sfwdTopicTemplate = $block.find('#user-progress-topic-template')[0];

  try {
    // 1. Fetch group courses
    const courses = await api.get(endpoints.groupCourses(groupId));

    if (!Array.isArray(courses) || courses.length === 0) {
      console.log('[user-progress] No courses found for group:', groupId);
      return;
    }

    // Cache data globally so other blocks can access them
    window.bysGroupsCache = window.bysGroupsCache || {};
    window.bysGroupsCache.groupId = groupId;
    window.bysGroupsCache.courses = courses;

    // 2. Render course shells (without structure data yet)
    /**
     * NOTE: we render course accordions without the full course structure (lessons, topics, quizzes) to avoid making parallel requests to the LD API. Requesting full breakdowns for ALL courses on page load will cause timeout issues. Instead, we fetch the course hierarchy for a single course when its accordion is clicked, so only one course is being requested at a time.
     */
    courses.forEach((course, courseIndex) => {
      const courseNode = courseTemplate.content.cloneNode(true);
      const $course = $(courseNode);
      const courseNum = courseIndex + 1;

      // Set course name (use title.rendered to get the nice name)
      const courseTitle = typeof course.title === 'string' ? course.title : course.title?.rendered || 'Untitled';
      $course.find('.accordion-toggle__course-name').html(courseTitle);

      // Set unique IDs for accordion functionality
      const courseId = `hs-course-heading-${courseNum}`;
      const contentId = `hs-course-collapse-${courseNum}`;
      $course.find('.hs-accordion').attr('id', courseId).data('course-id', course.id);
      $course.find('.hs-accordion-toggle').attr('aria-controls', contentId);
      $course.find('.hs-accordion-content').attr('id', contentId).attr('aria-labelledby', courseId);

      const $accordionContent = $course.find('.accordion-content__inner');

      // Set loading state
      $accordionContent.html('<p>Click to load course structure...</p>');

      // Attach click handler to fetch course structure on expand
      const $toggle = $course.find('.hs-accordion-toggle');
      let structureLoaded = false;

      // 3. CRITICAL: Fetch course structure on-demand on accordion click
      $toggle.on('click', async function() {
        if (structureLoaded) return; // Already loaded

        structureLoaded = true;
        $accordionContent.html('<p>Loading...</p>');

        try {
          const courseData = await api.get(endpoints.courseHierarchialBreakdown(course.id));

          // courseHierarchialBreakdown returns { lessons (sfwd-lessons with nested sfwd-topics), quiz_ids }
          const modules = courseData.lessons || courseData; // Handle both old and new format
          const quizIds = courseData.quiz_ids || [];

          // Cache quiz IDs for this course
          if (quizIds.length > 0) {
            window.bysGroupsCache.courseQuizzes = window.bysGroupsCache.courseQuizzes || {};
            window.bysGroupsCache.courseQuizzes[course.id] = quizIds;
          }

          // Clear loading state
          $accordionContent.empty();

          // Render course modules (sfwd-lessons with their sfwd-topics)
          if (Array.isArray(modules) && modules.length > 0) {
            modules.forEach((sfwdLesson) => {
              const lessonNode = sfwdLessonTemplate.content.cloneNode(true);
              const $lesson = $(lessonNode);
              $lesson.find('.module__name').html(sfwdLesson.title);

              const $tbody = $lesson.find('tbody');

              // Render sfwd-topics for this sfwd-lesson
              if (Array.isArray(sfwdLesson.topics)) {
                sfwdLesson.topics.forEach((sfwdTopic) => {
                  const topicNode = sfwdTopicTemplate.content.cloneNode(true);
                  const $topic = $(topicNode);
                  $topic.find('.topic-name').html(sfwdTopic.title);
                  $tbody.append($topic);
                });
              }

              $accordionContent.append($lesson);
            });
          } else {
            $accordionContent.html('<p>No modules found.</p>');
          }
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
