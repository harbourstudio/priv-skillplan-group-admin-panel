import { api, endpoints } from '../_shared/api-client.js';
import { LOADING_COMPONENT } from '../_shared/loading.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-stats').first(); // will only have 1 instance of this block per page
  if (!$block) return;

  const $totalMembers = $block.find('[data-bys-stat="total_members"');
  const $completedCourses = $block.find('[data-bys-stat="completed_courses"]');
  const $incompleteCourses = $block.find('[data-bys-stat="incomplete_courses"]');
  const $totalInactiveMembers = $block.find('[data-bys-stat="total_inactive_members"]');

  // listen for the custom jquery event triggered by group-select block
  $(document).on('bys:groupSelected', async (_, {groupId, baseUsersStats, courses}) => {

    // update base stats immediately
    $totalMembers.html(baseUsersStats.total_members ?? 0);
    $totalInactiveMembers.html(baseUsersStats.total_inactive_members ?? 0);

    // show loading state
    $completedCourses.html(LOADING_COMPONENT);
    $incompleteCourses.html(LOADING_COMPONENT);

    // fetch course completion stats for entire group
    try {
      const courseIds = (courses || []).map(c => c.id).join(',');
      const url = endpoints.groupCourseCompletionStats(groupId) + (courseIds ? `?course_ids=${courseIds}` : '');
      const stats = await api.get(url);
      $completedCourses.html(stats.total_completed ?? 0);
      $incompleteCourses.html(stats.total_incomplete ?? 0);
    } catch (err) {
      console.error('[group-stats] Failed to fetch course completion stats:', err);
      $completedCourses.html(0);
      $incompleteCourses.html(0);
    }
  });
});
