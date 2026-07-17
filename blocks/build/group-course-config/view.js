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

/***/ "./src/_shared/confirm.js"
/*!********************************!*\
  !*** ./src/_shared/confirm.js ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bysConfirm: () => (/* binding */ bysConfirm)
/* harmony export */ });
let _$overlay = null;
function getOverlay() {
  if (_$overlay) return _$overlay;
  _$overlay = jQuery(`
        <div class="bys-confirm-overlay" role="dialog" aria-modal="true">
            <div class="bys-confirm__dialog">
                <p class="bys-confirm__message"></p>
                <div class="bys-confirm__actions">
                    <button class="bys-confirm__cancel btn-unstyled" type="button">Cancel</button>
                    <button class="bys-confirm__ok btn-unstyled" type="button">Confirm</button>
                </div>
            </div>
        </div>
    `);
  jQuery('body').append(_$overlay);
  return _$overlay;
}
function bysConfirm(message, confirmLabel = 'Confirm') {
  return new Promise(resolve => {
    const $ov = getOverlay();
    $ov.find('.bys-confirm__message').text(message);
    $ov.find('.bys-confirm__ok').text(confirmLabel);
    $ov.addClass('bys-confirm-overlay--open');
    jQuery('html').css('overflow', 'hidden');
    function close(result) {
      $ov.removeClass('bys-confirm-overlay--open');
      jQuery('html').css('overflow', '');
      $ov.find('.bys-confirm__ok, .bys-confirm__cancel').off('.bysConfirm');
      $ov.off('.bysConfirm');
      document.removeEventListener('keydown', handleKey);
      resolve(result);
    }
    function handleKey(e) {
      if (e.key === 'Escape') close(false);
    }
    $ov.find('.bys-confirm__ok').on('click.bysConfirm', () => close(true));
    $ov.find('.bys-confirm__cancel').on('click.bysConfirm', () => close(false));
    $ov.on('click.bysConfirm', e => {
      if (jQuery(e.target).is($ov)) close(false);
    });
    document.addEventListener('keydown', handleKey);
  });
}

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
/*!*****************************************!*\
  !*** ./src/group-course-config/view.js ***!
  \*****************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/* harmony import */ var _shared_confirm_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/confirm.js */ "./src/_shared/confirm.js");
/* harmony import */ var _shared_store_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../_shared/store.js */ "./src/_shared/store.js");



let currentGroupId = null;
let groupCourses = [];
let allCourses = [];
let selectedCourse = null;

// Titles arrive pre-decoded from the server (see normalize_course_title in
// class-groups-router.php). The client treats them as plain text — `.text()`
// and `.attr()` re-encode at insertion time, so no XSS surface.
function courseTitle(course) {
  return typeof course.title === 'string' ? course.title : course.title?.rendered || 'Untitled';
}
function buildCourseRow(course) {
  const title = courseTitle(course);
  const required = course.required === true;

  // Clone the #gcc__template-item <template> and fill
  const template = document.getElementById('gcc__template-item');
  const $row = jQuery(template.content.cloneNode(true)).find('.gcc__item');
  $row.attr('data-course-id', course.id);
  $row.find('.gcc__name').text(title);
  const $label = $row.find('.gcc__toggle-label');
  $label.text(required ? 'Required' : 'Optional').toggleClass('is-required', required);
  const $checkbox = $row.find('input[type="checkbox"]');
  $checkbox.prop('checked', required);
  $checkbox.on('change', async function () {
    const $cb = jQuery(this);
    const nowRequired = $cb.prop('checked');
    $label.text(nowRequired ? 'Required' : 'Optional').toggleClass('is-required', nowRequired);
    course.required = nowRequired;
    $cb.prop('disabled', true);
    try {
      await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.post(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.toggleRequiredCourse(currentGroupId, course.id));
      _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.invalidate(`groups/${currentGroupId}/courses`);
      // Mutation write-through: flip required flag in the cached course
      // shape so other blocks see the new state on next page nav.
      const cachedCourses = _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getCourses();
      if (Array.isArray(cachedCourses)) {
        _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].setCourses(cachedCourses.map(c => c.id === course.id ? {
          ...c,
          required: nowRequired
        } : c));
      }
    } catch (err) {
      console.error('[course-config] Toggle required failed', err);
      course.required = !nowRequired;
      $cb.prop('checked', !nowRequired);
      $label.text(!nowRequired ? 'Required' : 'Optional').toggleClass('is-required', !nowRequired);
    } finally {
      $cb.prop('disabled', false);
    }
  });
  const $removeBtn = $row.find('.gcc__remove');
  $removeBtn.attr('aria-label', `Remove ${title}`);
  $removeBtn.on('click', async function () {
    const $btn = jQuery(this);
    if (!(await (0,_shared_confirm_js__WEBPACK_IMPORTED_MODULE_1__.bysConfirm)(`Remove "${title}" from this group?`, 'Remove'))) return;
    $btn.prop('disabled', true);
    try {
      await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.post(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.removeGroupCourse(currentGroupId, course.id));
      groupCourses = groupCourses.filter(c => c.id !== course.id);
      _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.invalidate(`groups/${currentGroupId}/courses`);
      // Mutation write-through: drop the removed course from the cache.
      const cachedCourses = _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getCourses();
      if (Array.isArray(cachedCourses)) {
        _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].setCourses(cachedCourses.filter(c => c.id !== course.id));
      }
      onRemove($row);
    } catch (err) {
      console.error('[course-config] Remove failed', err);
      $btn.prop('disabled', false);
    }
  });
  return $row;
}

// Build a single suggestion <li> from the #gcc__template-suggestion template.
function buildSuggestion(course) {
  const template = document.getElementById('gcc__template-suggestion');
  const $li = jQuery(template.content.cloneNode(true)).find('.gcc__suggestion');
  $li.attr('data-course-id', course.id);
  $li.attr('data-course-title', course.title);
  if (course.shortname) {
    $li.append(jQuery('<span class="gcc__suggestion-title">').text(course.title), jQuery('<span class="gcc__suggestion-shortname">').text(course.shortname));
  } else {
    $li.text(course.title);
  }
  return $li;
}
let $messageEl = null;
function showMessage(text, variant) {
  if (!$messageEl) return;
  $messageEl.removeClass('gcc__message--empty gcc__message--error').addClass(`gcc__message--${variant}`).text(text).show();
}
function hideMessage() {
  if (!$messageEl) return;
  $messageEl.hide().text('').removeClass('gcc__message--empty gcc__message--error');
}

// Build N row nodes into a single DocumentFragment — one reflow on insert
// instead of one per append.
function buildRowsFragment(courses) {
  const frag = document.createDocumentFragment();
  courses.forEach(c => {
    const $r = buildCourseRow(c);
    frag.appendChild($r[0]);
  });
  return frag;
}
function onRemove($row) {
  $row.fadeOut(200, () => {
    $row.remove();
    if (!groupCourses.length) {
      showMessage('No courses added to this group yet.', 'empty');
    }
  });
}
jQuery(document).ready(async $ => {
  const $block = $('.wp-block-bys-groups-group-course-config').first();
  if (!$block.length) return;
  const $skeleton = $block.find('.gcc__skeleton');
  const $list = $block.find('.gcc__list');
  const $message = $block.find('.gcc__message');
  const $search = $block.find('.gcc__search');
  const $addBtn = $block.find('.gcc__add-btn');
  const $suggestions = $block.find('.gcc__suggestions');
  $messageEl = $message;
  function renderList() {
    $list.empty();
    if (!groupCourses.length) {
      showMessage('No courses added to this group yet.', 'empty');
      return;
    }
    hideMessage();
    $list[0].appendChild(buildRowsFragment(groupCourses));
  }

  // ── Autocomplete ──────────────────────────────────────────────────────────

  async function ensureAllCourses() {
    if (allCourses.length) return;
    try {
      allCourses = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.allCourses());
    } catch (e) {
      allCourses = [];
    }
  }
  function showSuggestions(query) {
    const q = query.toLowerCase().trim();
    const addedIds = new Set(groupCourses.map(c => c.id));
    const matches = allCourses.filter(c => !addedIds.has(c.id) && (!q || c.title.toLowerCase().includes(q))).slice(0, 8);
    $suggestions.empty();
    if (!matches.length) {
      const $empty = jQuery('<li class="gcc__suggestion gcc__suggestion--empty" role="option"></li>').text('No courses found');
      $suggestions.append($empty);
    } else {
      const frag = document.createDocumentFragment();
      matches.forEach(c => frag.appendChild(buildSuggestion(c)[0]));
      $suggestions[0].appendChild(frag);
    }
    $suggestions.removeClass('hidden');
  }
  function hideSuggestions() {
    $suggestions.addClass('hidden').empty();
  }
  $search.on('focus', async function () {
    await ensureAllCourses();
    showSuggestions($(this).val());
  });
  $search.on('input', async function () {
    await ensureAllCourses();
    selectedCourse = null;
    $addBtn.prop('disabled', true);
    showSuggestions($(this).val());
  });
  $suggestions.on('mousedown', '.gcc__suggestion:not(.gcc__suggestion--empty)', function (e) {
    e.preventDefault();
    selectedCourse = {
      id: parseInt($(this).data('courseId'), 10),
      title: $(this).data('courseTitle')
    };
    $search.val(selectedCourse.title);
    $addBtn.prop('disabled', false);
    hideSuggestions();
  });
  $(document).on('click.courseConfig', e => {
    if (!$(e.target).closest('.gcc__search-wrap').length) {
      hideSuggestions();
      if (!selectedCourse) $search.val('');
    }
  });

  // ── Add course ────────────────────────────────────────────────────────────

  $addBtn.on('click', async () => {
    if (!selectedCourse || !currentGroupId) return;
    $addBtn.prop('disabled', true).text('Adding…');
    try {
      await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.post(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.addGroupCourse(currentGroupId, selectedCourse.id));
      // Re-fetch the canonical course list (includes the new course AND
      // its baked quizzes_show_test_grading_config / _reporting fields).
      groupCourses = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupCourses(currentGroupId), true);
      // Mutation write-through: replace the cache with the fresh response.
      _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].setCourses(Array.isArray(groupCourses) ? groupCourses : []);
      $search.val('');
      selectedCourse = null;
      renderList();
    } catch (err) {
      console.error('[course-config] Add course failed', err);
      showMessage('Could not add course. Please try again.', 'error');
    } finally {
      $addBtn.prop('disabled', !selectedCourse).text('Add');
    }
  });

  // ── Group selected ────────────────────────────────────────────────────────

  $(document).on('bys:groupSelected', (_, {
    groupId
  }) => {
    // courses come from the store — group-select writes them before firing.
    const courses = _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getCourses() || [];
    const isSiteEditor = window.bysGroupsAuth?.isSiteEditor === true;
    currentGroupId = groupId;
    selectedCourse = null;
    allCourses = [];
    $search.val('');
    $addBtn.prop('disabled', true);
    hideSuggestions();

    // Show/hide the entire add-course form for site editors
    $block.find('.gcc__add').toggle(!isSiteEditor);
    $skeleton.show();
    $list.empty();
    hideMessage();
    groupCourses = Array.isArray(courses) ? courses : [];
    $skeleton.hide();
    renderList();

    // Hide per-row remove and required toggle for site editors
    if (isSiteEditor) {
      $list.find('.gcc__remove, .gcc__toggle').hide();
    }
  });

  // Fast first paint: if the store has courses cached from a prior page in
  // this session, render the list immediately. The bys:groupSelected handler
  // above will re-render with fresh data shortly after.
  const cachedGroupId = _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getCurrentGroup();
  const cachedCourses = _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getCourses();
  if (cachedGroupId !== null && cachedCourses !== null) {
    currentGroupId = cachedGroupId;
    groupCourses = cachedCourses;
    renderList();
    $skeleton.hide();
  }
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map