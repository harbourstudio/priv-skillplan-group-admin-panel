/**
 * User Activity Block - Frontend View
 * Fetches user activity from REST API and renders in a table
 */

import { api, endpoints } from '../_shared/api-client.js';
import { LOADING_HTML } from '../_shared/loading.js';

jQuery(document).ready(($) => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('user_id');

  if (!userId) {
    return; // User ID is required
  }

  const $block = $('.wp-block-bys-groups-user-activity').first();
  const $tbody = $block.find('table tbody');
  const $form = $block.find('.filters__form');
  const $resetBtn = $block.find('.filters__reset');
  const rowTemplate = $block.find('#user-activity__template-row')[0];

  const iconMap = {
    'Logged In': 'fa-user',
    'Updated Profile': 'fa-user',
    'Updated Account Settings': 'fa-user',
    'Earned a Certificate': 'fa-certificate',
    'Viewed a Certificate': 'fa-eye',
  };

  let currentPage = 1;
  let currentFilters = {};

  /**
   * Format datetime string to readable format
   */
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return `${dateStr}\n${timeStr}`;
  };

  /**
   * Load activity data from API
   */
  const loadActivity = async (page = 1) => {
    const $loadingRow = jQuery(`<tr><td>${LOADING_HTML}</td></tr>`);
    $tbody.html($loadingRow);
    currentPage = page;

    try {
      const queryParams = new URLSearchParams({
        page,
        per_page: $block.find('[name="per_page"]').val() || 20,
        ...(currentFilters.activity ? { activity: currentFilters.activity } : {}),
        ...(currentFilters.date_from ? { date_from: currentFilters.date_from } : {}),
        ...(currentFilters.date_to ? { date_to: currentFilters.date_to } : {}),
      });

      const url = `${endpoints.userActivity(userId)}?${queryParams.toString()}`;
      const result = await api.get(url);

      $tbody.empty();

      if (!result.items || result.items.length === 0) {
        $tbody.html('<tr><td>No activity found.</td></tr>');
        return;
      }

      result.items.forEach((item) => {
        const $row = $(rowTemplate.content.cloneNode(true));
        
        const icon = iconMap[item.activity_label] || '';
        $row.find('.cell-activity__icon').addClass(icon);
        $row.find('.cell-activity__label').text(item.activity_label);

        $row.find('.cell-created-at').text(formatDate(item.created_at));
        $row.find('.cell-object-title').html(item.object_title || '—');
        
        const objectType = item.object_type || '—';
        $row.find('.cell-object-type .cell-object-type__label').text(objectType.charAt(0).toUpperCase() + objectType.slice(1));
        $row.find('.cell-object-type .cell-object-type__dot').addClass(`cell-object-type__dot--${objectType}`);
        
        const initiatedBy = item.initiated_by || '—';
        $row.find('.cell-initiated-by').text(initiatedBy.charAt(0).toUpperCase() + initiatedBy.slice(1));
        
        $tbody.append($row);

      });
    } catch (err) {
      console.error('[user-activity] Failed to fetch activity:', err);
      $tbody.html('<tr><td>Failed to load activity.</td></tr>');
    }
  };

  /**
   * Handle filter form submission
   */
  $form.on('submit', function (e) {
    e.preventDefault();
    currentFilters = {
      activity: $block.find('[name="activity"]').val() || '',
      date_from: $block.find('[name="date_from"]').val() || '',
      date_to: $block.find('[name="date_to"]').val() || '',
    };
    loadActivity(1);
  });

  /**
   * Handle reset button
   */
  $resetBtn.on('click', function () {
    currentFilters = {};
    $form[0].reset();
    loadActivity(1);
  });

  /**
   * Listen for tab activation event from user-tabs block
   */
  jQuery(window).on('bysUserTabActivated', function (_event, tabName) {
    if (tabName === 'user-activity') {
      loadActivity(1);
    }
  });

  // Load on page load (fallback in case tab is pre-activated)
  loadActivity(1);
});
