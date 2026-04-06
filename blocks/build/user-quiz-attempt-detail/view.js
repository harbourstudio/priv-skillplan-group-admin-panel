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
  !*** ./src/user-quiz-attempt-detail/view.js ***!
  \**********************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");

jQuery(document).ready($ => {
  const params = new URLSearchParams(window.location.search);
  const activityId = params.get('attempt_id');
  const $block = $('.wp-block-bys-groups-user-quiz-attempt-detail').first();
  const $loading = $block.find('.attempt-detail__loading');
  const $list = $block.find('.attempt-detail__list');
  const $empty = $block.find('.attempt-detail__empty');
  const $error = $block.find('.attempt-detail__error');
  const template = $block.find('#attempt-detail__template-question')[0];
  const RESULT_CONFIG = {
    correct: {
      label: 'Correct',
      cls: 'result-badge--correct'
    },
    incorrect: {
      label: 'Incorrect',
      cls: 'result-badge--incorrect'
    },
    partial: {
      label: 'Partially Correct',
      cls: 'result-badge--partial'
    },
    ungraded: {
      label: 'Ungraded',
      cls: 'result-badge--ungraded'
    }
  };

  // Icon and visual state for each answer choice
  // Note: LearnDash does not store which specific option the user selected for single/multiple
  // choice questions — only overall correctness is available. We therefore only mark which
  // options are correct vs wrong; the card border + badge conveys the overall result.
  const CHOICE_STATES = {
    correct: {
      icon: 'fa-circle-check',
      cls: 'answer-choice--correct'
    },
    wrong: {
      icon: 'fa-circle',
      cls: ''
    }
  };
  if (!activityId) {
    $loading.addClass('hidden');
    $error.removeClass('hidden').text('No attempt ID provided.');
    return;
  }

  // ── Render user answer section ──────────────────────────────────────────────

  function renderUserAnswers($card, q) {
    if (!q.user_answers) return;

    // Choice-based (single / multiple)
    if (q.user_answers.type === 'choices') {
      const $answers = $card.find('.question-card__answers');
      q.user_answers.items.forEach(choice => {
        const state = choice.is_correct ? CHOICE_STATES.correct : CHOICE_STATES.wrong;
        const $item = $('<div class="answer-choice">').addClass(state.cls);
        $item.append(`<i class="fa-regular ${state.icon} answer-choice__icon" aria-hidden="true"></i>`);
        const $text = $('<span class="answer-choice__text">');
        if (choice.is_html) {
          $text.html(choice.text);
        } else {
          $text.text(choice.text);
        }
        $item.append($text);
        $answers.append($item);
      });
      $answers.removeClass('hidden');
      return;
    }

    // Free-text / essay
    if (q.user_answers.type === 'text' && q.user_answers.user_text) {
      $card.find('.question-card__user-text')
      // user_text is sanitized server-side with wp_kses_post
      .html(q.user_answers.user_text).removeClass('hidden');
    }
  }

  // ── Main fetch ──────────────────────────────────────────────────────────────

  (async () => {
    try {
      const questions = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.attemptQuestions(activityId));
      $loading.addClass('hidden');
      if (!questions.length) {
        $empty.removeClass('hidden');
        // Notify sidebar with empty array so it can handle gracefully
        $(window).trigger('bysQuestionsRendered', [[]]);
        return;
      }
      questions.forEach((q, index) => {
        const n = index + 1;
        const node = template.content.cloneNode(true);
        const $card = $(node);

        // Anchor target + result border colour via class
        const config = RESULT_CONFIG[q.result] ?? RESULT_CONFIG.ungraded;
        $card.find('.question-card').attr('id', `question-${n}`).addClass(`question-card--${q.result}`);
        $card.find('.question-card__number').text(`Q${n}`);
        $card.find('.question-card__result-badge').addClass(`result-badge ${config.cls}`).text(config.label);
        if (q.points_max > 0) {
          $card.find('.question-card__points').text(`${q.points_earned} / ${q.points_max} pts`);
        } else {
          $card.find('.question-card__points').addClass('hidden');
        }

        // question_text is sanitized server-side with wp_kses_post
        $card.find('.question-card__text').html(q.question_text || q.title || '');
        renderUserAnswers($card, q);
        $list.append($card);
      });
      $list.removeClass('hidden');

      // Notify the sidebar nav with a compact summary of each question's result
      $(window).trigger('bysQuestionsRendered', [questions.map((q, i) => ({
        index: i + 1,
        result: q.result
      }))]);
    } catch (err) {
      console.error('[user-quiz-attempt-detail] Failed to fetch questions:', err);
      $loading.addClass('hidden');
      $error.removeClass('hidden');
    }
  })();
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map