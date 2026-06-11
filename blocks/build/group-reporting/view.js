/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/_shared/alert.js"
/*!******************************!*\
  !*** ./src/_shared/alert.js ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bysAlert: () => (/* binding */ bysAlert)
/* harmony export */ });
/**
 * Shared alert component.
 *
 * Each call appends a fresh alert component to <body>. Clicking the overlay
 * or close button destroys (removes) the element so nothing lingers in the DOM.
 *
 * Usage:
 *     import { bysAlert } from '../_shared/alert.js';
 *     bysAlert('Something went wrong.');
 */

const $ = jQuery;
function bysAlert(message) {
  const $alert = $(`
        <div class="bys-groups-alert" role="dialog" aria-modal="true">
            <div class="bys-groups-alert__dialog">
                <button class="bys-groups-alert__close btn-unstyled" type="button" aria-label="Close alert">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <p class="bys-groups-alert__message"></p>
            </div>
        </div>
    `);
  $alert.find('.bys-groups-alert__message').text(message);
  $('body').append($alert);

  // Force reflow so the open class triggers the transition.
  $alert[0].offsetHeight;
  $alert.addClass('bys-groups-alert--open');
  const prevHtmlOverflow = $('html').css('overflow');
  $('html').css('overflow', 'hidden');
  return new Promise(resolve => {
    function destroy() {
      $alert.off('.bysAlert');
      $('html').css('overflow', prevHtmlOverflow || '');
      $alert.remove();
      resolve();
    }

    // Close button destroys (handler on the button so icon clicks still work).
    $alert.find('.bys-groups-alert__close').on('click.bysAlert', destroy);

    // Overlay click (but not clicks on the dialog itself) destroys.
    $alert.on('click.bysAlert', e => {
      if (e.target === $alert[0]) destroy();
    });
  });
}

/***/ },

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

/***/ },

/***/ "./node_modules/flatpickr/dist/esm/index.js"
/*!**************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/index.js ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _types_options__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./types/options */ "./node_modules/flatpickr/dist/esm/types/options.js");
/* harmony import */ var _l10n_default__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./l10n/default */ "./node_modules/flatpickr/dist/esm/l10n/default.js");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils */ "./node_modules/flatpickr/dist/esm/utils/index.js");
/* harmony import */ var _utils_dom__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils/dom */ "./node_modules/flatpickr/dist/esm/utils/dom.js");
/* harmony import */ var _utils_dates__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils/dates */ "./node_modules/flatpickr/dist/esm/utils/dates.js");
/* harmony import */ var _utils_formatting__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./utils/formatting */ "./node_modules/flatpickr/dist/esm/utils/formatting.js");
/* harmony import */ var _utils_polyfills__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./utils/polyfills */ "./node_modules/flatpickr/dist/esm/utils/polyfills.js");
/* harmony import */ var _utils_polyfills__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_utils_polyfills__WEBPACK_IMPORTED_MODULE_6__);
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (undefined && undefined.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};







var DEBOUNCED_CHANGE_MS = 300;
function FlatpickrInstance(element, instanceConfig) {
    var self = {
        config: __assign(__assign({}, _types_options__WEBPACK_IMPORTED_MODULE_0__.defaults), flatpickr.defaultConfig),
        l10n: _l10n_default__WEBPACK_IMPORTED_MODULE_1__["default"],
    };
    self.parseDate = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.createDateParser)({ config: self.config, l10n: self.l10n });
    self._handlers = [];
    self.pluginElements = [];
    self.loadedPlugins = [];
    self._bind = bind;
    self._setHoursFromDate = setHoursFromDate;
    self._positionCalendar = positionCalendar;
    self.changeMonth = changeMonth;
    self.changeYear = changeYear;
    self.clear = clear;
    self.close = close;
    self.onMouseOver = onMouseOver;
    self._createElement = _utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement;
    self.createDay = createDay;
    self.destroy = destroy;
    self.isEnabled = isEnabled;
    self.jumpToDate = jumpToDate;
    self.updateValue = updateValue;
    self.open = open;
    self.redraw = redraw;
    self.set = set;
    self.setDate = setDate;
    self.toggle = toggle;
    function setupHelperFunctions() {
        self.utils = {
            getDaysInMonth: function (month, yr) {
                if (month === void 0) { month = self.currentMonth; }
                if (yr === void 0) { yr = self.currentYear; }
                if (month === 1 && ((yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0))
                    return 29;
                return self.l10n.daysInMonth[month];
            },
        };
    }
    function init() {
        self.element = self.input = element;
        self.isOpen = false;
        parseConfig();
        setupLocale();
        setupInputs();
        setupDates();
        setupHelperFunctions();
        if (!self.isMobile)
            build();
        bindEvents();
        if (self.selectedDates.length || self.config.noCalendar) {
            if (self.config.enableTime) {
                setHoursFromDate(self.config.noCalendar ? self.latestSelectedDateObj : undefined);
            }
            updateValue(false);
        }
        setCalendarWidth();
        var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (!self.isMobile && isSafari) {
            positionCalendar();
        }
        triggerEvent("onReady");
    }
    function getClosestActiveElement() {
        var _a;
        return (((_a = self.calendarContainer) === null || _a === void 0 ? void 0 : _a.getRootNode())
            .activeElement || document.activeElement);
    }
    function bindToInstance(fn) {
        return fn.bind(self);
    }
    function setCalendarWidth() {
        var config = self.config;
        if (config.weekNumbers === false && config.showMonths === 1) {
            return;
        }
        else if (config.noCalendar !== true) {
            window.requestAnimationFrame(function () {
                if (self.calendarContainer !== undefined) {
                    self.calendarContainer.style.visibility = "hidden";
                    self.calendarContainer.style.display = "block";
                }
                if (self.daysContainer !== undefined) {
                    var daysWidth = (self.days.offsetWidth + 1) * config.showMonths;
                    self.daysContainer.style.width = daysWidth + "px";
                    self.calendarContainer.style.width =
                        daysWidth +
                            (self.weekWrapper !== undefined
                                ? self.weekWrapper.offsetWidth
                                : 0) +
                            "px";
                    self.calendarContainer.style.removeProperty("visibility");
                    self.calendarContainer.style.removeProperty("display");
                }
            });
        }
    }
    function updateTime(e) {
        if (self.selectedDates.length === 0) {
            var defaultDate = self.config.minDate === undefined ||
                (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(new Date(), self.config.minDate) >= 0
                ? new Date()
                : new Date(self.config.minDate.getTime());
            var defaults = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.getDefaultHours)(self.config);
            defaultDate.setHours(defaults.hours, defaults.minutes, defaults.seconds, defaultDate.getMilliseconds());
            self.selectedDates = [defaultDate];
            self.latestSelectedDateObj = defaultDate;
        }
        if (e !== undefined && e.type !== "blur") {
            timeWrapper(e);
        }
        var prevValue = self._input.value;
        setHoursFromInputs();
        updateValue();
        if (self._input.value !== prevValue) {
            self._debouncedChange();
        }
    }
    function ampm2military(hour, amPM) {
        return (hour % 12) + 12 * (0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(amPM === self.l10n.amPM[1]);
    }
    function military2ampm(hour) {
        switch (hour % 24) {
            case 0:
            case 12:
                return 12;
            default:
                return hour % 12;
        }
    }
    function setHoursFromInputs() {
        if (self.hourElement === undefined || self.minuteElement === undefined)
            return;
        var hours = (parseInt(self.hourElement.value.slice(-2), 10) || 0) % 24, minutes = (parseInt(self.minuteElement.value, 10) || 0) % 60, seconds = self.secondElement !== undefined
            ? (parseInt(self.secondElement.value, 10) || 0) % 60
            : 0;
        if (self.amPM !== undefined) {
            hours = ampm2military(hours, self.amPM.textContent);
        }
        var limitMinHours = self.config.minTime !== undefined ||
            (self.config.minDate &&
                self.minDateHasTime &&
                self.latestSelectedDateObj &&
                (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(self.latestSelectedDateObj, self.config.minDate, true) ===
                    0);
        var limitMaxHours = self.config.maxTime !== undefined ||
            (self.config.maxDate &&
                self.maxDateHasTime &&
                self.latestSelectedDateObj &&
                (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(self.latestSelectedDateObj, self.config.maxDate, true) ===
                    0);
        if (self.config.maxTime !== undefined &&
            self.config.minTime !== undefined &&
            self.config.minTime > self.config.maxTime) {
            var minBound = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.calculateSecondsSinceMidnight)(self.config.minTime.getHours(), self.config.minTime.getMinutes(), self.config.minTime.getSeconds());
            var maxBound = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.calculateSecondsSinceMidnight)(self.config.maxTime.getHours(), self.config.maxTime.getMinutes(), self.config.maxTime.getSeconds());
            var currentTime = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.calculateSecondsSinceMidnight)(hours, minutes, seconds);
            if (currentTime > maxBound && currentTime < minBound) {
                var result = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.parseSeconds)(minBound);
                hours = result[0];
                minutes = result[1];
                seconds = result[2];
            }
        }
        else {
            if (limitMaxHours) {
                var maxTime = self.config.maxTime !== undefined
                    ? self.config.maxTime
                    : self.config.maxDate;
                hours = Math.min(hours, maxTime.getHours());
                if (hours === maxTime.getHours())
                    minutes = Math.min(minutes, maxTime.getMinutes());
                if (minutes === maxTime.getMinutes())
                    seconds = Math.min(seconds, maxTime.getSeconds());
            }
            if (limitMinHours) {
                var minTime = self.config.minTime !== undefined
                    ? self.config.minTime
                    : self.config.minDate;
                hours = Math.max(hours, minTime.getHours());
                if (hours === minTime.getHours() && minutes < minTime.getMinutes())
                    minutes = minTime.getMinutes();
                if (minutes === minTime.getMinutes())
                    seconds = Math.max(seconds, minTime.getSeconds());
            }
        }
        setHours(hours, minutes, seconds);
    }
    function setHoursFromDate(dateObj) {
        var date = dateObj || self.latestSelectedDateObj;
        if (date && date instanceof Date) {
            setHours(date.getHours(), date.getMinutes(), date.getSeconds());
        }
    }
    function setHours(hours, minutes, seconds) {
        if (self.latestSelectedDateObj !== undefined) {
            self.latestSelectedDateObj.setHours(hours % 24, minutes, seconds || 0, 0);
        }
        if (!self.hourElement || !self.minuteElement || self.isMobile)
            return;
        self.hourElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(!self.config.time_24hr
            ? ((12 + hours) % 12) + 12 * (0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(hours % 12 === 0)
            : hours);
        self.minuteElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(minutes);
        if (self.amPM !== undefined)
            self.amPM.textContent = self.l10n.amPM[(0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(hours >= 12)];
        if (self.secondElement !== undefined)
            self.secondElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(seconds);
    }
    function onYearInput(event) {
        var eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(event);
        var year = parseInt(eventTarget.value) + (event.delta || 0);
        if (year / 1000 > 1 ||
            (event.key === "Enter" && !/[^\d]/.test(year.toString()))) {
            changeYear(year);
        }
    }
    function bind(element, event, handler, options) {
        if (event instanceof Array)
            return event.forEach(function (ev) { return bind(element, ev, handler, options); });
        if (element instanceof Array)
            return element.forEach(function (el) { return bind(el, event, handler, options); });
        element.addEventListener(event, handler, options);
        self._handlers.push({
            remove: function () { return element.removeEventListener(event, handler, options); },
        });
    }
    function triggerChange() {
        triggerEvent("onChange");
    }
    function bindEvents() {
        if (self.config.wrap) {
            ["open", "close", "toggle", "clear"].forEach(function (evt) {
                Array.prototype.forEach.call(self.element.querySelectorAll("[data-" + evt + "]"), function (el) {
                    return bind(el, "click", self[evt]);
                });
            });
        }
        if (self.isMobile) {
            setupMobile();
            return;
        }
        var debouncedResize = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.debounce)(onResize, 50);
        self._debouncedChange = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.debounce)(triggerChange, DEBOUNCED_CHANGE_MS);
        if (self.daysContainer && !/iPhone|iPad|iPod/i.test(navigator.userAgent))
            bind(self.daysContainer, "mouseover", function (e) {
                if (self.config.mode === "range")
                    onMouseOver((0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e));
            });
        bind(self._input, "keydown", onKeyDown);
        if (self.calendarContainer !== undefined) {
            bind(self.calendarContainer, "keydown", onKeyDown);
        }
        if (!self.config.inline && !self.config.static)
            bind(window, "resize", debouncedResize);
        if (window.ontouchstart !== undefined)
            bind(window.document, "touchstart", documentClick);
        else
            bind(window.document, "mousedown", documentClick);
        bind(window.document, "focus", documentClick, { capture: true });
        if (self.config.clickOpens === true) {
            bind(self._input, "focus", self.open);
            bind(self._input, "click", self.open);
        }
        if (self.daysContainer !== undefined) {
            bind(self.monthNav, "click", onMonthNavClick);
            bind(self.monthNav, ["keyup", "increment"], onYearInput);
            bind(self.daysContainer, "click", selectDate);
        }
        if (self.timeContainer !== undefined &&
            self.minuteElement !== undefined &&
            self.hourElement !== undefined) {
            var selText = function (e) {
                return (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e).select();
            };
            bind(self.timeContainer, ["increment"], updateTime);
            bind(self.timeContainer, "blur", updateTime, { capture: true });
            bind(self.timeContainer, "click", timeIncrement);
            bind([self.hourElement, self.minuteElement], ["focus", "click"], selText);
            if (self.secondElement !== undefined)
                bind(self.secondElement, "focus", function () { return self.secondElement && self.secondElement.select(); });
            if (self.amPM !== undefined) {
                bind(self.amPM, "click", function (e) {
                    updateTime(e);
                });
            }
        }
        if (self.config.allowInput) {
            bind(self._input, "blur", onBlur);
        }
    }
    function jumpToDate(jumpDate, triggerChange) {
        var jumpTo = jumpDate !== undefined
            ? self.parseDate(jumpDate)
            : self.latestSelectedDateObj ||
                (self.config.minDate && self.config.minDate > self.now
                    ? self.config.minDate
                    : self.config.maxDate && self.config.maxDate < self.now
                        ? self.config.maxDate
                        : self.now);
        var oldYear = self.currentYear;
        var oldMonth = self.currentMonth;
        try {
            if (jumpTo !== undefined) {
                self.currentYear = jumpTo.getFullYear();
                self.currentMonth = jumpTo.getMonth();
            }
        }
        catch (e) {
            e.message = "Invalid date supplied: " + jumpTo;
            self.config.errorHandler(e);
        }
        if (triggerChange && self.currentYear !== oldYear) {
            triggerEvent("onYearChange");
            buildMonthSwitch();
        }
        if (triggerChange &&
            (self.currentYear !== oldYear || self.currentMonth !== oldMonth)) {
            triggerEvent("onMonthChange");
        }
        self.redraw();
    }
    function timeIncrement(e) {
        var eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
        if (~eventTarget.className.indexOf("arrow"))
            incrementNumInput(e, eventTarget.classList.contains("arrowUp") ? 1 : -1);
    }
    function incrementNumInput(e, delta, inputElem) {
        var target = e && (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
        var input = inputElem ||
            (target && target.parentNode && target.parentNode.firstChild);
        var event = createEvent("increment");
        event.delta = delta;
        input && input.dispatchEvent(event);
    }
    function build() {
        var fragment = window.document.createDocumentFragment();
        self.calendarContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-calendar");
        self.calendarContainer.tabIndex = -1;
        if (!self.config.noCalendar) {
            fragment.appendChild(buildMonthNav());
            self.innerContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-innerContainer");
            if (self.config.weekNumbers) {
                var _a = buildWeeks(), weekWrapper = _a.weekWrapper, weekNumbers = _a.weekNumbers;
                self.innerContainer.appendChild(weekWrapper);
                self.weekNumbers = weekNumbers;
                self.weekWrapper = weekWrapper;
            }
            self.rContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-rContainer");
            self.rContainer.appendChild(buildWeekdays());
            if (!self.daysContainer) {
                self.daysContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-days");
                self.daysContainer.tabIndex = -1;
            }
            buildDays();
            self.rContainer.appendChild(self.daysContainer);
            self.innerContainer.appendChild(self.rContainer);
            fragment.appendChild(self.innerContainer);
        }
        if (self.config.enableTime) {
            fragment.appendChild(buildTime());
        }
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "rangeMode", self.config.mode === "range");
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "animate", self.config.animate === true);
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "multiMonth", self.config.showMonths > 1);
        self.calendarContainer.appendChild(fragment);
        var customAppend = self.config.appendTo !== undefined &&
            self.config.appendTo.nodeType !== undefined;
        if (self.config.inline || self.config.static) {
            self.calendarContainer.classList.add(self.config.inline ? "inline" : "static");
            if (self.config.inline) {
                if (!customAppend && self.element.parentNode)
                    self.element.parentNode.insertBefore(self.calendarContainer, self._input.nextSibling);
                else if (self.config.appendTo !== undefined)
                    self.config.appendTo.appendChild(self.calendarContainer);
            }
            if (self.config.static) {
                var wrapper = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-wrapper");
                if (self.element.parentNode)
                    self.element.parentNode.insertBefore(wrapper, self.element);
                wrapper.appendChild(self.element);
                if (self.altInput)
                    wrapper.appendChild(self.altInput);
                wrapper.appendChild(self.calendarContainer);
            }
        }
        if (!self.config.static && !self.config.inline)
            (self.config.appendTo !== undefined
                ? self.config.appendTo
                : window.document.body).appendChild(self.calendarContainer);
    }
    function createDay(className, date, _dayNumber, i) {
        var dateIsEnabled = isEnabled(date, true), dayElement = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", className, date.getDate().toString());
        dayElement.dateObj = date;
        dayElement.$i = i;
        dayElement.setAttribute("aria-label", self.formatDate(date, self.config.ariaDateFormat));
        if (className.indexOf("hidden") === -1 &&
            (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(date, self.now) === 0) {
            self.todayDateElem = dayElement;
            dayElement.classList.add("today");
            dayElement.setAttribute("aria-current", "date");
        }
        if (dateIsEnabled) {
            dayElement.tabIndex = -1;
            if (isDateSelected(date)) {
                dayElement.classList.add("selected");
                self.selectedDateElem = dayElement;
                if (self.config.mode === "range") {
                    (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(dayElement, "startRange", self.selectedDates[0] &&
                        (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(date, self.selectedDates[0], true) === 0);
                    (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(dayElement, "endRange", self.selectedDates[1] &&
                        (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(date, self.selectedDates[1], true) === 0);
                    if (className === "nextMonthDay")
                        dayElement.classList.add("inRange");
                }
            }
        }
        else {
            dayElement.classList.add("flatpickr-disabled");
        }
        if (self.config.mode === "range") {
            if (isDateInRange(date) && !isDateSelected(date))
                dayElement.classList.add("inRange");
        }
        if (self.weekNumbers &&
            self.config.showMonths === 1 &&
            className !== "prevMonthDay" &&
            i % 7 === 6) {
            self.weekNumbers.insertAdjacentHTML("beforeend", "<span class='flatpickr-day'>" + self.config.getWeek(date) + "</span>");
        }
        triggerEvent("onDayCreate", dayElement);
        return dayElement;
    }
    function focusOnDayElem(targetNode) {
        targetNode.focus();
        if (self.config.mode === "range")
            onMouseOver(targetNode);
    }
    function getFirstAvailableDay(delta) {
        var startMonth = delta > 0 ? 0 : self.config.showMonths - 1;
        var endMonth = delta > 0 ? self.config.showMonths : -1;
        for (var m = startMonth; m != endMonth; m += delta) {
            var month = self.daysContainer.children[m];
            var startIndex = delta > 0 ? 0 : month.children.length - 1;
            var endIndex = delta > 0 ? month.children.length : -1;
            for (var i = startIndex; i != endIndex; i += delta) {
                var c = month.children[i];
                if (c.className.indexOf("hidden") === -1 && isEnabled(c.dateObj))
                    return c;
            }
        }
        return undefined;
    }
    function getNextAvailableDay(current, delta) {
        var givenMonth = current.className.indexOf("Month") === -1
            ? current.dateObj.getMonth()
            : self.currentMonth;
        var endMonth = delta > 0 ? self.config.showMonths : -1;
        var loopDelta = delta > 0 ? 1 : -1;
        for (var m = givenMonth - self.currentMonth; m != endMonth; m += loopDelta) {
            var month = self.daysContainer.children[m];
            var startIndex = givenMonth - self.currentMonth === m
                ? current.$i + delta
                : delta < 0
                    ? month.children.length - 1
                    : 0;
            var numMonthDays = month.children.length;
            for (var i = startIndex; i >= 0 && i < numMonthDays && i != (delta > 0 ? numMonthDays : -1); i += loopDelta) {
                var c = month.children[i];
                if (c.className.indexOf("hidden") === -1 &&
                    isEnabled(c.dateObj) &&
                    Math.abs(current.$i - i) >= Math.abs(delta))
                    return focusOnDayElem(c);
            }
        }
        self.changeMonth(loopDelta);
        focusOnDay(getFirstAvailableDay(loopDelta), 0);
        return undefined;
    }
    function focusOnDay(current, offset) {
        var activeElement = getClosestActiveElement();
        var dayFocused = isInView(activeElement || document.body);
        var startElem = current !== undefined
            ? current
            : dayFocused
                ? activeElement
                : self.selectedDateElem !== undefined && isInView(self.selectedDateElem)
                    ? self.selectedDateElem
                    : self.todayDateElem !== undefined && isInView(self.todayDateElem)
                        ? self.todayDateElem
                        : getFirstAvailableDay(offset > 0 ? 1 : -1);
        if (startElem === undefined) {
            self._input.focus();
        }
        else if (!dayFocused) {
            focusOnDayElem(startElem);
        }
        else {
            getNextAvailableDay(startElem, offset);
        }
    }
    function buildMonthDays(year, month) {
        var firstOfMonth = (new Date(year, month, 1).getDay() - self.l10n.firstDayOfWeek + 7) % 7;
        var prevMonthDays = self.utils.getDaysInMonth((month - 1 + 12) % 12, year);
        var daysInMonth = self.utils.getDaysInMonth(month, year), days = window.document.createDocumentFragment(), isMultiMonth = self.config.showMonths > 1, prevMonthDayClass = isMultiMonth ? "prevMonthDay hidden" : "prevMonthDay", nextMonthDayClass = isMultiMonth ? "nextMonthDay hidden" : "nextMonthDay";
        var dayNumber = prevMonthDays + 1 - firstOfMonth, dayIndex = 0;
        for (; dayNumber <= prevMonthDays; dayNumber++, dayIndex++) {
            days.appendChild(createDay("flatpickr-day " + prevMonthDayClass, new Date(year, month - 1, dayNumber), dayNumber, dayIndex));
        }
        for (dayNumber = 1; dayNumber <= daysInMonth; dayNumber++, dayIndex++) {
            days.appendChild(createDay("flatpickr-day", new Date(year, month, dayNumber), dayNumber, dayIndex));
        }
        for (var dayNum = daysInMonth + 1; dayNum <= 42 - firstOfMonth &&
            (self.config.showMonths === 1 || dayIndex % 7 !== 0); dayNum++, dayIndex++) {
            days.appendChild(createDay("flatpickr-day " + nextMonthDayClass, new Date(year, month + 1, dayNum % daysInMonth), dayNum, dayIndex));
        }
        var dayContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "dayContainer");
        dayContainer.appendChild(days);
        return dayContainer;
    }
    function buildDays() {
        if (self.daysContainer === undefined) {
            return;
        }
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.clearNode)(self.daysContainer);
        if (self.weekNumbers)
            (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.clearNode)(self.weekNumbers);
        var frag = document.createDocumentFragment();
        for (var i = 0; i < self.config.showMonths; i++) {
            var d = new Date(self.currentYear, self.currentMonth, 1);
            d.setMonth(self.currentMonth + i);
            frag.appendChild(buildMonthDays(d.getFullYear(), d.getMonth()));
        }
        self.daysContainer.appendChild(frag);
        self.days = self.daysContainer.firstChild;
        if (self.config.mode === "range" && self.selectedDates.length === 1) {
            onMouseOver();
        }
    }
    function buildMonthSwitch() {
        if (self.config.showMonths > 1 ||
            self.config.monthSelectorType !== "dropdown")
            return;
        var shouldBuildMonth = function (month) {
            if (self.config.minDate !== undefined &&
                self.currentYear === self.config.minDate.getFullYear() &&
                month < self.config.minDate.getMonth()) {
                return false;
            }
            return !(self.config.maxDate !== undefined &&
                self.currentYear === self.config.maxDate.getFullYear() &&
                month > self.config.maxDate.getMonth());
        };
        self.monthsDropdownContainer.tabIndex = -1;
        self.monthsDropdownContainer.innerHTML = "";
        for (var i = 0; i < 12; i++) {
            if (!shouldBuildMonth(i))
                continue;
            var month = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("option", "flatpickr-monthDropdown-month");
            month.value = new Date(self.currentYear, i).getMonth().toString();
            month.textContent = (0,_utils_formatting__WEBPACK_IMPORTED_MODULE_5__.monthToStr)(i, self.config.shorthandCurrentMonth, self.l10n);
            month.tabIndex = -1;
            if (self.currentMonth === i) {
                month.selected = true;
            }
            self.monthsDropdownContainer.appendChild(month);
        }
    }
    function buildMonth() {
        var container = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-month");
        var monthNavFragment = window.document.createDocumentFragment();
        var monthElement;
        if (self.config.showMonths > 1 ||
            self.config.monthSelectorType === "static") {
            monthElement = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "cur-month");
        }
        else {
            self.monthsDropdownContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("select", "flatpickr-monthDropdown-months");
            self.monthsDropdownContainer.setAttribute("aria-label", self.l10n.monthAriaLabel);
            bind(self.monthsDropdownContainer, "change", function (e) {
                var target = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
                var selectedMonth = parseInt(target.value, 10);
                self.changeMonth(selectedMonth - self.currentMonth);
                triggerEvent("onMonthChange");
            });
            buildMonthSwitch();
            monthElement = self.monthsDropdownContainer;
        }
        var yearInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createNumberInput)("cur-year", { tabindex: "-1" });
        var yearElement = yearInput.getElementsByTagName("input")[0];
        yearElement.setAttribute("aria-label", self.l10n.yearAriaLabel);
        if (self.config.minDate) {
            yearElement.setAttribute("min", self.config.minDate.getFullYear().toString());
        }
        if (self.config.maxDate) {
            yearElement.setAttribute("max", self.config.maxDate.getFullYear().toString());
            yearElement.disabled =
                !!self.config.minDate &&
                    self.config.minDate.getFullYear() === self.config.maxDate.getFullYear();
        }
        var currentMonth = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-current-month");
        currentMonth.appendChild(monthElement);
        currentMonth.appendChild(yearInput);
        monthNavFragment.appendChild(currentMonth);
        container.appendChild(monthNavFragment);
        return {
            container: container,
            yearElement: yearElement,
            monthElement: monthElement,
        };
    }
    function buildMonths() {
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.clearNode)(self.monthNav);
        self.monthNav.appendChild(self.prevMonthNav);
        if (self.config.showMonths) {
            self.yearElements = [];
            self.monthElements = [];
        }
        for (var m = self.config.showMonths; m--;) {
            var month = buildMonth();
            self.yearElements.push(month.yearElement);
            self.monthElements.push(month.monthElement);
            self.monthNav.appendChild(month.container);
        }
        self.monthNav.appendChild(self.nextMonthNav);
    }
    function buildMonthNav() {
        self.monthNav = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-months");
        self.yearElements = [];
        self.monthElements = [];
        self.prevMonthNav = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-prev-month");
        self.prevMonthNav.innerHTML = self.config.prevArrow;
        self.nextMonthNav = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-next-month");
        self.nextMonthNav.innerHTML = self.config.nextArrow;
        buildMonths();
        Object.defineProperty(self, "_hidePrevMonthArrow", {
            get: function () { return self.__hidePrevMonthArrow; },
            set: function (bool) {
                if (self.__hidePrevMonthArrow !== bool) {
                    (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.prevMonthNav, "flatpickr-disabled", bool);
                    self.__hidePrevMonthArrow = bool;
                }
            },
        });
        Object.defineProperty(self, "_hideNextMonthArrow", {
            get: function () { return self.__hideNextMonthArrow; },
            set: function (bool) {
                if (self.__hideNextMonthArrow !== bool) {
                    (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.nextMonthNav, "flatpickr-disabled", bool);
                    self.__hideNextMonthArrow = bool;
                }
            },
        });
        self.currentYearElement = self.yearElements[0];
        updateNavigationCurrentMonth();
        return self.monthNav;
    }
    function buildTime() {
        self.calendarContainer.classList.add("hasTime");
        if (self.config.noCalendar)
            self.calendarContainer.classList.add("noCalendar");
        var defaults = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.getDefaultHours)(self.config);
        self.timeContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-time");
        self.timeContainer.tabIndex = -1;
        var separator = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-time-separator", ":");
        var hourInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createNumberInput)("flatpickr-hour", {
            "aria-label": self.l10n.hourAriaLabel,
        });
        self.hourElement = hourInput.getElementsByTagName("input")[0];
        var minuteInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createNumberInput)("flatpickr-minute", {
            "aria-label": self.l10n.minuteAriaLabel,
        });
        self.minuteElement = minuteInput.getElementsByTagName("input")[0];
        self.hourElement.tabIndex = self.minuteElement.tabIndex = -1;
        self.hourElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(self.latestSelectedDateObj
            ? self.latestSelectedDateObj.getHours()
            : self.config.time_24hr
                ? defaults.hours
                : military2ampm(defaults.hours));
        self.minuteElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(self.latestSelectedDateObj
            ? self.latestSelectedDateObj.getMinutes()
            : defaults.minutes);
        self.hourElement.setAttribute("step", self.config.hourIncrement.toString());
        self.minuteElement.setAttribute("step", self.config.minuteIncrement.toString());
        self.hourElement.setAttribute("min", self.config.time_24hr ? "0" : "1");
        self.hourElement.setAttribute("max", self.config.time_24hr ? "23" : "12");
        self.hourElement.setAttribute("maxlength", "2");
        self.minuteElement.setAttribute("min", "0");
        self.minuteElement.setAttribute("max", "59");
        self.minuteElement.setAttribute("maxlength", "2");
        self.timeContainer.appendChild(hourInput);
        self.timeContainer.appendChild(separator);
        self.timeContainer.appendChild(minuteInput);
        if (self.config.time_24hr)
            self.timeContainer.classList.add("time24hr");
        if (self.config.enableSeconds) {
            self.timeContainer.classList.add("hasSeconds");
            var secondInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createNumberInput)("flatpickr-second");
            self.secondElement = secondInput.getElementsByTagName("input")[0];
            self.secondElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(self.latestSelectedDateObj
                ? self.latestSelectedDateObj.getSeconds()
                : defaults.seconds);
            self.secondElement.setAttribute("step", self.minuteElement.getAttribute("step"));
            self.secondElement.setAttribute("min", "0");
            self.secondElement.setAttribute("max", "59");
            self.secondElement.setAttribute("maxlength", "2");
            self.timeContainer.appendChild((0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-time-separator", ":"));
            self.timeContainer.appendChild(secondInput);
        }
        if (!self.config.time_24hr) {
            self.amPM = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-am-pm", self.l10n.amPM[(0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)((self.latestSelectedDateObj
                ? self.hourElement.value
                : self.config.defaultHour) > 11)]);
            self.amPM.title = self.l10n.toggleTitle;
            self.amPM.tabIndex = -1;
            self.timeContainer.appendChild(self.amPM);
        }
        return self.timeContainer;
    }
    function buildWeekdays() {
        if (!self.weekdayContainer)
            self.weekdayContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-weekdays");
        else
            (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.clearNode)(self.weekdayContainer);
        for (var i = self.config.showMonths; i--;) {
            var container = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-weekdaycontainer");
            self.weekdayContainer.appendChild(container);
        }
        updateWeekdays();
        return self.weekdayContainer;
    }
    function updateWeekdays() {
        if (!self.weekdayContainer) {
            return;
        }
        var firstDayOfWeek = self.l10n.firstDayOfWeek;
        var weekdays = __spreadArrays(self.l10n.weekdays.shorthand);
        if (firstDayOfWeek > 0 && firstDayOfWeek < weekdays.length) {
            weekdays = __spreadArrays(weekdays.splice(firstDayOfWeek, weekdays.length), weekdays.splice(0, firstDayOfWeek));
        }
        for (var i = self.config.showMonths; i--;) {
            self.weekdayContainer.children[i].innerHTML = "\n      <span class='flatpickr-weekday'>\n        " + weekdays.join("</span><span class='flatpickr-weekday'>") + "\n      </span>\n      ";
        }
    }
    function buildWeeks() {
        self.calendarContainer.classList.add("hasWeeks");
        var weekWrapper = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-weekwrapper");
        weekWrapper.appendChild((0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-weekday", self.l10n.weekAbbreviation));
        var weekNumbers = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-weeks");
        weekWrapper.appendChild(weekNumbers);
        return {
            weekWrapper: weekWrapper,
            weekNumbers: weekNumbers,
        };
    }
    function changeMonth(value, isOffset) {
        if (isOffset === void 0) { isOffset = true; }
        var delta = isOffset ? value : value - self.currentMonth;
        if ((delta < 0 && self._hidePrevMonthArrow === true) ||
            (delta > 0 && self._hideNextMonthArrow === true))
            return;
        self.currentMonth += delta;
        if (self.currentMonth < 0 || self.currentMonth > 11) {
            self.currentYear += self.currentMonth > 11 ? 1 : -1;
            self.currentMonth = (self.currentMonth + 12) % 12;
            triggerEvent("onYearChange");
            buildMonthSwitch();
        }
        buildDays();
        triggerEvent("onMonthChange");
        updateNavigationCurrentMonth();
    }
    function clear(triggerChangeEvent, toInitial) {
        if (triggerChangeEvent === void 0) { triggerChangeEvent = true; }
        if (toInitial === void 0) { toInitial = true; }
        self.input.value = "";
        if (self.altInput !== undefined)
            self.altInput.value = "";
        if (self.mobileInput !== undefined)
            self.mobileInput.value = "";
        self.selectedDates = [];
        self.latestSelectedDateObj = undefined;
        if (toInitial === true) {
            self.currentYear = self._initialDate.getFullYear();
            self.currentMonth = self._initialDate.getMonth();
        }
        if (self.config.enableTime === true) {
            var _a = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.getDefaultHours)(self.config), hours = _a.hours, minutes = _a.minutes, seconds = _a.seconds;
            setHours(hours, minutes, seconds);
        }
        self.redraw();
        if (triggerChangeEvent)
            triggerEvent("onChange");
    }
    function close() {
        self.isOpen = false;
        if (!self.isMobile) {
            if (self.calendarContainer !== undefined) {
                self.calendarContainer.classList.remove("open");
            }
            if (self._input !== undefined) {
                self._input.classList.remove("active");
            }
        }
        triggerEvent("onClose");
    }
    function destroy() {
        if (self.config !== undefined)
            triggerEvent("onDestroy");
        for (var i = self._handlers.length; i--;) {
            self._handlers[i].remove();
        }
        self._handlers = [];
        if (self.mobileInput) {
            if (self.mobileInput.parentNode)
                self.mobileInput.parentNode.removeChild(self.mobileInput);
            self.mobileInput = undefined;
        }
        else if (self.calendarContainer && self.calendarContainer.parentNode) {
            if (self.config.static && self.calendarContainer.parentNode) {
                var wrapper = self.calendarContainer.parentNode;
                wrapper.lastChild && wrapper.removeChild(wrapper.lastChild);
                if (wrapper.parentNode) {
                    while (wrapper.firstChild)
                        wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
                    wrapper.parentNode.removeChild(wrapper);
                }
            }
            else
                self.calendarContainer.parentNode.removeChild(self.calendarContainer);
        }
        if (self.altInput) {
            self.input.type = "text";
            if (self.altInput.parentNode)
                self.altInput.parentNode.removeChild(self.altInput);
            delete self.altInput;
        }
        if (self.input) {
            self.input.type = self.input._type;
            self.input.classList.remove("flatpickr-input");
            self.input.removeAttribute("readonly");
        }
        [
            "_showTimeInput",
            "latestSelectedDateObj",
            "_hideNextMonthArrow",
            "_hidePrevMonthArrow",
            "__hideNextMonthArrow",
            "__hidePrevMonthArrow",
            "isMobile",
            "isOpen",
            "selectedDateElem",
            "minDateHasTime",
            "maxDateHasTime",
            "days",
            "daysContainer",
            "_input",
            "_positionElement",
            "innerContainer",
            "rContainer",
            "monthNav",
            "todayDateElem",
            "calendarContainer",
            "weekdayContainer",
            "prevMonthNav",
            "nextMonthNav",
            "monthsDropdownContainer",
            "currentMonthElement",
            "currentYearElement",
            "navigationCurrentMonth",
            "selectedDateElem",
            "config",
        ].forEach(function (k) {
            try {
                delete self[k];
            }
            catch (_) { }
        });
    }
    function isCalendarElem(elem) {
        return self.calendarContainer.contains(elem);
    }
    function documentClick(e) {
        if (self.isOpen && !self.config.inline) {
            var eventTarget_1 = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
            var isCalendarElement = isCalendarElem(eventTarget_1);
            var isInput = eventTarget_1 === self.input ||
                eventTarget_1 === self.altInput ||
                self.element.contains(eventTarget_1) ||
                (e.path &&
                    e.path.indexOf &&
                    (~e.path.indexOf(self.input) ||
                        ~e.path.indexOf(self.altInput)));
            var lostFocus = !isInput &&
                !isCalendarElement &&
                !isCalendarElem(e.relatedTarget);
            var isIgnored = !self.config.ignoredFocusElements.some(function (elem) {
                return elem.contains(eventTarget_1);
            });
            if (lostFocus && isIgnored) {
                if (self.config.allowInput) {
                    self.setDate(self._input.value, false, self.config.altInput
                        ? self.config.altFormat
                        : self.config.dateFormat);
                }
                if (self.timeContainer !== undefined &&
                    self.minuteElement !== undefined &&
                    self.hourElement !== undefined &&
                    self.input.value !== "" &&
                    self.input.value !== undefined) {
                    updateTime();
                }
                self.close();
                if (self.config &&
                    self.config.mode === "range" &&
                    self.selectedDates.length === 1)
                    self.clear(false);
            }
        }
    }
    function changeYear(newYear) {
        if (!newYear ||
            (self.config.minDate && newYear < self.config.minDate.getFullYear()) ||
            (self.config.maxDate && newYear > self.config.maxDate.getFullYear()))
            return;
        var newYearNum = newYear, isNewYear = self.currentYear !== newYearNum;
        self.currentYear = newYearNum || self.currentYear;
        if (self.config.maxDate &&
            self.currentYear === self.config.maxDate.getFullYear()) {
            self.currentMonth = Math.min(self.config.maxDate.getMonth(), self.currentMonth);
        }
        else if (self.config.minDate &&
            self.currentYear === self.config.minDate.getFullYear()) {
            self.currentMonth = Math.max(self.config.minDate.getMonth(), self.currentMonth);
        }
        if (isNewYear) {
            self.redraw();
            triggerEvent("onYearChange");
            buildMonthSwitch();
        }
    }
    function isEnabled(date, timeless) {
        var _a;
        if (timeless === void 0) { timeless = true; }
        var dateToCheck = self.parseDate(date, undefined, timeless);
        if ((self.config.minDate &&
            dateToCheck &&
            (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(dateToCheck, self.config.minDate, timeless !== undefined ? timeless : !self.minDateHasTime) < 0) ||
            (self.config.maxDate &&
                dateToCheck &&
                (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(dateToCheck, self.config.maxDate, timeless !== undefined ? timeless : !self.maxDateHasTime) > 0))
            return false;
        if (!self.config.enable && self.config.disable.length === 0)
            return true;
        if (dateToCheck === undefined)
            return false;
        var bool = !!self.config.enable, array = (_a = self.config.enable) !== null && _a !== void 0 ? _a : self.config.disable;
        for (var i = 0, d = void 0; i < array.length; i++) {
            d = array[i];
            if (typeof d === "function" &&
                d(dateToCheck))
                return bool;
            else if (d instanceof Date &&
                dateToCheck !== undefined &&
                d.getTime() === dateToCheck.getTime())
                return bool;
            else if (typeof d === "string") {
                var parsed = self.parseDate(d, undefined, true);
                return parsed && parsed.getTime() === dateToCheck.getTime()
                    ? bool
                    : !bool;
            }
            else if (typeof d === "object" &&
                dateToCheck !== undefined &&
                d.from &&
                d.to &&
                dateToCheck.getTime() >= d.from.getTime() &&
                dateToCheck.getTime() <= d.to.getTime())
                return bool;
        }
        return !bool;
    }
    function isInView(elem) {
        if (self.daysContainer !== undefined)
            return (elem.className.indexOf("hidden") === -1 &&
                elem.className.indexOf("flatpickr-disabled") === -1 &&
                self.daysContainer.contains(elem));
        return false;
    }
    function onBlur(e) {
        var isInput = e.target === self._input;
        var valueChanged = self._input.value.trimEnd() !== getDateStr();
        if (isInput &&
            valueChanged &&
            !(e.relatedTarget && isCalendarElem(e.relatedTarget))) {
            self.setDate(self._input.value, true, e.target === self.altInput
                ? self.config.altFormat
                : self.config.dateFormat);
        }
    }
    function onKeyDown(e) {
        var eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
        var isInput = self.config.wrap
            ? element.contains(eventTarget)
            : eventTarget === self._input;
        var allowInput = self.config.allowInput;
        var allowKeydown = self.isOpen && (!allowInput || !isInput);
        var allowInlineKeydown = self.config.inline && isInput && !allowInput;
        if (e.keyCode === 13 && isInput) {
            if (allowInput) {
                self.setDate(self._input.value, true, eventTarget === self.altInput
                    ? self.config.altFormat
                    : self.config.dateFormat);
                self.close();
                return eventTarget.blur();
            }
            else {
                self.open();
            }
        }
        else if (isCalendarElem(eventTarget) ||
            allowKeydown ||
            allowInlineKeydown) {
            var isTimeObj = !!self.timeContainer &&
                self.timeContainer.contains(eventTarget);
            switch (e.keyCode) {
                case 13:
                    if (isTimeObj) {
                        e.preventDefault();
                        updateTime();
                        focusAndClose();
                    }
                    else
                        selectDate(e);
                    break;
                case 27:
                    e.preventDefault();
                    focusAndClose();
                    break;
                case 8:
                case 46:
                    if (isInput && !self.config.allowInput) {
                        e.preventDefault();
                        self.clear();
                    }
                    break;
                case 37:
                case 39:
                    if (!isTimeObj && !isInput) {
                        e.preventDefault();
                        var activeElement = getClosestActiveElement();
                        if (self.daysContainer !== undefined &&
                            (allowInput === false ||
                                (activeElement && isInView(activeElement)))) {
                            var delta_1 = e.keyCode === 39 ? 1 : -1;
                            if (!e.ctrlKey)
                                focusOnDay(undefined, delta_1);
                            else {
                                e.stopPropagation();
                                changeMonth(delta_1);
                                focusOnDay(getFirstAvailableDay(1), 0);
                            }
                        }
                    }
                    else if (self.hourElement)
                        self.hourElement.focus();
                    break;
                case 38:
                case 40:
                    e.preventDefault();
                    var delta = e.keyCode === 40 ? 1 : -1;
                    if ((self.daysContainer &&
                        eventTarget.$i !== undefined) ||
                        eventTarget === self.input ||
                        eventTarget === self.altInput) {
                        if (e.ctrlKey) {
                            e.stopPropagation();
                            changeYear(self.currentYear - delta);
                            focusOnDay(getFirstAvailableDay(1), 0);
                        }
                        else if (!isTimeObj)
                            focusOnDay(undefined, delta * 7);
                    }
                    else if (eventTarget === self.currentYearElement) {
                        changeYear(self.currentYear - delta);
                    }
                    else if (self.config.enableTime) {
                        if (!isTimeObj && self.hourElement)
                            self.hourElement.focus();
                        updateTime(e);
                        self._debouncedChange();
                    }
                    break;
                case 9:
                    if (isTimeObj) {
                        var elems = [
                            self.hourElement,
                            self.minuteElement,
                            self.secondElement,
                            self.amPM,
                        ]
                            .concat(self.pluginElements)
                            .filter(function (x) { return x; });
                        var i = elems.indexOf(eventTarget);
                        if (i !== -1) {
                            var target = elems[i + (e.shiftKey ? -1 : 1)];
                            e.preventDefault();
                            (target || self._input).focus();
                        }
                    }
                    else if (!self.config.noCalendar &&
                        self.daysContainer &&
                        self.daysContainer.contains(eventTarget) &&
                        e.shiftKey) {
                        e.preventDefault();
                        self._input.focus();
                    }
                    break;
                default:
                    break;
            }
        }
        if (self.amPM !== undefined && eventTarget === self.amPM) {
            switch (e.key) {
                case self.l10n.amPM[0].charAt(0):
                case self.l10n.amPM[0].charAt(0).toLowerCase():
                    self.amPM.textContent = self.l10n.amPM[0];
                    setHoursFromInputs();
                    updateValue();
                    break;
                case self.l10n.amPM[1].charAt(0):
                case self.l10n.amPM[1].charAt(0).toLowerCase():
                    self.amPM.textContent = self.l10n.amPM[1];
                    setHoursFromInputs();
                    updateValue();
                    break;
            }
        }
        if (isInput || isCalendarElem(eventTarget)) {
            triggerEvent("onKeyDown", e);
        }
    }
    function onMouseOver(elem, cellClass) {
        if (cellClass === void 0) { cellClass = "flatpickr-day"; }
        if (self.selectedDates.length !== 1 ||
            (elem &&
                (!elem.classList.contains(cellClass) ||
                    elem.classList.contains("flatpickr-disabled"))))
            return;
        var hoverDate = elem
            ? elem.dateObj.getTime()
            : self.days.firstElementChild.dateObj.getTime(), initialDate = self.parseDate(self.selectedDates[0], undefined, true).getTime(), rangeStartDate = Math.min(hoverDate, self.selectedDates[0].getTime()), rangeEndDate = Math.max(hoverDate, self.selectedDates[0].getTime());
        var containsDisabled = false;
        var minRange = 0, maxRange = 0;
        for (var t = rangeStartDate; t < rangeEndDate; t += _utils_dates__WEBPACK_IMPORTED_MODULE_4__.duration.DAY) {
            if (!isEnabled(new Date(t), true)) {
                containsDisabled =
                    containsDisabled || (t > rangeStartDate && t < rangeEndDate);
                if (t < initialDate && (!minRange || t > minRange))
                    minRange = t;
                else if (t > initialDate && (!maxRange || t < maxRange))
                    maxRange = t;
            }
        }
        var hoverableCells = Array.from(self.rContainer.querySelectorAll("*:nth-child(-n+" + self.config.showMonths + ") > ." + cellClass));
        hoverableCells.forEach(function (dayElem) {
            var date = dayElem.dateObj;
            var timestamp = date.getTime();
            var outOfRange = (minRange > 0 && timestamp < minRange) ||
                (maxRange > 0 && timestamp > maxRange);
            if (outOfRange) {
                dayElem.classList.add("notAllowed");
                ["inRange", "startRange", "endRange"].forEach(function (c) {
                    dayElem.classList.remove(c);
                });
                return;
            }
            else if (containsDisabled && !outOfRange)
                return;
            ["startRange", "inRange", "endRange", "notAllowed"].forEach(function (c) {
                dayElem.classList.remove(c);
            });
            if (elem !== undefined) {
                elem.classList.add(hoverDate <= self.selectedDates[0].getTime()
                    ? "startRange"
                    : "endRange");
                if (initialDate < hoverDate && timestamp === initialDate)
                    dayElem.classList.add("startRange");
                else if (initialDate > hoverDate && timestamp === initialDate)
                    dayElem.classList.add("endRange");
                if (timestamp >= minRange &&
                    (maxRange === 0 || timestamp <= maxRange) &&
                    (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.isBetween)(timestamp, initialDate, hoverDate))
                    dayElem.classList.add("inRange");
            }
        });
    }
    function onResize() {
        if (self.isOpen && !self.config.static && !self.config.inline)
            positionCalendar();
    }
    function open(e, positionElement) {
        if (positionElement === void 0) { positionElement = self._positionElement; }
        if (self.isMobile === true) {
            if (e) {
                e.preventDefault();
                var eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
                if (eventTarget) {
                    eventTarget.blur();
                }
            }
            if (self.mobileInput !== undefined) {
                self.mobileInput.focus();
                self.mobileInput.click();
            }
            triggerEvent("onOpen");
            return;
        }
        else if (self._input.disabled || self.config.inline) {
            return;
        }
        var wasOpen = self.isOpen;
        self.isOpen = true;
        if (!wasOpen) {
            self.calendarContainer.classList.add("open");
            self._input.classList.add("active");
            triggerEvent("onOpen");
            positionCalendar(positionElement);
        }
        if (self.config.enableTime === true && self.config.noCalendar === true) {
            if (self.config.allowInput === false &&
                (e === undefined ||
                    !self.timeContainer.contains(e.relatedTarget))) {
                setTimeout(function () { return self.hourElement.select(); }, 50);
            }
        }
    }
    function minMaxDateSetter(type) {
        return function (date) {
            var dateObj = (self.config["_" + type + "Date"] = self.parseDate(date, self.config.dateFormat));
            var inverseDateObj = self.config["_" + (type === "min" ? "max" : "min") + "Date"];
            if (dateObj !== undefined) {
                self[type === "min" ? "minDateHasTime" : "maxDateHasTime"] =
                    dateObj.getHours() > 0 ||
                        dateObj.getMinutes() > 0 ||
                        dateObj.getSeconds() > 0;
            }
            if (self.selectedDates) {
                self.selectedDates = self.selectedDates.filter(function (d) { return isEnabled(d); });
                if (!self.selectedDates.length && type === "min")
                    setHoursFromDate(dateObj);
                updateValue();
            }
            if (self.daysContainer) {
                redraw();
                if (dateObj !== undefined)
                    self.currentYearElement[type] = dateObj.getFullYear().toString();
                else
                    self.currentYearElement.removeAttribute(type);
                self.currentYearElement.disabled =
                    !!inverseDateObj &&
                        dateObj !== undefined &&
                        inverseDateObj.getFullYear() === dateObj.getFullYear();
            }
        };
    }
    function parseConfig() {
        var boolOpts = [
            "wrap",
            "weekNumbers",
            "allowInput",
            "allowInvalidPreload",
            "clickOpens",
            "time_24hr",
            "enableTime",
            "noCalendar",
            "altInput",
            "shorthandCurrentMonth",
            "inline",
            "static",
            "enableSeconds",
            "disableMobile",
        ];
        var userConfig = __assign(__assign({}, JSON.parse(JSON.stringify(element.dataset || {}))), instanceConfig);
        var formats = {};
        self.config.parseDate = userConfig.parseDate;
        self.config.formatDate = userConfig.formatDate;
        Object.defineProperty(self.config, "enable", {
            get: function () { return self.config._enable; },
            set: function (dates) {
                self.config._enable = parseDateRules(dates);
            },
        });
        Object.defineProperty(self.config, "disable", {
            get: function () { return self.config._disable; },
            set: function (dates) {
                self.config._disable = parseDateRules(dates);
            },
        });
        var timeMode = userConfig.mode === "time";
        if (!userConfig.dateFormat && (userConfig.enableTime || timeMode)) {
            var defaultDateFormat = flatpickr.defaultConfig.dateFormat || _types_options__WEBPACK_IMPORTED_MODULE_0__.defaults.dateFormat;
            formats.dateFormat =
                userConfig.noCalendar || timeMode
                    ? "H:i" + (userConfig.enableSeconds ? ":S" : "")
                    : defaultDateFormat + " H:i" + (userConfig.enableSeconds ? ":S" : "");
        }
        if (userConfig.altInput &&
            (userConfig.enableTime || timeMode) &&
            !userConfig.altFormat) {
            var defaultAltFormat = flatpickr.defaultConfig.altFormat || _types_options__WEBPACK_IMPORTED_MODULE_0__.defaults.altFormat;
            formats.altFormat =
                userConfig.noCalendar || timeMode
                    ? "h:i" + (userConfig.enableSeconds ? ":S K" : " K")
                    : defaultAltFormat + (" h:i" + (userConfig.enableSeconds ? ":S" : "") + " K");
        }
        Object.defineProperty(self.config, "minDate", {
            get: function () { return self.config._minDate; },
            set: minMaxDateSetter("min"),
        });
        Object.defineProperty(self.config, "maxDate", {
            get: function () { return self.config._maxDate; },
            set: minMaxDateSetter("max"),
        });
        var minMaxTimeSetter = function (type) { return function (val) {
            self.config[type === "min" ? "_minTime" : "_maxTime"] = self.parseDate(val, "H:i:S");
        }; };
        Object.defineProperty(self.config, "minTime", {
            get: function () { return self.config._minTime; },
            set: minMaxTimeSetter("min"),
        });
        Object.defineProperty(self.config, "maxTime", {
            get: function () { return self.config._maxTime; },
            set: minMaxTimeSetter("max"),
        });
        if (userConfig.mode === "time") {
            self.config.noCalendar = true;
            self.config.enableTime = true;
        }
        Object.assign(self.config, formats, userConfig);
        for (var i = 0; i < boolOpts.length; i++)
            self.config[boolOpts[i]] =
                self.config[boolOpts[i]] === true ||
                    self.config[boolOpts[i]] === "true";
        _types_options__WEBPACK_IMPORTED_MODULE_0__.HOOKS.filter(function (hook) { return self.config[hook] !== undefined; }).forEach(function (hook) {
            self.config[hook] = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.arrayify)(self.config[hook] || []).map(bindToInstance);
        });
        self.isMobile =
            !self.config.disableMobile &&
                !self.config.inline &&
                self.config.mode === "single" &&
                !self.config.disable.length &&
                !self.config.enable &&
                !self.config.weekNumbers &&
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        for (var i = 0; i < self.config.plugins.length; i++) {
            var pluginConf = self.config.plugins[i](self) || {};
            for (var key in pluginConf) {
                if (_types_options__WEBPACK_IMPORTED_MODULE_0__.HOOKS.indexOf(key) > -1) {
                    self.config[key] = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.arrayify)(pluginConf[key])
                        .map(bindToInstance)
                        .concat(self.config[key]);
                }
                else if (typeof userConfig[key] === "undefined")
                    self.config[key] = pluginConf[key];
            }
        }
        if (!userConfig.altInputClass) {
            self.config.altInputClass =
                getInputElem().className + " " + self.config.altInputClass;
        }
        triggerEvent("onParseConfig");
    }
    function getInputElem() {
        return self.config.wrap
            ? element.querySelector("[data-input]")
            : element;
    }
    function setupLocale() {
        if (typeof self.config.locale !== "object" &&
            typeof flatpickr.l10ns[self.config.locale] === "undefined")
            self.config.errorHandler(new Error("flatpickr: invalid locale " + self.config.locale));
        self.l10n = __assign(__assign({}, flatpickr.l10ns.default), (typeof self.config.locale === "object"
            ? self.config.locale
            : self.config.locale !== "default"
                ? flatpickr.l10ns[self.config.locale]
                : undefined));
        _utils_formatting__WEBPACK_IMPORTED_MODULE_5__.tokenRegex.D = "(" + self.l10n.weekdays.shorthand.join("|") + ")";
        _utils_formatting__WEBPACK_IMPORTED_MODULE_5__.tokenRegex.l = "(" + self.l10n.weekdays.longhand.join("|") + ")";
        _utils_formatting__WEBPACK_IMPORTED_MODULE_5__.tokenRegex.M = "(" + self.l10n.months.shorthand.join("|") + ")";
        _utils_formatting__WEBPACK_IMPORTED_MODULE_5__.tokenRegex.F = "(" + self.l10n.months.longhand.join("|") + ")";
        _utils_formatting__WEBPACK_IMPORTED_MODULE_5__.tokenRegex.K = "(" + self.l10n.amPM[0] + "|" + self.l10n.amPM[1] + "|" + self.l10n.amPM[0].toLowerCase() + "|" + self.l10n.amPM[1].toLowerCase() + ")";
        var userConfig = __assign(__assign({}, instanceConfig), JSON.parse(JSON.stringify(element.dataset || {})));
        if (userConfig.time_24hr === undefined &&
            flatpickr.defaultConfig.time_24hr === undefined) {
            self.config.time_24hr = self.l10n.time_24hr;
        }
        self.formatDate = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.createDateFormatter)(self);
        self.parseDate = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.createDateParser)({ config: self.config, l10n: self.l10n });
    }
    function positionCalendar(customPositionElement) {
        if (typeof self.config.position === "function") {
            return void self.config.position(self, customPositionElement);
        }
        if (self.calendarContainer === undefined)
            return;
        triggerEvent("onPreCalendarPosition");
        var positionElement = customPositionElement || self._positionElement;
        var calendarHeight = Array.prototype.reduce.call(self.calendarContainer.children, (function (acc, child) { return acc + child.offsetHeight; }), 0), calendarWidth = self.calendarContainer.offsetWidth, configPos = self.config.position.split(" "), configPosVertical = configPos[0], configPosHorizontal = configPos.length > 1 ? configPos[1] : null, inputBounds = positionElement.getBoundingClientRect(), distanceFromBottom = window.innerHeight - inputBounds.bottom, showOnTop = configPosVertical === "above" ||
            (configPosVertical !== "below" &&
                distanceFromBottom < calendarHeight &&
                inputBounds.top > calendarHeight);
        var top = window.pageYOffset +
            inputBounds.top +
            (!showOnTop ? positionElement.offsetHeight + 2 : -calendarHeight - 2);
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "arrowTop", !showOnTop);
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "arrowBottom", showOnTop);
        if (self.config.inline)
            return;
        var left = window.pageXOffset + inputBounds.left;
        var isCenter = false;
        var isRight = false;
        if (configPosHorizontal === "center") {
            left -= (calendarWidth - inputBounds.width) / 2;
            isCenter = true;
        }
        else if (configPosHorizontal === "right") {
            left -= calendarWidth - inputBounds.width;
            isRight = true;
        }
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "arrowLeft", !isCenter && !isRight);
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "arrowCenter", isCenter);
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "arrowRight", isRight);
        var right = window.document.body.offsetWidth -
            (window.pageXOffset + inputBounds.right);
        var rightMost = left + calendarWidth > window.document.body.offsetWidth;
        var centerMost = right + calendarWidth > window.document.body.offsetWidth;
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "rightMost", rightMost);
        if (self.config.static)
            return;
        self.calendarContainer.style.top = top + "px";
        if (!rightMost) {
            self.calendarContainer.style.left = left + "px";
            self.calendarContainer.style.right = "auto";
        }
        else if (!centerMost) {
            self.calendarContainer.style.left = "auto";
            self.calendarContainer.style.right = right + "px";
        }
        else {
            var doc = getDocumentStyleSheet();
            if (doc === undefined)
                return;
            var bodyWidth = window.document.body.offsetWidth;
            var centerLeft = Math.max(0, bodyWidth / 2 - calendarWidth / 2);
            var centerBefore = ".flatpickr-calendar.centerMost:before";
            var centerAfter = ".flatpickr-calendar.centerMost:after";
            var centerIndex = doc.cssRules.length;
            var centerStyle = "{left:" + inputBounds.left + "px;right:auto;}";
            (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "rightMost", false);
            (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "centerMost", true);
            doc.insertRule(centerBefore + "," + centerAfter + centerStyle, centerIndex);
            self.calendarContainer.style.left = centerLeft + "px";
            self.calendarContainer.style.right = "auto";
        }
    }
    function getDocumentStyleSheet() {
        var editableSheet = null;
        for (var i = 0; i < document.styleSheets.length; i++) {
            var sheet = document.styleSheets[i];
            if (!sheet.cssRules)
                continue;
            try {
                sheet.cssRules;
            }
            catch (err) {
                continue;
            }
            editableSheet = sheet;
            break;
        }
        return editableSheet != null ? editableSheet : createStyleSheet();
    }
    function createStyleSheet() {
        var style = document.createElement("style");
        document.head.appendChild(style);
        return style.sheet;
    }
    function redraw() {
        if (self.config.noCalendar || self.isMobile)
            return;
        buildMonthSwitch();
        updateNavigationCurrentMonth();
        buildDays();
    }
    function focusAndClose() {
        self._input.focus();
        if (window.navigator.userAgent.indexOf("MSIE") !== -1 ||
            navigator.msMaxTouchPoints !== undefined) {
            setTimeout(self.close, 0);
        }
        else {
            self.close();
        }
    }
    function selectDate(e) {
        e.preventDefault();
        e.stopPropagation();
        var isSelectable = function (day) {
            return day.classList &&
                day.classList.contains("flatpickr-day") &&
                !day.classList.contains("flatpickr-disabled") &&
                !day.classList.contains("notAllowed");
        };
        var t = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.findParent)((0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e), isSelectable);
        if (t === undefined)
            return;
        var target = t;
        var selectedDate = (self.latestSelectedDateObj = new Date(target.dateObj.getTime()));
        var shouldChangeMonth = (selectedDate.getMonth() < self.currentMonth ||
            selectedDate.getMonth() >
                self.currentMonth + self.config.showMonths - 1) &&
            self.config.mode !== "range";
        self.selectedDateElem = target;
        if (self.config.mode === "single")
            self.selectedDates = [selectedDate];
        else if (self.config.mode === "multiple") {
            var selectedIndex = isDateSelected(selectedDate);
            if (selectedIndex)
                self.selectedDates.splice(parseInt(selectedIndex), 1);
            else
                self.selectedDates.push(selectedDate);
        }
        else if (self.config.mode === "range") {
            if (self.selectedDates.length === 2) {
                self.clear(false, false);
            }
            self.latestSelectedDateObj = selectedDate;
            self.selectedDates.push(selectedDate);
            if ((0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(selectedDate, self.selectedDates[0], true) !== 0)
                self.selectedDates.sort(function (a, b) { return a.getTime() - b.getTime(); });
        }
        setHoursFromInputs();
        if (shouldChangeMonth) {
            var isNewYear = self.currentYear !== selectedDate.getFullYear();
            self.currentYear = selectedDate.getFullYear();
            self.currentMonth = selectedDate.getMonth();
            if (isNewYear) {
                triggerEvent("onYearChange");
                buildMonthSwitch();
            }
            triggerEvent("onMonthChange");
        }
        updateNavigationCurrentMonth();
        buildDays();
        updateValue();
        if (!shouldChangeMonth &&
            self.config.mode !== "range" &&
            self.config.showMonths === 1)
            focusOnDayElem(target);
        else if (self.selectedDateElem !== undefined &&
            self.hourElement === undefined) {
            self.selectedDateElem && self.selectedDateElem.focus();
        }
        if (self.hourElement !== undefined)
            self.hourElement !== undefined && self.hourElement.focus();
        if (self.config.closeOnSelect) {
            var single = self.config.mode === "single" && !self.config.enableTime;
            var range = self.config.mode === "range" &&
                self.selectedDates.length === 2 &&
                !self.config.enableTime;
            if (single || range) {
                focusAndClose();
            }
        }
        triggerChange();
    }
    var CALLBACKS = {
        locale: [setupLocale, updateWeekdays],
        showMonths: [buildMonths, setCalendarWidth, buildWeekdays],
        minDate: [jumpToDate],
        maxDate: [jumpToDate],
        positionElement: [updatePositionElement],
        clickOpens: [
            function () {
                if (self.config.clickOpens === true) {
                    bind(self._input, "focus", self.open);
                    bind(self._input, "click", self.open);
                }
                else {
                    self._input.removeEventListener("focus", self.open);
                    self._input.removeEventListener("click", self.open);
                }
            },
        ],
    };
    function set(option, value) {
        if (option !== null && typeof option === "object") {
            Object.assign(self.config, option);
            for (var key in option) {
                if (CALLBACKS[key] !== undefined)
                    CALLBACKS[key].forEach(function (x) { return x(); });
            }
        }
        else {
            self.config[option] = value;
            if (CALLBACKS[option] !== undefined)
                CALLBACKS[option].forEach(function (x) { return x(); });
            else if (_types_options__WEBPACK_IMPORTED_MODULE_0__.HOOKS.indexOf(option) > -1)
                self.config[option] = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.arrayify)(value);
        }
        self.redraw();
        updateValue(true);
    }
    function setSelectedDate(inputDate, format) {
        var dates = [];
        if (inputDate instanceof Array)
            dates = inputDate.map(function (d) { return self.parseDate(d, format); });
        else if (inputDate instanceof Date || typeof inputDate === "number")
            dates = [self.parseDate(inputDate, format)];
        else if (typeof inputDate === "string") {
            switch (self.config.mode) {
                case "single":
                case "time":
                    dates = [self.parseDate(inputDate, format)];
                    break;
                case "multiple":
                    dates = inputDate
                        .split(self.config.conjunction)
                        .map(function (date) { return self.parseDate(date, format); });
                    break;
                case "range":
                    dates = inputDate
                        .split(self.l10n.rangeSeparator)
                        .map(function (date) { return self.parseDate(date, format); });
                    break;
                default:
                    break;
            }
        }
        else
            self.config.errorHandler(new Error("Invalid date supplied: " + JSON.stringify(inputDate)));
        self.selectedDates = (self.config.allowInvalidPreload
            ? dates
            : dates.filter(function (d) { return d instanceof Date && isEnabled(d, false); }));
        if (self.config.mode === "range")
            self.selectedDates.sort(function (a, b) { return a.getTime() - b.getTime(); });
    }
    function setDate(date, triggerChange, format) {
        if (triggerChange === void 0) { triggerChange = false; }
        if (format === void 0) { format = self.config.dateFormat; }
        if ((date !== 0 && !date) || (date instanceof Array && date.length === 0))
            return self.clear(triggerChange);
        setSelectedDate(date, format);
        self.latestSelectedDateObj =
            self.selectedDates[self.selectedDates.length - 1];
        self.redraw();
        jumpToDate(undefined, triggerChange);
        setHoursFromDate();
        if (self.selectedDates.length === 0) {
            self.clear(false);
        }
        updateValue(triggerChange);
        if (triggerChange)
            triggerEvent("onChange");
    }
    function parseDateRules(arr) {
        return arr
            .slice()
            .map(function (rule) {
            if (typeof rule === "string" ||
                typeof rule === "number" ||
                rule instanceof Date) {
                return self.parseDate(rule, undefined, true);
            }
            else if (rule &&
                typeof rule === "object" &&
                rule.from &&
                rule.to)
                return {
                    from: self.parseDate(rule.from, undefined),
                    to: self.parseDate(rule.to, undefined),
                };
            return rule;
        })
            .filter(function (x) { return x; });
    }
    function setupDates() {
        self.selectedDates = [];
        self.now = self.parseDate(self.config.now) || new Date();
        var preloadedDate = self.config.defaultDate ||
            ((self.input.nodeName === "INPUT" ||
                self.input.nodeName === "TEXTAREA") &&
                self.input.placeholder &&
                self.input.value === self.input.placeholder
                ? null
                : self.input.value);
        if (preloadedDate)
            setSelectedDate(preloadedDate, self.config.dateFormat);
        self._initialDate =
            self.selectedDates.length > 0
                ? self.selectedDates[0]
                : self.config.minDate &&
                    self.config.minDate.getTime() > self.now.getTime()
                    ? self.config.minDate
                    : self.config.maxDate &&
                        self.config.maxDate.getTime() < self.now.getTime()
                        ? self.config.maxDate
                        : self.now;
        self.currentYear = self._initialDate.getFullYear();
        self.currentMonth = self._initialDate.getMonth();
        if (self.selectedDates.length > 0)
            self.latestSelectedDateObj = self.selectedDates[0];
        if (self.config.minTime !== undefined)
            self.config.minTime = self.parseDate(self.config.minTime, "H:i");
        if (self.config.maxTime !== undefined)
            self.config.maxTime = self.parseDate(self.config.maxTime, "H:i");
        self.minDateHasTime =
            !!self.config.minDate &&
                (self.config.minDate.getHours() > 0 ||
                    self.config.minDate.getMinutes() > 0 ||
                    self.config.minDate.getSeconds() > 0);
        self.maxDateHasTime =
            !!self.config.maxDate &&
                (self.config.maxDate.getHours() > 0 ||
                    self.config.maxDate.getMinutes() > 0 ||
                    self.config.maxDate.getSeconds() > 0);
    }
    function setupInputs() {
        self.input = getInputElem();
        if (!self.input) {
            self.config.errorHandler(new Error("Invalid input element specified"));
            return;
        }
        self.input._type = self.input.type;
        self.input.type = "text";
        self.input.classList.add("flatpickr-input");
        self._input = self.input;
        if (self.config.altInput) {
            self.altInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)(self.input.nodeName, self.config.altInputClass);
            self._input = self.altInput;
            self.altInput.placeholder = self.input.placeholder;
            self.altInput.disabled = self.input.disabled;
            self.altInput.required = self.input.required;
            self.altInput.tabIndex = self.input.tabIndex;
            self.altInput.type = "text";
            self.input.setAttribute("type", "hidden");
            if (!self.config.static && self.input.parentNode)
                self.input.parentNode.insertBefore(self.altInput, self.input.nextSibling);
        }
        if (!self.config.allowInput)
            self._input.setAttribute("readonly", "readonly");
        updatePositionElement();
    }
    function updatePositionElement() {
        self._positionElement = self.config.positionElement || self._input;
    }
    function setupMobile() {
        var inputType = self.config.enableTime
            ? self.config.noCalendar
                ? "time"
                : "datetime-local"
            : "date";
        self.mobileInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("input", self.input.className + " flatpickr-mobile");
        self.mobileInput.tabIndex = 1;
        self.mobileInput.type = inputType;
        self.mobileInput.disabled = self.input.disabled;
        self.mobileInput.required = self.input.required;
        self.mobileInput.placeholder = self.input.placeholder;
        self.mobileFormatStr =
            inputType === "datetime-local"
                ? "Y-m-d\\TH:i:S"
                : inputType === "date"
                    ? "Y-m-d"
                    : "H:i:S";
        if (self.selectedDates.length > 0) {
            self.mobileInput.defaultValue = self.mobileInput.value = self.formatDate(self.selectedDates[0], self.mobileFormatStr);
        }
        if (self.config.minDate)
            self.mobileInput.min = self.formatDate(self.config.minDate, "Y-m-d");
        if (self.config.maxDate)
            self.mobileInput.max = self.formatDate(self.config.maxDate, "Y-m-d");
        if (self.input.getAttribute("step"))
            self.mobileInput.step = String(self.input.getAttribute("step"));
        self.input.type = "hidden";
        if (self.altInput !== undefined)
            self.altInput.type = "hidden";
        try {
            if (self.input.parentNode)
                self.input.parentNode.insertBefore(self.mobileInput, self.input.nextSibling);
        }
        catch (_a) { }
        bind(self.mobileInput, "change", function (e) {
            self.setDate((0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e).value, false, self.mobileFormatStr);
            triggerEvent("onChange");
            triggerEvent("onClose");
        });
    }
    function toggle(e) {
        if (self.isOpen === true)
            return self.close();
        self.open(e);
    }
    function triggerEvent(event, data) {
        if (self.config === undefined)
            return;
        var hooks = self.config[event];
        if (hooks !== undefined && hooks.length > 0) {
            for (var i = 0; hooks[i] && i < hooks.length; i++)
                hooks[i](self.selectedDates, self.input.value, self, data);
        }
        if (event === "onChange") {
            self.input.dispatchEvent(createEvent("change"));
            self.input.dispatchEvent(createEvent("input"));
        }
    }
    function createEvent(name) {
        var e = document.createEvent("Event");
        e.initEvent(name, true, true);
        return e;
    }
    function isDateSelected(date) {
        for (var i = 0; i < self.selectedDates.length; i++) {
            var selectedDate = self.selectedDates[i];
            if (selectedDate instanceof Date &&
                (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(selectedDate, date) === 0)
                return "" + i;
        }
        return false;
    }
    function isDateInRange(date) {
        if (self.config.mode !== "range" || self.selectedDates.length < 2)
            return false;
        return ((0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(date, self.selectedDates[0]) >= 0 &&
            (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(date, self.selectedDates[1]) <= 0);
    }
    function updateNavigationCurrentMonth() {
        if (self.config.noCalendar || self.isMobile || !self.monthNav)
            return;
        self.yearElements.forEach(function (yearElement, i) {
            var d = new Date(self.currentYear, self.currentMonth, 1);
            d.setMonth(self.currentMonth + i);
            if (self.config.showMonths > 1 ||
                self.config.monthSelectorType === "static") {
                self.monthElements[i].textContent =
                    (0,_utils_formatting__WEBPACK_IMPORTED_MODULE_5__.monthToStr)(d.getMonth(), self.config.shorthandCurrentMonth, self.l10n) + " ";
            }
            else {
                self.monthsDropdownContainer.value = d.getMonth().toString();
            }
            yearElement.value = d.getFullYear().toString();
        });
        self._hidePrevMonthArrow =
            self.config.minDate !== undefined &&
                (self.currentYear === self.config.minDate.getFullYear()
                    ? self.currentMonth <= self.config.minDate.getMonth()
                    : self.currentYear < self.config.minDate.getFullYear());
        self._hideNextMonthArrow =
            self.config.maxDate !== undefined &&
                (self.currentYear === self.config.maxDate.getFullYear()
                    ? self.currentMonth + 1 > self.config.maxDate.getMonth()
                    : self.currentYear > self.config.maxDate.getFullYear());
    }
    function getDateStr(specificFormat) {
        var format = specificFormat ||
            (self.config.altInput ? self.config.altFormat : self.config.dateFormat);
        return self.selectedDates
            .map(function (dObj) { return self.formatDate(dObj, format); })
            .filter(function (d, i, arr) {
            return self.config.mode !== "range" ||
                self.config.enableTime ||
                arr.indexOf(d) === i;
        })
            .join(self.config.mode !== "range"
            ? self.config.conjunction
            : self.l10n.rangeSeparator);
    }
    function updateValue(triggerChange) {
        if (triggerChange === void 0) { triggerChange = true; }
        if (self.mobileInput !== undefined && self.mobileFormatStr) {
            self.mobileInput.value =
                self.latestSelectedDateObj !== undefined
                    ? self.formatDate(self.latestSelectedDateObj, self.mobileFormatStr)
                    : "";
        }
        self.input.value = getDateStr(self.config.dateFormat);
        if (self.altInput !== undefined) {
            self.altInput.value = getDateStr(self.config.altFormat);
        }
        if (triggerChange !== false)
            triggerEvent("onValueUpdate");
    }
    function onMonthNavClick(e) {
        var eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
        var isPrevMonth = self.prevMonthNav.contains(eventTarget);
        var isNextMonth = self.nextMonthNav.contains(eventTarget);
        if (isPrevMonth || isNextMonth) {
            changeMonth(isPrevMonth ? -1 : 1);
        }
        else if (self.yearElements.indexOf(eventTarget) >= 0) {
            eventTarget.select();
        }
        else if (eventTarget.classList.contains("arrowUp")) {
            self.changeYear(self.currentYear + 1);
        }
        else if (eventTarget.classList.contains("arrowDown")) {
            self.changeYear(self.currentYear - 1);
        }
    }
    function timeWrapper(e) {
        e.preventDefault();
        var isKeyDown = e.type === "keydown", eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e), input = eventTarget;
        if (self.amPM !== undefined && eventTarget === self.amPM) {
            self.amPM.textContent =
                self.l10n.amPM[(0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(self.amPM.textContent === self.l10n.amPM[0])];
        }
        var min = parseFloat(input.getAttribute("min")), max = parseFloat(input.getAttribute("max")), step = parseFloat(input.getAttribute("step")), curValue = parseInt(input.value, 10), delta = e.delta ||
            (isKeyDown ? (e.which === 38 ? 1 : -1) : 0);
        var newValue = curValue + step * delta;
        if (typeof input.value !== "undefined" && input.value.length === 2) {
            var isHourElem = input === self.hourElement, isMinuteElem = input === self.minuteElement;
            if (newValue < min) {
                newValue =
                    max +
                        newValue +
                        (0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(!isHourElem) +
                        ((0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(isHourElem) && (0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(!self.amPM));
                if (isMinuteElem)
                    incrementNumInput(undefined, -1, self.hourElement);
            }
            else if (newValue > max) {
                newValue =
                    input === self.hourElement ? newValue - max - (0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(!self.amPM) : min;
                if (isMinuteElem)
                    incrementNumInput(undefined, 1, self.hourElement);
            }
            if (self.amPM &&
                isHourElem &&
                (step === 1
                    ? newValue + curValue === 23
                    : Math.abs(newValue - curValue) > step)) {
                self.amPM.textContent =
                    self.l10n.amPM[(0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(self.amPM.textContent === self.l10n.amPM[0])];
            }
            input.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(newValue);
        }
    }
    init();
    return self;
}
function _flatpickr(nodeList, config) {
    var nodes = Array.prototype.slice
        .call(nodeList)
        .filter(function (x) { return x instanceof HTMLElement; });
    var instances = [];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        try {
            if (node.getAttribute("data-fp-omit") !== null)
                continue;
            if (node._flatpickr !== undefined) {
                node._flatpickr.destroy();
                node._flatpickr = undefined;
            }
            node._flatpickr = FlatpickrInstance(node, config || {});
            instances.push(node._flatpickr);
        }
        catch (e) {
            console.error(e);
        }
    }
    return instances.length === 1 ? instances[0] : instances;
}
if (typeof HTMLElement !== "undefined" &&
    typeof HTMLCollection !== "undefined" &&
    typeof NodeList !== "undefined") {
    HTMLCollection.prototype.flatpickr = NodeList.prototype.flatpickr = function (config) {
        return _flatpickr(this, config);
    };
    HTMLElement.prototype.flatpickr = function (config) {
        return _flatpickr([this], config);
    };
}
var flatpickr = function (selector, config) {
    if (typeof selector === "string") {
        return _flatpickr(window.document.querySelectorAll(selector), config);
    }
    else if (selector instanceof Node) {
        return _flatpickr([selector], config);
    }
    else {
        return _flatpickr(selector, config);
    }
};
flatpickr.defaultConfig = {};
flatpickr.l10ns = {
    en: __assign({}, _l10n_default__WEBPACK_IMPORTED_MODULE_1__["default"]),
    default: __assign({}, _l10n_default__WEBPACK_IMPORTED_MODULE_1__["default"]),
};
flatpickr.localize = function (l10n) {
    flatpickr.l10ns.default = __assign(__assign({}, flatpickr.l10ns.default), l10n);
};
flatpickr.setDefaults = function (config) {
    flatpickr.defaultConfig = __assign(__assign({}, flatpickr.defaultConfig), config);
};
flatpickr.parseDate = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.createDateParser)({});
flatpickr.formatDate = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.createDateFormatter)({});
flatpickr.compareDates = _utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates;
if (typeof jQuery !== "undefined" && typeof jQuery.fn !== "undefined") {
    jQuery.fn.flatpickr = function (config) {
        return _flatpickr(this, config);
    };
}
Date.prototype.fp_incr = function (days) {
    return new Date(this.getFullYear(), this.getMonth(), this.getDate() + (typeof days === "string" ? parseInt(days, 10) : days));
};
if (typeof window !== "undefined") {
    window.flatpickr = flatpickr;
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (flatpickr);


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/l10n/default.js"
/*!*********************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/l10n/default.js ***!
  \*********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   english: () => (/* binding */ english)
/* harmony export */ });
var english = {
    weekdays: {
        shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        longhand: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ],
    },
    months: {
        shorthand: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ],
        longhand: [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ],
    },
    daysInMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    firstDayOfWeek: 0,
    ordinal: function (nth) {
        var s = nth % 100;
        if (s > 3 && s < 21)
            return "th";
        switch (s % 10) {
            case 1:
                return "st";
            case 2:
                return "nd";
            case 3:
                return "rd";
            default:
                return "th";
        }
    },
    rangeSeparator: " to ",
    weekAbbreviation: "Wk",
    scrollTitle: "Scroll to increment",
    toggleTitle: "Click to toggle",
    amPM: ["AM", "PM"],
    yearAriaLabel: "Year",
    monthAriaLabel: "Month",
    hourAriaLabel: "Hour",
    minuteAriaLabel: "Minute",
    time_24hr: false,
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (english);


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/types/options.js"
/*!**********************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/types/options.js ***!
  \**********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HOOKS: () => (/* binding */ HOOKS),
/* harmony export */   defaults: () => (/* binding */ defaults)
/* harmony export */ });
var HOOKS = [
    "onChange",
    "onClose",
    "onDayCreate",
    "onDestroy",
    "onKeyDown",
    "onMonthChange",
    "onOpen",
    "onParseConfig",
    "onReady",
    "onValueUpdate",
    "onYearChange",
    "onPreCalendarPosition",
];
var defaults = {
    _disable: [],
    allowInput: false,
    allowInvalidPreload: false,
    altFormat: "F j, Y",
    altInput: false,
    altInputClass: "form-control input",
    animate: typeof window === "object" &&
        window.navigator.userAgent.indexOf("MSIE") === -1,
    ariaDateFormat: "F j, Y",
    autoFillDefaultTime: true,
    clickOpens: true,
    closeOnSelect: true,
    conjunction: ", ",
    dateFormat: "Y-m-d",
    defaultHour: 12,
    defaultMinute: 0,
    defaultSeconds: 0,
    disable: [],
    disableMobile: false,
    enableSeconds: false,
    enableTime: false,
    errorHandler: function (err) {
        return typeof console !== "undefined" && console.warn(err);
    },
    getWeek: function (givenDate) {
        var date = new Date(givenDate.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
        var week1 = new Date(date.getFullYear(), 0, 4);
        return (1 +
            Math.round(((date.getTime() - week1.getTime()) / 86400000 -
                3 +
                ((week1.getDay() + 6) % 7)) /
                7));
    },
    hourIncrement: 1,
    ignoredFocusElements: [],
    inline: false,
    locale: "default",
    minuteIncrement: 5,
    mode: "single",
    monthSelectorType: "dropdown",
    nextArrow: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 17 17'><g></g><path d='M13.207 8.472l-7.854 7.854-0.707-0.707 7.146-7.146-7.146-7.148 0.707-0.707 7.854 7.854z' /></svg>",
    noCalendar: false,
    now: new Date(),
    onChange: [],
    onClose: [],
    onDayCreate: [],
    onDestroy: [],
    onKeyDown: [],
    onMonthChange: [],
    onOpen: [],
    onParseConfig: [],
    onReady: [],
    onValueUpdate: [],
    onYearChange: [],
    onPreCalendarPosition: [],
    plugins: [],
    position: "auto",
    positionElement: undefined,
    prevArrow: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 17 17'><g></g><path d='M5.207 8.471l7.146 7.147-0.707 0.707-7.853-7.854 7.854-7.853 0.707 0.707-7.147 7.146z' /></svg>",
    shorthandCurrentMonth: false,
    showMonths: 1,
    static: false,
    time_24hr: false,
    weekNumbers: false,
    wrap: false,
};


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/utils/dates.js"
/*!********************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/utils/dates.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   calculateSecondsSinceMidnight: () => (/* binding */ calculateSecondsSinceMidnight),
/* harmony export */   compareDates: () => (/* binding */ compareDates),
/* harmony export */   compareTimes: () => (/* binding */ compareTimes),
/* harmony export */   createDateFormatter: () => (/* binding */ createDateFormatter),
/* harmony export */   createDateParser: () => (/* binding */ createDateParser),
/* harmony export */   duration: () => (/* binding */ duration),
/* harmony export */   getDefaultHours: () => (/* binding */ getDefaultHours),
/* harmony export */   isBetween: () => (/* binding */ isBetween),
/* harmony export */   parseSeconds: () => (/* binding */ parseSeconds)
/* harmony export */ });
/* harmony import */ var _formatting__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./formatting */ "./node_modules/flatpickr/dist/esm/utils/formatting.js");
/* harmony import */ var _types_options__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../types/options */ "./node_modules/flatpickr/dist/esm/types/options.js");
/* harmony import */ var _l10n_default__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../l10n/default */ "./node_modules/flatpickr/dist/esm/l10n/default.js");



var createDateFormatter = function (_a) {
    var _b = _a.config, config = _b === void 0 ? _types_options__WEBPACK_IMPORTED_MODULE_1__.defaults : _b, _c = _a.l10n, l10n = _c === void 0 ? _l10n_default__WEBPACK_IMPORTED_MODULE_2__.english : _c, _d = _a.isMobile, isMobile = _d === void 0 ? false : _d;
    return function (dateObj, frmt, overrideLocale) {
        var locale = overrideLocale || l10n;
        if (config.formatDate !== undefined && !isMobile) {
            return config.formatDate(dateObj, frmt, locale);
        }
        return frmt
            .split("")
            .map(function (c, i, arr) {
            return _formatting__WEBPACK_IMPORTED_MODULE_0__.formats[c] && arr[i - 1] !== "\\"
                ? _formatting__WEBPACK_IMPORTED_MODULE_0__.formats[c](dateObj, locale, config)
                : c !== "\\"
                    ? c
                    : "";
        })
            .join("");
    };
};
var createDateParser = function (_a) {
    var _b = _a.config, config = _b === void 0 ? _types_options__WEBPACK_IMPORTED_MODULE_1__.defaults : _b, _c = _a.l10n, l10n = _c === void 0 ? _l10n_default__WEBPACK_IMPORTED_MODULE_2__.english : _c;
    return function (date, givenFormat, timeless, customLocale) {
        if (date !== 0 && !date)
            return undefined;
        var locale = customLocale || l10n;
        var parsedDate;
        var dateOrig = date;
        if (date instanceof Date)
            parsedDate = new Date(date.getTime());
        else if (typeof date !== "string" &&
            date.toFixed !== undefined)
            parsedDate = new Date(date);
        else if (typeof date === "string") {
            var format = givenFormat || (config || _types_options__WEBPACK_IMPORTED_MODULE_1__.defaults).dateFormat;
            var datestr = String(date).trim();
            if (datestr === "today") {
                parsedDate = new Date();
                timeless = true;
            }
            else if (config && config.parseDate) {
                parsedDate = config.parseDate(date, format);
            }
            else if (/Z$/.test(datestr) ||
                /GMT$/.test(datestr)) {
                parsedDate = new Date(date);
            }
            else {
                var matched = void 0, ops = [];
                for (var i = 0, matchIndex = 0, regexStr = ""; i < format.length; i++) {
                    var token = format[i];
                    var isBackSlash = token === "\\";
                    var escaped = format[i - 1] === "\\" || isBackSlash;
                    if (_formatting__WEBPACK_IMPORTED_MODULE_0__.tokenRegex[token] && !escaped) {
                        regexStr += _formatting__WEBPACK_IMPORTED_MODULE_0__.tokenRegex[token];
                        var match = new RegExp(regexStr).exec(date);
                        if (match && (matched = true)) {
                            ops[token !== "Y" ? "push" : "unshift"]({
                                fn: _formatting__WEBPACK_IMPORTED_MODULE_0__.revFormat[token],
                                val: match[++matchIndex],
                            });
                        }
                    }
                    else if (!isBackSlash)
                        regexStr += ".";
                }
                parsedDate =
                    !config || !config.noCalendar
                        ? new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0)
                        : new Date(new Date().setHours(0, 0, 0, 0));
                ops.forEach(function (_a) {
                    var fn = _a.fn, val = _a.val;
                    return (parsedDate = fn(parsedDate, val, locale) || parsedDate);
                });
                parsedDate = matched ? parsedDate : undefined;
            }
        }
        if (!(parsedDate instanceof Date && !isNaN(parsedDate.getTime()))) {
            config.errorHandler(new Error("Invalid date provided: " + dateOrig));
            return undefined;
        }
        if (timeless === true)
            parsedDate.setHours(0, 0, 0, 0);
        return parsedDate;
    };
};
function compareDates(date1, date2, timeless) {
    if (timeless === void 0) { timeless = true; }
    if (timeless !== false) {
        return (new Date(date1.getTime()).setHours(0, 0, 0, 0) -
            new Date(date2.getTime()).setHours(0, 0, 0, 0));
    }
    return date1.getTime() - date2.getTime();
}
function compareTimes(date1, date2) {
    return (3600 * (date1.getHours() - date2.getHours()) +
        60 * (date1.getMinutes() - date2.getMinutes()) +
        date1.getSeconds() -
        date2.getSeconds());
}
var isBetween = function (ts, ts1, ts2) {
    return ts > Math.min(ts1, ts2) && ts < Math.max(ts1, ts2);
};
var calculateSecondsSinceMidnight = function (hours, minutes, seconds) {
    return hours * 3600 + minutes * 60 + seconds;
};
var parseSeconds = function (secondsSinceMidnight) {
    var hours = Math.floor(secondsSinceMidnight / 3600), minutes = (secondsSinceMidnight - hours * 3600) / 60;
    return [hours, minutes, secondsSinceMidnight - hours * 3600 - minutes * 60];
};
var duration = {
    DAY: 86400000,
};
function getDefaultHours(config) {
    var hours = config.defaultHour;
    var minutes = config.defaultMinute;
    var seconds = config.defaultSeconds;
    if (config.minDate !== undefined) {
        var minHour = config.minDate.getHours();
        var minMinutes = config.minDate.getMinutes();
        var minSeconds = config.minDate.getSeconds();
        if (hours < minHour) {
            hours = minHour;
        }
        if (hours === minHour && minutes < minMinutes) {
            minutes = minMinutes;
        }
        if (hours === minHour && minutes === minMinutes && seconds < minSeconds)
            seconds = config.minDate.getSeconds();
    }
    if (config.maxDate !== undefined) {
        var maxHr = config.maxDate.getHours();
        var maxMinutes = config.maxDate.getMinutes();
        hours = Math.min(hours, maxHr);
        if (hours === maxHr)
            minutes = Math.min(maxMinutes, minutes);
        if (hours === maxHr && minutes === maxMinutes)
            seconds = config.maxDate.getSeconds();
    }
    return { hours: hours, minutes: minutes, seconds: seconds };
}


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/utils/dom.js"
/*!******************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/utils/dom.js ***!
  \******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clearNode: () => (/* binding */ clearNode),
/* harmony export */   createElement: () => (/* binding */ createElement),
/* harmony export */   createNumberInput: () => (/* binding */ createNumberInput),
/* harmony export */   findParent: () => (/* binding */ findParent),
/* harmony export */   getEventTarget: () => (/* binding */ getEventTarget),
/* harmony export */   toggleClass: () => (/* binding */ toggleClass)
/* harmony export */ });
function toggleClass(elem, className, bool) {
    if (bool === true)
        return elem.classList.add(className);
    elem.classList.remove(className);
}
function createElement(tag, className, content) {
    var e = window.document.createElement(tag);
    className = className || "";
    content = content || "";
    e.className = className;
    if (content !== undefined)
        e.textContent = content;
    return e;
}
function clearNode(node) {
    while (node.firstChild)
        node.removeChild(node.firstChild);
}
function findParent(node, condition) {
    if (condition(node))
        return node;
    else if (node.parentNode)
        return findParent(node.parentNode, condition);
    return undefined;
}
function createNumberInput(inputClassName, opts) {
    var wrapper = createElement("div", "numInputWrapper"), numInput = createElement("input", "numInput " + inputClassName), arrowUp = createElement("span", "arrowUp"), arrowDown = createElement("span", "arrowDown");
    if (navigator.userAgent.indexOf("MSIE 9.0") === -1) {
        numInput.type = "number";
    }
    else {
        numInput.type = "text";
        numInput.pattern = "\\d*";
    }
    if (opts !== undefined)
        for (var key in opts)
            numInput.setAttribute(key, opts[key]);
    wrapper.appendChild(numInput);
    wrapper.appendChild(arrowUp);
    wrapper.appendChild(arrowDown);
    return wrapper;
}
function getEventTarget(event) {
    try {
        if (typeof event.composedPath === "function") {
            var path = event.composedPath();
            return path[0];
        }
        return event.target;
    }
    catch (error) {
        return event.target;
    }
}


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/utils/formatting.js"
/*!*************************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/utils/formatting.js ***!
  \*************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   formats: () => (/* binding */ formats),
/* harmony export */   monthToStr: () => (/* binding */ monthToStr),
/* harmony export */   revFormat: () => (/* binding */ revFormat),
/* harmony export */   tokenRegex: () => (/* binding */ tokenRegex)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils */ "./node_modules/flatpickr/dist/esm/utils/index.js");

var doNothing = function () { return undefined; };
var monthToStr = function (monthNumber, shorthand, locale) { return locale.months[shorthand ? "shorthand" : "longhand"][monthNumber]; };
var revFormat = {
    D: doNothing,
    F: function (dateObj, monthName, locale) {
        dateObj.setMonth(locale.months.longhand.indexOf(monthName));
    },
    G: function (dateObj, hour) {
        dateObj.setHours((dateObj.getHours() >= 12 ? 12 : 0) + parseFloat(hour));
    },
    H: function (dateObj, hour) {
        dateObj.setHours(parseFloat(hour));
    },
    J: function (dateObj, day) {
        dateObj.setDate(parseFloat(day));
    },
    K: function (dateObj, amPM, locale) {
        dateObj.setHours((dateObj.getHours() % 12) +
            12 * (0,_utils__WEBPACK_IMPORTED_MODULE_0__.int)(new RegExp(locale.amPM[1], "i").test(amPM)));
    },
    M: function (dateObj, shortMonth, locale) {
        dateObj.setMonth(locale.months.shorthand.indexOf(shortMonth));
    },
    S: function (dateObj, seconds) {
        dateObj.setSeconds(parseFloat(seconds));
    },
    U: function (_, unixSeconds) { return new Date(parseFloat(unixSeconds) * 1000); },
    W: function (dateObj, weekNum, locale) {
        var weekNumber = parseInt(weekNum);
        var date = new Date(dateObj.getFullYear(), 0, 2 + (weekNumber - 1) * 7, 0, 0, 0, 0);
        date.setDate(date.getDate() - date.getDay() + locale.firstDayOfWeek);
        return date;
    },
    Y: function (dateObj, year) {
        dateObj.setFullYear(parseFloat(year));
    },
    Z: function (_, ISODate) { return new Date(ISODate); },
    d: function (dateObj, day) {
        dateObj.setDate(parseFloat(day));
    },
    h: function (dateObj, hour) {
        dateObj.setHours((dateObj.getHours() >= 12 ? 12 : 0) + parseFloat(hour));
    },
    i: function (dateObj, minutes) {
        dateObj.setMinutes(parseFloat(minutes));
    },
    j: function (dateObj, day) {
        dateObj.setDate(parseFloat(day));
    },
    l: doNothing,
    m: function (dateObj, month) {
        dateObj.setMonth(parseFloat(month) - 1);
    },
    n: function (dateObj, month) {
        dateObj.setMonth(parseFloat(month) - 1);
    },
    s: function (dateObj, seconds) {
        dateObj.setSeconds(parseFloat(seconds));
    },
    u: function (_, unixMillSeconds) {
        return new Date(parseFloat(unixMillSeconds));
    },
    w: doNothing,
    y: function (dateObj, year) {
        dateObj.setFullYear(2000 + parseFloat(year));
    },
};
var tokenRegex = {
    D: "",
    F: "",
    G: "(\\d\\d|\\d)",
    H: "(\\d\\d|\\d)",
    J: "(\\d\\d|\\d)\\w+",
    K: "",
    M: "",
    S: "(\\d\\d|\\d)",
    U: "(.+)",
    W: "(\\d\\d|\\d)",
    Y: "(\\d{4})",
    Z: "(.+)",
    d: "(\\d\\d|\\d)",
    h: "(\\d\\d|\\d)",
    i: "(\\d\\d|\\d)",
    j: "(\\d\\d|\\d)",
    l: "",
    m: "(\\d\\d|\\d)",
    n: "(\\d\\d|\\d)",
    s: "(\\d\\d|\\d)",
    u: "(.+)",
    w: "(\\d\\d|\\d)",
    y: "(\\d{2})",
};
var formats = {
    Z: function (date) { return date.toISOString(); },
    D: function (date, locale, options) {
        return locale.weekdays.shorthand[formats.w(date, locale, options)];
    },
    F: function (date, locale, options) {
        return monthToStr(formats.n(date, locale, options) - 1, false, locale);
    },
    G: function (date, locale, options) {
        return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(formats.h(date, locale, options));
    },
    H: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getHours()); },
    J: function (date, locale) {
        return locale.ordinal !== undefined
            ? date.getDate() + locale.ordinal(date.getDate())
            : date.getDate();
    },
    K: function (date, locale) { return locale.amPM[(0,_utils__WEBPACK_IMPORTED_MODULE_0__.int)(date.getHours() > 11)]; },
    M: function (date, locale) {
        return monthToStr(date.getMonth(), true, locale);
    },
    S: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getSeconds()); },
    U: function (date) { return date.getTime() / 1000; },
    W: function (date, _, options) {
        return options.getWeek(date);
    },
    Y: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getFullYear(), 4); },
    d: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getDate()); },
    h: function (date) { return (date.getHours() % 12 ? date.getHours() % 12 : 12); },
    i: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getMinutes()); },
    j: function (date) { return date.getDate(); },
    l: function (date, locale) {
        return locale.weekdays.longhand[date.getDay()];
    },
    m: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getMonth() + 1); },
    n: function (date) { return date.getMonth() + 1; },
    s: function (date) { return date.getSeconds(); },
    u: function (date) { return date.getTime(); },
    w: function (date) { return date.getDay(); },
    y: function (date) { return String(date.getFullYear()).substring(2); },
};


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/utils/index.js"
/*!********************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/utils/index.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   arrayify: () => (/* binding */ arrayify),
/* harmony export */   debounce: () => (/* binding */ debounce),
/* harmony export */   int: () => (/* binding */ int),
/* harmony export */   pad: () => (/* binding */ pad)
/* harmony export */ });
var pad = function (number, length) {
    if (length === void 0) { length = 2; }
    return ("000" + number).slice(length * -1);
};
var int = function (bool) { return (bool === true ? 1 : 0); };
function debounce(fn, wait) {
    var t;
    return function () {
        var _this = this;
        var args = arguments;
        clearTimeout(t);
        t = setTimeout(function () { return fn.apply(_this, args); }, wait);
    };
}
var arrayify = function (obj) {
    return obj instanceof Array ? obj : [obj];
};


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/utils/polyfills.js"
/*!************************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/utils/polyfills.js ***!
  \************************************************************/
() {


if (typeof Object.assign !== "function") {
    Object.assign = function (target) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!target) {
            throw TypeError("Cannot convert undefined or null to object");
        }
        var _loop_1 = function (source) {
            if (source) {
                Object.keys(source).forEach(function (key) { return (target[key] = source[key]); });
            }
        };
        for (var _a = 0, args_1 = args; _a < args_1.length; _a++) {
            var source = args_1[_a];
            _loop_1(source);
        }
        return target;
    };
}


/***/ },

/***/ "./node_modules/flatpickr/dist/flatpickr.min.css"
/*!*******************************************************!*\
  !*** ./node_modules/flatpickr/dist/flatpickr.min.css ***!
  \*******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
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
/* harmony import */ var _shared_store_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/store.js */ "./src/_shared/store.js");
/* harmony import */ var _shared_alert_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../_shared/alert.js */ "./src/_shared/alert.js");
/* harmony import */ var _shared_helpers_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../_shared/helpers.js */ "./src/_shared/helpers.js");
/* harmony import */ var _shared_tooltip_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../_shared/tooltip.js */ "./src/_shared/tooltip.js");
/* harmony import */ var flatpickr__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! flatpickr */ "./node_modules/flatpickr/dist/esm/index.js");
/* harmony import */ var flatpickr_dist_flatpickr_min_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! flatpickr/dist/flatpickr.min.css */ "./node_modules/flatpickr/dist/flatpickr.min.css");
Object(function webpackMissingModule() { var e = new Error("Cannot find module 'jszip'"); e.code = 'MODULE_NOT_FOUND'; throw e; }());








jQuery(document).ready(function ($) {
  const $block = $('.wp-block-bys-groups-group-reporting').first(); // assume only 1 block instance per page
  const $table = $block.find('.reporting-table');
  if (!$table.length) return;
  const detailUrl = $table.data('detailUrl') || '/administrator-dashboard/user-progress-detail/'; // used to direct to group users' single pages 

  const $filtersToggle = $block.find('.group-reporting__filters-toggle');
  const $filtersBox = $block.find('.group-reporting__filters-box');
  const $filtersForm = $block.find('.filters__form');
  const $submitBtn = $block.find('.group-reporting__submit');
  const $resetBtn = $block.find('.group-reporting__reset');
  const $sortSelect = $block.find('#sort-select');
  const $sortOptionsCompletion = $block.find('.group-reporting__sort-option--completion');
  const $filterStatus = $block.find('#filter-status');
  const $filterUserStatus = $block.find('#filter-user-status');
  const $filterEnrolFrom = $block.find('#filter-enrolment-date-from');
  const $filterEnrolTo = $block.find('#filter-enrolment-date-to');
  const $filterComplFrom = $block.find('#filter-completion-date-from');
  const $filterComplTo = $block.find('#filter-completion-date-to');
  const $enrolRangeText = $block.find('#enrolment-date-range-text');
  const $enrolRangeDropdown = $block.find('#enrolment-date-range-dropdown');
  const $enrolRangeTrigger = $block.find('#enrolment-date-range-trigger');
  const $complRangeText = $block.find('#completion-date-range-text');
  const $complRangeDropdown = $block.find('#completion-date-range-dropdown');
  const $complRangeTrigger = $block.find('#completion-date-range-trigger');
  const $courseDepFields = $block.find('.group-reporting__field--course-dep');
  const $msCourse = $block.find('#bys-multiselect-course');
  const $msUsers = $block.find('#bys-multiselect-users');
  const $showMoreBtn = $block.find('.group-reporting__show-more');
  const $exportBtn = $block.find('.group-reporting__export a');
  const PAGE_SIZE = 10;
  let expandedIdx = null;
  let usersInView = []; // current page of users
  let coursesInView = []; // current courses (from bys:groupSelected)
  let userCourseProgressAll = {}; // promoted to module scope: { [userId]: [...progress] }
  let courseQuizLoadedIdx = new Set();
  let courseQuizStepsCache = {}; // { [courseId]: [...steps] }
  let userQuizProgressCache = {}; // { [courseId]: { [userId]: { [quizId]: quizData } } }
  let loadedOffset = 0; // how many users have been loaded into the table
  let currentSort = 'first_name_asc';
  let sortedUsers = []; // sorted order after an explicit sort; empty = use lazy-load order
  let displayedCount = 0; // how many of sortedUsers are currently rendered

  // ── Filter state ────────────────────────────────────────────────────────────
  let selectedCourseIds = []; // course multiselect state
  let selectedUserIds = []; // user multiselect state
  let allGroupUserIds = []; // full list of user IDs for current group (from bysGroupsStore)
  let allGroupUsers = []; // full fetched user objects for the filter list (lazy-loaded)
  let allGroupUsersLoaded = false; // whether the full user list has been fetched

  let activeFilters = {
    courseIds: [],
    userIds: [],
    courseStatus: '',
    userStatus: '',
    enrolmentDate: {
      from: '',
      to: ''
    },
    completionDate: {
      from: '',
      to: ''
    }
  };

  // ── Filter panel toggle ──────────────────────────────────────────────────────
  $filtersToggle.on('click', function () {
    const $toggle = $(this);
    const isOpen = $toggle.attr('aria-expanded') === 'true';
    $toggle.attr('aria-expanded', !isOpen);
    $filtersBox.attr('aria-hidden', isOpen);
    $filtersBox.toggleClass('hidden', isOpen);
    if (!isOpen) {
      populateCourseMultiselect();
      populateUserMultiselect(); // lazy-fetches full user list if needed
    }
  });

  // ── Course column expand/collapse ────────────────────────────────────────────
  $table.on('click', '.group-reporting__course-toggle', function (e) {
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
    $table.find('.group-reporting__course-header').removeClass('group-reporting__course-header--expanded').addClass('group-reporting__course-header--collapsed').removeClass('group-reporting__col--hidden').find('.group-reporting__course-toggle').attr('aria-expanded', 'false');
    $table.find('.group-reporting__cell--badge').removeClass('group-reporting__col--hidden');
    $table.find('.group-reporting__sub-col, .group-reporting__sub-cell').addClass('group-reporting__sub-col--hidden');

    // Re-apply course column filter after reset
    applyColumnFilter();
  }
  function expandCourse(idx) {
    const $header = $table.find(`.group-reporting__course-header[data-course-idx="${idx}"]`);
    $header.removeClass('group-reporting__course-header--collapsed').addClass('group-reporting__course-header--expanded').find('.group-reporting__course-toggle').attr('aria-expanded', 'true');
    $table.find(`.group-reporting__sub-col[data-course-idx="${idx}"]`).removeClass('group-reporting__sub-col--hidden');
    $table.find(`.group-reporting__sub-cell[data-course-idx="${idx}"]`).removeClass('group-reporting__sub-col--hidden');
    $table.find(`.group-reporting__course-header:not([data-course-idx="${idx}"])`).addClass('group-reporting__col--hidden');
    $table.find(`.group-reporting__cell--badge:not([data-course-idx="${idx}"])`).addClass('group-reporting__col--hidden');
  }

  // ── Row click to detail page ─────────────────────────────────────────────────
  $table.on('click', '.group-reporting__row', function (e) {
    if ($(e.target).closest('.group-reporting__course-toggle').length) return;
    if ($(e.target).closest('a').length) return;
    const userId = $(this).data('userId');
    if (userId) window.location.href = detailUrl + '?user_id=' + userId + '&group_id=' + currentGroupId;
  });

  // ── Status badge ─────────────────────────────────────────────────────────────
  // Shared handler for rendering the .status-badge cell. Also stashes the
  // raw `last_active` / `status_checked_at` timestamps as data attributes so
  // the mouseenter handler below can build a tooltip ("Last active: X" /
  // "Checked at Y") without needing the full user object.
  function applyStatusBadge($badge, user) {
    const userStatus = user.status || 'never';
    $badge.attr('class', `status-badge status-badge--${userStatus}`);
    if (user.last_active) $badge.attr('data-last-active', user.last_active);else $badge.removeAttr('data-last-active');
    if (user.status_checked_at) $badge.attr('data-status-checked-at', user.status_checked_at);else $badge.removeAttr('data-status-checked-at');
  }

  // Status-badge tooltip — only renders the Last active line. The
  // data-status-checked-at attribute is still stashed on the badge by
  // applyStatusBadge() for future use / debugging, just not displayed.
  // Uses the shared tooltip helper (not the local createAndShowTooltip
  // below, which is wired to quiz-icon data).
  $table.on('mouseenter', '.status-badge', function () {
    const $badge = jQuery(this);
    const lastActive = $badge.attr('data-last-active');
    (0,_shared_tooltip_js__WEBPACK_IMPORTED_MODULE_4__.createTooltip)($badge, {
      title: lastActive ? `Last active: ${(0,_shared_helpers_js__WEBPACK_IMPORTED_MODULE_3__.formatDateTime)(lastActive)}` : 'Never active'
    });
  });
  $table.on('mouseleave', '.status-badge', function () {
    (0,_shared_tooltip_js__WEBPACK_IMPORTED_MODULE_4__.destroyTooltip)();
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
        <div class="bys-tooltip__title">${quizTitle}</div>
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
  $table.on('mouseenter', '.group-reporting__quiz-icon[data-quiz-id]:not([data-tip-loaded])', async function () {
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
      $icon.attr('data-tip', tip).attr('data-tip-loaded', '1');
      createAndShowTooltip($icon);
    } catch (err) {
      console.error(`[group-reporting] Failed to fetch quiz attempts for user ${userId}, quiz ${quizId}:`, err);
      $icon.attr('data-tip-loaded', '1');
      createAndShowTooltip($icon);
    }
  });
  $table.on('mouseenter', '.group-reporting__quiz-icon[data-tip-loaded]', function () {
    createAndShowTooltip($(this));
  });
  $table.on('mouseleave', '.group-reporting__quiz-icon', function () {
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

  // Fast first paint: if the store has the current group + courses + user_ids
  // cached from a prior page in this session, pre-render the table header and
  // skeleton rows so the user sees structure before group-select's fetches
  // complete. The bys:groupSelected handler below will re-render with fresh
  // data shortly after.
  (function preRenderFromCache() {
    const cachedGroupId = _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getCurrentGroup();
    const cachedCourses = _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getCourses();
    const cachedUserIds = _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getUserIds();
    const cachedHydratedUsers = _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getUsers();
    if (cachedGroupId !== null && cachedCourses !== null && cachedHydratedUsers !== null) {
      currentGroupId = cachedGroupId;
      coursesInView = cachedCourses;
      allGroupUserIds = cachedUserIds;
      // Render the column headers and the first page of users from the cache.
      // Course cells stay as loading placeholders until progress fetches resolve
      // in populateTableFromAPI (triggered by bys:groupSelected).
      rebuildTableHeader(cachedCourses);
      const firstPage = cachedHydratedUsers.slice(0, PAGE_SIZE);
      renderUserRowsFromCache(cachedCourses, firstPage);
      usersInView = firstPage;
      loadedOffset = firstPage.length;
    }
  })();

  /**
   * Reset module-level state when the leader switches groups. Wipes filter
   * selections, cached progress, sort state, and pagination offsets; resets
   * the form UI controls. Called from the bys:groupSelected handler.
   */
  function resetTableStateForGroup(userIds) {
    selectedCourseIds = [];
    selectedUserIds = [];
    allGroupUserIds = userIds;
    allGroupUsers = [];
    allGroupUsersLoaded = false;
    activeFilters = {
      courseIds: [],
      userIds: [],
      courseStatus: '',
      userStatus: '',
      enrolmentDate: {
        from: '',
        to: ''
      },
      completionDate: {
        from: '',
        to: ''
      }
    };
    userCourseProgressAll = {};
    courseQuizStepsCache = {};
    userQuizProgressCache = {};
    loadedOffset = 0;
    currentSort = 'first_name_asc';
    sortedUsers = [];
    displayedCount = 0;
    $sortSelect.val('first_name_asc');
    resetFilterFormUI();
    updateCourseDepFieldState();
    updateCompletionSortVisibility();
  }
  $(document).on('bys:groupSelected', async function (_, data) {
    const groupId = data.groupId;
    if (!groupId) return;
    currentGroupId = groupId;

    // Read from the store now — group-select wrote both before firing this event.
    const userIds = _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getUserIds() || [];
    const courses = _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getCourses() || [];
    resetTableStateForGroup(userIds);
    await populateTableFromAPI(groupId, userIds, courses);

    // if filters panel is currently open, re-render the multiselects so they reflect the newly selected group
    if ($filtersBox.length && !$filtersBox.hasClass('hidden')) {
      populateCourseMultiselect();
      populateUserMultiselect();
    }
  });

  // ── Table population ──────────────────────────────────────────────────────────
  async function populateTableFromAPI(groupId, userIds, courses) {
    try {
      const firstTenUserIds = userIds.slice(0, 10);
      rebuildTableHeader(courses);

      // Preserve any rows the pre-render path already put on screen. Only
      // show the bulk skeleton when the tbody is empty (cold load).
      const tbodyHasRows = $table.find('tbody tr').length > 0;
      if (!tbodyHasRows) {
        showSkeletonRows(firstTenUserIds.length || PAGE_SIZE, courses.length);
      }
      if (!firstTenUserIds.length) {
        rebuildTableBody(courses, [], {});
        return;
      }

      // Hydrated users come from the store on the warm path (no /users call).
      // Fall back to the network only if the store hasn't been populated yet.
      const cachedHydrated = _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getCurrentGroup() === Number(groupId) ? _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getHydratedUsers(firstTenUserIds) : null;
      let usersResponse;
      if (cachedHydrated !== null) {
        console.log('[bys-store] group-reporting: HIT hydrated — skipping /users fetch');
        usersResponse = cachedHydrated;
      } else {
        console.log('[bys-store] group-reporting: MISS hydrated — fetching /users');
        const usersUrl = `/wp-json/bys-groups/v1/groups/${groupId}/users?user_ids=${firstTenUserIds.join(',')}`;
        usersResponse = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(usersUrl, true);
        if (!usersResponse || !Array.isArray(usersResponse)) {
          console.error('Invalid users response:', usersResponse);
          return;
        }
        _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].setUsers(usersResponse); // write-through so other blocks reuse it
      }
      usersInView = usersResponse;
      coursesInView = courses;
      courseQuizLoadedIdx.clear();

      // Render rows now — name/email/status synchronously from usersResponse;
      // course cells start as skeletons (from the cell template) and fill in
      // per-user as each progress fetch resolves below. We re-render whenever
      // the rendered rows belong to a different group than the one we're now
      // populating (group switch). On the warm path (same group, pre-render
      // already painted), we keep the existing rows.
      const $tbody = $table.find('tbody');
      const renderedGroupId = $tbody.data('renderedGroupId');
      const needsRerender = !renderedGroupId || Number(renderedGroupId) !== Number(groupId);
      if (needsRerender) {
        renderUserRowsFromCache(courses, usersResponse);
        // Re-apply expanded-course visibility to freshly-rendered cells.
        if (expandedIdx !== null) expandCourse(expandedIdx);
      }
      const courseIds = courses.map(c => c.id).join(',');

      // Per-user progress fetches in parallel — no Promise.all wait. Each
      // .then() fills only its own row's cells, so users trickle in as their
      // data lands instead of waiting for the slowest fetch.
      usersResponse.forEach(user => {
        if (!courseIds) {
          userCourseProgressAll[user.id] = [];
          return;
        }
        const endpoint = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
        _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(endpoint, true).then(progressArray => {
          userCourseProgressAll[user.id] = Array.isArray(progressArray) ? progressArray : [];
          const $row = $tbody.find(`tr[data-user-id="${user.id}"]`);
          if ($row.length) applyCourseProgressToRow($row, courses, userCourseProgressAll[user.id]);
        }).catch(err => {
          console.error(`Failed to fetch course progress for user ${user.id}:`, err);
          userCourseProgressAll[user.id] = [];
        });
      });
      loadedOffset = firstTenUserIds.length;
      updateShowMoreButton();
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
   * Works by toggling group-reporting__col--hidden on matching [data-course-idx] elements.
   */
  function applyColumnFilter() {
    const filtered = activeFilters.courseIds.length > 0;
    coursesInView.forEach((course, idx) => {
      const visible = !filtered || activeFilters.courseIds.includes(course.id);

      // Sub-columns only matter if this course is the expanded one — leave their
      // own hidden state alone; just hide the whole group if column is filtered out.
      if (!visible) {
        $table.find(`[data-course-idx="${idx}"]`).addClass('group-reporting__col--hidden');
      } else if (expandedIdx !== idx) {
        // Visible but not expanded: clear group-reporting__col--hidden from everything for
        // this course (the toggle button inside the header also receives it when
        // hidden), then keep sub-cols hidden via their own class.
        $table.find(`[data-course-idx="${idx}"]`).removeClass('group-reporting__col--hidden');
        $table.find(`.group-reporting__sub-col[data-course-idx="${idx}"]`).addClass('group-reporting__sub-col--hidden');
        $table.find(`.group-reporting__sub-cell[data-course-idx="${idx}"]`).addClass('group-reporting__sub-col--hidden');
      }
    });
  }

  /**
   * Build a once-per-filter-pass context: pre-parses date ranges so each user
   * check doesn't re-construct Date objects, and stashes filter fields for fast
   * access. Caller (applyRowFilters) calls this once before iterating users.
   */
  function buildFilterContext(filters) {
    function parseRange(range) {
      if (!range.from && !range.to) return null;
      const from = range.from ? new Date(range.from) : null;
      let to = null;
      if (range.to) {
        to = new Date(range.to);
        to.setHours(23, 59, 59, 999);
      }
      return {
        from,
        to
      };
    }
    return {
      courseIds: filters.courseIds,
      userIds: filters.userIds,
      courseStatus: filters.courseStatus,
      userStatus: filters.userStatus,
      enrolment: parseRange(filters.enrolmentDate),
      completion: parseRange(filters.completionDate)
    };
  }

  /**
   * Predicate: does a user pass all active row filters? Pure (no DOM access).
   * Uses an already-built context so date Date() construction and the
   * coursesToCheck derivation happen ONCE per user, not per-filter-per-user.
   */
  function userPassesRowFilter(user, ctx) {
    if (ctx.userIds.length > 0 && !ctx.userIds.includes(user.id)) return false;
    if (ctx.userStatus && (user.status || 'never') !== ctx.userStatus) return false;
    const needsProgress = Boolean(ctx.courseStatus) || Boolean(ctx.enrolment) || Boolean(ctx.completion);
    if (!needsProgress) return true;

    // Compute once per user (was up to 3× before).
    const userProgress = userCourseProgressAll[user.id] || [];
    const coursesToCheck = ctx.courseIds.length > 0 ? userProgress.filter(p => ctx.courseIds.includes(p.course_id)) : userProgress;
    if (ctx.courseStatus) {
      const expected = ctx.courseStatus === 'inactive' ? 'not_started' : ctx.courseStatus;
      if (!coursesToCheck.some(p => (p.progress_status || 'not_started') === expected)) return false;
    }
    if (ctx.enrolment) {
      const ok = coursesToCheck.some(p => {
        if (!p.enrolled_at) return false;
        const d = new Date(p.enrolled_at);
        if (ctx.enrolment.from && d < ctx.enrolment.from) return false;
        if (ctx.enrolment.to && d > ctx.enrolment.to) return false;
        return true;
      });
      if (!ok) return false;
    }
    if (ctx.completion) {
      const ok = coursesToCheck.some(p => {
        if (!p.date_completed) return false;
        const d = new Date(p.date_completed);
        if (ctx.completion.from && d < ctx.completion.from) return false;
        if (ctx.completion.to && d > ctx.completion.to) return false;
        return true;
      });
      if (!ok) return false;
    }
    return true;
  }

  /**
   * Show/hide rows based on the active filters. All work against in-memory data.
   * The --filtered class triggers display:none via CSS — no inline style needed.
   */
  function applyRowFilters() {
    const ctx = buildFilterContext(activeFilters);
    $table.find('tbody tr.group-reporting__row').each(function () {
      const userId = parseInt($(this).data('userId'), 10);
      const user = usersInView.find(u => u.id === userId);
      if (!user) return;
      const visible = userPassesRowFilter(user, ctx);
      $(this).toggleClass('group-reporting__row--filtered', !visible);
    });
  }

  // ── Course-dependent field enable/disable ────────────────────────────────────
  function updateCourseDepFieldState() {
    const singleCourse = selectedCourseIds.length === 1;
    const $depFields = $courseDepFields;
    $depFields.toggleClass('is-disabled', !singleCourse);
    $depFields.find('select, input[type="date"], .date-range__trigger').prop('disabled', !singleCourse);
    if (!singleCourse) {
      $filterStatus.val('').addClass('is-placeholder');
      resetDateRangeField($filterEnrolFrom, $filterEnrolTo, $enrolRangeText, $enrolRangeDropdown);
      resetDateRangeField($filterComplFrom, $filterComplTo, $complRangeText, $complRangeDropdown);
    }
  }
  function updateCompletionSortVisibility() {
    const singleCourse = activeFilters.courseIds.length === 1;
    const $opts = $sortOptionsCompletion;
    $opts.toggleClass('hidden', !singleCourse);
    // If a completion sort is active but the option is now hidden, fall back to default
    if (!singleCourse && (currentSort === 'completion_date_asc' || currentSort === 'completion_date_desc')) {
      currentSort = 'first_name_asc';
      $sortSelect.val('first_name_asc');
    }
  }

  // ── Filter form submit ────────────────────────────────────────────────────────
  $filtersForm.on('submit', async function (e) {
    e.preventDefault();
    const singleCourse = selectedCourseIds.length === 1;
    activeFilters.courseIds = selectedCourseIds.slice();
    activeFilters.userIds = selectedUserIds.slice();
    activeFilters.courseStatus = singleCourse ? $filterStatus.val() : '';
    activeFilters.userStatus = $filterUserStatus.val();
    activeFilters.enrolmentDate = singleCourse ? {
      from: $filterEnrolFrom.val(),
      to: $filterEnrolTo.val()
    } : {
      from: '',
      to: ''
    };
    activeFilters.completionDate = singleCourse ? {
      from: $filterComplFrom.val(),
      to: $filterComplTo.val()
    } : {
      from: '',
      to: ''
    };
    closeMultiselect($msCourse);
    closeMultiselect($msUsers);

    // Row filters may match users not yet loaded — drain remaining pages first
    const hasRowFilter = activeFilters.userIds.length > 0 || activeFilters.courseStatus || activeFilters.userStatus || activeFilters.enrolmentDate.from || activeFilters.enrolmentDate.to || activeFilters.completionDate.from || activeFilters.completionDate.to;
    if (hasRowFilter && loadedOffset < allGroupUserIds.length) {
      const $btn = $submitBtn;
      $btn.prop('disabled', true).text('Loading…');
      await loadAllRemainingUsers();
      $btn.prop('disabled', false).text('Filter');
    }
    applyFilters();
    updateCompletionSortVisibility();
  });

  // ── Filter reset ──────────────────────────────────────────────────────────────
  $resetBtn.on('click', function () {
    selectedCourseIds = [];
    selectedUserIds = [];
    activeFilters = {
      courseIds: [],
      userIds: [],
      courseStatus: '',
      userStatus: '',
      enrolmentDate: {
        from: '',
        to: ''
      },
      completionDate: {
        from: '',
        to: ''
      }
    };
    resetFilterFormUI();
    updateCourseDepFieldState();
    updateCompletionSortVisibility();
    closeMultiselect($msCourse);
    closeMultiselect($msUsers);
    populateCourseMultiselect();
    populateUserMultiselect();

    // Restore all rows and columns
    $table.find('tbody tr').css('display', '').removeClass('group-reporting__row--filtered');
    $table.find('[data-course-idx]').removeClass('group-reporting__col--hidden');
    $table.find('.group-reporting__sub-col, .group-reporting__sub-cell').addClass('group-reporting__sub-col--hidden');
    expandedIdx = null;
  });

  // ── Flatpickr instances ─────────────────────────────────────────────────────
  const FP_FILTER = {
    dateFormat: 'd-m-y',
    altInput: true,
    altInputClass: 'flatpickr-input group-reporting__datetime',
    altFormat: 'j M Y',
    disableMobile: true,
    allowInput: false,
    onReady(_, __, fp) {
      fp.calendarContainer.classList.add('bys-fp');
      if (fp.altInput && fp.config.placeholder) {
        fp.altInput.placeholder = fp.config.placeholder;
      }
    }
  };
  function syncClearButton($input, hasValue) {
    // Clear button is a sibling of the (hidden) original input; flatpickr's alt
    // input sits between them. Use the input's parent to find the button.
    const $btn = $input.parent().find('.group-reporting__date-clear');
    if (hasValue) $btn.removeAttr('hidden');else $btn.attr('hidden', '');
  }
  let fpEnrolFrom, fpEnrolTo, fpComplFrom, fpComplTo;
  fpEnrolFrom = (0,flatpickr__WEBPACK_IMPORTED_MODULE_5__["default"])($filterEnrolFrom[0], {
    ...FP_FILTER,
    placeholder: 'Pick a date',
    onChange(_, dateStr) {
      fpEnrolTo.set('minDate', dateStr || null);
      syncClearButton($filterEnrolFrom, Boolean(dateStr));
      updateDateRangeText($filterEnrolFrom, $filterEnrolTo, $enrolRangeText);
    }
  });
  fpEnrolTo = (0,flatpickr__WEBPACK_IMPORTED_MODULE_5__["default"])($filterEnrolTo[0], {
    ...FP_FILTER,
    placeholder: 'Pick a date',
    onChange(_, dateStr) {
      fpEnrolFrom.set('maxDate', dateStr || null);
      syncClearButton($filterEnrolTo, Boolean(dateStr));
      updateDateRangeText($filterEnrolFrom, $filterEnrolTo, $enrolRangeText);
    }
  });
  fpComplFrom = (0,flatpickr__WEBPACK_IMPORTED_MODULE_5__["default"])($filterComplFrom[0], {
    ...FP_FILTER,
    placeholder: 'Pick a date',
    onChange(_, dateStr) {
      fpComplTo.set('minDate', dateStr || null);
      syncClearButton($filterComplFrom, Boolean(dateStr));
      updateDateRangeText($filterComplFrom, $filterComplTo, $complRangeText);
    }
  });
  fpComplTo = (0,flatpickr__WEBPACK_IMPORTED_MODULE_5__["default"])($filterComplTo[0], {
    ...FP_FILTER,
    placeholder: 'Pick a date',
    onChange(_, dateStr) {
      fpComplFrom.set('maxDate', dateStr || null);
      syncClearButton($filterComplTo, Boolean(dateStr));
      updateDateRangeText($filterComplFrom, $filterComplTo, $complRangeText);
    }
  });

  // Map each input to its flatpickr instance — used by resetDateRangeField
  // and the clear-button handler.
  const fpFor = new Map([[$filterEnrolFrom[0].id, fpEnrolFrom], [$filterEnrolTo[0].id, fpEnrolTo], [$filterComplFrom[0].id, fpComplFrom], [$filterComplTo[0].id, fpComplTo]]);

  // Clear-button handler. Delegated so it works regardless of when flatpickr
  // mutates the surrounding DOM.
  $block.on('click', '.group-reporting__date-clear', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const targetId = $(this).data('target');
    const fp = fpFor.get(targetId);
    if (fp) fp.clear(); // triggers onChange → syncClearButton + updateDateRangeText
  });

  // Field-wrap click → open the picker. flatpickr's auto click-open can
  // fail when the original input is initialised inside a display:none parent
  // (our dropdown starts hidden), so we wire it explicitly.
  $block.on('click', '.group-reporting__date-field__input', function (e) {
    if (e.target.closest('.group-reporting__date-clear')) return; // clear has its own handler
    // Find the (hidden) original input inside this wrap and look up its fp.
    const inputId = $(this).find('input.group-reporting__datetime').attr('id');
    const fp = fpFor.get(inputId);
    if (fp) fp.open();
  });
  function resetDateRangeField($from, $to, $text, $dropdown) {
    // Clear via flatpickr so onChange fires (which hides clear buttons + updates text).
    const fpFrom = fpFor.get($from[0].id);
    const fpTo = fpFor.get($to[0].id);
    if (fpFrom) fpFrom.clear();
    if (fpTo) fpTo.clear();
    $text.text('Select a date range');
    $dropdown.addClass('hidden');
  }
  function updateDateRangeText($from, $to, $text) {
    const dateFrom = $from.val();
    const dateTo = $to.val();
    if (!dateFrom && !dateTo) $text.text('Select a date range');else if (dateFrom && dateTo) $text.text(`${dateFrom} – ${dateTo}`);else if (dateFrom) $text.text(`From ${dateFrom}`);else $text.text(`Until ${dateTo}`);
  }
  function resetFilterFormUI() {
    $filterStatus.val('').addClass('is-placeholder');
    $filterUserStatus.val('').addClass('is-placeholder');
    resetDateRangeField($filterEnrolFrom, $filterEnrolTo, $enrolRangeText, $enrolRangeDropdown);
    resetDateRangeField($filterComplFrom, $filterComplTo, $complRangeText, $complRangeDropdown);
  }

  // ── Table builders ────────────────────────────────────────────────────────────
  function showSkeletonRows(count, courseCount = 0) {
    const $tbody = $table.find('tbody');
    $tbody.html('');
    const rowTemplate = document.getElementById('skeleton-row-template');
    for (let i = 0; i < count; i++) {
      const row = rowTemplate.content.cloneNode(true);
      const tr = row.querySelector('tr');
      for (let c = 0; c < courseCount; c++) {
        const td = document.createElement('td');
        td.className = 'group-reporting__cell group-reporting__cell--badge';
        const span = document.createElement('span');
        span.style.width = '24px';
        td.appendChild(span);
        tr.appendChild(td);
      }
      $tbody.append(row);
    }
  }
  function showSkeletonCourseHeaders(count) {
    const headerRow = $table.find('thead .group-reporting__table-head')[0];
    if (!headerRow) return;
    // Remove any existing skeleton course headers
    $(headerRow).find('.group-reporting__course-header--skeleton').remove();
    const skeletonTemplate = document.getElementById('skeleton-course-header-template');
    for (let i = 0; i < count; i++) {
      headerRow.appendChild(skeletonTemplate.content.cloneNode(true));
    }
  }
  function rebuildTableHeader(courses) {
    const $thead = $table.find('thead');
    $thead.html('');
    const headerRow = document.createElement('tr');
    headerRow.className = 'group-reporting__table-head';
    const statusTh = document.createElement('th');
    statusTh.className = 'group-reporting__col group-reporting__col--status';
    headerRow.appendChild(statusTh);
    const nameTh = document.createElement('th');
    nameTh.className = 'group-reporting__col group-reporting__col--name';
    nameTh.textContent = 'Name';
    headerRow.appendChild(nameTh);
    const emailTh = document.createElement('th');
    emailTh.className = 'group-reporting__col group-reporting__col--email';
    emailTh.textContent = 'Email';
    headerRow.appendChild(emailTh);
    const courseHeaderTemplate = document.getElementById('course-header-template');
    courses.forEach((course, idx) => {
      const headerContent = courseHeaderTemplate.content.cloneNode(true);
      const $headers = $(headerContent);
      $headers.find('[data-course-idx]').attr('data-course-idx', idx);
      const courseTitle = course.title?.rendered || course.title || '';
      $headers.find('.group-reporting__course-toggle').html(truncateTitle(courseTitle)).attr('title', courseTitle).attr('data-course-idx', idx);
      if (course.required) {
        $headers.find('.group-reporting__required-badge').removeClass('hidden');
      }
      $headers.find('.group-reporting__download').attr('data-course-idx', idx);
      $headers.children().each(function () {
        headerRow.appendChild(this);
      });
    });
    $thead.append(headerRow);
  }
  function buildQuizBars(quizData, userId, userQuizProgress) {
    if (!quizData || quizData.length === 0) {
      return '<span class="group-reporting__quiz-empty">—</span>';
    }
    const barsMaxHeight = 24;
    const bars = quizData.map(quiz => {
      const quizId = quiz.step_id;
      const quizTitle = quiz.step_title;
      const summary = userQuizProgress[quizId];
      if (!summary || summary.total_attempts === 0) {
        const tip = `${quizTitle}|Not attempted`;
        return `<span class="group-reporting__quiz-icon group-reporting__quiz-icon--neutral" data-tip="${tip}" data-quiz-id="${quizId}" data-quiz-title="${quizTitle}"></span>`;
      }
      const cls = summary.pass_highest ? 'group-reporting__quiz-icon--pass' : 'group-reporting__quiz-icon--fail';
      const barHeight = barsMaxHeight * (summary.percent_highest * 0.01);
      const tip = `${quizTitle}|Loading...|${Math.round(summary.percent_highest)}%`;
      return `<span class="group-reporting__quiz-icon ${cls}" data-tip="${tip}" data-quiz-id="${quizId}" data-user-id="${userId}" data-quiz-title="${quizTitle}" data-percent="${Math.round(summary.percent_highest)}" style="height: ${barHeight}px"></span>`;
    });
    return `<div class="group-reporting__quiz-icons">${bars.join('')}</div>`;
  }

  /**
   * Build a single user's row fragment with name/email/status filled in and
   * skeleton course cells per course. Used by both renderUserRowsFromCache
   * (initial render — wipes then appends) and appendUserRowsToTable
   * (load-more — appends without wiping).
   */
  function buildUserRowFragment(courses, user) {
    const rowTemplate = document.getElementById('group-reporting__row-template');
    const cellTemplate = document.getElementById('group-reporting__cell-template');
    const $fragment = $(rowTemplate.content.cloneNode(true));
    const $tr = $fragment.find('tr');
    $tr.attr('data-user-id', user.id);

    // Status dot — toggle modifier class for online/offline/never AND
    // wrap the icon with the "Last checked" tooltip. Must use the same
    // helper as appendTableRows() so both render paths stay in sync
    // (fast first paint vs full rebuild after fetch).
    applyStatusBadge($tr.find('.status-badge'), user);

    // Name + detail link.
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || '';
    $tr.find('.group-reporting__name-link').attr('href', detailUrl + '?group_id=' + currentGroupId + '&user_id=' + user.id).text(fullName);

    // Email
    $tr.find('.group-reporting__col--email').text(user.email || '');

    // Course cells — clone the per-course cell template once per course.
    // Inner spans carry .skeleton until applyCourseProgressToRow replaces them.
    courses.forEach((course, idx) => {
      const $cells = $(cellTemplate.content.cloneNode(true));
      $cells.find('td').attr('data-course-idx', idx);
      $tr.append($cells);
    });
    return $fragment;
  }

  /**
   * Fast first paint: replace tbody with a row per hydrated user using only
   * the fields the store gives us (status, name, email). All markup comes from
   * the templates in render.php — no HTML strings in this script. Course
   * cells stay as skeletons until the trickle-in path fills them.
   */
  function renderUserRowsFromCache(courses, users) {
    const $tbody = $table.find('tbody');
    $tbody.html('');
    users.forEach(user => $tbody.append(buildUserRowFragment(courses, user)));
    // Stamp which group these rows belong to. populateTableFromAPI compares
    // this against the incoming groupId to decide whether a re-render is
    // needed (group switch) or rows can be reused (warm path / same group).
    $tbody.data('renderedGroupId', currentGroupId ? Number(currentGroupId) : null);
  }

  /**
   * Append new user rows to the existing tbody (for the "Show More" path).
   * Same shape as renderUserRowsFromCache but doesn't wipe what's already there.
   */
  function appendUserRowsToTable(courses, users) {
    const $tbody = $table.find('tbody');
    users.forEach(user => $tbody.append(buildUserRowFragment(courses, user)));
  }
  function rebuildTableBody(courses, users, userCourseProgress) {
    $table.find('tbody').html('');
    appendTableRows(courses, users, userCourseProgress);
  }

  /**
   * Fill the five cells for one course-column (badge + 4 sub-cells) using a
   * single user's course-progress data. $scope is any jQuery set that contains
   * those cells — it can be an existing <tr> (in-place update via the trickle
   * path) or a freshly-cloned cell fragment from #group-reporting__cell-template
   * (initial render in appendTableRows). Selectors are scoped by data-course-idx
   * so both cases resolve correctly.
   */
  function fillCellsForCourse($scope, idx, courseData) {
    const progressStatus = courseData?.progress_status || 'not_started';
    const status = progressStatus === 'completed' ? 'completed' : progressStatus === 'in_progress' ? 'in-progress' : 'not-started';

    // Badge cell
    $scope.find(`.group-reporting__cell--badge[data-course-idx="${idx}"] span`).attr('class', `completion-badge completion-badge--${status}`);

    // Progress sub-cell
    const stepsCompleted = courseData?.steps_completed || 0;
    const stepsTotal = courseData?.steps_total || 0;
    const percentage = typeof courseData?.percent_complete === 'number' ? courseData.percent_complete : stepsTotal > 0 ? Math.min(100, Math.round(stepsCompleted / stepsTotal * 100)) : 0;
    const percentClass = percentage === 100 ? 'complete' : percentage === 0 ? 'not-started' : 'in-progress';
    $scope.find(`.group-reporting__sub-cell--progress[data-course-idx="${idx}"]`).html(`
      <div class="group-reporting__progress-wrap"><div class="group-reporting__progress-bar" style="width:${percentage}%;"></div></div>
      <span class="group-reporting__percent group-reporting__percent--${percentClass}">${percentage}%</span>
    `);

    // Quizzing sub-cell — loading spinner until the course column is expanded
    // and loadQuizDataForCourse replaces it with the real bars.
    $scope.find(`.group-reporting__sub-cell--quizzing[data-course-idx="${idx}"]`).html('<span class="group-reporting__quiz-loading"><i class="fa-regular fa-spinner-third fa-spin"></i></span>');

    // Date sub-cells
    const enrolledAt = courseData?.enrolled_at || '';
    const dateCompleted = courseData?.date_completed || '';
    $scope.find(`.group-reporting__sub-cell--enrolment[data-course-idx="${idx}"]`).html(`<span class="group-reporting__date">${enrolledAt ? formatDate(enrolledAt) : 'Not started'}</span>`);
    $scope.find(`.group-reporting__sub-cell--completion[data-course-idx="${idx}"]`).html(`<span class="group-reporting__date">${dateCompleted ? formatDate(dateCompleted) : 'Not completed'}</span>`);
  }

  /**
   * Update one existing row's course cells in place — used by the trickle-in
   * path in populateTableFromAPI when a single user's progress fetch resolves.
   */
  function applyCourseProgressToRow($tr, courses, userProgress) {
    const progress = Array.isArray(userProgress) ? userProgress : [];
    courses.forEach((course, idx) => {
      const courseData = progress.find(cp => cp.course_id === course.id);
      fillCellsForCourse($tr, idx, courseData);
    });
  }
  function appendTableRows(courses, users, userCourseProgress) {
    const $tbody = $table.find('tbody');
    const rowTemplate = document.getElementById('skeleton-row-template');
    const cellTemplate = document.getElementById('group-reporting__cell-template');
    users.forEach(user => {
      const userProgress = userCourseProgress[user.id] || [];
      const rowContent = rowTemplate.content.cloneNode(true);
      const $row = $(rowContent);
      $row.find('tr').attr('data-user-id', user.id).removeClass('group-reporting__row--loading');
      applyStatusBadge($row.find('.status-badge'), user);
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || '';
      $row.find('.group-reporting__col--name').html(`
        <a href="${detailUrl}?group_id=${currentGroupId}&user_id=${user.id}" class="group-reporting__name-link" onclick="event.stopPropagation();">
          ${escapeHtml(fullName)}
        </a>
      `);
      $row.find('.group-reporting__col--email').html(escapeHtml(user.email));
      courses.forEach((course, idx) => {
        const courseData = userProgress.find(cp => cp.course_id === course.id);
        const cellContent = cellTemplate.content.cloneNode(true);
        const $cells = $(cellContent);
        $cells.find('td').attr('data-course-idx', idx);

        // Fill the 5 cells from the same helper used by trickle-in updates.
        fillCellsForCourse($cells, idx, courseData);

        // Apply expanded-course visibility state at creation time so new rows
        // are correct immediately, without depending on a post-append fixup pass.
        if (expandedIdx !== null) {
          if (idx !== expandedIdx) {
            $cells.find('.group-reporting__cell--badge').addClass('group-reporting__col--hidden');
          } else {
            $cells.find('.group-reporting__sub-cell').removeClass('group-reporting__sub-col--hidden');
          }
        }
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
    const quizSteps = await ensureQuizDataForCourse(course, usersInView);
    $table.find(`.group-reporting__sub-cell--quizzing[data-course-idx="${courseIdx}"]`).each(function () {
      const userId = $(this).closest('tr').data('userId');
      const userQuizProgress = (userQuizProgressCache[course.id] || {})[userId] || {};
      $(this).html(buildQuizBars(quizSteps, userId, userQuizProgress));
    });
  }

  // ── Show More / lazy load ─────────────────────────────────────────────────────

  function updateShowMoreButton() {
    const $btn = $showMoreBtn;
    const hasMore = sortedUsers.length > 0 ? displayedCount < sortedUsers.length : loadedOffset < allGroupUserIds.length;
    $btn.toggleClass('hidden', !hasMore);
  }
  $block.on('click', '.group-reporting__show-more', function () {
    loadMoreUsers();
  });

  /**
   * Core: fetch a specific batch of user IDs, get their progress, append rows.
   * Returns the array of newly loaded users (or empty array on failure).
   */
  /**
   * Trickle-in flavour: render rows immediately with skeleton course cells,
   * then fire per-user progress fetches in parallel without awaiting. Each
   * row's cells fill in as its own progress lands. Used by the "Show More"
   * click handler.
   *
   * Returns the new users so the caller can await the user-list fetch even
   * though it doesn't wait for the per-user progress.
   */
  async function fetchAndAppendUsersTrickle(nextIds) {
    const usersUrl = `/wp-json/bys-groups/v1/groups/${currentGroupId}/users?user_ids=${nextIds.join(',')}`;
    const newUsers = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(usersUrl, true);
    if (!newUsers || !Array.isArray(newUsers)) return [];

    // Append rows now — name/email/status synchronously; course cells are skeletons.
    appendUserRowsToTable(coursesInView, newUsers);
    if (expandedIdx !== null) expandCourse(expandedIdx);
    usersInView = usersInView.concat(newUsers);
    loadedOffset += newUsers.length;

    // Per-user progress fetches in parallel — each .then() fills only its row.
    const courseIds = coursesInView.map(c => c.id).join(',');
    newUsers.forEach(user => {
      if (!courseIds) {
        userCourseProgressAll[user.id] = [];
        return;
      }
      const endpoint = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
      _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(endpoint, true).then(progressArray => {
        userCourseProgressAll[user.id] = Array.isArray(progressArray) ? progressArray : [];
        const $row = $table.find(`tr[data-user-id="${user.id}"]`);
        if ($row.length) applyCourseProgressToRow($row, coursesInView, userCourseProgressAll[user.id]);
        // When a course column is expanded, fill THIS row's quiz cells too —
        // the column-level loader (loadQuizDataForNewUsers) batches a single
        // round of cells, so the row needs its quiz fill once progress arrives.
        if (expandedIdx !== null && courseQuizLoadedIdx.has(expandedIdx)) {
          loadQuizDataForNewUsers(expandedIdx, [user]);
        }
      }).catch(err => {
        console.error(`Failed to fetch course progress for user ${user.id}:`, err);
        userCourseProgressAll[user.id] = [];
      });
    });
    return newUsers;
  }

  /**
   * Await-all flavour: fetches users + every per-user progress before returning.
   * Used by loadAllRemainingUsers because the caller needs every row's progress
   * data populated before applying filters / sorts that key off it.
   */
  async function fetchAndAppendUsers(nextIds) {
    const usersUrl = `/wp-json/bys-groups/v1/groups/${currentGroupId}/users?user_ids=${nextIds.join(',')}`;
    const newUsers = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(usersUrl, true);
    if (!newUsers || !Array.isArray(newUsers)) return [];
    const courseIds = coursesInView.map(c => c.id).join(',');
    await Promise.all(newUsers.map(async user => {
      if (!courseIds) {
        userCourseProgressAll[user.id] = [];
        return;
      }
      const endpoint = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
      try {
        userCourseProgressAll[user.id] = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(endpoint, true);
      } catch (err) {
        console.error(`Failed to fetch course progress for user ${user.id}:`, err);
        userCourseProgressAll[user.id] = [];
      }
    }));
    usersInView = usersInView.concat(newUsers);
    loadedOffset += newUsers.length;
    appendTableRows(coursesInView, newUsers, userCourseProgressAll);
    if (expandedIdx !== null && courseQuizLoadedIdx.has(expandedIdx)) {
      await loadQuizDataForNewUsers(expandedIdx, newUsers);
    }
    return newUsers;
  }
  async function loadMoreUsers() {
    const $btn = $showMoreBtn;

    // Post-sort: data already in memory — just render the next page
    if (sortedUsers.length > 0 && displayedCount < sortedUsers.length) {
      const nextPage = sortedUsers.slice(displayedCount, displayedCount + PAGE_SIZE);
      displayedCount += nextPage.length;
      appendTableRows(coursesInView, nextPage, userCourseProgressAll);
      if (expandedIdx !== null && courseQuizLoadedIdx.has(expandedIdx)) {
        await loadQuizDataForNewUsers(expandedIdx, nextPage);
      }
      applyFilters();
      if (expandedIdx !== null) expandCourse(expandedIdx);
      updateShowMoreButton();
      return;
    }
    const nextIds = allGroupUserIds.slice(loadedOffset, loadedOffset + PAGE_SIZE);
    if (!nextIds.length) {
      $btn.addClass('hidden');
      return;
    }
    $btn.prop('disabled', true).text('Loading…');
    try {
      // Trickle: returns once rows are appended (and per-user progress is in
      // flight). The leader sees rows with skeleton cells immediately; cells
      // fill as each user's fetch resolves.
      await fetchAndAppendUsersTrickle(nextIds);
      applyFilters();
      if (expandedIdx !== null) expandCourse(expandedIdx);
      updateShowMoreButton();
    } catch (err) {
      console.error('[group-reporting] Failed to load more users:', err);
    } finally {
      $btn.prop('disabled', false).text('Show More Results');
    }
  }

  /**
   * Load all users not yet fetched, in PAGE_SIZE batches.
   * Used when a filter is submitted that may match users beyond the current page.
   */
  async function loadAllRemainingUsers() {
    while (loadedOffset < allGroupUserIds.length) {
      const nextIds = allGroupUserIds.slice(loadedOffset, loadedOffset + PAGE_SIZE);
      if (!nextIds.length) break;
      try {
        await fetchAndAppendUsers(nextIds);
      } catch (err) {
        console.error('[group-reporting] Failed to load remaining users for filter:', err);
        break;
      }
    }
    updateShowMoreButton();
  }
  async function loadQuizDataForNewUsers(courseIdx, newUsers) {
    const course = coursesInView[courseIdx];
    if (!course) return;
    const quizSteps = await ensureQuizDataForCourse(course, newUsers);
    if (!quizSteps.length) return;
    newUsers.forEach(user => {
      const userQuizProgress = (userQuizProgressCache[course.id] || {})[user.id] || {};
      $table.find(`tr[data-user-id="${user.id}"] .group-reporting__sub-cell--quizzing[data-course-idx="${courseIdx}"]`).html(buildQuizBars(quizSteps, user.id, userQuizProgress));
    });
  }

  // ── Sort ──────────────────────────────────────────────────────────────────────

  $block.on('change', '#sort-select', async function () {
    currentSort = $(this).val();
    const $select = $(this);
    if (loadedOffset < allGroupUserIds.length) {
      $select.prop('disabled', true);
      await loadAllRemainingUsers();
      $select.prop('disabled', false);
    }
    sortAndRebuildTable();
  });
  function getUserSortDate(user) {
    const userProgress = userCourseProgressAll[user.id] || [];
    const coursesToCheck = activeFilters.courseIds.length > 0 ? userProgress.filter(p => activeFilters.courseIds.includes(p.course_id)) : userProgress;
    const dates = coursesToCheck.map(p => p.enrolled_at ? new Date(p.enrolled_at).getTime() : 0).filter(d => d > 0);
    return dates.length ? Math.max(...dates) : 0;
  }
  function sortAndRebuildTable() {
    sortedUsers = [...usersInView];
    switch (currentSort) {
      case 'first_name_asc':
        sortedUsers.sort((a, b) => (a.first_name || a.display_name || '').toLowerCase().localeCompare((b.first_name || b.display_name || '').toLowerCase()));
        break;
      case 'first_name_desc':
        sortedUsers.sort((a, b) => (b.first_name || b.display_name || '').toLowerCase().localeCompare((a.first_name || a.display_name || '').toLowerCase()));
        break;
      case 'last_name_asc':
        sortedUsers.sort((a, b) => (a.last_name || a.display_name || '').toLowerCase().localeCompare((b.last_name || b.display_name || '').toLowerCase()));
        break;
      case 'last_name_desc':
        sortedUsers.sort((a, b) => (b.last_name || b.display_name || '').toLowerCase().localeCompare((a.last_name || a.display_name || '').toLowerCase()));
        break;
      case 'date_asc':
        sortedUsers.sort((a, b) => getUserSortDate(a) - getUserSortDate(b));
        break;
      case 'completion_date_asc':
      case 'completion_date_desc':
        {
          const courseId = activeFilters.courseIds[0];
          const getCompletionDate = user => {
            const progress = (userCourseProgressAll[user.id] || []).find(p => p.course_id === courseId);
            return progress?.date_completed ? new Date(progress.date_completed).getTime() : 0;
          };
          sortedUsers.sort((a, b) => {
            const da = getCompletionDate(a);
            const db = getCompletionDate(b);
            // Users with no completion date always go to the bottom
            if (!da && !db) return 0;
            if (!da) return 1;
            if (!db) return -1;
            return currentSort === 'completion_date_asc' ? da - db : db - da;
          });
          break;
        }
      case 'date_desc':
      default:
        sortedUsers.sort((a, b) => getUserSortDate(b) - getUserSortDate(a));
        break;
    }
    displayedCount = Math.min(PAGE_SIZE, sortedUsers.length);
    const wasExpanded = expandedIdx;
    rebuildTableBody(coursesInView, sortedUsers.slice(0, displayedCount), userCourseProgressAll);

    // Restore expanded course state and quiz data from cache
    if (wasExpanded !== null) {
      expandCourse(wasExpanded);
      applyColumnFilter();
      const course = coursesInView[wasExpanded];
      if (course && courseQuizLoadedIdx.has(wasExpanded) && userQuizProgressCache[course.id]) {
        const quizSteps = courseQuizStepsCache[course.id] || [];
        $table.find(`.group-reporting__sub-cell--quizzing[data-course-idx="${wasExpanded}"]`).each(function () {
          const userId = $(this).closest('tr').data('userId');
          const userQuizProgress = userQuizProgressCache[course.id][userId] || {};
          $(this).html(buildQuizBars(quizSteps, userId, userQuizProgress));
        });
      }
    }
    updateShowMoreButton();
    applyFilters();
  }

  // ── Course Multiselect ────────────────────────────────────────────────────────

  function populateCourseMultiselect() {
    const $ms = $msCourse;
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
      const requiredMark = course.required ? ' <span class="group-reporting__required-badge" aria-hidden="true">*</span>' : '';
      $list.append(`
        <li class="bys-multiselect__option" role="option" aria-selected="${isChecked}" data-course-id="${id}">
          <label>
            <input type="checkbox" value="${id}" ${isChecked ? 'checked' : ''} />
            <span>${title}${requiredMark}</span>
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
          ${title}
          <button class="bys-multiselect__pill-remove btn-unstyled" type="button" aria-label="Remove ${title}" data-course-id="${id}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </span>
      `);
    });
  }

  // Open/close toggle
  $block.on('click', '#bys-multiselect-course .bys-multiselect__toggle', function (e) {
    e.stopPropagation();
    toggleMultiselect($msCourse);
  });
  $block.on('click', '#bys-multiselect-course .bys-multiselect__control', function (e) {
    if ($(e.target).closest('.bys-multiselect__pill-remove').length) return;
    toggleMultiselect($msCourse);
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
      closeMultiselect($msCourse);
    }
    if (!$(e.target).closest('#bys-multiselect-users').length) {
      closeMultiselect($msUsers);
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
    syncPills($msCourse);
    updateCourseDepFieldState();
  });

  // Pill remove
  $block.on('click', '.bys-multiselect__pill-remove', function (e) {
    e.stopPropagation();
    const id = parseInt($(this).data('courseId'), 10);
    selectedCourseIds = selectedCourseIds.filter(x => x !== id);
    $block.find(`#bys-multiselect-course-dropdown input[value="${id}"]`).prop('checked', false).closest('li').attr('aria-selected', 'false');
    syncPills($msCourse);
    updateCourseDepFieldState();
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
    const $ms = $msUsers;
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
      // Sort alphabetically by first/last name
      allGroupUsers.sort((a, b) => {
        const nameA = [a.first_name || '', a.last_name || ''].filter(Boolean).join(' ') || a.display_name || '';
        const nameB = [b.first_name || '', b.last_name || ''].filter(Boolean).join(' ') || b.display_name || '';
        return nameA.localeCompare(nameB);
      });
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
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      const name = [firstName, lastName].filter(Boolean).join(' ');
      const isChecked = selectedUserIds.includes(id);
      const label = name ? `${escapeHtml(name)} (${escapeHtml(email)})` : escapeHtml(email);
      $list.append(`
        <li class="bys-multiselect__option" role="option" aria-selected="${isChecked}" data-user-id="${id}" data-name="${escapeHtml(name.toLowerCase())}" data-email="${escapeHtml(email.toLowerCase())}">
          <label>
            <input type="checkbox" value="${id}" ${isChecked ? 'checked' : ''} />
            <span class="bys-multiselect__user-label">${label}</span>
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
      const name = [user.first_name || '', user.last_name || ''].filter(Boolean).join(' ');
      const pillLabel = name ? `${escapeHtml(name)} (${escapeHtml(email)})` : escapeHtml(email);
      $pills.append(`
        <span class="bys-multiselect__pill" data-user-id="${id}">
          ${pillLabel}
          <button class="bys-multiselect__pill-remove btn-unstyled" type="button" aria-label="Remove ${escapeHtml(name || email)}" data-user-id="${id}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </span>
      `);
    });
  }

  // Open/close — users
  $block.on('click', '#bys-multiselect-users .bys-multiselect__toggle', function (e) {
    e.stopPropagation();
    toggleMultiselect($msUsers);
  });
  $block.on('click', '#bys-multiselect-users .bys-multiselect__control', function (e) {
    if ($(e.target).closest('.bys-multiselect__pill-remove').length) return;
    toggleMultiselect($msUsers);
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
    syncUserPills($msUsers);
  });

  // Pill remove — users
  $block.on('click', '#bys-multiselect-users .bys-multiselect__pill-remove', function (e) {
    e.stopPropagation();
    const id = parseInt($(this).data('userId'), 10);
    selectedUserIds = selectedUserIds.filter(x => x !== id);
    $block.find(`#bys-multiselect-users-dropdown input[value="${id}"]`).prop('checked', false).closest('li').attr('aria-selected', 'false');
    syncUserPills($msUsers);
  });

  // Search within users dropdown
  $block.on('input', '#bys-multiselect-users .bys-multiselect__search', function () {
    const q = $(this).val().toLowerCase().trim();
    const $options = $block.find('#bys-multiselect-users-dropdown .bys-multiselect__option');
    let visibleCount = 0;
    $options.each(function () {
      const name = $(this).data('name') || '';
      const email = $(this).data('email') || '';
      const match = !q || name.includes(q) || email.includes(q);
      $(this).toggleClass('hidden', !match);
      if (match) visibleCount++;
    });
    $block.find('#bys-multiselect-users .bys-multiselect__empty').toggleClass('hidden', visibleCount > 0);
  });

  // ── Placeholder class for native select/date ─────────────────────────────────
  $block.on('change', '#filter-status, #filter-user-status', function () {
    $(this).toggleClass('is-placeholder', !$(this).val());
  });

  // ── Date range dropdowns ──────────────────────────────────────────────────────
  $block.on('click', '#enrolment-date-range-trigger', function (e) {
    e.preventDefault();
    $block.find('#enrolment-date-range-dropdown').toggleClass('hidden');
  });
  $block.on('click', '#completion-date-range-trigger', function (e) {
    e.preventDefault();
    $block.find('#completion-date-range-dropdown').toggleClass('hidden');
  });
  $(document).on('click.group-reporting__date-range', function (e) {
    // Ignore clicks inside any flatpickr calendar — it's rendered as a body
    // sibling, so .closest() against the field wrapper misses it.
    if ($(e.target).closest('.flatpickr-calendar').length) return;
    if (!$(e.target).closest('#group-reporting__field--enrolment-date').length) {
      $block.find('#enrolment-date-range-dropdown').addClass('hidden');
    }
    if (!$(e.target).closest('#group-reporting__field--completion-date').length) {
      $block.find('#completion-date-range-dropdown').addClass('hidden');
    }
  });

  // Native change handlers retired — flatpickr's onChange (configured per
  // instance above) handles validation and text updates.

  // ── Export ────────────────────────────────────────────────────────────────────

  $exportBtn.on('click', async function (e) {
    e.preventDefault();
    if (!currentGroupId) return;
    const $link = $(this);
    $link.addClass('is-loading').text('Exporting…');
    try {
      await exportTableToCsv();
    } finally {
      $link.removeClass('is-loading').html('<i class="fa-regular fa-download"></i> Export Table');
    }
  });
  $table.on('click', '.group-reporting__download', async function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentGroupId) return;
    const courseIdx = parseInt($(this).data('courseIdx'), 10);
    const course = coursesInView[courseIdx];
    if (!course) return;
    const $link = $(this);
    $link.addClass('is-loading').html('<i class="fa-regular fa-spinner fa-spin"></i>');
    try {
      await downloadCourseCertificates(course);
    } catch (err) {
      (0,_shared_alert_js__WEBPACK_IMPORTED_MODULE_2__.bysAlert)('Bulk certificate download failed.');
      console.error('[group-reporting] Bulk certificate download failed', err);
    } finally {
      $link.removeClass('is-loading').html('<i class="fa-regular fa-download"></i>');
    }
  });

  /**
   * Shared: get the filtered, ordered user list for any export.
   * Loads all remaining users first if they haven't been fetched yet.
   */
  async function getExportUsers() {
    if (loadedOffset < allGroupUserIds.length) {
      await loadAllRemainingUsers();
    }
    const ordered = sortedUsers.length > 0 ? [...sortedUsers] : [...usersInView];
    const ctx = buildFilterContext(activeFilters);
    return ordered.filter(user => userPassesRowFilter(user, ctx));
  }

  /**
   * Shared: serialize a 2-D array of strings to a UTF-8 CSV blob and trigger download.
   */
  function downloadCsv(rows, filename) {
    const csv = rows.map(row => row.map(cell => {
      const str = String(cell ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function courseProgressCells(courseData) {
    const progressLabel = {
      completed: 'Completed',
      in_progress: 'In Progress',
      not_started: 'Not Started'
    };
    const progressStatus = courseData?.progress_status || 'not_started';
    // mirrors the progress sub-cell
    const stepsCompleted = courseData?.steps_completed || 0;
    const stepsTotal = courseData?.steps_total || 0;
    const percentage = typeof courseData?.percent_complete === 'number' ? courseData.percent_complete : stepsTotal > 0 ? Math.min(100, Math.round(stepsCompleted / stepsTotal * 100)) : 0;
    return [progressLabel[progressStatus] || progressStatus, `${percentage}%`, courseData?.enrolled_at ? formatDate(courseData.enrolled_at) : '', courseData?.date_completed ? formatDate(courseData.date_completed) : ''];
  }

  /**
   * Ensure quiz steps + per-user progress are cached for a course.
   * Uses a single batch endpoint so export never makes N per-user calls.
   * Returns the array of quiz steps (may be empty if the course has none).
   */
  async function ensureQuizDataForCourse(course, users) {
    // ── Step 1: quiz steps ──────────────────────────────────────────────────
    // Prefer the per-course quizzes_show_in_reporting baked into /base-group-data
    // (already in the store). Fall back to the network only if the store
    // hasn't been populated yet for this group.
    let quizSteps = courseQuizStepsCache[course.id];
    if (!quizSteps) {
      const cachedCourse = (_shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getCourses() || []).find(c => c.id === course.id);
      if (cachedCourse && Array.isArray(cachedCourse.quizzes_show_in_reporting)) {
        console.log('[bys-store] group-reporting: HIT quizzes_show_in_reporting from store for course', course.id);
        quizSteps = cachedCourse.quizzes_show_in_reporting;
        courseQuizStepsCache[course.id] = quizSteps;
      } else {
        try {
          console.log('[bys-store] group-reporting: MISS — fetching courseQuizSteps for course', course.id);
          quizSteps = (await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.courseQuizSteps(course.id))) || [];
          courseQuizStepsCache[course.id] = quizSteps;
        } catch (err) {
          console.error(`[group-reporting] Failed to fetch quiz steps for course ${course.id}:`, err);
          quizSteps = [];
          courseQuizStepsCache[course.id] = quizSteps;
        }
      }
    }
    if (!quizSteps.length) return quizSteps;

    // ── Step 2: batch-fetch progress for any users not yet cached ───────────
    if (!userQuizProgressCache[course.id]) userQuizProgressCache[course.id] = {};
    const uncached = users.filter(u => userQuizProgressCache[course.id][u.id] === undefined);
    if (!uncached.length) return quizSteps;
    try {
      const userIds = uncached.map(u => u.id).join(',');
      const url = _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.courseQuizProgressBatch(course.id, userIds);
      // forceRefresh=true so the cache key (which includes all user IDs) is always fresh
      const batchResult = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(url, true);

      // batchResult: { [userId]: { [quizId]: { total_attempts, percent_highest, pass_highest } } }
      uncached.forEach(user => {
        const userData = batchResult && batchResult[user.id] ? batchResult[user.id] : {};
        // Re-key as integers to match buildQuizBars / quizProgressCell lookup by step_id
        const map = {};
        Object.keys(userData).forEach(qid => {
          map[parseInt(qid, 10)] = userData[qid];
        });
        userQuizProgressCache[course.id][user.id] = map;
      });
    } catch (err) {
      console.error(`[group-reporting] Batch quiz progress fetch failed for course ${course.id}:`, err);
      uncached.forEach(user => {
        userQuizProgressCache[course.id][user.id] = {};
      });
    }
    return quizSteps;
  }
  function quizProgressCell(quizStep, userQuizProgress) {
    const summary = userQuizProgress[quizStep.step_id];
    if (!summary || summary.total_attempts === 0) return 'Not attempted';
    const pct = Math.round(summary.percent_highest);
    return summary.pass_highest ? `Pass (${pct}%)` : `Fail (${pct}%)`;
  }
  async function exportTableToCsv() {
    const filteredUsers = await getExportUsers();

    // Determine which courses to include (respect active course column filter)
    const coursesToExport = activeFilters.courseIds.length > 0 ? coursesInView.filter(c => activeFilters.courseIds.includes(c.id)) : [...coursesInView];

    // Pre-fetch all quiz data for exported courses
    const quizStepsPerCourse = {};
    for (const course of coursesToExport) {
      quizStepsPerCourse[course.id] = await ensureQuizDataForCourse(course, filteredUsers);
    }
    const statusLabel = {
      online: 'Online',
      offline: 'Offline',
      never: 'Never Logged In'
    };
    const headers = ['Status', 'Name', 'Email'];
    coursesToExport.forEach(course => {
      const title = course.shortname || course.title?.rendered || course.title || '';
      const req = course.required ? ' (Required)' : '';
      headers.push(`${title}${req} - Course Status`, `${title}${req} - Progress`, `${title}${req} - Enrolled`, `${title}${req} - Completed`);
      (quizStepsPerCourse[course.id] || []).forEach(quiz => {
        headers.push(`${title}${req} - ${quiz.step_title}`);
      });
    });
    const rows = [headers];
    filteredUsers.forEach(user => {
      const userProgress = userCourseProgressAll[user.id] || [];
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || '';
      const row = [statusLabel[user.status] || 'Never Logged In', fullName, user.email || ''];
      coursesToExport.forEach(course => {
        row.push(...courseProgressCells(userProgress.find(cp => cp.course_id === course.id)));
        const userQuizProgress = (userQuizProgressCache[course.id] || {})[user.id] || {};
        (quizStepsPerCourse[course.id] || []).forEach(quiz => {
          row.push(quizProgressCell(quiz, userQuizProgress));
        });
      });
      rows.push(row);
    });
    const today = new Date().toISOString().split('T')[0];
    downloadCsv(rows, `group-report-${currentGroupId}-${today}.csv`);
  }

  /**
   * Bundle LD certs for every group-user achieved course-compltion into a ZIP
   * 
   * Cert URLs come from learndash_get_course_certificate_link()
   * server-side and carry a per-(course, target_user, viewing_user) nonce,
   * so each URL only renders for the user that requested the bulk download.
   * fetch() runs with credentials: 'include' to carry the session cookie.
   * 
   * NOTE: summary of non-complete
   */
  async function downloadCourseCertificates(course) {
    // get cert data
    const response = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(`/wp-json/bys-groups/v1/groups/${currentGroupId}/courses/${course.id}/certificate-urls`, true // forceRefresh - never serve a stale list
    );
    const users = Array.isArray(response?.users) ? response.users : [];
    const courseTitle = response?.course_title || course.title?.rendered || course.title || `course-${course.id}`;

    // Course has no certificate configured - abandon download
    if (response?.has_certificate_template === false) {
      (0,_shared_alert_js__WEBPACK_IMPORTED_MODULE_2__.bysAlert)(`"${courseTitle}" has no certificate configured.`);
      // console.warn('[group-reporting] Course has no certificate template:', course.id);
      return;
    }
    if (!users.length) {
      (0,_shared_alert_js__WEBPACK_IMPORTED_MODULE_2__.bysAlert)('No group members to download certificates for.');
      // console.warn('[group-reporting] No group members to download certificates for.');
      return;
    }
    // no group-users have achieved completion yet
    if (!users.some(u => !!u.certificate_url)) {
      (0,_shared_alert_js__WEBPACK_IMPORTED_MODULE_2__.bysAlert)(`No group members have completed "${courseTitle}".`);
      // console.warn('[group-reporting] No completers for course:', course.id);
      return;
    }

    // create a new ZIP file container
    const zip = new Object(function webpackMissingModule() { var e = new Error("Cannot find module 'jszip'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())();

    // Sanitise once — used for both the per-PDF filename and the outer
    // ZIP filename. Filesystems differ on what they tolerate; the
    // intersection of safe chars is conservative.
    const safe = str => String(str).replace(/[^a-zA-Z0-9-_.]+/g, '_').replace(/^_+|_+$/g, '');

    // Cap concurrency so the server doesn't get overloaded by large download at once 
    const PARALLEL = 5;
    const summaryRows = [['Email', 'User ID', 'Name', 'Certificate Included']];
    let cursor = 0;
    async function worker() {
      while (cursor < users.length) {
        const user = users[cursor++];
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || '';
        let included = false;
        if (user.certificate_url) {
          try {
            const resp = await fetch(user.certificate_url, {
              credentials: 'include'
            });
            if (resp.ok) {
              const buf = await resp.arrayBuffer();
              const filename = `${safe(user.user_id + '_' + fullName)}.pdf`;
              zip.file(filename, buf);
              included = true;
            }
          } catch (err) {
            console.warn('[group-reporting] Failed to fetch certificate for user', user.user_id, err);
          }
        }
        summaryRows.push([user.email || '', user.user_id, fullName, included ? 'Yes' : 'No']);
      }
    }
    await Promise.all(Array.from({
      length: PARALLEL
    }, worker));

    // Summary CSV at the root of the ZIP. UTF-8 BOM for Excel compatibility,
    // matching downloadCsv's behaviour for the table-level export.
    const summaryFile = summaryRows.map(row => row.map(cell => {
      const str = String(cell ?? '');
      return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')).join('\n');
    zip.file('_summary.csv', '﻿' + summaryFile);

    // make the ZIP a downloadable file and trigger browser download by simulating a click on a hidden link 
    const blob = await zip.generateAsync({
      type: 'blob'
    });
    const today = new Date().toISOString().split('T')[0];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentGroupId}-certificates-${safe(courseTitle)}-${today}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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

  // Truncate a column header title to at most maxChars at a word boundary, appending '…'
  function truncateTitle(title, maxChars = 28) {
    if (!title || title.length <= maxChars) return title;
    const cut = title.lastIndexOf(' ', maxChars);
    return (cut > 0 ? title.substring(0, cut) : title.substring(0, maxChars)) + '\u2026';
  }
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map