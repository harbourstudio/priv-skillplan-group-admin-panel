import { readBlockData } from '../_shared/block-data.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-user-stats').first();
  if (!$block.length) return;

  // Populate server-side stats immediately (injected in render.php)
  const serverStats = readBlockData('user-stats', {});
  Object.entries(serverStats).forEach(([key, value]) => {
    const $el = $block.find(`[data-bys-stat="${key}"]`);
    if ($el.length) {
      $el.text(value !== undefined && value !== null ? value : '—');
      $el.removeClass('stat__number--loading');
    }
  });
});
