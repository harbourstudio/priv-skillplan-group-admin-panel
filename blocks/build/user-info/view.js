/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/_shared/api-client.js"
/*!***********************************!*\
  !*** ./src/_shared/api-client.js ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   api: () => (/* binding */ api),
/* harmony export */   endpoints: () => (/* binding */ endpoints)
/* harmony export */ });
/**
 * Shared API client with in-memory caching and request deduplication.
 * Prevents duplicate requests when multiple blocks fetch the same data.
 * Uses basic auth via Authorization header (from plugin settings).
 */

// Get basic auth credentials from WP
function getAuthorizationHeader() {
  if (window.bysGroupsAuth && window.bysGroupsAuth.header) {
    return window.bysGroupsAuth.header;
  }
  return null;
}

// custom API endpoint definitions
const endpoints = {
  // /groups/* routes
  baseGroupData: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/base-group-data`,
  baseGroupStats: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/group-stats`,
  groupLeaders: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/leaders`,
  groupUsers: (groupId, userIds) => `/wp-json/bys-groups/v1/groups/${groupId}/users?user_ids=${userIds}`,
  groupUserInfo: (groupId, userId) => `/wp-json/bys-groups/v1/groups/${groupId}/users/${userId}`,
  groupCourses: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/courses`,
  groupCourseCompletionStats: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/course-completion-stats`,
  groupQuizSubmissionStats: (groupId, quizIds) => `/wp-json/bys-groups/v1/groups/${groupId}/quiz-submission-stats?quiz_ids=${quizIds.join(',')}`,
  groupQuizAttempts: (groupId, quizId) => `/wp-json/bys-groups/v1/groups/${groupId}/quizzes/${quizId}/attempts`,
  removeGroupLeader: (groupId, userId) => `/wp-json/bys-groups/v1/groups/${groupId}/leaders/${userId}`,
  allCourses: () => '/wp-json/bys-groups/v1/all-courses',
  addGroupCourse: (groupId, courseId) => `/wp-json/bys-groups/v1/groups/${groupId}/courses/${courseId}/add`,
  removeGroupCourse: (groupId, courseId) => `/wp-json/bys-groups/v1/groups/${groupId}/courses/${courseId}/remove`,
  toggleRequiredCourse: (groupId, courseId) => `/wp-json/bys-groups/v1/groups/${groupId}/courses/${courseId}/toggle-required`,
  removeGroupUser: (groupId, userId) => `/wp-json/bys-groups/v1/groups/${groupId}/users/${userId}/remove`,
  archiveGroup: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/archive`,
  unarchiveGroup: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/unarchive`,
  renameGroup: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/rename`,
  archivedGroups: () => {
    const userId = window.bysGroupsAuth?.userId ?? '';
    return `/wp-json/bys-groups/v1/me/archived-groups${userId ? `?user_id=${userId}` : ''}`;
  },
  groupQuizAccess: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/quiz-access`,
  userQuizAccess: (groupId, userId) => `/wp-json/bys-groups/v1/groups/${groupId}/users/${userId}/quiz-access`,
  notifyUserQuizAccess: (groupId, userId) => `/wp-json/bys-groups/v1/groups/${groupId}/users/${userId}/notify-quiz-access`,
  groupInviteBulk: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/invite-bulk`,
  groupCommunicationLog: (groupId, count = 25, offset = 0) => `/wp-json/bys-groups/v1/groups/${groupId}/communication-log?count=${count}&offset=${offset}`,
  communicationRecipients: batchId => `/wp-json/bys-groups/v1/communications/batch/${batchId}/recipients`,
  communicationDetail: messageId => `/wp-json/bys-groups/v1/communications/${messageId}/detail`,
  conditionalRecipients: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/conditional-recipients`,
  // /me/* routes
  currentUserGroups: () => '/wp-json/bys-groups/v1/me/groups',
  currentUserOrganizations: () => '/wp-json/bys-groups/v1/me/organizations',
  // /organizations/* routes
  createOrganizationGroup: orgId => `/wp-json/bys-groups/v1/organizations/${orgId}/groups`,
  // /courses/* routes
  courseHierarchialBreakdown: courseId => `/wp-json/bys-groups/v1/courses/${courseId}/steps`,
  courseQuizSteps: courseId => `/wp-json/bys-groups/v1/courses/${courseId}/quiz-steps`,
  courseQuizzes: courseId => `/wp-json/bys-groups/v1/courses/${courseId}/quizzes`,
  courseQuizStepsGrading: courseId => `/wp-json/bys-groups/v1/courses/${courseId}/quiz-steps?filter=grading`,
  courseQuizProgressBatch: (courseId, userIds) => `/wp-json/bys-groups/v1/courses/${courseId}/quiz-progress-batch?user_ids=${userIds}`,
  // /users/* routes
  userCoursesWithProgress: userId => `/wp-json/bys-groups/v1/users/${userId}/courses?include=progress`,
  userQuizProgress: userId => `/wp-json/bys-groups/v1/users/${userId}/quiz-progress`,
  userQuizAttemptsDetails: (userId, quizId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts/${quizId}`,
  userActivity: userId => `/wp-json/bys-groups/v1/users/${userId}/activity`,
  userCourseActivity: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/activity?course_id=${courseId}`,
  userCourseStepsProgress: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/course-progress-steps/${courseId}`,
  // /attempts/* routes
  attemptDetail: activityId => `/wp-json/bys-groups/v1/attempts/${activityId}`,
  attemptQuestions: activityId => `/wp-json/bys-groups/v1/attempts/${activityId}/questions`
};

// Singleton anchored on `window` so every block bundle shares one cache
const apiSingleton = window.bysGroupsApi || {
  _cache: new Map(),
  _pending: new Map(),
  /**
   * Fetch data with automatic caching and deduplication.
   */
  async get(url, forceRefresh = false) {
    // Return cached response if available
    if (!forceRefresh && this._cache.has(url)) {
      return this._cache.get(url);
    }

    // Return existing pending request if existing
    if (this._pending.has(url)) {
      return this._pending.get(url);
    }

    // Send request and cache the result
    const headers = {};
    const authHeader = getAuthorizationHeader();
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    // Always include the WP REST nonce so cookie-based auth works and
    // get_current_user_id() resolves to the actual logged-in user.
    if (window.bysGroupsAuth?.nonce) {
      headers['X-WP-Nonce'] = window.bysGroupsAuth.nonce;
    }
    const promise = jQuery.ajax({
      url: url,
      type: 'GET',
      headers: headers,
      dataType: 'json'
    }).done((data, textStatus, jqXHR) => {
      console.log(`Success for ${url}:`, {
        status: jqXHR.status,
        data
      });
    }).then(data => {
      this._cache.set(url, data);
      return data;
    }).catch((jqXHR, textStatus, errorThrown) => {
      console.error(`API request failed for ${url}:`, {
        status: jqXHR.status,
        statusText: jqXHR.statusText,
        responseText: jqXHR.responseText?.substring(0, 500),
        textStatus: textStatus,
        errorThrown: errorThrown?.message
      });
      throw new Error(`API request failed: ${jqXHR.status} ${jqXHR.statusText} - ${jqXHR.responseText?.substring(0, 100)}`);
    }).always(() => {
      this._pending.delete(url);
    });
    this._pending.set(url, promise);
    return promise;
  },
  /**
   * Fire-and-forget POST. Does not cache. Auth header included automatically.
   */
  post(url, body = {}) {
    const headers = {
      'Content-Type': 'application/json'
    };
    const authHeader = getAuthorizationHeader();
    if (authHeader) headers['Authorization'] = authHeader;
    if (window.bysGroupsAuth?.nonce) headers['X-WP-Nonce'] = window.bysGroupsAuth.nonce;
    return jQuery.ajax({
      url,
      type: 'POST',
      headers,
      data: JSON.stringify(body),
      dataType: 'json'
    }).catch(jqXHR => {
      console.error(`POST failed for ${url}:`, jqXHR.status, jqXHR.responseText?.substring(0, 200));
      throw new Error(`POST failed: ${jqXHR.status} ${jqXHR.responseText?.substring(0, 100)}`);
    });
  },
  /**
   * Fire-and-forget DELETE.
   */
  delete(url) {
    const headers = {};
    const authHeader = getAuthorizationHeader();
    if (authHeader) headers['Authorization'] = authHeader;
    if (window.bysGroupsAuth?.nonce) headers['X-WP-Nonce'] = window.bysGroupsAuth.nonce;
    return jQuery.ajax({
      url,
      type: 'DELETE',
      headers,
      dataType: 'json'
    }).catch(jqXHR => {
      console.error(`DELETE failed for ${url}:`, jqXHR.status, jqXHR.responseText?.substring(0, 200));
      throw new Error(`DELETE failed: ${jqXHR.status} ${jqXHR.responseText?.substring(0, 100)}`);
    });
  },
  /**
   * Invalidate cached responses
   */
  invalidate(keyFragment) {
    for (const key of this._cache.keys()) {
      if (key.includes(keyFragment)) {
        this._cache.delete(key);
      }
    }
  },
  /**
   * Clear all cached data
   */
  clear() {
    this._cache.clear();
  }
};
window.bysGroupsApi = apiSingleton;
const api = apiSingleton;

/***/ },

/***/ "./src/_shared/helpers.js"
/*!********************************!*\
  !*** ./src/_shared/helpers.js ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   convertFromUTC: () => (/* binding */ convertFromUTC),
/* harmony export */   convertToUTC: () => (/* binding */ convertToUTC),
/* harmony export */   formatDate: () => (/* binding */ formatDate),
/* harmony export */   formatDateTime: () => (/* binding */ formatDateTime),
/* harmony export */   formatDuration: () => (/* binding */ formatDuration),
/* harmony export */   formatScore: () => (/* binding */ formatScore),
/* harmony export */   formatTime: () => (/* binding */ formatTime)
/* harmony export */ });
/**
 * Shared block functions
 *
 * Usage:
 *   import { formatScore, formatDate } from '../_shared/helpers.js';
 *
 */

function formatScore(percent, pointsScored, pointsTotal) {
  if (percent === null || percent === undefined) return '—';
  if (pointsScored === null || pointsTotal === null) return `${percent}%`;
  const pct = parseFloat(Number(percent).toFixed(2));
  return `${pointsScored}/${pointsTotal} (${pct}%)`;
}
function formatDate(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '—';
  }
}
function formatTime(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return '—';
  }
}
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return '—';
  }
}

/**
 * Convert a UTC ISO 8601 string to a local datetime string in
 * `YYYY-MM-DDTHH:mm` format (the dateFormat used by Flatpickr).
 *
 * @param {string} utcDatetimeValue ISO 8601 UTC datetime
 * @returns {string} Local datetime in YYYY-MM-DDTHH:mm, or '' if invalid
 */
function convertFromUTC(utcDatetimeValue) {
  if (!utcDatetimeValue) return '';
  const dt = new Date(utcDatetimeValue);
  if (isNaN(dt.getTime())) return '';
  const Y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const H = String(dt.getHours()).padStart(2, '0');
  const i = String(dt.getMinutes()).padStart(2, '0');
  return `${Y}-${m}-${d}T${H}:${i}`;
}

/**
 * Convert a Flatpickr-style local datetime string (`YYYY-MM-DDTHH:mm`)
 * into a UTC ISO 8601 string suitable for sending to a server.
 *
 * @param {string} localDatetimeValue Local datetime in YYYY-MM-DDTHH:mm
 * @returns {string} UTC ISO 8601 string, or '' if input is empty
 */
function convertToUTC(localDatetimeValue) {
  if (!localDatetimeValue) return '';
  const [datePart, timePart] = localDatetimeValue.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

/***/ },

/***/ "./src/_shared/tooltip.js"
/*!********************************!*\
  !*** ./src/_shared/tooltip.js ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createTooltip: () => (/* binding */ createTooltip),
/* harmony export */   destroyTooltip: () => (/* binding */ destroyTooltip)
/* harmony export */ });
/**
 * Shared tooltip utility
 *
 * Usage in block scripts:
 *   import { createTooltip, destroyTooltip } from '../_shared/tooltip.js';
 *
 *   jQuery(document).ready(($) => {
 *     // Show tooltip on hover
 *     $container.on('mouseenter', '[data-tooltip]', function () {
 *       createTooltip($(this), $(this).attr('data-tooltip'));
 *     });
 *
 *     // Hide tooltip on leave
 *     $container.on('mouseleave', '[data-tooltip]', function () {
 *       destroyTooltip();
 *     });
 *   });
 */

function createTooltip($trigger, content) {
  destroyTooltip();
  if (!content) return;
  const $tip = jQuery('<div class="bys-groups-tooltip" role="tooltip"></div>');

  // Render based on content type
  if (typeof content === 'string') {
    $tip.text(content);
  } else if (typeof content === 'object') {
    const {
      title,
      body
    } = content;
    let html = '';
    if (title) html += `<div class="bys-groups-tooltip__title">${escapeHtml(title)}</div>`;
    if (body) html += `<div class="bys-groups-tooltip__content">${escapeHtml(body)}</div>`;
    if (html) $tip.html(html);
  }
  $tip.appendTo('body');

  // Position below trigger
  const triggerRect = $trigger[0].getBoundingClientRect();
  $tip.css({
    position: 'fixed',
    top: triggerRect.top + triggerRect.height + 4 + 'px',
    left: triggerRect.left + 'px'
  });
}
function destroyTooltip() {
  jQuery('.bys-groups-tooltip').remove();
}
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*******************************!*\
  !*** ./src/user-info/view.js ***!
  \*******************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/* harmony import */ var _shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/helpers.js */ "./src/_shared/helpers.js");
/* harmony import */ var _shared_tooltip_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../_shared/tooltip.js */ "./src/_shared/tooltip.js");



jQuery(document).ready(async $ => {
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
    const userData = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupUserInfo(groupId, userId), true);
    // Display user info
    displayUserInfo(userData);
  } catch (err) {
    console.error('Failed to fetch user details:', err);
  }
  async function waitForAuthHeader() {
    return new Promise(resolve => {
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
    if (!$block) return;
    const fullName = [user.first_name, user.last_name].join(' ') || user.display_name;
    const statusClass = user.status === 'online' ? 'active' : 'inactive';
    const statusText = user.status === 'online' ? 'Active' : user.status === 'offline' ? 'Offline' : 'Never Logged In';

    // Format dates — Last Active is a viewer-local DATE display, with the
    // full server ISO timestamp pinned as a native browser tooltip via title=.
    const enrolledDate = user.group_enrolled_date ? formatUnixTimestamp(user.group_enrolled_date) : 'Unknown';
    const lastActiveDate = user.last_active ? (0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__.formatDate)(user.last_active) : 'Never';

    // Populate with data
    $block.find('.user-avatar').attr('src', user.avatar_url || `https://i.pravatar.cc/80?u=${encodeURIComponent(user.email)}`).attr('alt', fullName);
    $block.find('.user-name').text(fullName);
    $block.find('.user-email').text(user.email);
    $block.find('.user-enrolled-date').text(enrolledDate);
    $block.find('.user-last-login-date').text(lastActiveDate).attr('title', user.last_active || '');
    const $statusItem = $block.find('.user-info__meta-status');
    $statusItem.addClass(`user-info__meta-status--${statusClass}`);
    $block.find('.user-status-text').text(statusText);

    // Stash both timestamps on the status item; the mouseenter handler
    // assembles the tooltip object so we don't recreate it on every hover.
    if (user.last_active) $statusItem.attr('data-last-active', user.last_active);
    if (user.status_checked_at) $statusItem.attr('data-status-checked-at', user.status_checked_at);
  }

  // Shared tooltip handlers — show "Last active" + "Checked at" on hover.
  jQuery(document).on('mouseenter', '.user-info__meta-status', function () {
    const $item = jQuery(this);
    const lastActive = $item.attr('data-last-active');
    const checkedAt = $item.attr('data-status-checked-at');
    if (!lastActive && !checkedAt) return;
    (0,_shared_tooltip_js__WEBPACK_IMPORTED_MODULE_2__.createTooltip)($item, {
      title: lastActive ? `Last active: ${(0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__.formatDateTime)(lastActive)}` : 'Never active',
      body: checkedAt ? `Checked at ${(0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__.formatDateTime)(checkedAt)}` : ''
    });
  });
  jQuery(document).on('mouseleave', '.user-info__meta-status', function () {
    (0,_shared_tooltip_js__WEBPACK_IMPORTED_MODULE_2__.destroyTooltip)();
  });
  function formatUnixTimestamp(timestamp) {
    if (!timestamp) return '';
    try {
      // Convert Unix timestamp (seconds) to milliseconds
      const numTimestamp = parseInt(timestamp, 10);
      if (isNaN(numTimestamp)) return '';
      const date = new Date(numTimestamp * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '';
    }
  }
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map