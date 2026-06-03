import { endpoints, api } from '../_shared/api-client.js';
import { formatDateTime } from '../_shared/helpers.js';
import { createTooltip, destroyTooltip } from '../_shared/tooltip.js';

jQuery(document).ready(async ($) => {
  // Get user_id from URL parameters
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('user_id');
  const groupId = params.get('group_id');

  if (!userId || !groupId) {
    console.error('Missing user_id or group_id parameter');
    return;
  }

  // Wait for auth header to be available
  await waitForAuthHeader();

  try {
    // Fetch user details from custom endpoint 
    const userData = await api.get(endpoints.groupUserInfo(groupId, userId), true);
    // Display user info
    displayUserInfo(userData);
  } catch (err) {
    console.error('Failed to fetch user details:', err);
  }

  async function waitForAuthHeader() {
    return new Promise((resolve) => {
      const checkAuth = () => {
        if (window.bysGroupsAuth && window.bysGroupsAuth.header) {
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
    });
  }

  function displayUserInfo(user) {
    const $block = $('.wp-block-bys-groups-user-info').first(); // only one block instance per page 
    if(!$block) return;
    
    const fullName = [user.first_name, user.last_name].join(' ') || user.display_name;
    const statusClass = user.status === 'online' ? 'active' : 'inactive';
    const statusText = user.status === 'online' ? 'Active' : user.status === 'offline' ? 'Offline' : 'Never Logged In';

    // Format dates
    const enrolledDate = user.group_enrolled_date ? formatUnixTimestamp(user.group_enrolled_date) : 'Unknown';
    const lastLoginDate = user.last_login ? formatUnixTimestamp(user.last_login) : 'Never';

    // Populate with data
    $block.find('.user-avatar')
      .attr('src', user.avatar_url || `https://i.pravatar.cc/80?u=${encodeURIComponent(user.email)}`)
      .attr('alt', fullName);

    $block.find('.user-name').text(fullName);
    $block.find('.user-email').text(user.email);
    $block.find('.user-enrolled-date').text(enrolledDate);
    $block.find('.user-last-login-date').text(lastLoginDate);
    const $statusItem = $block.find('.user-info__meta-status');
    $statusItem.addClass(`user-info__meta-status--${statusClass}`);
    $block.find('.user-status-text').text(statusText);

    // display "Last checked" on hover so the leader knows how fresh this status is
    if (user.status_checked_at) {
      $statusItem.attr('data-tooltip', `Last checked: ${formatDateTime(user.status_checked_at)}`);
    }
  }

  // used shared tooltip handlers
  jQuery(document).on('mouseenter', '.user-info__meta-item.user-info__meta-status[data-tooltip]', function () {
    createTooltip(jQuery(this), jQuery(this).attr('data-tooltip'));
  });
  jQuery(document).on('mouseleave', '.user-info__meta-item.user-info__meta-status[data-tooltip]', function () {
    destroyTooltip();
  });

  function formatUnixTimestamp(timestamp) {
    if (!timestamp) return '';
    try {
      // Convert Unix timestamp (seconds) to milliseconds
      const numTimestamp = parseInt(timestamp, 10);
      if (isNaN(numTimestamp)) return '';
      const date = new Date(numTimestamp * 1000);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

});
