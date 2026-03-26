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
  let usersInView = []; // current page of users
  let coursesInView = []; // current courses (from bys:groupSelected)
  let userCourseProgressAll = {}; // promoted to module scope: { [userId]: [...progress] }
  let courseQuizLoadedIdx = new Set();

  // ── Filter state ────────────────────────────────────────────────────────────
  let selectedCourseIds = []; // course multiselect state
  let selectedUserIds = []; // user multiselect state
  let allGroupUserIds = []; // full list of user IDs for current group (from baseUsersStats)
  let allGroupUsers = []; // full fetched user objects for the filter list (lazy-loaded)
  let allGroupUsersLoaded = false; // whether the full user list has been fetched

  let activeFilters = {
    // current applied filter values
    courseIds: [],
    // array of course IDs (empty = all)
    userIds: [],
    // array of user IDs (empty = all)
    status: '',
    enrolmentDate: '',
    completionDate: ''
  };

  // ── Filter panel toggle ──────────────────────────────────────────────────────
  $block.find('.filters__toggle').on('click', function () {
    const $toggle = $(this);
    const $box = $block.find('#filters-box');
    const isOpen = $toggle.attr('aria-expanded') === 'true';
    $toggle.attr('aria-expanded', !isOpen);
    $box.attr('aria-hidden', isOpen);
    $box.toggleClass('hidden', isOpen);
    if (!isOpen) {
      populateCourseMultiselect();
      populateUserMultiselect(); // lazy-fetches full user list if needed
    }
  });

  // ── Course column expand/collapse ────────────────────────────────────────────
  $table.on('click', '.bys-course-toggle', function (e) {
    e.stopPropagation();
    const idx = parseInt($(this).data('courseIdx'), 10);
    const opening = expandedIdx !== idx;
    resetAllCourses();
    if (opening) {
      expandCourse(idx);
      expandedIdx = idx;
      if (!courseQuizLoadedIdx.has(idx)) {
        loadQuizDataForCourse(idx);
      }
    } else {
      expandedIdx = null;
    }
  });
  function resetAllCourses() {
    $table.find('.course-col-header').removeClass('course-col-header--expanded').addClass('course-col-header--collapsed').removeClass('course-col--hidden').find('.bys-course-toggle').attr('aria-expanded', 'false');
    $table.find('.course-cell--badge').removeClass('course-col--hidden');
    $table.find('.course-sub-col, .course-sub-cell').addClass('course-sub-col--hidden');

    // Re-apply course column filter after reset
    applyColumnFilter();
  }
  function expandCourse(idx) {
    const $header = $table.find(`.course-col-header[data-course-idx="${idx}"]`);
    $header.removeClass('course-col-header--collapsed').addClass('course-col-header--expanded').find('.bys-course-toggle').attr('aria-expanded', 'true');
    $table.find(`.course-sub-col[data-course-idx="${idx}"]`).removeClass('course-sub-col--hidden');
    $table.find(`.course-sub-cell[data-course-idx="${idx}"]`).removeClass('course-sub-col--hidden');
    $table.find(`.course-col-header:not([data-course-idx="${idx}"])`).addClass('course-col--hidden');
    $table.find(`.course-cell--badge:not([data-course-idx="${idx}"])`).addClass('course-col--hidden');
  }

  // ── Row click to detail page ─────────────────────────────────────────────────
  $table.on('click', '.reporting-table__row', function (e) {
    if ($(e.target).closest('.bys-course-toggle').length) return;
    if ($(e.target).closest('a').length) return;
    const userId = $(this).data('userId');
    if (userId) window.location.href = detailUrl + '?user_id=' + userId + '&group_id=' + currentGroupId;
  });

  // ── Tooltips ─────────────────────────────────────────────────────────────────
  function createAndShowTooltip($trigger) {
    const tipData = $trigger.data('tip');
    if (!tipData) return;
    $('.bys-tooltip-instance').remove();
    let quizTitle = tipData;
    let pointsFraction = '';
    let percentage = '';
    if (tipData.includes('|')) {
      const parts = tipData.split('|');
      quizTitle = parts[0] || '';
      pointsFraction = parts[1] || '';
      percentage = parts[2] || '';
    }
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
  $table.on('mouseenter', '.bys-quiz-icon[data-quiz-id]:not([data-tip-loaded])', async function () {
    const $icon = $(this);
    const quizId = parseInt($icon.data('quizId'));
    const userId = parseInt($icon.data('userId'));
    if (!userId || !quizId) {
      createAndShowTooltip($icon);
      return;
    }
    try {
      const attempts = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.userQuizAttemptsDetails(userId, quizId));
      if (!Array.isArray(attempts) || attempts.length === 0) {
        $icon.attr('data-tip-loaded', '1');
        createAndShowTooltip($icon);
        return;
      }
      const highest = attempts.reduce((best, a) => parseFloat(a.percentage || 0) >= parseFloat(best.percentage || 0) ? a : best, attempts[0]);
      const pointsFraction = highest.points_scored != null && highest.points_total != null ? `${highest.points_scored}/${highest.points_total}` : 'N/A';
      const tip = `${$icon.data('quizTitle')}|${pointsFraction}|${$icon.data('percent')}%`;
      $icon.attr('data-tip', escapeHtml(tip)).attr('data-tip-loaded', '1');
      createAndShowTooltip($icon);
    } catch (err) {
      console.error(`[group-reporting] Failed to fetch quiz attempts for user ${userId}, quiz ${quizId}:`, err);
      $icon.attr('data-tip-loaded', '1');
      createAndShowTooltip($icon);
    }
  });
  $table.on('mouseenter', '.bys-quiz-icon[data-tip-loaded]', function () {
    createAndShowTooltip($(this));
  });
  $table.on('mouseleave', '.bys-quiz-icon', function () {
    destroyTooltip();
  });
  $table.on('mouseenter', '.status-badge__icon[data-tip]', function () {
    createAndShowTooltip($(this));
  });
  $table.on('mouseleave', '.status-badge__icon', function () {
    destroyTooltip();
  });
  $table.on('click', '[data-tip]', function (e) {
    e.stopPropagation();
    createAndShowTooltip($(this));
  });
  $(document).on('click', function () {
    destroyTooltip();
  });

  // ── Group selection ───────────────────────────────────────────────────────────
  let currentGroupId = null;
  $(document).on('bys:groupSelected', async function (_, data) {
    const groupId = data.groupId;
    const baseUsersStats = data.baseUsersStats || {};
    const courses = data.courses || [];
    if (!groupId) return;
    currentGroupId = groupId;

    // Reset filter state on group change
    selectedCourseIds = [];
    selectedUserIds = [];
    allGroupUserIds = data.baseUsersStats?.user_ids || [];
    allGroupUsers = [];
    allGroupUsersLoaded = false;
    activeFilters = {
      courseIds: [],
      userIds: [],
      status: '',
      enrolmentDate: '',
      completionDate: ''
    };
    resetFilterFormUI();
    await populateTableFromAPI(groupId, baseUsersStats, courses);
  });

  // ── Table population ──────────────────────────────────────────────────────────
  async function populateTableFromAPI(groupId, baseUsersStats, courses) {
    try {
      const userIds = baseUsersStats.user_ids || [];
      const firstTenUserIds = userIds.slice(0, 10);
      rebuildTableHeader(courses);
      if (!firstTenUserIds.length) {
        rebuildTableBody(courses, [], {});
        return;
      }
      const usersUrl = `/wp-json/bys-groups/v1/groups/${groupId}/users?user_ids=${firstTenUserIds.join(',')}`;
      const usersResponse = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(usersUrl, true);
      if (!usersResponse || !Array.isArray(usersResponse)) {
        console.error('Invalid users response:', usersResponse);
        return;
      }
      usersInView = usersResponse;
      coursesInView = courses;
      courseQuizLoadedIdx.clear();
      const courseIds = courses.map(c => c.id).join(',');
      if (courseIds) {
        for (const user of usersResponse) {
          const progressUrl = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
          try {
            userCourseProgressAll[user.id] = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(progressUrl, true);
          } catch (err) {
            console.error(`Failed to fetch course progress for user ${user.id}:`, err);
            userCourseProgressAll[user.id] = [];
          }
        }
      } else {
        usersResponse.forEach(user => {
          userCourseProgressAll[user.id] = [];
        });
      }
      rebuildTableHeader(courses);
      rebuildTableBody(courses, usersResponse, userCourseProgressAll);
    } catch (err) {
      console.error('Failed to fetch group reporting data:', err);
    }
  }

  // ── Filter application ────────────────────────────────────────────────────────

  /**
   * Apply all active filters to the current table state.
   * Course filter → show/hide columns (no re-render).
   * All other filters → show/hide rows.
   */
  function applyFilters() {
    applyColumnFilter();
    applyRowFilters();
  }

  /**
   * Show/hide course columns based on activeFilters.courseIds.
   * Works by toggling course-col--hidden on matching [data-course-idx] elements.
   */
  function applyColumnFilter() {
    const filtered = activeFilters.courseIds.length > 0;
    coursesInView.forEach((course, idx) => {
      const visible = !filtered || activeFilters.courseIds.includes(course.id);

      // Badge column (always present per course)
      $table.find(`.course-col-header[data-course-idx="${idx}"]`).toggleClass('course-col--hidden', !visible);
      $table.find(`.course-cell--badge[data-course-idx="${idx}"]`).toggleClass('course-col--hidden', !visible);

      // Sub-columns only matter if this course is the expanded one — leave their
      // own hidden state alone; just hide the whole group if column is filtered out.
      if (!visible) {
        $table.find(`[data-course-idx="${idx}"]`).addClass('course-col--hidden');
      } else if (expandedIdx !== idx) {
        // Visible but not expanded: ensure sub-cols stay hidden (their normal state)
        $table.find(`.course-sub-col[data-course-idx="${idx}"]`).addClass('course-sub-col--hidden').removeClass('course-col--hidden');
        $table.find(`.course-sub-cell[data-course-idx="${idx}"]`).addClass('course-sub-col--hidden').removeClass('course-col--hidden');
        $table.find(`.course-col-header[data-course-idx="${idx}"]`).removeClass('course-col--hidden');
        $table.find(`.course-cell--badge[data-course-idx="${idx}"]`).removeClass('course-col--hidden');
      }
    });
  }

  /**
   * Show/hide rows based on user search, status, enrolment date, completion date.
   * All filtering is against in-memory data — no re-fetch.
   */
  function applyRowFilters() {
    const {
      userIds,
      status,
      enrolmentDate,
      completionDate
    } = activeFilters;
    $table.find('tbody tr.reporting-table__row').each(function () {
      const userId = parseInt($(this).data('userId'), 10);
      const user = usersInView.find(u => u.id === userId);
      if (!user) return;
      let visible = true;

      // User multiselect filter — exact ID match
      if (userIds.length > 0) {
        visible = userIds.includes(userId);
      }

      // Status filter
      if (visible && status) {
        const userStatus = user.status || 'never';
        // Map filter option values to the status values on the user object
        // status options: 'active' (online), 'inactive' (offline/never), 'completed', 'in_progress'
        if (status === 'active') {
          visible = userStatus === 'online';
        } else if (status === 'inactive') {
          visible = userStatus === 'offline' || userStatus === 'never';
        } else if (status === 'completed' || status === 'in_progress') {
          // Course-level statuses: user is visible if ANY of the filtered courses match
          const userProgress = userCourseProgressAll[userId] || [];
          const coursesToCheck = activeFilters.courseIds.length > 0 ? userProgress.filter(p => activeFilters.courseIds.includes(p.course_id)) : userProgress;
          const progressStatus = status === 'completed' ? 'completed' : 'in_progress';
          visible = coursesToCheck.some(p => p.progress_status === progressStatus);
        }
      }

      // Enrolment date filter — user visible if ANY course has enrolled_at on/after the date
      if (visible && enrolmentDate) {
        const filterDate = new Date(enrolmentDate);
        const userProgress = userCourseProgressAll[userId] || [];
        const coursesToCheck = activeFilters.courseIds.length > 0 ? userProgress.filter(p => activeFilters.courseIds.includes(p.course_id)) : userProgress;
        visible = coursesToCheck.some(p => p.enrolled_at && new Date(p.enrolled_at) >= filterDate);
      }

      // Completion date filter — user visible if ANY course completed on/after the date
      if (visible && completionDate) {
        const filterDate = new Date(completionDate);
        const userProgress = userCourseProgressAll[userId] || [];
        const coursesToCheck = activeFilters.courseIds.length > 0 ? userProgress.filter(p => activeFilters.courseIds.includes(p.course_id)) : userProgress;
        visible = coursesToCheck.some(p => p.date_completed && new Date(p.date_completed) >= filterDate);
      }
      $(this).toggleClass('reporting-table__row--filtered', !visible);
      $(this).css('display', visible ? '' : 'none');
    });
  }

  // ── Filter form submit ────────────────────────────────────────────────────────
  $block.find('.filters__form').on('submit', function (e) {
    e.preventDefault();
    activeFilters.courseIds = selectedCourseIds.slice();
    activeFilters.userIds = selectedUserIds.slice();
    activeFilters.status = $block.find('#filter-status').val();
    activeFilters.enrolmentDate = $block.find('#filter-enrolment-date').val();
    activeFilters.completionDate = $block.find('#filter-completion-date').val();
    closeMultiselect($block.find('#bys-multiselect-course'));
    closeMultiselect($block.find('#bys-multiselect-users'));
    applyFilters();
  });

  // ── Filter reset ──────────────────────────────────────────────────────────────
  $block.find('.filters__reset').on('click', function () {
    selectedCourseIds = [];
    selectedUserIds = [];
    activeFilters = {
      courseIds: [],
      userIds: [],
      status: '',
      enrolmentDate: '',
      completionDate: ''
    };
    resetFilterFormUI();
    closeMultiselect($block.find('#bys-multiselect-course'));
    closeMultiselect($block.find('#bys-multiselect-users'));
    populateCourseMultiselect();
    populateUserMultiselect();

    // Restore all rows and columns
    $table.find('tbody tr').css('display', '').removeClass('reporting-table__row--filtered');
    $table.find('[data-course-idx]').removeClass('course-col--hidden');
    $table.find('.course-sub-col, .course-sub-cell').addClass('course-sub-col--hidden');
    expandedIdx = null;
  });
  function resetFilterFormUI() {
    $block.find('#filter-status').val('');
    $block.find('#filter-enrolment-date').val('');
    $block.find('#filter-completion-date').val('');
  }

  // ── Table builders ────────────────────────────────────────────────────────────
  function rebuildTableHeader(courses) {
    const $thead = $table.find('thead');
    $thead.html('');
    const headerRow = document.createElement('tr');
    headerRow.className = 'reporting-table__head';
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
    const courseHeaderTemplate = document.getElementById('course-header-template');
    courses.forEach((course, idx) => {
      const headerContent = courseHeaderTemplate.content.cloneNode(true);
      const $headers = $(headerContent);
      $headers.find('[data-course-idx]').attr('data-course-idx', idx);
      const courseTitle = course.title?.rendered || course.title || '';
      const requiredBadge = course.required ? ' <span class="bys-required-badge" aria-label="Required" title="Required">*</span>' : '';
      $headers.find('.bys-course-toggle').html(escapeHtml(courseTitle) + requiredBadge).attr('data-course-idx', idx);
      $headers.find('.bys-dl-link').attr('title', `Download ${escapeHtml(courseTitle)}`);
      $headers.children().each(function () {
        headerRow.appendChild(this);
      });
    });
    $thead.append(headerRow);
  }
  function buildQuizBars(quizData, userId, userQuizProgress) {
    if (!quizData || quizData.length === 0) {
      return '<span class="bys-quiz-empty">—</span>';
    }
    const barsMaxHeight = 24;
    const bars = quizData.map(quiz => {
      const quizId = quiz.step_id;
      const quizTitle = quiz.step_title;
      const summary = userQuizProgress[quizId];
      if (!summary || summary.total_attempts === 0) {
        const tip = `${quizTitle}|Not attempted`;
        return `<span class="bys-quiz-icon bys-quiz-icon--neutral" data-tip="${escapeHtml(tip)}" data-quiz-id="${quizId}" data-quiz-title="${escapeHtml(quizTitle)}"></span>`;
      }
      const cls = summary.pass_highest ? 'bys-quiz-icon--pass' : 'bys-quiz-icon--fail';
      const barHeight = barsMaxHeight * (summary.percent_highest * 0.01);
      const tip = `${quizTitle}|Loading...|${Math.round(summary.percent_highest)}%`;
      return `<span class="bys-quiz-icon ${cls}" data-tip="${escapeHtml(tip)}" data-quiz-id="${quizId}" data-user-id="${userId}" data-quiz-title="${escapeHtml(quizTitle)}" data-percent="${Math.round(summary.percent_highest)}" style="height: ${barHeight}px"></span>`;
    });
    return `<div class="bys-quiz-icons">${bars.join('')}</div>`;
  }
  function rebuildTableBody(courses, users, userCourseProgress) {
    const $tbody = $table.find('tbody');
    $tbody.html('');
    const rowTemplate = document.getElementById('skeleton-row-template');
    const cellTemplate = document.getElementById('course-cell-template');
    users.forEach(user => {
      const userProgress = userCourseProgress[user.id] || [];
      const rowContent = rowTemplate.content.cloneNode(true);
      const $row = $(rowContent);
      $row.find('tr').attr('data-user-id', user.id);
      const userStatus = user.status || 'never';
      const statusClass = `status-badge--${userStatus}`;
      let statusBadge = `<i class="fa-solid fa-circle"></i>`;
      if (user.last_login) {
        const readableDateTime = formatDate(user.last_login);
        const unixTimestamp = user.last_login_unix || '';
        const tooltipText = `Last login: ${readableDateTime} (${unixTimestamp})`;
        statusBadge = `<span class="status-badge__icon" data-tip="${escapeHtml(tooltipText)}"><i class="fa-solid fa-circle"></i></span>`;
      }
      $row.find('.status-badge').attr('class', `status-badge ${statusClass}`).html(statusBadge);
      $row.find('.col-name').html(`
        <a href="${detailUrl}?group_id=${currentGroupId}&user_id=${user.id}" class="reporting-table__name-link" onclick="event.stopPropagation();">
          ${escapeHtml(user.display_name)}
        </a>
      `);
      $row.find('.col-email').html(escapeHtml(user.email));
      courses.forEach((course, idx) => {
        const courseData = userProgress.find(cp => cp.course_id === course.id);
        const progressStatus = courseData?.progress_status || 'not_started';
        let status = 'not-started';
        if (progressStatus === 'completed') status = 'completed';else if (progressStatus === 'in_progress') status = 'in-progress';
        const cellContent = cellTemplate.content.cloneNode(true);
        const $cells = $(cellContent);
        $cells.find('td').attr('data-course-idx', idx);
        $cells.find('.course-cell--badge span').attr('class', `completion-badge completion-badge--${status}`);
        const stepsCompleted = courseData?.steps_completed || 0;
        const stepsTotal = courseData?.steps_total || 0;
        const percentage = stepsTotal > 0 ? Math.round(stepsCompleted / stepsTotal * 100) : 0;
        let percentageClass = percentage === 100 ? 'complete' : percentage === 0 ? 'not-started' : 'in-progress';
        $cells.find('.course-sub-cell--progress').html(`
          <div class="bys-progress-wrap"><div class="bys-progress-bar" style="width:${percentage}%;"></div></div>
          <span class="bys-percent bys-percent--${percentageClass}">${percentage}%</span>
        `);
        $cells.find('.course-sub-cell--quizzing').html('<span class="bys-quiz-loading">—</span>');
        const enrolledAt = courseData?.enrolled_at || '';
        const dateCompleted = courseData?.date_completed || '';
        $cells.find('.course-sub-cell--enrolment').html(`<span class="bys-date">${enrolledAt ? formatDate(enrolledAt) : 'Not started'}</span>`);
        $cells.find('.course-sub-cell--completion').html(`<span class="bys-date">${dateCompleted ? formatDate(dateCompleted) : 'Not completed'}</span>`);
        $row.find('tr').append($cells);
      });
      $tbody.append($row);
    });
  }

  // ── Quiz data lazy loader ─────────────────────────────────────────────────────
  async function loadQuizDataForCourse(courseIdx) {
    const course = coursesInView[courseIdx];
    if (!course) return;
    courseQuizLoadedIdx.add(courseIdx);
    let quizSteps = [];
    try {
      quizSteps = (await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.courseQuizSteps(course.id))) || [];
    } catch (err) {
      console.error(`[group-reporting] Failed to fetch quiz steps for course ${course.id}:`, err);
    }
    const userQuizProgressMap = {};
    for (const user of usersInView) {
      try {
        const url = _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.userQuizProgress(user.id) + `?group_id=${currentGroupId}&course_ids=${course.id}`;
        const quizzes = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(url);
        userQuizProgressMap[user.id] = {};
        if (Array.isArray(quizzes)) {
          quizzes.forEach(q => {
            userQuizProgressMap[user.id][q.id] = q;
          });
        }
      } catch (err) {
        console.error(`[group-reporting] Failed to fetch quiz progress for user ${user.id}:`, err);
        userQuizProgressMap[user.id] = {};
      }
    }
    $table.find(`.course-sub-cell--quizzing[data-course-idx="${courseIdx}"]`).each(function () {
      const userId = $(this).closest('tr').data('userId');
      const userQuizProgress = userQuizProgressMap[userId] || {};
      $(this).html(buildQuizBars(quizSteps, userId, userQuizProgress));
    });
  }

  // ── Course Multiselect ────────────────────────────────────────────────────────

  function populateCourseMultiselect() {
    const $ms = $block.find('#bys-multiselect-course');
    const $list = $ms.find('.bys-multiselect__list');
    $list.html('');
    if (!coursesInView.length) {
      $ms.find('.bys-multiselect__empty').removeClass('hidden');
      return;
    }
    $ms.find('.bys-multiselect__empty').addClass('hidden');
    coursesInView.forEach(course => {
      const id = course.id;
      const title = course.title?.rendered || course.title || '';
      const isChecked = selectedCourseIds.includes(id);
      const requiredMark = course.required ? ' <span class="bys-required-badge" aria-hidden="true">*</span>' : '';
      $list.append(`
        <li class="bys-multiselect__option" role="option" aria-selected="${isChecked}" data-course-id="${id}">
          <label>
            <input type="checkbox" value="${id}" ${isChecked ? 'checked' : ''} />
            <span>${escapeHtml(title)}${requiredMark}</span>
          </label>
        </li>
      `);
    });
    syncPills($ms);
  }
  function syncPills($ms) {
    const $pills = $ms.find('.bys-multiselect__pills');
    $pills.html('');
    if (!selectedCourseIds.length) {
      $pills.html('<span class="bys-multiselect__placeholder">All courses</span>');
      return;
    }
    selectedCourseIds.forEach(id => {
      const course = coursesInView.find(c => c.id === id);
      if (!course) return;
      const title = course.title?.rendered || course.title || '';
      $pills.append(`
        <span class="bys-multiselect__pill" data-course-id="${id}">
          ${escapeHtml(title)}
          <button class="bys-multiselect__pill-remove btn-unstyled" type="button" aria-label="Remove ${escapeHtml(title)}" data-course-id="${id}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </span>
      `);
    });
  }

  // Open/close toggle
  $block.on('click', '#bys-multiselect-course .bys-multiselect__toggle', function (e) {
    e.stopPropagation();
    toggleMultiselect($block.find('#bys-multiselect-course'));
  });
  $block.on('click', '#bys-multiselect-course .bys-multiselect__control', function (e) {
    if ($(e.target).closest('.bys-multiselect__pill-remove').length) return;
    toggleMultiselect($block.find('#bys-multiselect-course'));
  });
  function toggleMultiselect($ms) {
    const isOpen = $ms.attr('aria-expanded') === 'true';
    $ms.attr('aria-expanded', isOpen ? 'false' : 'true');
    $ms.find('.bys-multiselect__dropdown').toggleClass('hidden', isOpen);
    if (!isOpen) $ms.find('.bys-multiselect__search').val('').trigger('input').focus();
  }
  function closeMultiselect($ms) {
    $ms.attr('aria-expanded', 'false');
    $ms.find('.bys-multiselect__dropdown').addClass('hidden');
  }
  $(document).on('click', function (e) {
    if (!$(e.target).closest('#bys-multiselect-course').length) {
      closeMultiselect($block.find('#bys-multiselect-course'));
    }
    if (!$(e.target).closest('#bys-multiselect-users').length) {
      closeMultiselect($block.find('#bys-multiselect-users'));
    }
  });

  // Checkbox toggle — courses
  $block.on('change', '#bys-multiselect-course-dropdown input[type="checkbox"]', function () {
    const id = parseInt($(this).val(), 10);
    if ($(this).is(':checked')) {
      if (!selectedCourseIds.includes(id)) selectedCourseIds.push(id);
      $(this).closest('li').attr('aria-selected', 'true');
    } else {
      selectedCourseIds = selectedCourseIds.filter(x => x !== id);
      $(this).closest('li').attr('aria-selected', 'false');
    }
    syncPills($block.find('#bys-multiselect-course'));
  });

  // Pill remove
  $block.on('click', '.bys-multiselect__pill-remove', function (e) {
    e.stopPropagation();
    const id = parseInt($(this).data('courseId'), 10);
    selectedCourseIds = selectedCourseIds.filter(x => x !== id);
    $block.find(`#bys-multiselect-course-dropdown input[value="${id}"]`).prop('checked', false).closest('li').attr('aria-selected', 'false');
    syncPills($block.find('#bys-multiselect-course'));
  });

  // Search within course dropdown
  $block.on('input', '#bys-multiselect-course .bys-multiselect__search', function () {
    const q = $(this).val().toLowerCase().trim();
    const $options = $block.find('#bys-multiselect-course-dropdown .bys-multiselect__option');
    let visibleCount = 0;
    $options.each(function () {
      const label = $(this).find('span').first().text().toLowerCase();
      const match = !q || label.includes(q);
      $(this).toggleClass('hidden', !match);
      if (match) visibleCount++;
    });
    $block.find('#bys-multiselect-course .bys-multiselect__empty').toggleClass('hidden', visibleCount > 0);
  });

  // ── User Multiselect ──────────────────────────────────────────────────────────

  /**
   * Lazy-fetch all group users on first open, then populate the list.
   * Uses the same /groups/{id}/users endpoint but passes all user IDs at once.
   * Result is cached in allGroupUsers for the life of the group selection.
   */
  async function populateUserMultiselect() {
    const $ms = $block.find('#bys-multiselect-users');
    const $list = $ms.find('.bys-multiselect__list');
    const $loading = $ms.find('.bys-multiselect__loading');
    const $empty = $ms.find('.bys-multiselect__empty');
    if (!allGroupUserIds.length) {
      $list.html('');
      $empty.removeClass('hidden');
      return;
    }

    // If already loaded, just re-render (selection state may have changed)
    if (allGroupUsersLoaded) {
      renderUserOptions($ms, $list, $empty);
      return;
    }

    // Show loading state while fetching
    $list.html('');
    $empty.addClass('hidden');
    $loading.removeClass('hidden');
    try {
      const url = `/wp-json/bys-groups/v1/groups/${currentGroupId}/users?user_ids=${allGroupUserIds.join(',')}`;
      const response = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(url, true);
      allGroupUsers = Array.isArray(response) ? response : [];
      // Sort alphabetically by display_name
      allGroupUsers.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
      allGroupUsersLoaded = true;
    } catch (err) {
      console.error('[group-reporting] Failed to fetch all group users for filter:', err);
      allGroupUsers = [];
      allGroupUsersLoaded = true;
    }
    $loading.addClass('hidden');
    renderUserOptions($ms, $list, $empty);
  }
  function renderUserOptions($ms, $list, $empty) {
    $list.html('');
    if (!allGroupUsers.length) {
      $empty.removeClass('hidden');
      syncUserPills($ms);
      return;
    }
    $empty.addClass('hidden');
    allGroupUsers.forEach(user => {
      const id = user.id;
      const email = user.email || '';
      const isChecked = selectedUserIds.includes(id);
      $list.append(`
        <li class="bys-multiselect__option" role="option" aria-selected="${isChecked}" data-user-id="${id}">
          <label>
            <input type="checkbox" value="${id}" ${isChecked ? 'checked' : ''} />
            <span class="bys-multiselect__user-email">${escapeHtml(email)}</span>
          </label>
        </li>
      `);
    });
    syncUserPills($ms);
  }
  function syncUserPills($ms) {
    const $pills = $ms.find('.bys-multiselect__pills');
    $pills.html('');
    if (!selectedUserIds.length) {
      $pills.html('<span class="bys-multiselect__placeholder">All users</span>');
      return;
    }
    selectedUserIds.forEach(id => {
      const user = allGroupUsers.find(u => u.id === id);
      if (!user) return;
      const email = user.email || '';
      $pills.append(`
        <span class="bys-multiselect__pill" data-user-id="${id}">
          ${escapeHtml(email)}
          <button class="bys-multiselect__pill-remove btn-unstyled" type="button" aria-label="Remove ${escapeHtml(email)}" data-user-id="${id}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </span>
      `);
    });
  }

  // Open/close — users
  $block.on('click', '#bys-multiselect-users .bys-multiselect__toggle', function (e) {
    e.stopPropagation();
    toggleMultiselect($block.find('#bys-multiselect-users'));
  });
  $block.on('click', '#bys-multiselect-users .bys-multiselect__control', function (e) {
    if ($(e.target).closest('.bys-multiselect__pill-remove').length) return;
    toggleMultiselect($block.find('#bys-multiselect-users'));
  });

  // Checkbox toggle — users
  $block.on('change', '#bys-multiselect-users-dropdown input[type="checkbox"]', function () {
    const id = parseInt($(this).val(), 10);
    if ($(this).is(':checked')) {
      if (!selectedUserIds.includes(id)) selectedUserIds.push(id);
      $(this).closest('li').attr('aria-selected', 'true');
    } else {
      selectedUserIds = selectedUserIds.filter(x => x !== id);
      $(this).closest('li').attr('aria-selected', 'false');
    }
    syncUserPills($block.find('#bys-multiselect-users'));
  });

  // Pill remove — users
  $block.on('click', '#bys-multiselect-users .bys-multiselect__pill-remove', function (e) {
    e.stopPropagation();
    const id = parseInt($(this).data('userId'), 10);
    selectedUserIds = selectedUserIds.filter(x => x !== id);
    $block.find(`#bys-multiselect-users-dropdown input[value="${id}"]`).prop('checked', false).closest('li').attr('aria-selected', 'false');
    syncUserPills($block.find('#bys-multiselect-users'));
  });

  // Search within users dropdown
  $block.on('input', '#bys-multiselect-users .bys-multiselect__search', function () {
    const q = $(this).val().toLowerCase().trim();
    const $options = $block.find('#bys-multiselect-users-dropdown .bys-multiselect__option');
    let visibleCount = 0;
    $options.each(function () {
      const email = $(this).find('.bys-multiselect__user-email').text().toLowerCase();
      const match = !q || email.includes(q);
      $(this).toggleClass('hidden', !match);
      if (match) visibleCount++;
    });
    $block.find('#bys-multiselect-users .bys-multiselect__empty').toggleClass('hidden', visibleCount > 0);
  });

  // ── Utilities ─────────────────────────────────────────────────────────────────
  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      return dateString;
    }
  }
  function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
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