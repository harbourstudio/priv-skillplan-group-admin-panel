/**
 * User Info Block - Frontend View
 * Fetches user data from REST API based on URL parameters
 */

import { api } from '../_shared/api-client.js';

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
    const userUrl = `/wp-json/bys-groups/v1/groups/${groupId}/users/${userId}`;
    const userData = await api.get(userUrl, true);

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
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name;
    const statusClass = user.has_logged_in ? 'active' : 'inactive';
    const statusText = user.has_logged_in ? 'Active' : 'Inactive';

    // Format dates
    const enrolledDate = user.group_enrolled_date ? formatDate(user.group_enrolled_date) : 'Unknown';
    const lastActiveDate = user.last_login ? formatUnixTimestamp(user.last_login) : 'Never';

    // Build HTML
    const html = `
      <div class="user-progress__header">
        <div class="user-progress__avatar">
          <img src="https://i.pravatar.cc/80?u=${encodeURIComponent(user.email)}" alt="${escapeHtml(fullName)}" />
        </div>
        <div class="user-progress__user-info">
          <h1 class="user-progress__name">${escapeHtml(fullName)}</h1>
          <div class="user-progress__meta">
            <span class="user-progress__email">${escapeHtml(user.email)}</span>
            <span class="user-progress__meta-item">
              <i class="fa-solid fa-calendar"></i> Enrolled: ${enrolledDate}
            </span>
            <span class="user-progress__meta-item">
              <i class="fa-solid fa-clock"></i> Last Active: ${lastActiveDate}
            </span>
            <span class="user-progress__meta-item user-progress__meta-item--${statusClass}">
              <i class="fa-solid fa-circle"></i> ${statusText}
            </span>
          </div>
        </div>
      </div>
    `;

    // Insert HTML into block
    const $block = $('.wp-block-bys-groups-user-info');
    $block.html(html);
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  }

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

  function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
});
