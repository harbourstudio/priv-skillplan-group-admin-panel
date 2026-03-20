import { api } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-select').first(); // will only have 1 instance of this block per page
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
      // call custom rest route; callback method makes the request to LD API for the data 
      // stats data will be available in the document (data payload) and can be accessed by any element listening to the bys:groupSelected event
      // particularily, it'll be available to use by the group-stats block
      const groupBaseStatsRoute = `/wp-json/bys-groups/v1/groups/${groupId}/stats`;
      const groupBaseStats = await api.get(groupBaseStatsRoute, true); // Force refresh
      console.log('groupBaseStats', groupBaseStats);

      $(document).trigger('bys:groupSelected', {
        groupId: parseInt(groupId),
        stats: groupBaseStats
      })
    } catch(err) {
      console.error('Failed to fetch data for group-select', err)
    }
  });
});