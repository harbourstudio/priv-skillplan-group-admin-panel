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
  groupCourses: groupId => `/wp-json/bys-groups/v1/groups/${groupId}/courses`,
  userCourseProgress: (userId, courseIds) => `/wp-json/bys-groups/v1/users/${userId}/course-progress?course_ids=${courseIds}`,
  courseQuizSteps: courseId => `/wp-json/bys-groups/v1/courses/${courseId}/quiz-steps`,
  userQuizAttempts: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts?course_id=${courseId}`,
  userInfo: (groupId, userId) => `/wp-json/bys-groups/v1/groups/${groupId}/users/${userId}`
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
  const detailUrl = $table.data('detailUrl') || '/administrator-dashboard/user-progress-detail/';
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
    if (userId) window.location.href = detailUrl + '?user_id=' + userId + '&group_id=' + currentGroupId;
  });

  // Create tooltip instance on demand
  function createAndShowTooltip($trigger) {
    const tipData = $trigger.data('tip');
    if (!tipData) return;

    // Remove any existing tooltip
    $('.bys-tooltip-instance').remove();

    // Parse tooltip data (format: "Quiz Title|points_earned/points_total|percentage")
    let quizTitle = tipData;
    let pointsFraction = '';
    let percentage = '';

    // If it contains pipe separators, parse the full format
    if (tipData.includes('|')) {
      const parts = tipData.split('|');
      quizTitle = parts[0] || '';
      pointsFraction = parts[1] || '';
      percentage = parts[2] || '';
    }

    // Create tooltip with structured content
    const $tip = $('<div class="bys-tooltip-instance" role="tooltip"></div>');
    if (pointsFraction || percentage) {
      $tip.html(`
        <div class="bys-tooltip__title">${escapeHtml(quizTitle)}</div>
        <div class="bys-tooltip__content">
          <div class="bys-tooltip__fraction">${escapeHtml(pointsFraction)}</div>
          <div class="bys-tooltip__percentage">${escapeHtml(percentage)}</div>
        </div>
      `);
    } else {
      $tip.text(quizTitle);
    }
    $tip.appendTo('body');

    // Position absolutely below the trigger element
    const triggerRect = $trigger[0].getBoundingClientRect();
    $tip.css({
      position: 'fixed',
      top: triggerRect.top + triggerRect.height + 6 + 'px',
      left: triggerRect.left + 'px'
    });
  }
  function destroyTooltip() {
    $('.bys-tooltip-instance').remove();
  }

  // Quiz icon tooltips — hover (desktop) and click (mobile/tablet)
  $table.on('mouseenter', '.bys-quiz-icon[data-tip]', function () {
    createAndShowTooltip($(this));
  });
  $table.on('mouseleave', '.bys-quiz-icon', function () {
    destroyTooltip();
  });

  // Status badge tooltips — hover (desktop) and click (mobile/tablet)
  $table.on('mouseenter', '.status-badge__icon[data-tip]', function () {
    createAndShowTooltip($(this));
  });
  $table.on('mouseleave', '.status-badge__icon', function () {
    destroyTooltip();
  });

  // Touch/click support for mobile/tablet (quiz icons and status badges)
  $table.on('click', '[data-tip]', function (e) {
    e.stopPropagation();
    createAndShowTooltip($(this));
  });

  // Hide tooltip when clicking elsewhere
  $(document).on('click', function () {
    destroyTooltip();
  });

  // Store current group ID for use in detail links
  let currentGroupId = null;

  // Listen for group selection event
  $(document).on('bys:groupSelected', async function (_, data) {
    // console.log('bys:groupSelected event received:', data);
    const groupId = data.groupId;
    const baseUsersStats = data.baseUsersStats || {};
    const courses = data.courses || [];
    if (!groupId) return;
    currentGroupId = groupId;
    await populateTableFromAPI(groupId, baseUsersStats, courses);
  });

  // Fetch and populate table from custom endpoint
  async function populateTableFromAPI(groupId, baseUsersStats, courses) {
    try {
      // console.log('Fetching users for group:', groupId);
      const userIds = baseUsersStats.user_ids || [];
      const firstTenUserIds = userIds.slice(0, 10);

      // Build table header immediately (we have courses data)
      rebuildTableHeader(courses);
      if (!firstTenUserIds.length) {
        // console.log('No users in group');
        rebuildTableBody(courses, [], {}, {}, {});
        return;
      }

      // Fetch user details for the first 10 users
      const usersUrl = `/wp-json/bys-groups/v1/groups/${groupId}/users?user_ids=${firstTenUserIds.join(',')}`;
      const usersResponse = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(usersUrl, true); // Force refresh

      if (!usersResponse || !Array.isArray(usersResponse)) {
        console.error('Invalid users response:', usersResponse);
        return;
      }

      // Scaffold table body with user rows (empty course cells)
      rebuildTableBody(courses, usersResponse, {}, {}, {});

      // Fetch quiz steps and course progress in parallel (background)
      // Fetch quiz steps for all courses (cached per course)
      const courseQuizMap = {};
      if (courses.length > 0) {
        try {
          await Promise.all(courses.map(async course => {
            const steps = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.courseQuizSteps(course.id));
            courseQuizMap[course.id] = steps || [];
          }));
        } catch (err) {
          console.error('Failed to fetch quiz steps:', err);
        }
      }

      // Fetch course progress for each user
      const userCourseProgress = {};
      const courseIds = courses.map(c => c.id).join(',');
      if (courseIds) {
        for (const user of usersResponse) {
          const progressUrl = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
          try {
            userCourseProgress[user.id] = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(progressUrl, true);
          } catch (err) {
            console.error(`Failed to fetch course progress for user ${user.id}:`, err);
            userCourseProgress[user.id] = [];
          }
        }
      } else {
        // No courses, set empty progress for all users
        usersResponse.forEach(user => {
          userCourseProgress[user.id] = [];
        });
      }

      // Fetch quiz attempts for each user × course
      const userQuizAttempts = {};
      for (const user of usersResponse) {
        userQuizAttempts[user.id] = {};
        for (const course of courses) {
          try {
            const attempts = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.userQuizAttempts(user.id, course.id), true); // Force refresh
            userQuizAttempts[user.id][course.id] = attempts || [];
          } catch (err) {
            console.error(`Failed to fetch quiz attempts for user ${user.id}, course ${course.id}:`, err);
            userQuizAttempts[user.id][course.id] = [];
          }
        }
      }
      rebuildTableHeader(courses);
      rebuildTableBody(courses, usersResponse, userCourseProgress, courseQuizMap, userQuizAttempts);
    } catch (err) {
      console.error('Failed to fetch group reporting data:', err);
    }
  }
  function rebuildTableHeader(courses) {
    const $thead = $table.find('thead');
    $thead.html('');
    const headerRow = document.createElement('tr');
    headerRow.className = 'reporting-table__head';

    // Add fixed columns
    const statusTh = document.createElement('th');
    statusTh.className = 'col-status';
    headerRow.appendChild(statusTh);
    const nameTh = document.createElement('th');
    nameTh.className = 'col-name';
    nameTh.textContent = 'Name';
    headerRow.appendChild(nameTh);
    const emailTh = document.createElement('th');
    emailTh.className = 'col-email';
    emailTh.textContent = 'Email';
    headerRow.appendChild(emailTh);

    // Add course headers using template
    const courseHeaderTemplate = document.getElementById('course-header-template');
    courses.forEach((course, idx) => {
      const headerContent = courseHeaderTemplate.content.cloneNode(true);
      const $headers = $(headerContent);

      // Update data-course-idx for all header cells
      $headers.find('[data-course-idx]').attr('data-course-idx', idx);

      // Update course title and download link
      // API Note: course.title is an object. Use .rendered for the nice title
      $headers.find('.bys-course-toggle').html(course.title.rendered).attr('data-course-idx', idx);
      $headers.find('.bys-dl-link').attr('title', `Download ${escapeHtml(course.title.rendered)}`);

      // Append cloned headers to the row
      $headers.children().each(function () {
        headerRow.appendChild(this);
      });
    });
    $thead.append(headerRow);
  }
  function buildQuizBars(quizData, attempts) {
    // quizData is an array of { step_id, step_title }
    if (!quizData || quizData.length === 0) {
      return '<span class="bys-quiz-empty">—</span>';
    }
    const bars = quizData.map((quiz, i) => {
      const quizId = quiz.step_id;
      const quizTitle = quiz.step_title;
      const quizAttempts = (attempts || []).filter(a => a.quiz_id === quizId);
      if (!quizAttempts.length) {
        const tip = `${quizTitle}|Not attempted`;
        return `<span class="bys-quiz-icon bys-quiz-icon--neutral" data-tip="${escapeHtml(tip)}"></span>`;
      }
      const latest = quizAttempts[quizAttempts.length - 1];
      const cls = latest.pass ? 'bys-quiz-icon--pass' : 'bys-quiz-icon--fail';

      // Format: "Quiz Title|points_earned/total_points|percentage%"
      const pointsFraction = latest.total_points > 0 ? `${latest.points}/${latest.total_points}` : 'N/A';
      const percentage = `${Math.round(latest.percentage)}%`;
      const tip = `${quizTitle}|${pointsFraction}|${percentage}`;
      return `<span class="bys-quiz-icon ${cls}" data-tip="${escapeHtml(tip)}"></span>`;
    });
    return `<div class="bys-quiz-icons">${bars.join('')}</div>`;
  }
  function rebuildTableBody(courses, users, userCourseProgress, courseQuizMap, userQuizAttempts) {
    const $tbody = $table.find('tbody');
    $tbody.html('');
    const rowTemplate = document.getElementById('skeleton-row-template');
    const cellTemplate = document.getElementById('course-cell-template');
    users.forEach(user => {
      const userProgress = userCourseProgress[user.id] || [];

      // Clone the row template
      const rowContent = rowTemplate.content.cloneNode(true);
      const $row = $(rowContent);

      // Set row user ID
      $row.find('tr').attr('data-user-id', user.id);

      // Update status badge (status is calculated in PHP based on last_login)
      const userStatus = user.status || 'never'; // 'online', 'offline', or 'never'
      const statusClass = `status-badge--${userStatus}`;

      // Build tooltip with last login info
      let statusBadge = `<i class="fa-solid fa-circle"></i>`;
      if (user.last_login) {
        const readableDateTime = formatDate(user.last_login);
        const unixTimestamp = user.last_login_unix || '';
        const tooltipText = `Last login: ${readableDateTime} (${unixTimestamp})`;
        statusBadge = `<span class="status-badge__icon" data-tip="${escapeHtml(tooltipText)}"><i class="fa-solid fa-circle"></i></span>`;
      }
      $row.find('.status-badge').attr('class', `status-badge ${statusClass}`).html(statusBadge);

      // Update name and email
      $row.find('.col-name').html(`
        <a href="${detailUrl}?group_id=${currentGroupId}&user_id=${user.id}" class="reporting-table__name-link" onclick="event.stopPropagation();">
          ${escapeHtml(user.display_name)}
        </a>
      `);
      $row.find('.col-email').html(escapeHtml(user.email));

      // Add course cells
      courses.forEach((course, idx) => {
        const courseData = userProgress.find(cp => cp.course_id === course.id);
        const progressStatus = courseData?.progress_status || 'not_started';

        // Map API progress_status to CSS class names
        let status = 'not-started';
        if (progressStatus === 'completed') {
          status = 'completed';
        } else if (progressStatus === 'in_progress') {
          status = 'in-progress';
        }

        // Clone cell template
        const cellContent = cellTemplate.content.cloneNode(true);
        const $cells = $(cellContent);

        // Set data-course-idx for all cells
        $cells.find('td').attr('data-course-idx', idx);

        // Update badge cell with status class only (no icons or colors in script)
        $cells.find('.course-cell--badge span').attr('class', `completion-badge completion-badge--${status}`);

        // Update progress cell
        const stepsCompleted = courseData?.steps_completed || 0;
        const stepsTotal = courseData?.steps_total || 0;
        const percentage = stepsTotal > 0 ? Math.round(stepsCompleted / stepsTotal * 100) : 0;
        $cells.find('.course-sub-cell--progress').html(`
          <div class="bys-progress-wrap"><div class="bys-progress-bar" style="width:${percentage}%;"></div></div>
          <span class="bys-pct">${percentage}%</span>
        `);

        // Update quizzing cell
        const quizData = courseQuizMap[course.id] || [];
        const attemptsForCourse = (userQuizAttempts[user.id] || {})[course.id] || [];
        $cells.find('.course-sub-cell--quizzing').html(buildQuizBars(quizData, attemptsForCourse));

        // Update date cells
        const enrolledAt = courseData?.enrolled_at || '';
        const dateCompleted = courseData?.date_completed || '';
        const enrolledDateDisplay = enrolledAt ? formatDate(enrolledAt) : 'Not started';
        const completedDateDisplay = dateCompleted ? formatDate(dateCompleted) : 'Not completed';
        $cells.find('.course-sub-cell--enrolment').html(`<span class="bys-date">${enrolledDateDisplay}</span>`);
        $cells.find('.course-sub-cell--completion').html(`<span class="bys-date">${completedDateDisplay}</span>`);

        // Append cells to row
        $row.find('tr').append($cells);
      });
      $tbody.append($row);
    });
  }
  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const dateFormat = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      return dateFormat;
    } catch (e) {
      return dateString;
    }
  }
  function escapeHtml(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
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