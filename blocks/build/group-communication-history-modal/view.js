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
 *
 * Authentication: the WP auth cookie + nonce. Per-route
 * auth is enforced server-side by each route's permission_callback.
 */

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
  markTutorialSeen: () => '/wp-json/bys-groups/v1/me/tutorial-seen',
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

    // Send request and cache the result.
    const headers = {};
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

/***/ "./src/_shared/store.js"
/*!******************************!*\
  !*** ./src/_shared/store.js ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/**
 * Shared client-side store for the current group
 *
 * Two-layer cache:
 *   - `window[KEY]` as live store
 *   - `sessionStorage[STORAGE_KEY]` so the store
 *     survives navigation between dashboard pages within the same tab.
 * 
 * NOTE:
 * `null` vs `[]` matters:
 *   users === null  -> "not loaded, please wait or fetch"
 *   users === []    -> "loaded and the group is genuinely empty"
 * Use `=== null` to check loaded-ness, not `!users`.
 */

const KEY = 'bysGroupsStore';
// Versioned key so we can ignore old shapes if `state` is ever restructured.
const STORAGE_KEY = 'bys_groups_store_v1';
const DEFAULT_STATE = {
  group_id: null,
  users: null,
  leaders: null,
  courses: null
};
function loadInitialState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {
      ...DEFAULT_STATE
    };
    const parsed = JSON.parse(raw);
    // Defensive: only accept known keys to avoid old-shape leakage.
    return {
      group_id: parsed.group_id ?? null,
      users: parsed.users ?? null,
      leaders: parsed.leaders ?? null,
      courses: parsed.courses ?? null
    };
  } catch (_err) {
    return {
      ...DEFAULT_STATE
    };
  }
}
const store = window[KEY] || {
  state: loadInitialState(),
  listeners: new Set(),
  setCurrentGroup(groupId) {
    // Switching groups wipes derived slots so blocks don't read stale data.
    this.state.group_id = Number(groupId);
    this.state.users = null;
    this.state.leaders = null;
    this.state.courses = null;
    this._emit();
  },
  // Merge by id. Stubs (just { id }) get upgraded in place when a hydrated
  // object for the same id arrives. New ids are appended. Existing fields are
  // preserved on conflict and updated by spread (incoming wins per field).
  setUsers(users) {
    if (this.state.users === null) {
      this.state.users = users.slice();
    } else {
      const byId = new Map(this.state.users.map(u => [u.id, u]));
      for (const incoming of users) {
        const prev = byId.get(incoming.id);
        byId.set(incoming.id, prev ? {
          ...prev,
          ...incoming
        } : incoming);
      }
      this.state.users = Array.from(byId.values());
    }
    this._emit();
  },
  // Reconcile the user roster to a canonical id list. PRESERVES hydration for
  // ids that survive, DROPS entries for ids that no longer exist. Called by
  // group-select after fetching base-user-stats so cached hydration carries
  // over across page navigations.
  setUserIdsAsStubs(ids) {
    const existing = new Map((this.state.users || []).map(u => [u.id, u]));
    this.state.users = ids.map(id => existing.get(id) || {
      id
    });
    this._emit();
  },
  // Remove a single user by id. Used after a successful api.delete /
  // removeGroupUser so the cache doesn't resurrect them on next page nav.
  removeUser(id) {
    if (!this.state.users) return;
    this.state.users = this.state.users.filter(u => u.id !== id);
    this._emit();
  },
  // Stores full leader objects (id, first_name, last_name, display_name,
  // email, avatar) so consumers can render directly from cache on a HIT.
  setLeaders(leaders) {
    this.state.leaders = leaders;
    this._emit();
  },
  // Stores course objects with the fields blocks need at render time.
  // - quizzes_show_test_grading_config:  [{step_id, step_title, start, end}, ...]
  //                      (show_test_grading_config=1). Used by group-ungraded-
  //                      quiz-alert, group-quiz-config (with start/end driving
  //                      the per-row Flatpickr values), and group-user-quiz-
  //                      config's learner/quiz search dropdowns.
  // - quizzes_show_in_reporting: [{step_id, step_title}, ...] (show_in_reporting=1)
  //                      used by group-reporting's quizzing sub-cells.
  // Both are pre-baked by /base-group-data so blocks don't fan out per-course
  // /quiz-steps fetches.
  setCourses(courses) {
    this.state.courses = courses.map(c => ({
      id: c.id,
      title: c.title,
      shortname: c.shortname ?? null,
      required: c.required ?? false,
      quizzes_show_test_grading_config: Array.isArray(c.quizzes_show_test_grading_config) ? c.quizzes_show_test_grading_config.map(q => ({
        step_id: q.step_id,
        step_title: q.step_title ?? '',
        start: q.start ?? '',
        end: q.end ?? ''
      })) : [],
      quizzes_show_in_reporting: Array.isArray(c.quizzes_show_in_reporting) ? c.quizzes_show_in_reporting : []
    }));
    this._emit();
  },
  getCurrentGroup() {
    return this.state.group_id;
  },
  getUsers() {
    return this.state.users;
  },
  getLeaders() {
    return this.state.leaders;
  },
  getCourses() {
    return this.state.courses;
  },
  // Derived getters: read from the stored arrays, no separate slots.
  getUserIds() {
    return this.state.users ? this.state.users.map(u => u.id) : null;
  },
  // Returns hydrated users for the requested ids, IN REQUESTED ORDER, only if
  // every requested id has hydrated fields (e.g. first_name is defined).
  // Returns null on any miss — caller should fetch + setUsers() to hydrate.
  getHydratedUsers(userIds) {
    if (!this.state.users || !userIds || !userIds.length) return null;
    const byId = new Map(this.state.users.map(u => [u.id, u]));
    const out = [];
    for (const id of userIds) {
      const u = byId.get(id);
      // A stub has only `id`; a hydrated record has at least first_name/email.
      if (!u || u.first_name === undefined) return null;
      out.push(u);
    }
    return out;
  },
  getLeaderIds() {
    return this.state.leaders ? this.state.leaders.map(l => l.id) : null;
  },
  getCourseIds() {
    return this.state.courses ? this.state.courses.map(c => c.id) : null;
  },
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  _emit() {
    this._persist();
    this.listeners.forEach(fn => fn(this.state));
  },
  _persist() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (_err) {
      // Storage full / disabled — non-fatal, in-memory store still works.
    }
  }
};
window[KEY] = store;
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (store);

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
/*!*******************************************************!*\
  !*** ./src/group-communication-history-modal/view.js ***!
  \*******************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/* harmony import */ var _shared_store_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/store.js */ "./src/_shared/store.js");


jQuery(document).ready($ => {
  const $block = $('.wp-block-bys-groups-group-communication-history-modal').first();
  if (!$block.length) return;
  const $modal = $block.find('#communication-history-modal');
  const $backdrop = $modal.find('.modal-backdrop');
  const $back = $modal.find('.modal__back');
  const $promptName = $modal.find('.modal__prompt-name');
  const $senderName = $modal.find('.modal__sender-name');
  const $screen1 = $modal.find('.comm-screen--1');
  const $screen2 = $modal.find('.comm-screen--2');
  const $screen3 = $modal.find('.comm-screen--3');
  let screen = 1;
  let currentBatchId = null;
  let currentPromptType = null;
  let loadedRecipients = null; // Cache recipients so we don't refetch on back navigation
  let currentGroupId = null;
  let screen2DateString = null; // Cache the formatted date for back navigation
  // Tracks how the modal was opened: 'batch' (from the log block, Screen 1
  // is irrelevant) or 'history' (from the prompts block, Screen 1 is the
  // entry point). Drives back-button visibility.
  let entryMode = 'history';
  function showScreen(n, subtitle) {
    screen = n;
    $screen1.toggle(n === 1);
    $screen2.toggle(n === 2);
    $screen3.toggle(n === 3);
    // Back button is only meaningful when there's a previous screen to
    // return to. In 'batch' entry mode, Screen 2 IS the entry point, so
    // it has no previous screen.
    const hasPrevious = entryMode === 'batch' ? n > 2 : n > 1;
    $back.toggle(hasPrevious);
    if (subtitle !== undefined) $promptName.text(subtitle);
  }
  function closeModal() {
    $modal.addClass('hidden');
    $('html').css('overflow', '');
    showScreen(1, '');
    currentBatchId = null;
    currentPromptType = null;
    loadedRecipients = null;
    entryMode = 'history';
    $senderName.hide().text('');
    // Show skeletons and clear content on close
    $screen1.find('.skeleton-wrapper').removeClass('hidden');
    $screen1.find('.comm-batch-list').find('tr:not(.skeleton-wrapper)').remove();
    $screen2.find('.skeleton-wrapper').removeClass('hidden');
    $screen2.find('.comm-user-list').find('tr:not(.skeleton-wrapper)').remove();
    setScreen3Loading(true);
  }
  $modal.find('.modal__close').on('click', closeModal);
  $backdrop.on('click', closeModal);
  $(document).on('keydown.commHistoryModal', e => {
    if (e.key === 'Escape' && !$modal.hasClass('hidden')) closeModal();
  });

  /**
   * Load all batches filtered by prompt_type
   */
  async function loadBatches(promptType) {
    const $tbody = $screen1.find('.comm-batch-list');
    const $loading = $screen1.find('.skeleton-wrapper');
    $loading.removeClass('hidden');
    $tbody.find('tr:not(.skeleton-wrapper)').remove();
    if (!currentGroupId) {
      $loading.addClass('hidden');
      $tbody.html(`<tr><td colspan="4" style="text-align:center;padding:20px;">No group selected</td></tr>`);
      return;
    }
    try {
      const data = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupCommunicationLog(currentGroupId));
      const batches = (data.messages || []).filter(msg => msg.prompt_type === promptType);
      $loading.addClass('hidden');
      renderBatches(batches);
    } catch (err) {
      console.error('[group-communication-history-modal] Error loading batches:', err);
      $loading.addClass('hidden');
      $tbody.find('tr:not(.skeleton-wrapper)').remove();
      $tbody.html(`<tr><td colspan="4" style="text-align:center;padding:20px;">Error loading history</td></tr>`);
    }
  }

  /**
   * Render batches into Screen 1 table
   */
  function renderBatches(batches) {
    const $tbody = $screen1.find('.comm-batch-list');
    $tbody.find('tr:not(.skeleton-wrapper)').remove();
    $screen1.find('.skeleton-wrapper').addClass('hidden');
    if (!batches || batches.length === 0) {
      $tbody.html(`<tr><td colspan="4" style="text-align:center;padding:20px;">No messages sent yet</td></tr>`);
      return;
    }

    // Reverse to show latest first
    const reversedBatches = [...batches].reverse();
    reversedBatches.forEach(batch => {
      // sent_at is already in local time from the API (Y-m-d H:i:s format)
      let sentAt = null;
      if (batch.sent_at) {
        // Try parsing as MySQL format first (YYYY-MM-DD HH:MM:SS)
        const mysqlMatch = batch.sent_at.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
        if (mysqlMatch) {
          sentAt = new Date(mysqlMatch[1], mysqlMatch[2] - 1, mysqlMatch[3], mysqlMatch[4], mysqlMatch[5], mysqlMatch[6]);
        } else {
          // Fall back to standard Date parsing (ISO format)
          sentAt = new Date(batch.sent_at);
        }
      }
      const dateStr = sentAt && !isNaN(sentAt.getTime()) ? sentAt.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }) : '';

      // Calculate status based on delivery_status
      let statusText = 'All Success';
      let statusClass = 'comm-status-badge--delivered';
      if (batch.delivery_status === 'scheduled') {
        statusText = 'Scheduled';
        statusClass = 'comm-status-badge--scheduled';
      } else if (batch.delivery_status === 'failed') {
        statusText = 'All Failed';
        statusClass = 'comm-status-badge--failed';
      } else if (batch.delivery_status === 'partial_failure') {
        statusText = 'Some Failed';
        statusClass = 'comm-status-badge--partial-failure';
      } else if (batch.delivery_status === 'bounced') {
        statusText = 'All Failed';
        statusClass = 'comm-status-badge--bounced';
      } else if (batch.delivery_status === 'spam') {
        statusText = 'Some Failed';
        statusClass = 'comm-status-badge--spam';
      } else if (batch.delivery_status === 'pending') {
        statusText = 'Pending';
        statusClass = 'comm-status-badge--pending';
      }

      // Fetch sender user info via the shared api client so the WP REST
      // nonce + plugin auth header are included (bare fetch hits 401 for
      // /wp/v2/users/{id} when the user has no public posts).
      let senderName = 'Unknown';
      if (batch.sender_user_id) {
        _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(`/wp-json/wp/v2/users/${batch.sender_user_id}`).then(data => {
          const name = data?.name || `User ${batch.sender_user_id}`;
          $tbody.find(`tr[data-batch-id="${escapeHtml(batch.batch_id)}"] .comm-sender-name`).text(name);
        }).catch(() => {
          // On error, just leave it as Unknown
        });
      }
      const $row = $(`
                <tr class="comm-batch-row" data-batch-id="${escapeHtml(batch.batch_id)}">
                    <td>${escapeHtml(dateStr)}</td>
                    <td class="comm-sender-name">${escapeHtml(senderName)}</td>
                    <td class="comm-recipient-count">${batch.recipient_count || 0}</td>
                    <td><span class="comm-status-badge ${statusClass}">${escapeHtml(statusText)}</span></td>
                </tr>
            `);
      $tbody.append($row);
    });
  }

  /**
   * Load all recipients for a batch
   */
  async function loadRecipients(batchId) {
    // Return cached if available
    if (loadedRecipients && loadedRecipients.batch_id === batchId) {
      renderRecipients(loadedRecipients);
      return;
    }
    const $tbody = $screen2.find('.comm-user-list');
    const $loading = $screen2.find('.skeleton-wrapper');
    $loading.removeClass('hidden');
    $tbody.find('tr:not(.skeleton-wrapper)').remove();
    try {
      const recipients = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.communicationRecipients(batchId));
      loadedRecipients = {
        batch_id: batchId,
        recipients
      };
      $loading.addClass('hidden');
      renderRecipients(loadedRecipients);
    } catch (err) {
      console.error('[group-communication-history-modal] Error loading recipients:', err);
      $loading.addClass('hidden');
      $tbody.find('tr:not(.skeleton-wrapper)').remove();
      $tbody.html(`<tr><td colspan="3" style="text-align:center;padding:20px;">Error loading recipients</td></tr>`);
    }
  }

  /**
   * Render recipients into Screen 2 table
   */
  function renderRecipients(data) {
    const $tbody = $screen2.find('.comm-user-list');
    $tbody.find('tr:not(.skeleton-wrapper)').remove();
    $screen2.find('.skeleton-wrapper').addClass('hidden');
    if (!data.recipients || !Array.isArray(data.recipients)) {
      return;
    }
    data.recipients.forEach(recipient => {
      const statusLabel = capitalize(recipient.delivery_status || 'pending');
      const statusClass = `comm-status-badge--${recipient.delivery_status}`;
      // Use message_id if available, otherwise fall back to DB row id
      const detailId = recipient.message_id || recipient.id;
      const $row = $(`
                <tr class="comm-user-row" data-detail-id="${escapeHtml(String(detailId))}" data-recipient-name="${escapeHtml(recipient.recipient_name)}">
                    <td>${escapeHtml(recipient.recipient_name)}</td>
                    <td class="comm-email">${escapeHtml(recipient.recipient_email)}</td>
                    <td><span class="comm-status-badge ${statusClass}">${escapeHtml(statusLabel)}</span></td>
                </tr>
            `);
      $tbody.append($row);
    });
  }

  /**
   * Load detail for a single message
   */
  /**
   * Show or hide every Screen 3 skeleton. `loading=true` blanks the
   * content fields and shows their skeletons; `loading=false` hides the
   * skeletons (subsequent text-setting reveals the content).
   */
  function setScreen3Loading(loading) {
    const $subject = $screen3.find('.comm-message-subject');
    const $recipient = $screen3.find('.comm-message-recipient');
    const $badge = $screen3.find('.comm-status-badge');
    const $body = $screen3.find('.comm-message-body');
    const $bodySkel = $screen3.find('.comm-message-body-skeleton');
    if (loading) {
      // Wipe content but keep skeleton spans, then ensure they're visible.
      [$subject, $recipient, $badge].forEach($el => {
        $el.find(':not(.skeleton)').remove();
        $el.find('.skeleton').show();
      });
      $body.empty();
      $bodySkel.show();
    } else {
      $screen3.find('.comm-meta-value .skeleton, .comm-status-badge .skeleton').hide();
      $bodySkel.hide();
    }
  }
  async function loadMessageDetail(detailId) {
    setScreen3Loading(true);
    try {
      // detailId is either a Postmark message_id or a DB row id (for failed/scheduled rows)
      const detail = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.communicationDetail(detailId));
      renderMessageDetail(detail);
    } catch (err) {
      console.error('[group-communication-history-modal] Error loading detail:', err);
      setScreen3Loading(false);
      $screen3.find('.comm-message-body').html(`<p style="color:red;">Error loading message details</p>`);
    }
  }

  /**
   * Render message detail into Screen 3
   */
  function renderMessageDetail(detail) {
    const statusLabel = capitalize(detail.delivery_status || 'pending');
    const statusClass = `comm-status-badge--${detail.delivery_status}`;
    setScreen3Loading(false);
    $screen3.find('.comm-message-subject').text(detail.subject || '(No subject)');
    $screen3.find('.comm-message-recipient').text(`${detail.recipient_name} <${detail.recipient_email}>`);
    const $badge = $screen3.find('.comm-status-badge');
    $badge.removeClass().addClass(`comm-status-badge ${statusClass}`).text(statusLabel);

    // Render email body (prefer HTML, fallback to text)
    const $body = $screen3.find('.comm-message-body');
    if (detail.body_html) {
      const bodyHtml = detail.body_html.replace(/<title[^>]*>.*?<\/title>/gi, '').replace(/>\s+</g, '><').replace(/\s\s+/g, ' ').trim();
      $body.html(bodyHtml);
    } else {
      $body.text(detail.body_text || '(No content)');
    }
  }

  /**
   * Fetch a WP user's display name and render it in the header slot. Hides
   * the slot when no user id is given or the fetch fails.
   */
  async function renderSenderName(userId) {
    if (!userId) {
      $senderName.hide().text('');
      return;
    }

    // Optimistic placeholder so something appears immediately.
    $senderName.text(` • Sent by user #${userId}`).show();
    try {
      const data = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(`/wp-json/wp/v2/users/${userId}`);
      const name = data?.name || `User ${userId}`;
      $senderName.text(` • Sent by ${name}`);
    } catch (err) {
      console.warn('[group-communication-history-modal] Failed to load sender name:', err);
      // Leave the placeholder text in place rather than going blank.
    }
  }

  /**
   * Called from the communication log block to open directly at screen 2
   */
  $(document).on('comm:open-batch', async (e, data) => {
    currentBatchId = data.batchId;
    currentGroupId = _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getCurrentGroup();
    entryMode = 'batch';
    $modal.removeClass('hidden');
    $('html').css('overflow', 'hidden');
    showScreen(2, data.date || '');
    renderSenderName(data.senderUserId);

    // Show skeleton before loading
    $screen2.find('.skeleton-wrapper').removeClass('hidden');
    await loadRecipients(data.batchId);
  });

  /**
   * Called from the communication prompts block to open history for a prompt_type
   */
  $(document).on('comm:open-history', async (e, data) => {
    currentPromptType = data.promptType;
    currentGroupId = _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getCurrentGroup();
    entryMode = 'history';
    $modal.removeClass('hidden');
    $('html').css('overflow', 'hidden');

    // Sender slot is only relevant for the per-batch view from the log.
    $senderName.hide().text('');
    showScreen(1, data.promptTitle || '');

    // Show skeleton before loading
    $screen1.find('.skeleton-wrapper').removeClass('hidden');
    await loadBatches(data.promptType);
  });

  /**
   * Back button handler
   */
  $back.on('click', () => {
    if (screen === 2 && entryMode === 'history') {
      // Only meaningful when we entered via the prompts block.
      showScreen(1, currentPromptType ? capitalize(currentPromptType.replace(/-/g, ' ')) : '');
    }
    if (screen === 3) {
      // Going back to Screen 2 — restore the cached date string
      showScreen(2, screen2DateString || '');
    }
  });

  /**
   * Screen 1: click batch row to view recipients
   */
  $screen1.on('click', '.comm-batch-row', async function () {
    const batchId = $(this).data('batchId');
    currentBatchId = batchId;
    const dateStr = $(this).find('td').eq(0).text();
    screen2DateString = dateStr; // Cache for back navigation
    showScreen(2, dateStr);
    await loadRecipients(batchId);
  });

  /**
   * Screen 2: click recipient row to view detail
   */
  $screen2.on('click', '.comm-user-row', async function () {
    const detailId = $(this).data('detailId');
    const recipientName = $(this).data('recipientName');
    showScreen(3, recipientName);
    await loadMessageDetail(detailId);
  });

  /**
   * Mutation observer for scroll lock
   */
  new MutationObserver(() => {
    $('html').css('overflow', $modal.hasClass('hidden') ? '' : 'hidden');
  }).observe($modal[0], {
    attributes: true,
    attributeFilter: ['class']
  });
});

/**
 * Utility: capitalize first letter
 */
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/**
 * Utility: escape HTML in strings for safe DOM insertion
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
})();

/******/ })()
;
//# sourceMappingURL=view.js.map