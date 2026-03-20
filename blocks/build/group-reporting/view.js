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
/* harmony export */   api: () => (/* binding */ api)
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
/**
 * view.js — BYS Group Reporting block.
 */


console.log('group-reporting view.js loaded');
jQuery(document).ready(function ($) {
  const $block = $('.wp-block-bys-groups-group-reporting').first();
  const $table = $block.find('.reporting-table');
  const detailUrl = $table.data('detailUrl') || '/administrator-dashboard/user-progress-detail/';
  const $tooltip = $('.bys-tooltip');
  if (!$table.length) return;
  let expandedIdx = null;

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
    $table.find('.course-col-header').removeClass('course-col-header--expanded').addClass('course-col-header--collapsed').removeClass('course-col--hidden').find('.bys-course-toggle').attr('aria-expanded', 'false');
    $table.find('.course-cell--badge').removeClass('course-col--hidden');
    $table.find('.course-sub-col, .course-sub-cell').addClass('course-sub-col--hidden');
  }
  function expandCourse(idx) {
    const $header = $table.find(`.course-col-header[data-course-idx="${idx}"]`);
    $header.removeClass('course-col-header--collapsed').addClass('course-col-header--expanded').find('.bys-course-toggle').attr('aria-expanded', 'true');
    $table.find(`.course-sub-col[data-course-idx="${idx}"]`).removeClass('course-sub-col--hidden');
    $table.find(`.course-sub-cell[data-course-idx="${idx}"]`).removeClass('course-sub-col--hidden');
    $table.find(`.course-col-header:not([data-course-idx="${idx}"])`).addClass('course-col--hidden');
    $table.find(`.course-cell--badge:not([data-course-idx="${idx}"])`).addClass('course-col--hidden');
  }

  // Row click to detail page
  $table.on('click', '.reporting-table__row', function (e) {
    if ($(e.target).closest('.bys-course-toggle').length) return;
    if ($(e.target).closest('a').length) return;
    const userId = $(this).data('userId');
    if (userId) window.location.href = detailUrl + '?user_id=' + userId;
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

  // Listen for group selection event
  $(document).on('bys:groupSelected', async function (_, data) {
    console.log('bys:groupSelected event received:', data);
    const groupId = data.groupId;
    if (!groupId) return;
    await populateTableFromAPI(groupId);
  });

  // Fetch and populate table from custom endpoint
  async function populateTableFromAPI(groupId) {
    try {
      console.log('Fetching users for group:', groupId);
      const usersUrl = `/wp-json/bys-groups/v1/groups/${groupId}/users`;
      const usersResponse = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(usersUrl, true); // Force refresh

      if (!usersResponse || !Array.isArray(usersResponse)) {
        console.error('Invalid users response:', usersResponse);
        return;
      }
      console.log('Users from API:', usersResponse);

      // Use placeholder courses (temp)
      const courses = [{
        id: 1,
        title: 'MF EL*'
      }, {
        id: 2,
        title: 'MF EL*'
      }, {
        id: 3,
        title: 'MF EL*'
      }, {
        id: 4,
        title: 'MF EL*'
      }, {
        id: 5,
        title: 'MF EL*'
      }, {
        id: 6,
        title: 'MF EL'
      }, {
        id: 7,
        title: 'MF EL'
      }, {
        id: 8,
        title: 'MF EL'
      }, {
        id: 9,
        title: 'MF EL'
      }, {
        id: 10,
        title: 'MF EL'
      }];
      rebuildTableHeader(courses);
      rebuildTableBody(courses, usersResponse);
    } catch (err) {
      console.error('Failed to fetch group reporting data:', err);
    }
  }
  function rebuildTableHeader(courses) {
    const $thead = $table.find('thead');
    $thead.html('');
    let headerHtml = '<tr class="reporting-table__head">';
    headerHtml += '<th class="col-status"></th>';
    headerHtml += '<th class="col-name">Name</th>';
    headerHtml += '<th class="col-email">Email</th>';
    courses.forEach((course, idx) => {
      headerHtml += `
        <th class="course-col-header course-col-header--collapsed" data-course-idx="${idx}">
          <div class="course-col-header__inner">
            <button class="bys-course-toggle btn-unstyled" type="button" aria-expanded="false" data-course-idx="${idx}">
              ${escapeHtml(course.title)}
            </button>
            <a class="bys-dl-link" href="#" title="Download ${escapeHtml(course.title)}">
              <i class="fa-solid fa-download"></i>
            </a>
          </div>
        </th>
        <th class="course-sub-col course-sub-col--progress course-sub-col--hidden" data-course-idx="${idx}">Completion Progress</th>
        <th class="course-sub-col course-sub-col--quizzing course-sub-col--hidden" data-course-idx="${idx}">Quizzing</th>
        <th class="course-sub-col course-sub-col--enrolment course-sub-col--hidden" data-course-idx="${idx}">Enrolment Date</th>
        <th class="course-sub-col course-sub-col--completion course-sub-col--hidden" data-course-idx="${idx}">Completion Date</th>
      `;
    });
    headerHtml += '</tr>';
    $thead.html(headerHtml);
  }
  function rebuildTableBody(courses, users) {
    const $tbody = $table.find('tbody');
    $tbody.html('');
    let bodyHtml = '';
    users.forEach(user => {
      const statusClass = user.has_logged_in ? 'status-badge--online' : '';
      bodyHtml += `
        <tr class="reporting-table__row" data-user-id="${user.id}">
          <td class="col-status">
            <span class="status-badge ${statusClass}">
              <i class="fa-solid fa-circle"></i>
            </span>
          </td>
          <td class="col-name">
            <a href="${detailUrl}?user_id=${user.id}" class="reporting-table__name-link" onclick="event.stopPropagation();">
              ${escapeHtml(user.display_name)}
            </a>
          </td>
          <td class="col-email">${escapeHtml(user.email)}</td>
      `;
      courses.forEach((_, idx) => {
        bodyHtml += `
          <td class="course-cell course-cell--badge" data-course-idx="${idx}">
            <span class="completion-badge completion-badge--none"><i class="fa-regular fa-circle"></i></span>
          </td>
          <td class="course-cell course-sub-cell course-sub-cell--progress course-sub-col--hidden" data-course-idx="${idx}">
            <div class="bys-progress-wrap"><div class="bys-progress-bar" style="width:0%;background:var(--wp--preset--color--gray-300);"></div></div>
            <span class="bys-pct" style="color:var(--wp--preset--color--gray-300);">0%</span>
          </td>
          <td class="course-cell course-sub-cell course-sub-cell--quizzing course-sub-col--hidden" data-course-idx="${idx}">
            <span class="bys-quiz-empty">—</span>
          </td>
          <td class="course-cell course-sub-cell course-sub-cell--enrolment course-sub-col--hidden" data-course-idx="${idx}">
            <span class="bys-date-empty">Not Started</span>
          </td>
          <td class="course-cell course-sub-cell course-sub-cell--completion course-sub-col--hidden" data-course-idx="${idx}">
            <span class="bys-date-empty">Not Completed</span>
          </td>
        `;
      });
      bodyHtml += '</tr>';
    });
    $tbody.html(bodyHtml);
  }
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map