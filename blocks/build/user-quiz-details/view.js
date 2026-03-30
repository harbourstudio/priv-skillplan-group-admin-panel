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
  userQuizAttempts: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts?course_id=${courseId}`,
  userQuizProgress: userId => `/wp-json/bys-groups/v1/users/${userId}/quiz-progress`,
  userQuizAttemptsDetails: (userId, quizId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts/${quizId}`,
  userActivity: userId => `/wp-json/bys-groups/v1/users/${userId}/activity`,
  userLessonProgress: (userId, lessonId) => `/wp-json/bys-groups/v1/users/${userId}/lessons/${lessonId}`,
  userTopicProgress: (userId, topicId) => `/wp-json/bys-groups/v1/users/${userId}/topics/${topicId}`
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

/***/ "./src/_shared/loading.js"
/*!********************************!*\
  !*** ./src/_shared/loading.js ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LOADING: () => (/* binding */ LOADING)
/* harmony export */ });
/**
 * Shared loading state component
 *
 * Usage:
 *   import { LOADING } from '../_shared/loading.js';
 * 
 */
const LOADING = `
    <div class="bys-groups-loading" role="status" aria-live="polite" aria-label="Loading">
        <span></span>
    </div>
`;

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
/*!***************************************!*\
  !*** ./src/user-quiz-details/view.js ***!
  \***************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/* harmony import */ var _shared_loading_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/loading.js */ "./src/_shared/loading.js");
/* harmony import */ var _shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../_shared/helpers.js */ "./src/_shared/helpers.js");
/* harmony import */ var _shared_tooltip_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../_shared/tooltip.js */ "./src/_shared/tooltip.js");




jQuery(document).ready($ => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get('group_id');
  const userId = params.get('user_id');
  if (!groupId || !userId) {
    console.error('[user-quiz-details] Missing group_id or user_id URL parameter');
    return;
  }
  const $block = $('.wp-block-bys-groups-user-quiz-details').first(); // only one instance of the block
  const $tableBody = $block.find('table').find('tbody');
  const $table = $block.find('table');
  const tableTemplate = $block.find('#user-quiz-details_template-row')[0];
  const $filterForm = $block.find('.filters__form');
  let dataLoaded = false;
  let allQuizzes = []; // Store original unfiltered data

  // Handle score_sort radio button change
  const updateColumnVisibility = sortMode => {
    const isHighest = sortMode === 'highest';

    // Show/hide highest columns
    $table.find('.col_score_highest, .col_result_highest').toggle(isHighest);
    $tableBody.find('.cell_score_highest, .cell_result_highest').toggle(isHighest);

    // Show/hide latest columns
    $table.find('.col_score_latest, .col_result_latest').toggle(!isHighest);
    $tableBody.find('.cell_score_latest, .cell_result_latest').toggle(!isHighest);
  };

  // Bind change event to radio buttons
  $block.find('input[name="score_sort"]').on('change', function () {
    updateColumnVisibility($(this).val());
  });

  // Initialize with default 'highest' mode
  updateColumnVisibility('highest');

  // Fetch and render quiz data
  const loadQuizData = async () => {
    if (dataLoaded) return; // Already loaded

    dataLoaded = true;
    const loadingCells = Array(6).fill(`<td>${_shared_loading_js__WEBPACK_IMPORTED_MODULE_1__.LOADING}</td>`).join('');
    $tableBody.html(`<tr>${loadingCells}</tr>`);
    try {
      // Fetch quiz progress from custom endpoint
      // Pass course IDs from cache to avoid redundant server-side fetch
      const courseIds = (window.bysGroupsCache?.courses || []).map(c => c.id).join(',');
      const url = _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.userQuizProgress(userId) + `?group_id=${groupId}` + (courseIds ? `&course_ids=${courseIds}` : '');
      const quizzes = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(url);
      if (!Array.isArray(quizzes) || quizzes.length === 0) {
        $tableBody.html('<tr><td colspan="6">No quiz attempts found.</td></tr>');
        return;
      }

      // Store original data for filtering
      allQuizzes = quizzes;

      // Render quizzes
      renderQuizzes(quizzes);

      // Bind filter form submit
      $filterForm.on('submit', function (e) {
        e.preventDefault();
        applyFilters();
      });

      // Bind filter reset
      $filterForm.find('.filters__reset').on('click', function () {
        $filterForm[0].reset();
        renderQuizzes(allQuizzes);
      });
    } catch (err) {
      console.error('[user-quiz-details] Failed to fetch quiz progress:', err);
      $tableBody.html('<tr><td>Failed to load quiz data.</td></tr>');
    }
  };

  // Apply filters to quiz data
  const applyFilters = () => {
    const keyword = $filterForm.find('#filter-keyword').val().toLowerCase();
    const status = $filterForm.find('#filter-status').val();
    const dateRange = $filterForm.find('#filter-date_range').val();
    const filtered = allQuizzes.filter(quiz => {
      // Keyword filter: search quiz title OR course title
      if (keyword) {
        const matchesKeyword = quiz.title.toLowerCase().includes(keyword) || quiz.parent_course_title.toLowerCase().includes(keyword);
        if (!matchesKeyword) return false;
      }

      // Status filter
      if (status) {
        if (status === 'pass' && !quiz.pass_latest) return false;
        if (status === 'fail' && quiz.pass_latest) return false;
        if (status === 'ungraded' && quiz.pass_latest !== null) return false;
      }

      // Date range filter
      if (dateRange) {
        const selectedDate = new Date(dateRange).getTime();
        const quizDate = new Date(quiz.latest_timestamp).getTime();
        if (quizDate < selectedDate) return false;
      }
      return true;
    });
    renderQuizzes(filtered);
  };

  // Render quiz rows to table
  const renderQuizzes = quizzes => {
    $tableBody.empty();
    if (quizzes.length === 0) {
      $tableBody.html('<tr><td colspan="9">No quizzes match your filters.</td></tr>');
      return;
    }
    quizzes.forEach(quiz => {
      const rowNode = tableTemplate.content.cloneNode(true);
      const $row = $(rowNode);

      // Set data-quiz-id attribute on the row element
      $row.find('tr').attr('data-quiz-id', quiz.id);

      // Populate cells
      $row.find('.cell_quiz_title').html(quiz.title);
      const $lastActivity = $row.find('.cell_last_activity');
      $lastActivity.text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDate)(quiz.latest_timestamp)).attr('data-tooltip', quiz.latest_timestamp_gmt ? (0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDateTime)(quiz.latest_timestamp_gmt) : '—');
      $row.find('.cell_parent_course').html(quiz.parent_course_title);

      // Populate attempts count and attach modal trigger
      $row.find('.attemps-count').text(quiz.total_attempts);
      $row.find('.cell_score_highest').text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatScore)(quiz.percent_highest, quiz.points_scored_highest, quiz.points_total_highest));
      $row.find('.cell_score_latest').text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatScore)(quiz.percent_latest, quiz.points_scored_latest, quiz.points_total_latest));

      // Render result badges
      const $resultHighest = $row.find('.cell_result_highest .status-badge');
      renderStatusBadge($resultHighest, quiz.pass_highest);
      const $resultLatest = $row.find('.cell_result_latest .status-badge');
      renderStatusBadge($resultLatest, quiz.pass_latest);

      // Attach click handler to modal trigger (ellipsis button)
      const $button = $row.find('.modal-quiz-attempts__trigger');
      $button.attr('data-quiz-id', quiz.id);

      // Add event handler for user-quiz-attempts-modal block interaction
      $button.on('click', function (e) {
        e.preventDefault();

        // trigger jQuery event for user-quiz-attempts-modal block
        // the user-quiz-attempts-modal itself will fetch full attempt details and render
        $(window).trigger('bysQuizAttemptsOpen', [{
          userId: userId,
          quizId: quiz.id,
          quizTitle: quiz.title,
          parentCourse: quiz.parent_course_title
        }]);
      });
      $tableBody.append($row);
    });

    // Initialize tooltips on last activity cells
    $tableBody.on('mouseenter', '[data-tooltip]', function () {
      (0,_shared_tooltip_js__WEBPACK_IMPORTED_MODULE_3__.createTooltip)($(this), $(this).attr('data-tooltip'));
    });
    $tableBody.on('mouseleave', '[data-tooltip]', function () {
      (0,_shared_tooltip_js__WEBPACK_IMPORTED_MODULE_3__.destroyTooltip)();
    });
  };

  // CRITICAL: Listen for jQuery tab activation event from user-tabs block
  jQuery(window).on('bysUserTabActivated', function (_event, tabName) {
    if (tabName === 'user-quiz-details') {
      loadQuizData();
    }
  });
});
function renderStatusBadge($badge, pass) {
  if (pass) {
    $badge.addClass('status-badge--pass').text('Pass');
  } else {
    $badge.addClass('status-badge--fail').text('Fail');
  }
}
})();

/******/ })()
;
//# sourceMappingURL=view.js.map