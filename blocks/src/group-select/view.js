import { api } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-select').first();
  if (!$block) return;

  const $select = $block.find('#group-select');
  const $button = $block.find('.group-selector__button');
  if (!$select.length || !$button.length) return;

  // When user clicks "Show Group" button, fetch stats from LearnDash API
  $button.on('click', async function(e) {
    e.preventDefault();

    const groupId = $select.val();
    if (!groupId) return;

    try {
      const baseStatsUrl = `/wp-json/bys-groups/v1/groups/${groupId}/stats`;
      const baseStats = await api.get(baseStatsUrl, true); // Force refresh
      // console.log('baseStats', baseStats);

      $(document).trigger('bys:groupSelected', {
        groupId: parseInt(groupId),
        stats: baseStats
      })
    } catch(err) {
      console.error('Failed to fetch data for group-select', err)
    }
  });
});