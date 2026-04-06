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
/*!************************************!*\
  !*** ./src/group-quizzing/view.js ***!
  \************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/* harmony import */ var _shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/helpers.js */ "./src/_shared/helpers.js");


jQuery(document).ready($ => {
  const $block = $('.wp-block-bys-groups-group-quizzing').first();
  if (!$block.length) return;
  const $skeleton = $block.find('#group-quizzing-skeleton');
  const $coursesList = $block.find('#group-quizzing-courses-list');
  const courseTemplate = $block.find('#group-quizzing-course-template')[0];
  const quizTemplate = $block.find('#group-quizzing-quiz-template')[0];
  async function renderCourses(groupId, courses) {
    $coursesList.empty();
    if (!Array.isArray(courses) || courses.length === 0) {
      console.log('[group-quizzing] No courses in payload');
      return;
    }

    // Fetch quiz steps for all courses upfront (needed for count, filtering, and stats query)
    const quizStepsByCourse = {};
    await Promise.all(courses.map(async course => {
      try {
        const steps = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.courseQuizSteps(course.id));
        quizStepsByCourse[course.id] = Array.isArray(steps) ? steps : [];
      } catch (err) {
        console.error(`[group-quizzing] Failed to fetch quiz steps for course ${course.id}:`, err);
        quizStepsByCourse[course.id] = [];
      }
    }));

    // Gather all quiz IDs across all courses and fetch submission stats in one request
    const allQuizIds = Object.values(quizStepsByCourse).flat().map(s => s.step_id);
    let submissionStats = {}; // keyed by quiz_id

    if (allQuizIds.length > 0) {
      try {
        const statsArray = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupQuizSubmissionStats(groupId, allQuizIds));
        if (Array.isArray(statsArray)) {
          statsArray.forEach(s => {
            submissionStats[s.quiz_id] = s;
          });
        }
      } catch (err) {
        console.error('[group-quizzing] Failed to fetch quiz submission stats:', err);
      }
    }
    $skeleton.addClass('hidden');
    let courseNum = 0;
    courses.forEach(course => {
      const quizSteps = quizStepsByCourse[course.id];

      // Skip courses with no quizzes
      if (!quizSteps.length) return;
      courseNum++;
      const courseNode = courseTemplate.content.cloneNode(true);
      const $course = $(courseNode);
      const courseId = `hs-quiz-course-heading-${courseNum}`;
      const contentId = `hs-quiz-course-collapse-${courseNum}`;
      const $accordion = $course.find('.hs-accordion');
      const $toggle = $course.find('.hs-accordion-toggle');
      const $accordionContent = $course.find('.accordion-content__inner');
      $accordion.attr('id', courseId).attr('data-course-id', course.id);
      $toggle.attr('aria-controls', contentId);
      $course.find('.hs-accordion-content').attr('id', contentId).attr('aria-labelledby', courseId);
      const courseTitle = typeof course.title === 'string' ? course.title : course.title?.rendered || 'Untitled';
      const courseDisplay = course.shortname || courseTitle;
      $course.find('.accordion-toggle__course-name').text(courseTitle);
      $course.find('.quiz-count-value').text(quizSteps.length);

      // Latest submission across all quizzes in this course
      const courseLastTs = quizSteps.reduce((latest, quiz) => {
        const ts = submissionStats[quiz.step_id]?.last_submission_gmt;
        if (!ts) return latest;
        return !latest || ts > latest ? ts : latest;
      }, null);
      $course.find('.accordion-toggle__date .date-value').text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__.formatDate)(courseLastTs));

      // Accordion header: total ungraded across all quizzes in this course
      const courseUngradedCount = quizSteps.reduce((sum, quiz) => sum + (submissionStats[quiz.step_id]?.ungraded_count ?? 0), 0);
      const $courseBadge = $course.find('.accordion-toggle__ungraded-badge');
      if (courseUngradedCount > 0) {
        $courseBadge.text(`${courseUngradedCount} ungraded`).addClass('ungraded-badge--has-ungraded');
      }

      // Lazy-render quiz rows on first open
      let quizzesRendered = false;
      $toggle.on('click', function () {
        if (quizzesRendered) return;
        quizzesRendered = true;
        $accordionContent.empty();
        quizSteps.forEach(quiz => {
          const quizNode = quizTemplate.content.cloneNode(true);
          const $quiz = $(quizNode);
          const stats = submissionStats[quiz.step_id];
          $quiz.find('.quiz-row__name').text(quiz.step_title);
          $quiz.find('.quiz-row__last-submission .date-value').text((0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_1__.formatDate)(stats?.last_submission_gmt));
          const totalSubs = stats?.total_submissions ?? 0;
          const ungradedCount = stats?.ungraded_count ?? 0;

          // Submission count
          $quiz.find('.quiz-row__submissions').text(totalSubs === 1 ? '1 submission' : `${totalSubs} submissions`);

          // Status icon: green check (all graded) or yellow exclamation (has ungraded)
          const $icon = $quiz.find('.quiz-row__status-icon');
          if (totalSubs > 0) {
            if (ungradedCount > 0) {
              $icon.addClass('status-icon--ungraded').append('<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>');
            } else {
              $icon.addClass('status-icon--graded').append('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>');
            }
          }

          // Ungraded badge
          if (ungradedCount > 0) {
            $quiz.find('.quiz-row__ungraded').text(`${ungradedCount} ungraded`).addClass('quiz-row__ungraded--active');
          }

          // Open attempts modal on click — no user pre-filter
          $quiz.find('.quiz-row').on('click', function () {
            $(window).trigger('bysQuizAttemptsOpen', [{
              groupId: groupId,
              quizId: quiz.step_id,
              quizTitle: quiz.step_title,
              parentCourse: courseDisplay
            }]);
          });
          $accordionContent.append($quiz);
        });
      });
      $coursesList.append($course);
    });
  }
  $(document).on('bys:groupSelected', function (_, data) {
    renderCourses(data.groupId, data.courses);
  });
  if (window.bysGroupData?.courses) {
    renderCourses(window.bysGroupData.groupId, window.bysGroupData.courses);
  }
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map