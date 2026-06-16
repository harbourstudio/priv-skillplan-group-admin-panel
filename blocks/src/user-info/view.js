import { endpoints, api } from '../_shared/api-client.js';
import { formatDate, formatDateTime } from '../_shared/helpers.js';
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

  await waitForAuth();

  try {
    // Fetch user details from custom endpoint 
    const userData = await api.get(endpoints.groupUserInfo(groupId, userId), true);
    // Display user info
    displayUserInfo(userData);
  } catch (err) {
    console.error('Failed to fetch user details:', err);
  }

  async function waitForAuth() {
    return new Promise((resolve) => {
      const checkAuth = () => {
        if (window.bysGroupsAuth && window.bysGroupsAuth.nonce) {
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

    // Format dates — Last Active is a viewer-local DATE display, with the
    // full server ISO timestamp pinned as a native browser tooltip via title=.
    const enrolledDate    = user.group_enrolled_date ? formatUnixTimestamp(user.group_enrolled_date) : 'Unknown';
    const lastActiveDate  = user.last_active ? formatDate(user.last_active) : 'Never';

    // Populate with data
    $block.find('.user-avatar')
      .attr('src', user.avatar_url || `https://i.pravatar.cc/80?u=${encodeURIComponent(user.email)}`)
      .attr('alt', fullName);

    $block.find('.user-name').text(fullName);
    $block.find('.user-email').text(user.email);
    $block.find('.user-enrolled-date').text(enrolledDate);
    $block.find('.user-last-login-date')
      .text(lastActiveDate)
      .attr('title', user.last_active || '');

    const $statusItem = $block.find('.user-info__meta-status');
    $statusItem.addClass(`user-info__meta-status--${statusClass}`);
    $block.find('.user-status-text').text(statusText);

    // Stash both timestamps on the status item; the mouseenter handler
    // assembles the tooltip object so we don't recreate it on every hover.
    if (user.last_active)        $statusItem.attr('data-last-active', user.last_active);
    if (user.status_checked_at)  $statusItem.attr('data-status-checked-at', user.status_checked_at);
  }

  // Shared tooltip handlers — show "Last active" + "Checked at" on hover.
  jQuery(document).on('mouseenter', '.user-info__meta-status', function () {
    const $item       = jQuery(this);
    const lastActive  = $item.attr('data-last-active');
    const checkedAt   = $item.attr('data-status-checked-at');
    if (!lastActive && !checkedAt) return;

    createTooltip($item, {
      title: lastActive ? `Last active: ${formatDateTime(lastActive)}` : 'Never active',
      body:  checkedAt  ? `Checked at ${formatDateTime(checkedAt)}`    : '',
    });
  });
  jQuery(document).on('mouseleave', '.user-info__meta-status', function () {
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
