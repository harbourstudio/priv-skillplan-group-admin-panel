import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-stats').first(); // will only have 1 instance of this block per page
  if (!$block) return;

  const $totalMembers = $block.find('[data-bys-stat="total_members"');
  const $completedCourses = $block.find('[data-bys-stat="completed_courses"]');
  const $incompleteCourses = $block.find('[data-bys-stat="incomplete_courses"]');
  const $totalInactiveMembers = $block.find('[data-bys-stat="total_inactive_members"]');

  // listen for the custom jquery event triggered by group-select block
  $(document).on('bys:groupSelected', async (_, {baseUsersStats, courses}) => {

    // Update base stats immediately
    $totalMembers.html(baseUsersStats.total_members ?? 0);
    $totalInactiveMembers.html(baseUsersStats.total_inactive_members ?? 0);

    // Fetch and calculate course completion stats in background
    calculateCourseStats(baseUsersStats.user_ids || [], courses || []);
  });

  async function calculateCourseStats(userIds, courses) {
    try {
      if (!courses.length || !userIds.length) {
        $completedCourses.html(0);
        $incompleteCourses.html(0);
        return;
      }

      const courseIds = courses.map(c => c.id).join(',');

      // Fetch progress for all users in parallel through custom wrapper
      const promises = userIds.map(userId => {
        const progressUrl = endpoints.userCourseProgress(userId, courseIds);
        return api.get(progressUrl, false);
      });

      const allProgressResults = await Promise.all(promises);

      // Count completed and incomplete courses
      let totalCompleted = 0;
      let totalIncomplete = 0;

      allProgressResults.forEach(progressArray => {
        if (!Array.isArray(progressArray)) return;
        progressArray.forEach(courseProgress => {
          if (courseProgress.progress_status === 'completed') {
            totalCompleted++;
          } else {
            totalIncomplete++;
          }
        });
      });

      $completedCourses.html(totalCompleted);
      $incompleteCourses.html(totalIncomplete);
    } catch (err) {
      console.error('Failed to calculate course stats:', err);
      $completedCourses.html(0);
      $incompleteCourses.html(0);
    }
  }
});
