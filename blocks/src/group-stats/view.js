import { api, endpoints } from '../_shared/api-client.js';
import { LOADING } from '../_shared/loading.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-stats').first(); // will only have 1 instance of this block per page
  if (!$block) return;

  const $totalMembers = $block.find('[data-bys-stat="total_members"');
  const $completedCourses = $block.find('[data-bys-stat="completed_courses"]');
  const $incompleteCourses = $block.find('[data-bys-stat="incomplete_courses"]');
  const $totalInactiveMembers = $block.find('[data-bys-stat="total_inactive_members"]');

  // Show loading state immediately — stats are empty until a group loads
  $block.find('.stat__number').addClass('stat__number--loading').html('');

  // listen for the custom jquery event triggered by group-select block
  $(document).on('bys:groupSelected', async (_, {groupId, baseUsersStats, courses}) => {

    // Show loading state on all numbers while data resolves
    $block.find('.stat__number').addClass('stat__number--loading').html('');

    // Base stats are already available — resolve immediately
    $totalMembers.removeClass('stat__number--loading').html(baseUsersStats.total_members ?? 0);
    $totalInactiveMembers.removeClass('stat__number--loading').html(baseUsersStats.total_inactive_members ?? 0);

    // Calculated stats need an async fetch
    calculateCourseStats(baseUsersStats.user_ids || [], courses || []);
  });

  // fetch course completion stats for entire group
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
        const progressUrl = endpoints.groupUserCourseProgress(userId, courseIds);
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

      $completedCourses.removeClass('stat__number--loading').html(totalCompleted);
      $incompleteCourses.removeClass('stat__number--loading').html(totalIncomplete);
    } catch (err) {
      console.error('Failed to calculate course stats:', err);
      $completedCourses.removeClass('stat__number--loading').html(0);
      $incompleteCourses.removeClass('stat__number--loading').html(0);
    }
  }
});
