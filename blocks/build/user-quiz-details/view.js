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
  courseQuizProgressBatch: (courseId, userIds) => `/wp-json/bys-groups/v1/courses/${courseId}/quiz-progress-batch?user_ids=${userIds}`,
  groupQuizSubmissionStats: (groupId, quizIds) => `/wp-json/bys-groups/v1/groups/${groupId}/quiz-submission-stats?quiz_ids=${quizIds.join(',')}`,
  groupQuizAttempts: (groupId, quizId) => `/wp-json/bys-groups/v1/groups/${groupId}/quizzes/${quizId}/attempts`,
  userQuizAttempts: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts?course_id=${courseId}`,
  userQuizProgress: userId => `/wp-json/bys-groups/v1/users/${userId}/quiz-progress`,
  userQuizAttemptsDetails: (userId, quizId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts/${quizId}`,
  attemptDetail: activityId => `/wp-json/bys-groups/v1/attempts/${activityId}`,
  attemptQuestions: activityId => `/wp-json/bys-groups/v1/attempts/${activityId}/questions`,
  userActivity: userId => `/wp-json/bys-groups/v1/users/${userId}/activity`,
  userCourseActivity: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/activity?course_id=${courseId}`,
  userCourseStepsProgress: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/course-progress-steps/${courseId}`,
  trackTopicVisit: userId => `/wp-json/bys-groups/v1/users/${userId}/track-topic-visit`
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
   * Fire-and-forget POST. Does not cache. Auth header included automatically.
   */
  post(url, body = {}) {
    const headers = {
      'Content-Type': 'application/json'
    };
    const authHeader = getAuthorizationHeader();
    if (authHeader) headers['Authorization'] = authHeader;
    return jQuery.ajax({
      url,
      type: 'POST',
      headers,
      data: JSON.stringify(body),
      dataType: 'json'
    }).catch(jqXHR => {
      console.error(`POST failed for ${url}:`, jqXHR.status, jqXHR.responseText?.substring(0, 200));
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
  const $block = $('.wp-block-bys-groups-user-quiz-details').first();
  const $filterForm = $block.find('.filters__form');
  const $flatTable = $block.find('#quizzes-table-flat');
  const $groupedContainer = $block.find('#quizzes-grouped');
  const $flatTableBody = $flatTable.find('tbody');
  const tableTemplate = $block.find('#user-quiz-details_template-row')[0];
  const courseTableTemplate = $block.find('#user-quiz-details_template-course-table')[0];
  const $showMore = $block.find('.bys-show-more');
  let dataLoaded = false;
  let allQuizzes = [];
  let groupByCourse = false;
  let currentPage = 1;
  let totalPages = 0;
  let isLoadingMore = false;
  const PER_PAGE = 25;
  let coursePages = {}; // Track pagination per course in grouped view

  // Helper to escape HTML in data attributes
  const escapeHtml = text => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Date range validation and UI helpers
  const validateDateRange = () => {
    const $dateFrom = $block.find('#filter-date-from');
    const $dateTo = $block.find('#filter-date-to');
    const dateFrom = $dateFrom.val();
    const dateTo = $dateTo.val();
    if (dateFrom) {
      $dateTo.attr('min', dateFrom);
    } else {
      $dateTo.removeAttr('min');
    }
    if (dateTo) {
      $dateFrom.attr('max', dateTo);
    } else {
      $dateFrom.removeAttr('max');
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      $dateFrom.val(dateTo);
    }
  };
  const updateDateRangeText = () => {
    const dateFrom = $block.find('#filter-date-from').val();
    const dateTo = $block.find('#filter-date-to').val();
    if (!dateFrom && !dateTo) {
      $block.find('#date-range-text').text('Select a date range');
    } else if (dateFrom && dateTo) {
      $block.find('#date-range-text').text(`${dateFrom} - ${dateTo}`);
    } else if (dateFrom) {
      $block.find('#date-range-text').text(`From ${dateFrom}`);
    } else {
      $block.find('#date-range-text').text(`Until ${dateTo}`);
    }
  };
  const toggleDateRangeDropdown = () => {
    $block.find('#date-range-dropdown').toggleClass('hidden');
  };

  // Handle date range inputs - validation and UI updates
  $block.find('#filter-date-from, #filter-date-to').on('change', function () {
    validateDateRange();
    updateDateRangeText();
  });

  // Handle date range dropdown toggle
  $block.find('#date-range-trigger').on('click', function (e) {
    e.preventDefault();
    toggleDateRangeDropdown();
  });

  // Close date range dropdown when clicking outside
  $(document).on('click', function (e) {
    const $dateRangeField = $block.find('.filters__field--date-range');
    const dateRangeElement = $dateRangeField[0];
    if (dateRangeElement && !dateRangeElement.contains(e.target)) {
      $block.find('#date-range-dropdown').addClass('hidden');
    }
  });

  // Handle filter form submission
  $filterForm.on('submit', function (e) {
    e.preventDefault();
    currentPage = 1;
    coursePages = {}; // Reset per-course pagination
    renderDisplayedQuizzes();
  });

  // Handle filter form reset
  $filterForm.on('reset', function () {
    setTimeout(() => {
      validateDateRange();
      updateDateRangeText();
      currentPage = 1;
      coursePages = {}; // Reset per-course pagination
      renderDisplayedQuizzes();
    }, 0);
  });

  // Handle show more button click
  $showMore.on('click', function (e) {
    e.preventDefault();
    if (!isLoadingMore && currentPage < totalPages) {
      isLoadingMore = true;
      currentPage++;
      renderDisplayedQuizzes();
      isLoadingMore = false;
    }
  });

  // Handle group by course toggle
  $block.find('.group-by-course-toggle').on('change', function () {
    groupByCourse = $(this).is(':checked');
    currentPage = 1;
    coursePages = {}; // Reset per-course pagination when toggling view
    renderDisplayedQuizzes();
  });

  // Handle score_sort radio button change
  const updateColumnVisibility = sortMode => {
    const isHighest = sortMode === 'highest';
    $flatTable.find('.col_score_highest, .col_result_highest').toggle(isHighest);
    $flatTableBody.find('.cell_score_highest, .cell_result_highest').toggle(isHighest);
    $flatTable.find('.col_score_latest, .col_result_latest').toggle(!isHighest);
    $flatTableBody.find('.cell_score_latest, .cell_result_latest').toggle(!isHighest);
    $groupedContainer.find('.col_score_highest, .col_result_highest').toggle(isHighest);
    $groupedContainer.find('.cell_score_highest, .cell_result_highest').toggle(isHighest);
    $groupedContainer.find('.col_score_latest, .col_result_latest').toggle(!isHighest);
    $groupedContainer.find('.cell_score_latest, .cell_result_latest').toggle(!isHighest);
  };
  $block.find('input[name="score_sort"]').on('change', function () {
    updateColumnVisibility($(this).val());
  });
  updateColumnVisibility('highest');

  // Update show more button visibility (flat view only)
  const updateShowMoreButton = () => {
    if (groupByCourse) {
      // In grouped view, show more buttons are per-course
      $showMore.addClass('hidden');
      return;
    }
    const displayedCount = $flatTableBody.find('tr').length;
    if (displayedCount >= applyFiltersToQuizzes().length) {
      $showMore.addClass('hidden');
    } else {
      $showMore.removeClass('hidden');
    }
  };

  // Render paginated quizzes (respects current page and filters)
  const renderDisplayedQuizzes = () => {
    const filtered = applyFiltersToQuizzes();
    if (groupByCourse) {
      // Grouped view: paginate per course
      renderQuizzes(filtered, true);
    } else {
      // Flat view: global pagination
      const start = 0;
      const end = currentPage * PER_PAGE;
      const paginated = filtered.slice(start, end);
      renderQuizzes(paginated, false);
      updateShowMoreButton();
    }
  };

  // Apply all active filters to quiz list (keyword, status, date range)
  const applyFiltersToQuizzes = () => {
    if (!allQuizzes.length) return [];
    return allQuizzes.filter(quiz => {
      const keyword = $block.find('#filter-keyword').val().toLowerCase();
      if (keyword) {
        const matchesKeyword = quiz.title.toLowerCase().includes(keyword) || quiz.parent_course_title.toLowerCase().includes(keyword);
        if (!matchesKeyword) return false;
      }
      const status = $block.find('#filter-status').val();
      if (status) {
        if (status === 'pass' && !quiz.pass_latest) return false;
        if (status === 'fail' && quiz.pass_latest) return false;
        if (status === 'ungraded' && quiz.pass_latest !== null) return false;
      }

      // Date range filter on latest_timestamp (last activity date)
      const dateFrom = $block.find('#filter-date-from').val();
      const dateTo = $block.find('#filter-date-to').val();
      if (dateFrom || dateTo) {
        const quizDate = new Date(quiz.latest_timestamp);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          if (quizDate < fromDate) return false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          // Include full day by extending to end of day
          toDate.setHours(23, 59, 59, 999);
          if (quizDate > toDate) return false;
        }
      }
      return true;
    });
  };
  const loadQuizData = async () => {
    if (dataLoaded) return;
    dataLoaded = true;
    const loadingCells = Array(6).fill(`<td>${_shared_loading_js__WEBPACK_IMPORTED_MODULE_1__.LOADING}</td>`).join('');
    $flatTableBody.html(`<tr>${loadingCells}</tr>`);
    try {
      const courseIds = (window.bysGroupsCache?.courses || []).map(c => c.id).join(',');
      const url = _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.userQuizProgress(userId) + `?group_id=${groupId}` + (courseIds ? `&course_ids=${courseIds}` : '');
      const quizzes = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(url);
      if (!Array.isArray(quizzes) || quizzes.length === 0) {
        $flatTableBody.html('<tr><td colspan="8">No quiz attempts found.</td></tr>');
        return;
      }
      allQuizzes = quizzes;

      // Count passed quizzes for user-stats coordination
      const passedCount = quizzes.filter(q => q.pass_highest === true).length;
      window.bysGroupsCache ??= {};
      window.bysGroupsCache.quizzesPassed = passedCount;
      jQuery(window).trigger('bys:statsUpdated', [{
        key: 'total_quizzes_passed',
        value: passedCount
      }]);
      currentPage = 1;
      totalPages = Math.ceil(allQuizzes.length / PER_PAGE);
      renderDisplayedQuizzes();
    } catch (err) {
      console.error('[user-quiz-details] Failed to fetch quiz progress:', err);
      $flatTableBody.html('<tr><td colspan="8">Failed to load quiz data.</td></tr>');
    }
  };
  const renderQuizzes = (quizzes, grouped = false) => {
    if (quizzes.length === 0) {
      $flatTableBody.html('<tr><td colspan="8">No quizzes match your filters.</td></tr>');
      $groupedContainer.html('');
      return;
    }
    if (grouped) {
      // Group by course and render separate tables with per-course pagination
      $flatTable.hide();
      $groupedContainer.show().empty();
      const groupedQuizzes = {};
      quizzes.forEach(quiz => {
        const courseTitle = quiz.parent_course_title || 'Uncategorized';
        if (!groupedQuizzes[courseTitle]) groupedQuizzes[courseTitle] = [];
        groupedQuizzes[courseTitle].push(quiz);
      });
      Object.entries(groupedQuizzes).forEach(([courseTitle, courseQuizzes]) => {
        // Initialize course pagination if needed
        if (!coursePages[courseTitle]) {
          coursePages[courseTitle] = 1;
        }
        const coursePageNum = coursePages[courseTitle];
        const courseStart = 0;
        const courseEnd = coursePageNum * PER_PAGE;
        const coursePaginated = courseQuizzes.slice(courseStart, courseEnd);
        const courseTableNode = courseTableTemplate.content.cloneNode(true);
        const $courseGroup = $(courseTableNode);
        const $courseTbody = $courseGroup.find('.course-group__tbody');
        $courseGroup.find('.course-group__title').html(courseTitle);
        coursePaginated.forEach(quiz => {
          renderQuizRow(quiz, $courseTbody, tableTemplate);
        });

        // Add show more button for this course if there are more quizzes
        if (coursePaginated.length < courseQuizzes.length) {
          const $showMoreBtn = $('<button class="bys-show-more bys-course-show-more btn-unstyled" type="button" data-course-title="' + escapeHtml(courseTitle) + '">' + 'Show More Results' + '</button>');
          $courseGroup.append($showMoreBtn);
        }
        $groupedContainer.append($courseGroup);
      });

      // Bind per-course show more button click handlers
      $groupedContainer.on('click', '.bys-course-show-more', function (e) {
        e.preventDefault();
        const courseTitle = $(this).data('courseTitle');
        if (coursePages[courseTitle] !== undefined) {
          coursePages[courseTitle]++;
          renderDisplayedQuizzes();
        }
      });

      // Bind tooltips in grouped view
      $groupedContainer.on('mouseenter', '[data-tooltip]', function () {
        (0,_shared_tooltip_js__WEBPACK_IMPORTED_MODULE_3__.createTooltip)($(this), $(this).attr('data-tooltip'));
      }).on('mouseleave', '[data-tooltip]', _shared_tooltip_js__WEBPACK_IMPORTED_MODULE_3__.destroyTooltip);
    } else {
      // Flat view: single table
      $flatTable.show();
      $groupedContainer.hide().empty();

      // Only clear table body if starting fresh pagination
      if (currentPage === 1) {
        $flatTableBody.empty();
      }
      quizzes.forEach(quiz => {
        renderQuizRow(quiz, $flatTableBody, tableTemplate);
      });

      // Bind tooltips in flat view
      $flatTableBody.on('mouseenter', '[data-tooltip]', function () {
        (0,_shared_tooltip_js__WEBPACK_IMPORTED_MODULE_3__.createTooltip)($(this), $(this).attr('data-tooltip'));
      }).on('mouseleave', '[data-tooltip]', _shared_tooltip_js__WEBPACK_IMPORTED_MODULE_3__.destroyTooltip);
    }
  };
  const renderQuizRow = (quiz, $tbody, template) => {
    const rowNode = template.content.cloneNode(true);
    const $row = $(rowNode);
    const $tr = $row.find('tr');
    $tr.attr('data-quiz-id', quiz.id).attr('data-course-id', quiz.parent_course_id);
    $row.find('.cell_quiz_title').html(quiz.title);
    const $lastActivity = $row.find('.cell_last_activity');
    $lastActivity.text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDate)(quiz.latest_timestamp)).attr('data-tooltip', quiz.latest_timestamp ? (0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDateTime)(quiz.latest_timestamp) : '—');
    $row.find('.cell_parent_course').html(quiz.parent_course_title);
    $row.find('.attemps-count').text(quiz.total_attempts);
    $row.find('.cell_score_highest').text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatScore)(quiz.percent_highest, quiz.points_scored_highest, quiz.points_total_highest));
    $row.find('.cell_score_latest').text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatScore)(quiz.percent_latest, quiz.points_scored_latest, quiz.points_total_latest));
    const $resultHighest = $row.find('.cell_result_highest .status-badge');
    renderStatusBadge($resultHighest, quiz.pass_highest);
    const $resultLatest = $row.find('.cell_result_latest .status-badge');
    renderStatusBadge($resultLatest, quiz.pass_latest);

    // Clickable attempts cell
    const $attempsCell = $row.find('.cell_total_attempts');
    $attempsCell.on('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const cachedCourse = (window.bysGroupsCache?.courses || []).find(c => c.id === quiz.parent_course_id);
      $(window).trigger('bysQuizAttemptsOpen', [{
        groupId: groupId,
        userId: userId,
        quizId: quiz.id,
        quizTitle: quiz.title,
        parentCourse: cachedCourse?.shortname || quiz.parent_course_title
      }]);
    });
    $attempsCell.on('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $attempsCell.trigger('click');
      }
    });
    $tbody.append($row);
  };
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