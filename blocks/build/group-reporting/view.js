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
  groupCourses: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/courses`
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
/*!*************************************!*\
  !*** ./src/group-reporting/view.js ***!
  \*************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");

jQuery(document).ready(function ($) {
  const $block = $('.wp-block-bys-groups-group-reporting').first();
  const $table = $block.find('.reporting-table');
  const $tooltip = $('.bys-tooltip');
  if (!$table.length) return;
  const detailUrl = $table.data('detailUrl') || '/administrator-dashboard/user-progress-detail/';
  let expandedIdx = null;
  let currentGroupId = null;

  /**
   * ======================================
   * Interactions
   * ======================================
   */
  // Filter panel toggle
  $block.find('.filters__toggle').on('click', function () {
    const $toggle = $(this);
    const $box = $block.find('#filters-box');
    const isOpen = $toggle.attr('aria-expanded') === 'true';
    $toggle.attr('aria-expanded', !isOpen);
    $box.attr('aria-hidden', isOpen);
    $box.toggleClass('hidden', isOpen);
  });

  // Course column expand/collapse
  $table.on('click', '.bys-course-toggle', function (e) {
    e.stopPropagation();
    const idx = parseInt($(this).data('courseIdx'), 10);
    const opening = expandedIdx !== idx;
    resetAllCourses();
    if (opening) {
      expandCourse(idx);
      expandedIdx = idx;
    } else {
      expandedIdx = null;
    }
  });
  function resetAllCourses() {
    $table.find('.course-col-header').removeClass('course-col-header--expanded course-col--hidden').addClass('course-col-header--collapsed').find('.bys-course-toggle').attr('aria-expanded', 'false');
    $table.find('.course-cell--badge').removeClass('course-col--hidden');
    $table.find('.course-sub-col, .course-sub-cell').addClass('course-sub-col--hidden');
  }
  function expandCourse(idx) {
    $table.find(`.course-col-header[data-course-idx="${idx}"]`).removeClass('course-col-header--collapsed').addClass('course-col-header--expanded').find('.bys-course-toggle').attr('aria-expanded', 'true');
    $table.find(`.course-sub-col[data-course-idx="${idx}"], .course-sub-cell[data-course-idx="${idx}"]`).removeClass('course-sub-col--hidden');
    $table.find(`.course-col-header:not([data-course-idx="${idx}"]), .course-cell--badge:not([data-course-idx="${idx}"])`).addClass('course-col--hidden');
  }

  // Row click to detail page
  $table.on('click', '.reporting-table__row', function (e) {
    if ($(e.target).closest('.bys-course-toggle').length) return;
    if ($(e.target).closest('a').length) return;
    const userId = $(this).data('userId');
    if (userId) window.location.href = detailUrl + '?user_id=' + userId + '&group_id=' + currentGroupId;
  });

  // Quiz icon tooltips
  $table.on('mouseenter', '.bys-quiz-icon[data-tip]', function () {
    const $icon = $(this);
    $tooltip.text($icon.data('tip')).attr('aria-hidden', 'false');
    const rect = this.getBoundingClientRect();
    $tooltip.css({
      top: window.scrollY + rect.bottom + 6 + 'px',
      left: window.scrollX + rect.left + rect.width / 2 - $tooltip.outerWidth() / 2 + 'px'
    });
  });
  $table.on('mouseleave', '.bys-quiz-icon', function () {
    $tooltip.attr('aria-hidden', 'true').text('');
  });

  /**
   * ======================================
   * Render table
   * ======================================
   */

  // listens for the jQuery event triggered by group-select block
  $(document).on('bys:groupSelected', async function (_, data) {
    const groupId = data.groupId;
    const courses = data.courses || [];
    const baseUsersStats = data.baseUsersStats || {};
    if (!groupId) return;
    currentGroupId = groupId;

    // render table header with courses
    rebuildTableHeader(courses);

    // render skeleton rows
    const userIds = baseUsersStats.user_ids || [];
    const firstTenUserIds = userIds.slice(0, 10);
    rebuildTableBodyWithSkeletons(courses, firstTenUserIds);

    // fetch user data and course progress in the background
    await populateTableWithData(groupId, courses, firstTenUserIds);
  });

  // render skeleton table rows with loading placeholders
  function rebuildTableBodyWithSkeletons(courses, userIds) {
    const $tbody = $table.find('tbody');
    const rowTemplate = document.getElementById('skeleton-row-template');
    const courseCellTemplate = document.getElementById('course-cell-template');
    $tbody.html('');
    userIds.forEach(userId => {
      // Clone the skeleton row
      const rowContent = rowTemplate.content.cloneNode(true);
      const $row = $(rowContent);
      $row.find('tr').attr('data-user-id', userId);
      courses.forEach((course, idx) => {
        const cellsContent = courseCellTemplate.content.cloneNode(true);
        const $cells = $(cellsContent);
        $cells.find('td').attr('data-course-idx', idx);
        $row.find('tr').append($cells);
      });
      $tbody.append($row);
    });
  }

  // Fetch user details and populate user info columns
  async function populateTableWithData(groupId, courses, userIds) {
    try {
      const userIdsString = userIds.join(',');
      const usersUrl = _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupUsers(groupId, userIdsString);
      const allUsersResponse = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(usersUrl, true);
      if (!allUsersResponse || !Array.isArray(allUsersResponse)) {
        console.error('Invalid users response:', allUsersResponse);
        return;
      }

      // Update user info columns for each user
      const $tbody = $table.find('tbody');
      allUsersResponse.forEach(user => {
        const $row = $tbody.find(`tr[data-user-id="${user.id}"]`);
        if (!$row.length) return;
        const statusClass = user.has_logged_in ? 'status-badge--online' : '';
        $row.removeClass('reporting-table__row--loading').find('.col-status .status-badge').attr('class', `status-badge ${statusClass}`).end().find('.col-name').html(`
            <a href="${detailUrl}?group_id=${currentGroupId}&user_id=${user.id}" class="reporting-table__name-link" onclick="event.stopPropagation();">
              ${user.display_name}
            </a>
          `).end().find('.col-email').html(user.email);
      });
    } catch (err) {
      console.error('Failed to fetch group reporting data:', err);
    }
  }

  // Update table header with course columns
  function rebuildTableHeader(courses) {
    const $headRow = $table.find('thead tr.reporting-table__head');

    // Remove existing course columns (keep fixed columns: status, name, email)
    $headRow.find('.course-col-header, .course-sub-col').remove();

    // If no courses, add skeleton
    if (!courses || courses.length === 0) {
      const skeletonTemplate = document.getElementById('skeleton-course-header-template');
      if (skeletonTemplate) {
        const skeletonContent = skeletonTemplate.content.cloneNode(true);
        $headRow.append(skeletonContent);
      }
    } else {
      // Clone course header template for each course
      const courseTemplate = document.getElementById('course-header-template');
      courses.forEach((course, idx) => {
        const headerContent = courseTemplate.content.cloneNode(true);
        const $headers = $(headerContent);

        // Update data-course-idx and course title
        $headers.find('[data-course-idx]').attr('data-course-idx', idx);
        $headers.find('.bys-course-toggle').html(course.title.rendered);
        $headers.find('.bys-dl-link').attr('title', `Download ${course.title.rendered}`);
        $headRow.append($headers);
      });
    }
  }
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map