import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-select').first(); // will only have 1 instance of this block per page
  if (!$block) return;

  const $select = $block.find('#group-select');
  const $button = $block.find('.group-selector__button');
  if (!$select.length || !$button.length) return;

  // When user clicks "Show Group" button, fetch shared data from LearnDash API
  $button.on('click', async function(e) {
    e.preventDefault();

    const groupId = $select.val();
    if (!groupId) return;

    try {
      // call custom rest route; callback method makes the request to LD API for the data
      // shared data will be available in the document (data payload) and can be accessed by any element listening to the bys:groupSelected event

      // Fetch shared data that both group-stats and group-reporting blocks need
      const baseUsersStats = await api.get(endpoints.groupBaseUsersStats(groupId), true); // Force refresh
      const courses = await api.get(endpoints.groupCourses(groupId), true); // Force refresh

      // store globally for blocks to reference
      window.bysGroupData = {
        groupId: parseInt(groupId),
        baseUsersStats: baseUsersStats,
        courses: courses,
      };

      // trigger event with all shared data
      $(document).trigger('bys:groupSelected', {
        groupId: parseInt(groupId),
        baseUsersStats: baseUsersStats,
        courses: courses,
      })
    } catch(err) {
      console.error('Failed to fetch group data', err)
    }
  });
});