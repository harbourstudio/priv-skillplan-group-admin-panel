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

  // Template references
  const courseTemplate = $block.find('#user-progress-course-template')[0];
  const lessonTemplate = $block.find('#user-progress-lesson-template')[0];
  const topicTemplate = $block.find('#user-progress-topic-template')[0];

  try {
    // 1. Fetch group courses
    const courses = await api.get(endpoints.groupCourses(groupId));

    if (!Array.isArray(courses) || courses.length === 0) {
      console.log('[user-progress] No courses found for group:', groupId);
      return;
    }

    // 2. Render course shells (without lessons/topics yet)
    /**
     * NOTE: we render course accordions without the full lessons/topics breakdown to avoid making parallel requests to the LD API. Requesting full breakdowns for ALL courses on page load will cause timeout issues. Instead, we fetch the lessons/topics breakdown for a single course when its accordion is clicked, so only one course is being requested at a time.
     */
    courses.forEach((course, courseIndex) => {
      const courseNode = courseTemplate.content.cloneNode(true);
      const $course = $(courseNode);
      const courseNum = courseIndex + 1;

      // Set course name (use title.rendered to get the nice name)
      const courseTitle = typeof course.title === 'string' ? course.title : course.title?.rendered || 'Untitled';
      $course.find('.accordion-toggle__course-name').text(courseTitle);

      // Set unique IDs for accordion functionality
      const courseId = `hs-course-heading-${courseNum}`;
      const contentId = `hs-course-collapse-${courseNum}`;
      $course.find('.hs-accordion').attr('id', courseId).data('course-id', course.id);
      $course.find('.hs-accordion-toggle').attr('aria-controls', contentId);
      $course.find('.hs-accordion-content').attr('id', contentId).attr('aria-labelledby', courseId);

      const $accordionContent = $course.find('.accordion-content__inner');

      // Set loading state
      $accordionContent.html('<p>Click to load lessons...</p>');

      // Attach click handler to fetch lessons on expand
      const $toggle = $course.find('.hs-accordion-toggle');
      let lessonsLoaded = false;

      // 3. Fetch lessons on-demand on accordion click
      $toggle.on('click', async function() {
        if (lessonsLoaded) return; // Already loaded

        lessonsLoaded = true;
        $accordionContent.html('<p>Loading...</p>');

        try {
          const lessons = await api.get(endpoints.courseLessonsWithTopics(course.id));

          // Clear loading state
          $accordionContent.empty();

          // Render lessons
          if (Array.isArray(lessons) && lessons.length > 0) {
            lessons.forEach((lesson) => {
              const lessonNode = lessonTemplate.content.cloneNode(true);
              const $lesson = $(lessonNode);
              $lesson.find('.module__name').text(lesson.title);

              const $tbody = $lesson.find('tbody');

              // Render topics for this lesson
              if (Array.isArray(lesson.topics)) {
                lesson.topics.forEach((topic) => {
                  const topicNode = topicTemplate.content.cloneNode(true);
                  const $topic = $(topicNode);
                  $topic.find('.topic-name').text(topic.title);
                  $tbody.append($topic);
                });
              }

              $accordionContent.append($lesson);
            });
          } else {
            $accordionContent.html('<p>No lessons found.</p>');
          }
        } catch (err) {
          console.error(`[user-progress] Failed to fetch lessons for course ${course.id}:`, err);
          $accordionContent.html('<p>Failed to load lessons.</p>');
        }
      });

      $coursesList.append($course);
    });

  } catch (err) {
    console.error('[user-progress] Failed to fetch courses:', err);
  }
});
