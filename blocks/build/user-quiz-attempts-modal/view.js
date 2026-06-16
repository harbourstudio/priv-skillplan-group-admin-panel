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
/*!**********************************************!*\
  !*** ./src/user-quiz-attempts-modal/view.js ***!
  \**********************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/* harmony import */ var _shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/helpers.js */ "./src/_shared/helpers.js");
/* harmony import */ var _shared_tooltip_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../_shared/tooltip.js */ "./src/_shared/tooltip.js");



jQuery(document).ready($ => {
  const $block = $('.wp-block-bys-groups-user-quiz-attempts-modal').first();
  const $modal = $block.find('#quiz-attempts-modal');
  const $tbody = $modal.find('tbody');
  const $modeFilter = $modal.find('#quiz-attempts-mode-filter');
  const $userSearch = $modal.find('#quiz-attempts-user-search');
  const $userClear = $modal.find('.user-search-clear');
  const $suggestions = $modal.find('#user-search-suggestions');
  const rowTemplate = $block.find('#user-quiz-attempts-modal__template-row')[0];
  let allAttempts = [];
  let currentRows = []; // tracks the currently rendered rows (for CSV export)
  let sortState = {
    col: 'user',
    dir: 'asc'
  };
  let usersIndex = []; // [{ id, name, email, label }] — built once after load
  let selectedUserId = null; // currently selected user ID (null = all)

  // Track current quiz/group context so the grading-page link can carry it forward
  let currentGroupId = null;
  let currentQuizId = null;
  let currentQuizTitle = '';
  let currentCourse = '';
  const round2 = n => n != null ? Math.round(n * 100) / 100 : n;
  function closeModal() {
    $modal.addClass('hidden').removeClass('open');
    $('html').css('overflow', 'unset');
  }

  // ── Sorting ────────────────────────────────────────────────────────────────

  function userName(attempt) {
    return [attempt.first_name, attempt.last_name].filter(Boolean).join(' ') || attempt.display_name || '';
  }
  function sortRows(rows) {
    if (!sortState.col) return rows;
    return [...rows].sort((a, b) => {
      let va, vb;
      switch (sortState.col) {
        case 'user':
          va = userName(a).toLowerCase();
          vb = userName(b).toLowerCase();
          break;
        case 'submitted':
          va = a.completed_gmt ?? '';
          vb = b.completed_gmt ?? '';
          break;
        case 'score':
          va = a.percentage ?? -1;
          vb = b.percentage ?? -1;
          break;
        case 'status':
          va = a.pass === true ? 2 : a.pass === false ? 1 : 0;
          vb = b.pass === true ? 2 : b.pass === false ? 1 : 0;
          break;
        default:
          return 0;
      }
      if (va < vb) return sortState.dir === 'asc' ? -1 : 1;
      if (va > vb) return sortState.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }
  function updateSortIcons() {
    $modal.find('thead th[data-sort-col]').each(function () {
      const $icon = $(this).find('.sort-icon');
      const col = $(this).data('sortCol');
      $icon.removeClass('fa-sort fa-sort-up fa-sort-down');
      $icon.addClass(col === sortState.col ? sortState.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down' : 'fa-sort');
    });
  }
  $modal.find('thead th[data-sort-col]').on('click', function () {
    const col = $(this).data('sortCol');
    sortState = sortState.col === col ? {
      col,
      dir: sortState.dir === 'asc' ? 'desc' : 'asc'
    } : {
      col,
      dir: 'asc'
    };
    updateSortIcons();
    applyFilters();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  function renderRows(attempts) {
    currentRows = attempts; // snapshot for CSV export
    $tbody.empty();
    $tbody.off('mouseenter mouseleave click');
    if (!attempts.length) {
      $tbody.html('<tr><td colspan="5">No attempts found.</td></tr>');
      return;
    }
    attempts.forEach((attempt, index) => {
      const rowNode = rowTemplate.content.cloneNode(true);
      const $row = $(rowNode);
      $row.find('tr').attr('data-user-id', attempt.user_id).attr('data-activity-id', attempt.activity_id);
      $row.find('.cell_attempt_index').text(index + 1);
      $row.find('.cell_attempt_user').text(userName(attempt));
      const $date = $row.find('.cell_attempt_date');
      $date.text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__.formatDate)(attempt.completed_gmt)).attr('data-tooltip', attempt.completed_gmt ? (0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__.formatDateTime)(attempt.completed_gmt) : '—');
      $row.find('.cell_attempt_score').text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__.formatScore)(round2(attempt.percentage), attempt.points_scored, attempt.points_total));
      const $badge = $row.find('.status-badge');
      if (attempt.pass === null) {
        $badge.addClass('status-badge--ungraded').text('Ungraded');
      } else if (attempt.pass) {
        $badge.addClass('status-badge--pass').text('Pass');
      } else {
        $badge.addClass('status-badge--fail').text('Fail');
      }
      $tbody.append($row);
    });
    $tbody.on('mouseenter', '[data-tooltip]', function () {
      (0,_shared_tooltip_js__WEBPACK_IMPORTED_MODULE_2__.createTooltip)($(this), $(this).attr('data-tooltip'));
    }).on('mouseleave', '[data-tooltip]', _shared_tooltip_js__WEBPACK_IMPORTED_MODULE_2__.destroyTooltip);

    // Collapsed view: click to drill into that user's attempts.
    // Expanded view (user selected): click to navigate to the grading page.
    $tbody.on('click', 'tr[data-user-id]', function () {
      if (selectedUserId) {
        const activityId = $(this).data('activityId');
        if (activityId) {
          const gradingUrl = $block.data('gradingUrl');
          const params = new URLSearchParams({
            attempt_id: activityId,
            group_id: currentGroupId ?? '',
            quiz_id: currentQuizId ?? ''
          });
          window.location.href = `${gradingUrl}?${params}`;
        }
      } else {
        selectUser(parseInt($(this).data('userId'), 10));
      }
    });
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  function collapseByUser(attempts, mode) {
    // Ungraded mode: show only users who have at least one ungraded attempt,
    // picking their most recent ungraded attempt as the representative row.
    if (mode === 'ungraded') {
      const best = {};
      attempts.filter(a => a.pass === null).forEach(a => {
        const existing = best[a.user_id];
        if (!existing || (a.completed_gmt ?? '') > (existing.completed_gmt ?? '')) {
          best[a.user_id] = a;
        }
      });
      return Object.values(best);
    }
    const best = {};
    attempts.forEach(a => {
      const existing = best[a.user_id];
      if (!existing) {
        best[a.user_id] = a;
        return;
      }
      if (mode === 'recent') {
        if ((a.completed_gmt ?? '') > (existing.completed_gmt ?? '')) best[a.user_id] = a;
      } else {
        if ((a.percentage ?? -1) > (existing.percentage ?? -1)) best[a.user_id] = a;
      }
    });
    return Object.values(best);
  }

  // ── CSV export ──────────────────────────────────────────────────────────────

  function downloadCsv(rows, filename) {
    const csv = rows.map(row => row.map(cell => {
      const str = String(cell ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function exportToCsv() {
    const headers = ['#', 'User', 'Submitted', 'Score', 'Percentage', 'Status'];
    const dataRows = currentRows.map((attempt, index) => {
      const status = attempt.pass === null ? 'Ungraded' : attempt.pass ? 'Pass' : 'Fail';
      const hasPoints = attempt.points_scored !== null && attempt.points_total !== null;
      const score = hasPoints ? `${attempt.points_scored}/${attempt.points_total}` : '';
      const pct = attempt.percentage !== null && attempt.percentage !== undefined ? `${round2(attempt.percentage)}%` : '';
      return [index + 1, userName(attempt), attempt.completed_gmt ? (0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__.formatDateTime)(attempt.completed_gmt) : '', score, pct, status];
    });
    const slug = currentQuizTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const today = new Date().toISOString().split('T')[0];
    downloadCsv([headers, ...dataRows], `quiz-attempts-${slug}-${today}.csv`);
  }
  function applyFilters() {
    const mode = $modeFilter.val();
    let rows;
    if (selectedUserId) {
      rows = allAttempts.filter(a => a.user_id === selectedUserId);
      $tbody.removeClass('is-collapsed');
    } else {
      rows = collapseByUser(allAttempts, mode);
      $tbody.addClass('is-collapsed');
    }
    renderRows(sortRows(rows));
  }

  // ── User autosuggest ───────────────────────────────────────────────────────

  function buildUsersIndex(attempts) {
    const seen = new Set();
    const index = [];
    attempts.forEach(a => {
      if (seen.has(a.user_id)) return;
      seen.add(a.user_id);
      const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.display_name || '';
      index.push({
        id: a.user_id,
        name,
        email: a.email || '',
        label: a.email ? `${name} (${a.email})` : name
      });
    });
    index.sort((a, b) => a.name.localeCompare(b.name));
    return index;
  }
  function showSuggestions(query) {
    const q = query.toLowerCase().trim();
    const matches = q ? usersIndex.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : usersIndex;
    $suggestions.empty();
    if (!matches.length) {
      $suggestions.append('<li class="user-suggestion user-suggestion--empty" role="option">No users found</li>');
    } else {
      matches.forEach(u => {
        $suggestions.append(`<li class="user-suggestion" role="option" data-user-id="${u.id}" data-user-name="${escapeAttr(u.name)}">${escapeHtml(u.label)}</li>`);
      });
    }
    $suggestions.removeClass('hidden');
    $userSearch.attr('aria-expanded', 'true');
  }
  function hideSuggestions() {
    $suggestions.addClass('hidden').empty();
    $userSearch.attr('aria-expanded', 'false');
  }
  function selectUser(userId) {
    const user = usersIndex.find(u => u.id === userId);
    if (!user) return;
    selectedUserId = userId;
    $userSearch.val(user.name).prop('readonly', true);
    $userClear.removeClass('hidden');
    $modeFilter.closest('.filter-bar__group').addClass('hidden');
    hideSuggestions();
    applyFilters();
  }
  function clearUserSelection() {
    selectedUserId = null;
    $userSearch.val('').prop('readonly', false).trigger('focus');
    $userClear.addClass('hidden');
    $modeFilter.closest('.filter-bar__group').removeClass('hidden');
    applyFilters();
  }
  const escapeHtml = s => $('<div>').text(s).html();
  const escapeAttr = s => s.replace(/"/g, '&quot;');
  $userSearch.on('input', function () {
    if (selectedUserId) return; // locked to a selection
    showSuggestions($(this).val());
  });
  $userSearch.on('focus', function () {
    if (!selectedUserId) showSuggestions($(this).val());
  });

  // Keyboard navigation in suggestions
  $userSearch.on('keydown', function (e) {
    if ($suggestions.hasClass('hidden')) return;
    const $items = $suggestions.find('.user-suggestion:not(.user-suggestion--empty)');
    const $active = $suggestions.find('.user-suggestion--active');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const $next = $active.length ? $active.removeClass('user-suggestion--active').next('.user-suggestion') : $items.first();
      $next.addClass('user-suggestion--active');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const $prev = $active.length ? $active.removeClass('user-suggestion--active').prev('.user-suggestion') : $items.last();
      $prev.addClass('user-suggestion--active');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if ($active.length) selectUser(parseInt($active.data('userId'), 10));
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });
  $suggestions.on('mousedown', '.user-suggestion:not(.user-suggestion--empty)', function (e) {
    e.preventDefault(); // prevent input blur before click fires
    selectUser(parseInt($(this).data('userId'), 10));
  });

  // Close suggestions when clicking outside
  $(document).on('click.userSearch', function (e) {
    if (!$(e.target).closest('.user-search-wrap').length) {
      hideSuggestions();
      // If nothing was selected, clear any partial text
      if (!selectedUserId) $userSearch.val('');
    }
  });
  $userClear.on('click', clearUserSelection);

  // ── Open event ─────────────────────────────────────────────────────────────

  $(window).on('bysQuizAttemptsOpen', async function (_event, data) {
    const {
      quizId,
      quizTitle,
      parentCourse,
      groupId,
      userId
    } = data;
    currentGroupId = groupId;
    currentQuizId = quizId;
    currentQuizTitle = quizTitle;
    currentCourse = parentCourse;
    $modal.find('.quiz-title').text(quizTitle);
    $modal.find('.course-title').text(parentCourse);

    // Reset state
    selectedUserId = null;
    usersIndex = [];
    $userSearch.val('').prop('readonly', false);
    $userClear.addClass('hidden');
    hideSuggestions();
    $modeFilter.val('highest');
    $modeFilter.closest('.filter-bar__group').removeClass('hidden');
    sortState = {
      col: 'user',
      dir: 'asc'
    };
    updateSortIcons();
    $tbody.html('<tr><td colspan="5">Loading attempts…</td></tr>');
    $modal.removeClass('hidden').addClass('open');
    $('html').css('overflow', 'hidden');
    if (typeof HSStaticMethods !== 'undefined') HSStaticMethods.autoInit();
    try {
      allAttempts = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupQuizAttempts(groupId, quizId), true);
      usersIndex = buildUsersIndex(allAttempts);
      if (userId) {
        selectUser(parseInt(userId, 10));
      } else {
        applyFilters();
      }
    } catch (err) {
      console.error('[user-quiz-attempts-modal] Failed to fetch quiz attempts:', err);
      $tbody.html('<tr><td colspan="5">Failed to load attempts.</td></tr>');
    }
  });

  // ── Filter change handlers ─────────────────────────────────────────────────

  $modeFilter.on('change', applyFilters);

  // ── Export handler ─────────────────────────────────────────────────────────

  $modal.find('.modal__export').on('click', function () {
    if (!currentRows.length) return;
    const $btn = $(this);
    $btn.prop('disabled', true);
    exportToCsv();
    $btn.prop('disabled', false);
  });

  // ── Close handlers ─────────────────────────────────────────────────────────

  $modal.find('.modal__close').on('click', closeModal);
  $modal.find('[data-hs-overlay]').on('click', function (e) {
    e.stopPropagation();
    closeModal();
  });
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map