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
  currentUserGroups: () => '/wp-json/bys-groups/v1/me/groups',
  groupBaseUsersStats: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/base-user-stats`,
  groupUsers: (groupId, userIds) => `/wp-json/bys-groups/v1/groups/${groupId}/users?user_ids=${userIds}`,
  groupUserInfo: (groupId, userId) => `/wp-json/bys-groups/v1/groups/${groupId}/users/${userId}`,
  groupCourses: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/courses`,
  groupCourseCompletionStats: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/course-completion-stats`,
  courseHierarchialBreakdown: courseId => `/wp-json/bys-groups/v1/courses/${courseId}/steps`,
  groupUserCourseProgress: (userId, courseIds) => `/wp-json/bys-groups/v1/users/${userId}/course-progress?course_ids=${courseIds}`,
  courseQuizSteps: courseId => `/wp-json/bys-groups/v1/courses/${courseId}/quiz-steps`,
  groupQuizSubmissionStats: (groupId, quizIds) => `/wp-json/bys-groups/v1/groups/${groupId}/quiz-submission-stats?quiz_ids=${quizIds.join(',')}`,
  groupQuizAttempts: (groupId, quizId) => `/wp-json/bys-groups/v1/groups/${groupId}/quizzes/${quizId}/attempts`,
  userQuizAttempts: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts?course_id=${courseId}`,
  userQuizProgress: userId => `/wp-json/bys-groups/v1/users/${userId}/quiz-progress`,
  userQuizAttemptsDetails: (userId, quizId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts/${quizId}`,
  attemptDetail: activityId => `/wp-json/bys-groups/v1/attempts/${activityId}`,
  attemptQuestions: activityId => `/wp-json/bys-groups/v1/attempts/${activityId}/questions`,
  userActivity: userId => `/wp-json/bys-groups/v1/users/${userId}/activity`,
  userCourseActivity: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/activity?course_id=${courseId}`,
  userCourseStepsProgress: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/course-progress-steps/${courseId}`
};
const api = {
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

/***/ },

/***/ "./src/_shared/helpers.js"
/*!********************************!*\
  !*** ./src/_shared/helpers.js ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
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
  return `${pointsScored}/${pointsTotal} (${percent}%)`;
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
  const $userFilter = $modal.find('#quiz-attempts-user-filter');
  const $modeFilter = $modal.find('#quiz-attempts-mode-filter');
  const rowTemplate = $block.find('#user-quiz-attempts-modal__template-row')[0];
  let allAttempts = [];
  let sortState = {
    col: 'user',
    dir: 'asc'
  };

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

  function sortRows(rows) {
    if (!sortState.col) return rows;
    return [...rows].sort((a, b) => {
      let va, vb;
      switch (sortState.col) {
        case 'user':
          va = (a.display_name || '').toLowerCase();
          vb = (b.display_name || '').toLowerCase();
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
      $row.find('.cell_attempt_user').text(attempt.display_name);
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
      if ($userFilter.val()) {
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
        $userFilter.val(String($(this).data('userId'))).trigger('change');
      }
    });
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  function collapseByUser(attempts, mode) {
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
  function applyFilters() {
    const selectedUserId = parseInt($userFilter.val()) || null;
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

    // Reset filters and sort
    $userFilter.find('option:not(:first)').remove();
    $userFilter.val('');
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
      const usersMap = {};
      allAttempts.forEach(a => {
        usersMap[a.user_id] = a.display_name;
      });
      Object.entries(usersMap).forEach(([id, name]) => {
        $userFilter.append(`<option value="${id}">${name}</option>`);
      });
      if (userId) {
        $userFilter.val(String(userId));
        $modeFilter.closest('.filter-bar__group').addClass('hidden');
      }
      applyFilters();
    } catch (err) {
      console.error('[user-quiz-attempts-modal] Failed to fetch quiz attempts:', err);
      $tbody.html('<tr><td colspan="5">Failed to load attempts.</td></tr>');
    }
  });

  // ── Filter change handlers ─────────────────────────────────────────────────

  $userFilter.on('change', function () {
    $modeFilter.closest('.filter-bar__group').toggleClass('hidden', !!$userFilter.val());
    applyFilters();
  });
  $modeFilter.on('change', applyFilters);

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