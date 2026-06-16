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
/*!***********************************!*\
  !*** ./src/user-progress/view.js ***!
  \***********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/* harmony import */ var _shared_loading_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/loading.js */ "./src/_shared/loading.js");
/* harmony import */ var _shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../_shared/helpers.js */ "./src/_shared/helpers.js");
/* harmony import */ var _shared_tooltip_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../_shared/tooltip.js */ "./src/_shared/tooltip.js");





// Status label mapping (reusable)
const STATUS_LABELS = {
  'completed': 'Completed',
  'in_progress': 'In Progress',
  'not_started': 'Not Started'
};

// Helper to build tooltip content from progress data
function buildTooltipContent(progressData) {
  if (!progressData) return '';
  const parts = [];
  if (progressData.date_started_gmt) parts.push(`Started: ${(0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDateTime)(progressData.date_started_gmt)}`);
  if (progressData.date_completed_gmt) parts.push(`Completed: ${(0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDateTime)(progressData.date_completed_gmt)}`);
  return parts.join(' | ');
}
jQuery(document).ready(async $ => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get('group_id');
  const userId = params.get('user_id');
  if (!userId) {
    console.error('[user-progress] Missing user_id URL parameter');
    return;
  }
  const $block = $('.wp-block-bys-groups-user-progress').first();
  const $coursesList = $block.find('#user-progress-courses-list');
  const courseTemplate = $block.find('#user-progress-course-template')[0];
  const sfwdLessonTemplate = $block.find('#user-progress-lesson-template')[0];
  const sfwdTopicTemplate = $block.find('#user-progress-topic-template')[0];

  // Track completed topics across all opened courses for user-stats coordination
  let topicsCompletedCount = 0;

  // Show skeleton accordions while courses load
  const skeletonTemplate = document.getElementById('user-progress-skeleton-template');
  const SKELETON_COUNT = 5;
  for (let i = 0; i < SKELETON_COUNT; i++) {
    $coursesList.append(skeletonTemplate.content.cloneNode(true));
  }
  try {
    // Single bundled call: courses list + per-course progress in one round trip
    const courses = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.userCoursesWithProgress(userId));
    $coursesList.find('.hs-accordion--skeleton').remove();
    if (!Array.isArray(courses) || courses.length === 0) {
      console.log('[user-progress] No enrolled courses found for user:', userId);
      return;
    }

    // Cache data globally
    window.bysGroupsCache = window.bysGroupsCache || {};
    window.bysGroupsCache.groupId = groupId;
    window.bysGroupsCache.courses = courses;

    // Render course shells with deferred structure loading
    courses.forEach((course, courseIndex) => {
      const courseNode = courseTemplate.content.cloneNode(true);
      const $course = $(courseNode);
      const courseNum = courseIndex + 1;

      // Set course name
      const courseTitle = typeof course.title === 'string' ? course.title : course.title?.rendered || 'Untitled';

      // Build DOM references once
      const $accordion = $course.find('.hs-accordion');
      const $toggle = $course.find('.hs-accordion-toggle');
      const $accordionContent = $course.find('.accordion-content__inner');
      const courseId = `hs-course-heading-${courseNum}`;
      const contentId = `hs-course-collapse-${courseNum}`;

      // Set course name and accordion structure
      $course.find('.accordion-toggle__course-name').html(courseTitle);
      $accordion.attr('id', courseId).attr('data-course-id', course.id);
      $toggle.attr('aria-controls', contentId);
      $course.find('.hs-accordion-content').attr('id', contentId).attr('aria-labelledby', courseId);

      // Set loading placeholder
      $accordionContent.html('<p>Click to load course structure...</p>');

      // Render course-level completion data from the bundled response (no extra fetch)
      const progress = course.progress;
      if (progress) {
        const $stepsCompleted = $toggle.find('.course-steps-completed');
        const $stepsTotal = $toggle.find('.course-steps-total');
        const $completionBadge = $toggle.find('.accordion-toggle__completion .completion-badge');
        const $dateElement = $toggle.find('.accordion-toggle__date');
        $stepsCompleted.html(progress.steps_completed || 0);
        $stepsTotal.html(progress.steps_total || 0);
        $completionBadge.addClass(`completion-badge--${progress.progress_status}`);
        $completionBadge.text(STATUS_LABELS[progress.progress_status] || progress.progress_status);

        // Date: completed timestamp or last-activity fallback
        if (progress.progress_status === 'completed' && progress.date_completed_gmt) {
          $dateElement.html((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDateTime)(progress.date_completed_gmt));
        } else if (progress.progress_status !== 'not_started') {
          _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.userCourseActivity(userId, course.id)).then(activityData => {
            if (activityData?.last_activity_gmt) {
              $dateElement.html((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDateTime)(activityData.last_activity_gmt));
            }
          }).catch(err => console.warn(`[user-progress] Failed to fetch course activity for course ${course.id}:`, err));
        }
      }

      // Fetch and render course structure on-demand
      let structureLoaded = false;
      $toggle.on('click', async function () {
        if (structureLoaded) return;
        structureLoaded = true;
        $accordionContent.html(_shared_loading_js__WEBPACK_IMPORTED_MODULE_1__.LOADING);
        try {
          const courseData = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.courseHierarchialBreakdown(course.id));
          const modules = courseData.lessons || courseData;
          const quizIds = courseData.quiz_ids || [];

          // Cache quiz IDs
          if (quizIds.length) {
            window.bysGroupsCache.courseQuizzes ??= {};
            window.bysGroupsCache.courseQuizzes[course.id] = quizIds;
          }

          // Fetch steps progress in single request
          const stepsResponse = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.userCourseStepsProgress(userId, course.id));
          const courseProgressSteps = Array.isArray(stepsResponse) ? stepsResponse : stepsResponse?.data || [];

          // Map steps by ID for quick lookup
          const stepsMap = Object.fromEntries(courseProgressSteps.map(step => [step.step, step]));
          $accordionContent.empty();
          if (!Array.isArray(modules) || !modules.length) {
            $accordionContent.html('<p>No modules found.</p>');
            return;
          }

          // Render lessons with nested topics
          for (const lesson of modules) {
            const lessonNode = sfwdLessonTemplate.content.cloneNode(true);
            const $lesson = $(lessonNode);
            const lessonData = stepsMap[lesson.id];
            const lessonStatus = lessonData?.step_status || 'not_started';
            $lesson.find('.lesson__name').html(lesson.title);
            $lesson.attr('data-lesson-id', lesson.id);
            const $lessonBadge = $lesson.find('.lesson__completion .completion-badge');
            $lessonBadge.addClass(`completion-badge--${lessonStatus}`).attr('data-status', lessonStatus);
            const lessonTooltip = buildTooltipContent(lessonData);
            if (lessonTooltip) $lessonBadge.attr('data-tooltip', lessonTooltip);
            const $tbody = $lesson.find('tbody');

            // Render topics
            if (Array.isArray(lesson.topics)) {
              for (const topic of lesson.topics) {
                const topicNode = sfwdTopicTemplate.content.cloneNode(true);
                const $topic = $(topicNode);
                const topicData = stepsMap[topic.id];
                const topicStatus = topicData?.step_status || 'not_started';
                $topic.find('.topic-name').html(topic.title);
                $topic.attr('data-topic-id', topic.id);
                const $topicBadge = $topic.find('.completion-badge');
                $topicBadge.addClass(`completion-badge--${topicStatus}`).attr('data-status', topicStatus);
                const topicTooltip = buildTooltipContent(topicData);
                if (topicTooltip) $topicBadge.attr('data-tooltip', topicTooltip);

                // Count completed topics (post_type === 'sfwd-topic' with step_status === 'completed')
                if (topicData?.post_type === 'sfwd-topic' && topicStatus === 'completed') {
                  topicsCompletedCount++;
                }

                // Populate activity columns from augmented step data
                $topic.find('.topic-visits').text(topicData?.visits != null ? topicData.visits : '—');
                $topic.find('.topic-timespent').text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDuration)(topicData?.time_spent_seconds));
                $topic.find('.topic-last-accessed').text(topicData?.last_accessed_gmt ? (0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_2__.formatDateTime)(topicData.last_accessed_gmt) : '—');
                $tbody.append($topic);
              }
            }
            $accordionContent.append($lesson);
          }

          // Write topics completed count to cache and notify user-stats block
          window.bysGroupsCache ??= {};
          window.bysGroupsCache.topicsCompleted = topicsCompletedCount;
          jQuery(window).trigger('bys:statsUpdated', [{
            key: 'total_topics_completed',
            value: topicsCompletedCount
          }]);

          // Attach tooltip handlers
          $accordionContent.on('mouseenter', '[data-tooltip]', function () {
            (0,_shared_tooltip_js__WEBPACK_IMPORTED_MODULE_3__.createTooltip)($(this), $(this).attr('data-tooltip'));
          }).on('mouseleave', '[data-tooltip]', _shared_tooltip_js__WEBPACK_IMPORTED_MODULE_3__.destroyTooltip);
        } catch (err) {
          console.error(`[user-progress] Failed to fetch course structure for course ${course.id}:`, err);
          $accordionContent.html('<p>Failed to load course structure.</p>');
        }
      });
      $coursesList.append($course);
    });
  } catch (err) {
    console.error('[user-progress] Failed to fetch courses:', err);
  }
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map