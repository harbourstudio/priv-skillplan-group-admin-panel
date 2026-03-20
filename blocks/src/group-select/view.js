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

      // Trigger custom event so other blocks know the group changed
      $(document).trigger('bys:groupSelected', [
        {
          groupId: parseInt(groupId),
          stats: baseStats,
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch group stats:', err);
    }
  });
});