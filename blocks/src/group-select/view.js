import { api } from '../_shared/api-client.js';
import { readBlockData } from '../_shared/block-data.js';

jQuery(document).ready(($) => {
  // Read group list from embedded JSON (rendered by render.php)
  const groups = readBlockData('group-select', []);

  // Populate select with groups from SSR data
  const $select = $('#group-select');
  groups.forEach((group) => {
    const $option = $('<option></option>')
      .val(group.id)
      .text(group.title);
    $select.append($option);
  });

  // When user clicks "Show Group" button, fetch stats from LearnDash API
  $('.group-selector__button').on('click', async function(e) {
    e.preventDefault();

    const groupId = $select.val();

    if (!groupId) {
      return;
    }

    try {
      // Fetch base stats from our custom endpoint
      const baseStatsUrl = `/wp-json/bys-groups/v1/groups/${groupId}/stats`;
      const baseStats = await api.get(baseStatsUrl, true); // Force refresh

      // Fetch courses for this group from our custom API
      const coursesUrl = `/wp-json/bys-groups/v1/groups/${groupId}/courses`;
      const coursesResponse = await api.get(coursesUrl, true); // Force refresh

      // Extract course data
      const courses = Array.isArray(coursesResponse)
        ? coursesResponse.map(course => ({ id: course.id, title: course.title }))
        : [];

      // Trigger custom event so other blocks know the group changed
      $(document).trigger('bys:groupSelected', [
        {
          groupId: parseInt(groupId),
          stats: baseStats,
          courses: courses,
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch group stats or courses:', err);
    }
  });
});