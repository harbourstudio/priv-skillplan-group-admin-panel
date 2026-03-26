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
  userActivity: userId => `/wp-json/bys-groups/v1/users/${userId}/activity`
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
/* harmony export */   LOADING_COMPONENT: () => (/* binding */ LOADING_COMPONENT)
/* harmony export */ });
/**
 * Shared loading state component
 *
 * Usage:
 *   import { LOADING_COMPONENT } from '../_shared/loading.js';
 * 
 */
const LOADING_COMPONENT = `
    <div class="bys-groups-loading-wrapper" role="status" aria-live="polite" aria-label="Loading">
        <div class="bys-groups-loading" aria-hidden="true">
            <span class="bys-groups-loading__dot"></span>
            <span class="bys-groups-loading__dot"></span>
            <span class="bys-groups-loading__dot"></span>
        </div>
        <span class="bys-sr-only">Loading</span>
    </div>
`;

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
/*!***********************************!*\
  !*** ./src/user-activity/view.js ***!
  \***********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/* harmony import */ var _shared_loading_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/loading.js */ "./src/_shared/loading.js");
/* harmony import */ var _shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../_shared/helpers.js */ "./src/_shared/helpers.js");
/**
 * User Activity Block - Frontend View
 * Fetches user activity from REST API and renders in a table
 */




jQuery(document).ready($ => {
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
    'Viewed a Certificate': 'fa-eye'
  };
  let currentPage = 1;
  let currentFilters = {};

  /**
   * Load activity data from API
   */
  const loadActivity = async (page = 1) => {
    const $loadingRow = jQuery(`<tr><td>${_shared_loading_js__WEBPACK_IMPORTED_MODULE_1__.LOADING_COMPONENT}</td></tr>`);
    $tbody.html($loadingRow);
    currentPage = page;
    try {
      const queryParams = new URLSearchParams({
        page,
        per_page: $block.find('[name="per_page"]').val() || 20,
        ...(currentFilters.activity ? {
          activity: currentFilters.activity
        } : {}),
        ...(currentFilters.date_from ? {
          date_from: currentFilters.date_from
        } : {}),
        ...(currentFilters.date_to ? {
          date_to: currentFilters.date_to
        } : {})
      });
      const url = `${_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.userActivity(userId)}?${queryParams.toString()}`;
      const result = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(url);
      $tbody.empty();
      if (!result.items || result.items.length === 0) {
        $tbody.html('<tr><td>No activity found.</td></tr>');
        return;
      }
      result.items.forEach(item => {
        const $row = $(rowTemplate.content.cloneNode(true));
        const icon = iconMap[item.activity_label] || '';
        $row.find('.cell-activity__icon').addClass(icon);
        $row.find('.cell-activity__label').text(item.activity_label);
        $row.find('.cell-created-at__date').text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDate)(item.created_at));
        $row.find('.cell-created-at__time').text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatTime)(item.created_at));
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
      date_to: $block.find('[name="date_to"]').val() || ''
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
})();

/******/ })()
;
//# sourceMappingURL=view.js.map