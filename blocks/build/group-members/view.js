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
/*!***********************************!*\
  !*** ./src/group-members/view.js ***!
  \***********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/* harmony import */ var _shared_confirm_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/confirm.js */ "./src/_shared/confirm.js");
/* harmony import */ var _shared_store_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../_shared/store.js */ "./src/_shared/store.js");



const PAGE_SIZE = 5;
function buildMemberRow(member, groupId, onRemove, canModify) {
  const name = `${member.first_name} ${member.last_name}`.trim() || member.display_name;

  // Clone the #gm__template-member <template> and fill
  const template = document.getElementById('gm__template-member');
  const $row = jQuery(template.content.cloneNode(true)).find('.gm__item');
  $row.attr('data-user-id', member.id);
  $row.find('.gm__name').text(name);
  $row.find('.gm__email').text(member.email || '');

  // Avatar: <img> when a URL is provided
  const $avatar = $row.find('.gm__avatar');
  if (member.avatar) {
    const img = document.createElement('img');
    img.src = member.avatar;
    img.alt = name;
    $avatar.append(img);
  }

  // Remove button only shown to viewers who have manage-member permission
  // (site admins + org admins + group-leaders). Graders see the row but
  // not the button. Server enforces the same gate via can_manage_user_in_group.
  const $removeBtn = $row.find('.gm__remove');
  if (canModify) {
    $removeBtn.attr('aria-label', `Remove ${name}`).text('✕');
    $removeBtn.on('click', async function () {
      const $btn = jQuery(this);
      if (!(await (0,_shared_confirm_js__WEBPACK_IMPORTED_MODULE_1__.bysConfirm)(`Remove ${name} from this group?`, 'Remove'))) return;
      $btn.prop('disabled', true);
      try {
        await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.post(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.removeGroupUser(groupId, member.id));
        _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].removeUser(member.id);
        _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.invalidate(`/groups/${groupId}/users`);
        onRemove(member.id, $row);
      } catch (err) {
        console.error('[group-members] Failed to remove member', err);
        $btn.prop('disabled', false);
      }
    });
  } else {
    $removeBtn.remove();
  }
  return $row;
}
jQuery(document).ready(async $ => {
  const $block = $('.wp-block-bys-groups-group-members').first();
  if (!$block.length) return;
  const $skeleton = $block.find('.gm__skeleton');
  const $list = $block.find('.gm__list');
  const $message = $block.find('.gm__message');
  const $showMore = $block.find('.gm__show-more');
  const $countVal = $block.find('.gm__count-val');
  let allMembers = [];
  let currentGroupId = null;
  let displayedCount = 0; // how many members are currently rendered
  let canModify = false;
  function setCount(n) {
    $countVal.text(String(n));
  }
  function showMessage(text, variant) {
    $message.removeClass('gm__message--empty gm__message--error').addClass(`gm__message--${variant}`).text(text).show();
  }
  function hideMessage() {
    $message.hide().text('').removeClass('gm__message--empty gm__message--error');
  }
  function buildRowsFragment(members) {
    const frag = document.createDocumentFragment();
    members.forEach(m => {
      const $r = buildMemberRow(m, currentGroupId, onRemove, canModify);
      frag.appendChild($r[0]);
    });
    return frag;
  }
  function updateShowMoreButton() {
    const hasMore = displayedCount < allMembers.length;
    $showMore.toggle(hasMore);
  }

  // Initial render: empty the list, then paint the first PAGE_SIZE rows.
  function renderInitial() {
    $list.empty();
    const firstBatch = allMembers.slice(0, PAGE_SIZE);
    $list[0].appendChild(buildRowsFragment(firstBatch));
    displayedCount = firstBatch.length;
    updateShowMoreButton();
  }

  // Append the next PAGE_SIZE rows
  function loadMore() {
    const nextBatch = allMembers.slice(displayedCount, displayedCount + PAGE_SIZE);
    if (!nextBatch.length) return;
    $list[0].appendChild(buildRowsFragment(nextBatch));
    displayedCount += nextBatch.length;
    updateShowMoreButton();
  }
  function onRemove(userId, $row) {
    allMembers = allMembers.filter(m => m.id !== userId);
    setCount(allMembers.length);
    $row.fadeOut(200, () => {
      $row.remove();
      displayedCount = Math.max(0, displayedCount - 1);
      updateShowMoreButton();

      // if last member was removed, show empty message right away
      if (allMembers.length === 0) {
        showMessage('No members in this group.', 'empty');
      }
    });
  }
  $showMore.on('click', loadMore);
  async function getUserIdsForGroup(groupId) {
    const stored = _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getCurrentGroup() === Number(groupId) ? _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getUserIds() : null;
    if (stored !== null) {
      // console.log('[bys-store] group-members: HIT — read user_ids from store', stored);
      return stored;
    }

    // console.log('[bys-store] group-members: MISS — waiting for store / will fall back to fetch');
    return new Promise(resolve => {
      const off = _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe(() => {
        if (_shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getCurrentGroup() !== Number(groupId)) return;
        const ids = _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getUserIds();
        if (ids !== null) {
          off();
          resolve(ids);
        }
      });
      _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupBaseUsersStats(groupId)).then(stats => {
        if (_shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getCurrentGroup() !== Number(groupId) || _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getUsers() !== null) return;
        // console.log('[bys-store] group-members: self-fetched user_ids and wrote to store');
        _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].setCurrentGroup(groupId);
        _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].setUserIdsAsStubs(stats.user_ids || []);
      }).catch(err => {
        console.error('[group-members] self-fetch base-user-stats failed', err);
        off();
        resolve([]);
      });
    });
  }
  $(document).on('bys:groupSelected', async (_, {
    groupId,
    canManageMembers
  }) => {
    currentGroupId = groupId;
    displayedCount = 0;
    canModify = !!canManageMembers;
    $skeleton.show();
    $list.empty();
    $showMore.hide();
    hideMessage();
    $countVal.text('');
    const userIds = await getUserIdsForGroup(groupId);
    if (!userIds.length) {
      $skeleton.hide();
      setCount(0);
      showMessage('No members in this group.', 'empty');
      return;
    }
    try {
      // read the store and fallback to a REST request otherwise
      // hydrated in the store (typical after the first fetch in this
      // session), skip the network call entirely.
      const cachedHydrated = _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getCurrentGroup() === Number(groupId) ? _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].getHydratedUsers(userIds) : null;
      let members;
      if (cachedHydrated !== null) {
        // console.log('[bys-store] group-members: HIT hydrated — rendering from store, skipping fetch');
        members = cachedHydrated;
      } else {
        // console.log('[bys-store] group-members: MISS hydrated — fetching groupUsers and writing through');
        members = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupUsers(groupId, userIds.join(',')));
        _shared_store_js__WEBPACK_IMPORTED_MODULE_2__["default"].setUsers(members);
      }

      // Pre-compute the sort key once (Date.parse → ms number)
      allMembers = members.map(m => ({
        ...m,
        _enrolledMs: m.enrolled_at ? Date.parse(m.enrolled_at) : 0
      })).sort((a, b) => b._enrolledMs - a._enrolledMs);
      $skeleton.hide();
      setCount(allMembers.length);
      renderInitial();
    } catch (err) {
      console.error('[group-members] Failed to fetch members', err);
      $skeleton.hide();
      setCount(0);
      showMessage('Could not load members.', 'error');
    }
  });
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map