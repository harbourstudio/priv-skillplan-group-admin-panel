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

function showToast(message) {
  const $toast = jQuery('<div class="bys-grade-toast">').text(message);
  jQuery('body').append($toast);
  // Trigger reflow so the transition plays
  // eslint-disable-next-line no-unused-expressions
  $toast[0].offsetHeight;
  $toast.addClass('bys-grade-toast--visible');
  setTimeout(() => {
    $toast.removeClass('bys-grade-toast--visible');
    setTimeout(() => $toast.remove(), 400);
  }, 3000);
}
jQuery(document).ready($ => {
  const params = new URLSearchParams(window.location.search);
  const activityId = params.get('attempt_id');
  const $block = $('.wp-block-bys-groups-user-quiz-attempt-detail').first();
  const canGrade = $block.attr('data-can-grade') === '1';
  const $loading = $block.find('.attempt-detail__loading');
  const $filters = $block.find('.attempt-detail__filters');
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

  // ── Edit mode state ─────────────────────────────────────────────────────────

  let isEditMode = false;
  // question_id → { result, points }
  const pendingGrades = new Map();
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

  // ── Correct answer section ──────────────────────────────────────────────────

  function renderCorrectAnswer($card, q) {
    if (!q.correct_answer || !q.correct_answer.length) return;
    const $el = $card.find('.question-card__correct-answer');
    const label = q.answer_type === 'essay' ? 'Answer key' : 'Correct answer';
    $el.attr('data-label', label);
    q.correct_answer.forEach(answer => {
      const $item = $('<div class="correct-answer__item">');
      if (answer.is_html) {
        $item.html(answer.text);
      } else {
        $item.text(answer.text);
      }
      $el.append($item);
    });
    $el.removeClass('hidden');
  }

  // ── Grade controls (rendered per-card in edit mode) ─────────────────────────

  function renderGradeControls($card, q) {
    const qid = q.question_id;
    const ptsMax = q.points_max;
    const current = pendingGrades.get(qid) || {
      result: q.result,
      points: q.points_earned
    };
    const $controls = $('<div class="grade-controls">');
    const gradeOptions = [{
      result: 'correct',
      label: 'Correct',
      icon: 'fa-circle-check'
    }, {
      result: 'incorrect',
      label: 'Incorrect',
      icon: 'fa-circle-xmark'
    }, {
      result: 'ungraded',
      label: 'Ungraded',
      icon: 'fa-circle'
    }];

    // Partial option only makes sense when a question has more than 1 point
    if (ptsMax > 1) {
      gradeOptions.splice(2, 0, {
        result: 'partial',
        label: 'Partial',
        icon: 'fa-circle-half-stroke'
      });
    }
    gradeOptions.forEach(({
      result,
      label,
      icon
    }) => {
      const isActive = current.result === result;
      const $btn = $(`<button type="button" class="grade-btn grade-btn--${result}">`).toggleClass('grade-btn--active', isActive).html(`<i class="fa-regular ${icon}" aria-hidden="true"></i>${label}`);
      $btn.on('click', function () {
        const existing = pendingGrades.get(qid) || {
          points: q.points_earned
        };
        pendingGrades.set(qid, {
          result,
          points: existing.points
        });
        $controls.find('.grade-btn').removeClass('grade-btn--active');
        $(this).addClass('grade-btn--active');
        $controls.find('.grade-partial-input').toggleClass('hidden', result !== 'partial');
      });
      $controls.append($btn);
    });

    // Points input for partial credit
    if (ptsMax > 1) {
      const initPts = current.result === 'partial' ? current.points : Math.max(0.5, Math.round(ptsMax / 2 * 2) / 2);
      const $partialRow = $('<div class="grade-partial-input">').toggleClass('hidden', current.result !== 'partial');
      const $input = $(`<input type="number" class="grade-points-input" min="0.5" max="${ptsMax}" step="0.5" value="${initPts}">`).on('change input', function () {
        const pts = Math.min(parseFloat($(this).val()) || 0, ptsMax);
        const existing = pendingGrades.get(qid) || {
          result: 'partial'
        };
        pendingGrades.set(qid, {
          result: existing.result,
          points: pts
        });
      });
      $partialRow.append($input, $(`<span class="grade-partial-label">/ ${ptsMax} pts</span>`));
      $controls.append($partialRow);
    }
    $card.append($controls);
  }

  // ── Enter / exit edit mode ──────────────────────────────────────────────────

  function enterEditMode(questions) {
    isEditMode = true;
    pendingGrades.clear();
    $block.addClass('is-editing');
    $block.find('.attempt-detail__edit-btn').addClass('hidden');

    // Seed pending grades from current question state
    questions.forEach(q => {
      pendingGrades.set(q.question_id, {
        result: q.result,
        points: q.points_earned
      });
    });

    // Attach grade controls to each card
    $list.find('.question-card').each(function (i) {
      const q = questions[i];
      if (q) renderGradeControls($(this), q);
    });
    $block.find('.grade-save-bar').removeClass('hidden');
  }
  function exitEditMode() {
    isEditMode = false;
    $block.removeClass('is-editing');
    $block.find('.attempt-detail__edit-btn').removeClass('hidden');
    $block.find('.grade-controls').remove();
    // Reset save bar to its initial state before hiding so it's ready for next session
    const $saveBar = $block.find('.grade-save-bar');
    $saveBar.find('.grade-save-bar__save').prop('disabled', false).text('Save Grades');
    $saveBar.find('.grade-save-bar__status').text('').removeClass('grade-save-bar__status--error grade-save-bar__status--success');
    $saveBar.addClass('hidden');
    pendingGrades.clear();
  }

  // Returns true if the pending grade differs from the question's original state.
  function gradeChanged(q, grade) {
    if (grade.result !== q.result) return true;
    if (grade.result === 'partial' && grade.points !== q.points_earned) return true;
    return false;
  }

  // Apply pending grades to the card visuals (called before exiting after save)
  function applyGradesToCards(questions) {
    questions.forEach((q, i) => {
      const grade = pendingGrades.get(q.question_id);
      if (!grade) return;
      const $card = $list.find('.question-card').eq(i);
      const config = RESULT_CONFIG[grade.result] ?? RESULT_CONFIG.ungraded;
      $card.removeClass('question-card--correct question-card--incorrect question-card--partial question-card--ungraded').addClass(`question-card--${grade.result}`);
      $card.find('.question-card__result-badge').removeClass('result-badge--correct result-badge--incorrect result-badge--partial result-badge--ungraded').addClass(config.cls).text(config.label);

      // Only show the badge if this specific question's grade was changed,
      // or if it was already marked as manually graded from a previous session.
      if (gradeChanged(q, grade) || q.manually_graded) {
        $card.find('.question-card__manual-badge').html('<i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>Manually graded').removeClass('hidden');
      }
      if (q.points_max > 0) {
        const earned = grade.result === 'correct' ? q.points_max : grade.result === 'incorrect' ? 0 : grade.result === 'partial' ? grade.points : q.points_earned;
        $card.find('.question-card__points').text(`${earned} / ${q.points_max} pts`);
      }
    });
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
        if (q.manually_graded) {
          $card.find('.question-card__manual-badge').html('<i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>Manually graded').removeClass('hidden');
        }
        if (q.points_max > 0) {
          $card.find('.question-card__points').text(`${q.points_earned} / ${q.points_max} pts`);
        } else {
          $card.find('.question-card__points').addClass('hidden');
        }

        // question_text is sanitized server-side with wp_kses_post
        $card.find('.question-card__text').html(q.question_text || q.title || '');
        renderUserAnswers($card, q);
        renderCorrectAnswer($card, q);
        $list.append($card);
      });
      $list.removeClass('hidden');

      // ── Filters ─────────────────────────────────────────────────────────────

      // Count results
      const counts = {
        all: questions.length,
        correct: 0,
        incorrect: 0,
        partial: 0,
        ungraded: 0
      };
      questions.forEach(q => {
        if (q.result in counts) counts[q.result]++;
      });

      // Populate count badges and disable filters with no matches
      $filters.find('.filter-btn').each(function () {
        const filter = $(this).data('filter');
        const count = counts[filter] ?? 0;
        $(this).find('.filter-btn__count').text(count);
        if (count === 0 && filter !== 'all') {
          $(this).prop('disabled', true);
        }
      });

      // ── Edit Grades button (admin / grader only) ─────────────────────────────

      if (canGrade) {
        const $editBtn = $('<button type="button" class="attempt-detail__edit-btn">').html('<i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>Edit Grades').on('click', () => enterEditMode(questions));
        $filters.append($editBtn);
      }
      $filters.removeClass('hidden');

      // Filter click handler
      $filters.on('click', '.filter-btn:not(:disabled)', function () {
        const filter = $(this).data('filter');
        $filters.find('.filter-btn').removeClass('filter-btn--active');
        $(this).addClass('filter-btn--active');
        $list.find('.question-card').each(function () {
          const matches = filter === 'all' || $(this).hasClass(`question-card--${filter}`);
          $(this).toggleClass('is-hidden', !matches);
        });
      });

      // ── Save bar (injected once, initially hidden) ────────────────────────────

      if (canGrade) {
        const $saveBar = $('<div class="grade-save-bar hidden">').append($('<span class="grade-save-bar__status">'), $('<div class="grade-save-bar__actions">').append($('<button type="button" class="grade-save-bar__cancel">').text('Cancel'), $('<button type="button" class="grade-save-bar__save">').text('Save Grades')));
        $block.append($saveBar);
        $saveBar.on('click', '.grade-save-bar__cancel', () => exitEditMode());
        $saveBar.on('click', '.grade-save-bar__save', async function () {
          const $saveBtn = $saveBar.find('.grade-save-bar__save');
          const $statusEl = $saveBar.find('.grade-save-bar__status');
          $saveBtn.prop('disabled', true).text('Saving\u2026');
          $statusEl.text('').removeClass('grade-save-bar__status--error');

          // Only submit grades that were actually changed from their original state.
          const grades = [];
          pendingGrades.forEach((grade, questionId) => {
            const q = questions.find(q => q.question_id === questionId);
            if (q && gradeChanged(q, grade)) {
              grades.push({
                question_id: questionId,
                result: grade.result,
                points: grade.points
              });
            }
          });
          if (!grades.length) {
            exitEditMode();
            return;
          }
          try {
            const authHeader = window.bysGroupsAuth && window.bysGroupsAuth.header ? window.bysGroupsAuth.header : null;
            const nonce = window.bysGradingNonce || null;
            const headers = {};
            if (authHeader) headers['Authorization'] = authHeader;
            if (nonce) headers['X-WP-Nonce'] = nonce;
            await $.ajax({
              url: `/wp-json/bys-groups/v1/attempts/${activityId}/grade`,
              method: 'POST',
              contentType: 'application/json',
              headers,
              data: JSON.stringify({
                grades
              }),
              dataType: 'json'
            });

            // Update card visuals before clearing pendingGrades
            applyGradesToCards(questions);

            // Sync questions array so re-entering edit mode shows correct state
            questions.forEach(q => {
              const grade = pendingGrades.get(q.question_id);
              if (!grade) return;
              if (gradeChanged(q, grade)) q.manually_graded = true;
              q.result = grade.result;
              q.points_earned = grade.result === 'correct' ? q.points_max : grade.result === 'incorrect' ? 0 : grade.result === 'partial' ? grade.points : q.points_earned;
            });

            // Update sidebar nav colours
            $(window).trigger('bysQuestionsRendered', [questions.map((q, i) => ({
              index: i + 1,
              result: q.result
            }))]);
            exitEditMode();
            showToast('Grades saved successfully.');
            setTimeout(() => window.location.reload(), 1400);
          } catch (err) {
            console.error('[grade] Save failed:', err);
            $statusEl.text('Failed to save. Please try again.').addClass('grade-save-bar__status--error');
            $saveBtn.prop('disabled', false).text('Save Grades');
          }
        });
      }

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