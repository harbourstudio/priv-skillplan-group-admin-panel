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
/*!********************************************!*\
  !*** ./src/group-add-member-modal/view.js ***!
  \********************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/* harmony import */ var _shared_store_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../_shared/store.js */ "./src/_shared/store.js");



// Module constants
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
jQuery(document).ready($ => {
  const $block = $('.wp-block-bys-groups-group-add-member-modal'); // first instance
  if (!$block.length) return;
  const $modal = $block.find('#add-member-modal');
  if (!$modal.length) return;
  const $screenUpload = $modal.find('.gaam__screen--upload');
  const $screenReview = $modal.find('.gaam__screen--review');
  const $screenResults = $modal.find('.gaam__screen--results');
  const $alert = $modal.find('.gaam__alert');
  const $fileInput = $modal.find('.upload__input');
  const $templateLink = $modal.find('.gaam__template');
  const $reviewBtn = $modal.find('.gaam__review');
  const $confirmBtn = $modal.find('.gaam__confirm');
  const $backBtn = $modal.find('.gaam__back');
  const $modalFooter = $modal.find('.gaam__footer');
  const $modalInner = $modal.find('.gaam__inner');
  let currentGroupId = null;
  let currentRole = 'learner'; // Set by bys:bulkAddOpened broadcast from group-add-member
  let validEmails = [];
  let invalidEmails = [];
  let previewData = null; // Stores dry_run response; ensures user reviews before confirming

  const $title = $modal.find('.gaam__title');
  const $defaultTitleText = $title.text();
  const $roleValue = $modal.find('.gaam__role-value');
  function syncTitleToRole() {
    if (currentRole === 'leader') {
      $title.text('Bulk Upload Group Leaders');
      $roleValue.text('Group Leader');
    } else {
      $title.text($defaultTitleText);
      $roleValue.text('Learner');
    }
  }
  function closeModal() {
    // Remove Preline's open class and add hidden
    $modal.removeClass('open').addClass('hidden');
    $('html').css('overflow', '');
    // Remove dynamically created Preline backdrop
    $('.hs-overlay-backdrop').remove();

    // Reset state on close
    resetState();
  }
  function resetState() {
    validEmails = [];
    invalidEmails = [];
    previewData = null;
    $modal.find('.gaam__alert--upload').hide().text('');
    $fileInput.val('');
    showScreen('upload');
  }
  function showScreen(screenName) {
    $screenUpload.hide();
    $screenReview.hide();
    $screenResults.hide();
    $reviewBtn.show();
    $confirmBtn.hide();
    $backBtn.hide();
    if (screenName === 'upload') {
      $screenUpload.show();
      $reviewBtn.show();
      $dropzone.show();
    } else if (screenName === 'review') {
      $screenReview.show();
      $reviewBtn.hide();
      $confirmBtn.show();
      $backBtn.show();
    } else if (screenName === 'results') {
      $screenResults.show();
      $confirmBtn.hide();
      $backBtn.hide();
      $reviewBtn.hide();
    }
  }

  // Template download
  $templateLink.on('click', e => {
    e.preventDefault();
    const csv = 'email\n';
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'group-enrollment.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // File upload button
  $modal.find('.gaam__upload').on('click', () => {
    $fileInput.click();
  });

  // Drag and drop
  const $dropzone = $modal.find('.gaam__dropzone');
  $dropzone.on('dragover', e => {
    e.preventDefault();
    $dropzone.css('background-color', '#f0f4ff');
  });
  $dropzone.on('dragleave', () => {
    $dropzone.css('background-color', '');
  });
  $dropzone.on('drop', e => {
    e.preventDefault();
    $dropzone.css('background-color', '');
    const files = e.originalEvent.dataTransfer.files;
    if (files.length) {
      handleFile(files[0]);
    }
  });

  // File input change
  $fileInput.on('change', function () {
    if (this.files.length) {
      handleFile(this.files[0]);
    }
  });
  function handleFile(file) {
    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      showUploadError('Please upload a valid file type (.csv).');
      return;
    }

    // Parse CSV
    const reader = new FileReader();
    reader.onload = e => {
      try {
        parseCSV(e.target.result);
      } catch (err) {
        showUploadError(err.message);
      }
    };
    reader.onerror = () => {
      showUploadError('Failed to read file.');
    };
    reader.readAsText(file);
  }
  function parseCSV(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 1) {
      throw new Error('File is empty.');
    }

    // Validate header contains "email" column
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    if (!headers.includes('email')) {
      throw new Error('File must have an "email" column header.');
    }

    // Find email column index
    const emailColumnIndex = headers.indexOf('email');

    // Extract and validate emails
    validEmails = [];
    invalidEmails = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const email = row[emailColumnIndex]?.trim();
      if (!email) continue; // Skip empty lines

      if (EMAIL_REGEX.test(email)) {
        validEmails.push(email);
      } else {
        invalidEmails.push(email);
      }
    }
    if (validEmails.length === 0 && invalidEmails.length === 0) {
      throw new Error('No emails found in file.');
    }
    const $uploadAlert = $modal.find('.gaam__alert--upload');
    $uploadAlert.removeClass('gaam__alert--error');
    $fileInput.val(''); // Clear input for re-upload
    $reviewBtn.prop('disabled', false);

    // Show success message
    const totalCount = validEmails.length + invalidEmails.length;
    const successMsg = `Valid file. Found ${totalCount} email(s).`;
    $uploadAlert.text(successMsg).show();
    $dropzone.hide();
  }
  function showUploadError(msg) {
    const $uploadAlert = $modal.find('.gaam__alert--upload');
    $uploadAlert.addClass('gaam__alert--error').text(msg).show();
    $reviewBtn.prop('disabled', true);
    validEmails = [];
    invalidEmails = [];
  }

  // Review button — fetch dry_run preview alongside the "already in role"
  // ID set (members for learner uploads, leaders for leader uploads).
  // Used client-side to bucket existing users into "newly added" vs
  // "already in this role" on the review screen.
  $reviewBtn.on('click', async () => {
    if (!currentGroupId || validEmails.length === 0) return;
    $reviewBtn.prop('disabled', true).text('Loading...');
    try {
      const alreadyInRolePromise = fetchAlreadyInRoleIds(currentGroupId, currentRole);
      const [response, alreadyInRoleIds] = await Promise.all([_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.post(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupInviteBulk(currentGroupId), {
        emails: validEmails,
        role: currentRole,
        dry_run: true
      }), alreadyInRolePromise]);
      previewData = {
        ...response,
        alreadyInRoleIds // array; rebuilt as a Set at each consumer
      };
      populateReviewScreen(response, new Set(alreadyInRoleIds));
      showScreen('review');
      $reviewBtn.text('Review Results');
    } catch (err) {
      showUploadError('Failed to preview. Please try again.');
      console.error('[add-member-modal]', err);
      $reviewBtn.text('Review Results');
    } finally {
      $reviewBtn.prop('disabled', false);
    }
  });

  /**
   * Returns the set of user IDs currently in `role` for `groupId` as an
   * array. Reads from the shared store cache when possible, falls back to
   * REST. For role='leader' the response shape from /leaders is an array
   * of leader objects with `.id`; for role='learner' base-user-stats
   * returns `.user_ids`.
   */
  async function fetchAlreadyInRoleIds(groupId, role) {
    const cachedGroup = _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getCurrentGroup() === Number(groupId);
    if (role === 'leader') {
      const cachedLeaders = cachedGroup ? _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getLeaders() : null;
      if (cachedLeaders) {
        return cachedLeaders.map(l => l.id);
      }
      const leaders = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupLeaders(groupId));
      return (Array.isArray(leaders) ? leaders : []).map(l => l.id);
    }
    const cachedUserIds = cachedGroup ? _shared_store_js__WEBPACK_IMPORTED_MODULE_1__["default"].getUserIds() : null;
    if (cachedUserIds) return cachedUserIds;
    const stats = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupBaseUsersStats(groupId));
    return stats?.user_ids || [];
  }
  function populateReviewScreen(data, alreadyInRoleIds) {
    // Cache all DOM selectors once
    const $listAdd = $screenReview.find('.gaam__review--add');
    const $listAlreadyMember = $screenReview.find('.gaam__review--already-member');
    const $listInvite = $screenReview.find('.gaam__review--invite');
    const $listAlreadyInvited = $screenReview.find('.gaam__review--already-invited');
    const $listInvalid = $screenReview.find('.gaam__review--invalid');
    const $sectionAdd = $screenReview.find('.gaam__review-group--add');
    const $sectionAlreadyMember = $screenReview.find('.gaam__review-group--already-member');
    const $sectionInvite = $screenReview.find('.gaam__review-group--invite');
    const $sectionAlreadyInvited = $screenReview.find('.gaam__review-group--already-invited');
    const $sectionInvalid = $screenReview.find('.gaam__review-group--invalid');
    const $countAdd = $screenReview.find('.gaam__review-count--add');
    const $countAlreadyMember = $screenReview.find('.gaam__review-count--already-member');
    const $countInvite = $screenReview.find('.gaam__review-count--invite');
    const $countAlreadyInvited = $screenReview.find('.gaam__review-count--already-invited');
    const $countInvalid = $screenReview.find('.gaam__review-count--invalid');

    // Swap the "Already ___" label to match the upload role.
    $screenReview.find('.gaam__review-label--already-member').text(currentRole === 'leader' ? 'Already leaders' : 'Already members');

    // Clear lists once
    $listAdd.empty();
    $listAlreadyMember.empty();
    $listInvite.empty();
    $listAlreadyInvited.empty();
    $listInvalid.empty();

    // Separate enrolled: those already in this role vs those being added
    const newlyEnrolled = [];
    const alreadyInRole = [];
    (data.enrolled || []).forEach(item => {
      if (alreadyInRoleIds.has(item.user_id)) {
        alreadyInRole.push(item);
      } else {
        newlyEnrolled.push(item);
      }
    });
    const invitedCount = data.invited?.length || 0;

    // Categorize server-side failed emails:
    // - "Pending invite already exists" = user will be invited (already has pending)
    // - Other failures = truly invalid emails
    const clientSideInvalidCount = invalidEmails.length;
    let alreadyInvitedCount = 0;
    const serverSideInvalidEmails = {};
    (data.failed || []).forEach(item => {
      if (item.reason === 'Pending invite already exists') {
        alreadyInvitedCount++;
      } else {
        serverSideInvalidEmails[item.email] = item.reason;
      }
    });
    const totalInvalidCount = clientSideInvalidCount + Object.keys(serverSideInvalidEmails).length;
    const totalCount = newlyEnrolled.length + alreadyInRole.length + invitedCount + alreadyInvitedCount + totalInvalidCount;

    // Render newly enrolled users (existing users being added to the role)
    if (newlyEnrolled.length > 0) {
      const addHtml = newlyEnrolled.map(item => `<li>${item.email}</li>`).join('');
      $listAdd.html(addHtml);
    }
    $countAdd.text(`(${newlyEnrolled.length})`);
    $sectionAdd.toggle(newlyEnrolled.length > 0);

    // Render already-in-role users (already members for learner uploads,
    // already leaders for leader uploads).
    if (alreadyInRole.length > 0) {
      const alreadyHtml = alreadyInRole.map(item => `<li>${item.email}</li>`).join('');
      $listAlreadyMember.html(alreadyHtml);
    }
    $countAlreadyMember.text(`(${alreadyInRole.length})`);
    $sectionAlreadyMember.toggle(alreadyInRole.length > 0);

    // Render invited users (new users getting invitations)
    if (invitedCount > 0) {
      const invitedHtml = (data.invited || []).map(item => `<li>${item.email}</li>`).join('');
      $listInvite.html(invitedHtml);
    }
    $countInvite.text(`(${invitedCount})`);
    $sectionInvite.toggle(invitedCount > 0);

    // Render already invited (users with existing pending invites)
    if (alreadyInvitedCount > 0) {
      let alreadyInvitedHtml = '';
      (data.failed || []).forEach(item => {
        if (item.reason === 'Pending invite already exists') {
          alreadyInvitedHtml += `<li>${item.email}</li>`;
        }
      });
      $listAlreadyInvited.html(alreadyInvitedHtml);
    }
    $countAlreadyInvited.text(`(${alreadyInvitedCount})`);
    $sectionAlreadyInvited.toggle(alreadyInvitedCount > 0);

    // Render invalid emails (client-side format errors + server-side failures)
    let invalidHtml = '';
    invalidEmails.forEach(email => {
      invalidHtml += `<li>${email}</li>`;
    });
    Object.keys(serverSideInvalidEmails).forEach(email => {
      invalidHtml += `<li>${email}</li>`;
    });
    if (invalidHtml) {
      $listInvalid.html(invalidHtml);
    }

    // Show/hide invalid section
    if (totalInvalidCount > 0) {
      $countInvalid.text(`(${totalInvalidCount})`);
      $sectionInvalid.show();
    } else {
      $sectionInvalid.hide();
    }

    // Render or update total count
    const $reviewBody = $screenReview.find('> div').first();
    let $totalCount = $reviewBody.find('.gaam__total-count');
    if ($totalCount.length === 0) {
      $totalCount = $(`<p class="gaam__total-count">Total: ${totalCount} emails</p>`);
      $reviewBody.prepend($totalCount);
    } else {
      $totalCount.text(`Total: ${totalCount} emails`);
    }
  }

  // Back button
  $backBtn.on('click', () => {
    showScreen('upload');
  });

  // Confirm button — process for real
  $confirmBtn.on('click', async () => {
    if (!currentGroupId || !previewData) return;
    $confirmBtn.prop('disabled', true).text('Processing...');
    try {
      const response = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.post(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupInviteBulk(currentGroupId), {
        emails: validEmails,
        role: currentRole,
        dry_run: false
      });

      // Re-bucket against the "already in this role" set captured at preview time.
      const alreadyInRoleIds = new Set(previewData?.alreadyInRoleIds || []);
      const newlyAdded = [];
      const alreadyInRole = [];
      (response.enrolled || []).forEach(item => {
        if (alreadyInRoleIds.has(item.user_id)) {
          alreadyInRole.push(item);
        } else {
          newlyAdded.push(item);
        }
      });

      // Count pending invites vs truly invalid
      const pendingInvites = (response.failed || []).filter(f => f.reason === 'Pending invite already exists').length;
      const actualFailures = (response.failed || []).length - pendingInvites;
      const invitedCount = (response.invited?.length || 0) + pendingInvites;
      const newlyAddedCount = newlyAdded.length;
      const alreadyInRoleCount = alreadyInRole.length;
      const total = newlyAddedCount + alreadyInRoleCount + invitedCount + actualFailures;
      const alreadyLabel = currentRole === 'leader' ? 'already leader(s)' : 'already member(s)';
      let summary = `Processed ${total} email(s): `;
      if (newlyAddedCount > 0) summary += `${newlyAddedCount} added`;
      if (alreadyInRoleCount > 0) summary += `${newlyAddedCount > 0 ? ', ' : ''}${alreadyInRoleCount} ${alreadyLabel}`;
      if (invitedCount > 0) summary += `${newlyAddedCount > 0 || alreadyInRoleCount > 0 ? ', ' : ''}${invitedCount} invited`;
      if (actualFailures > 0) summary += `${newlyAddedCount > 0 || alreadyInRoleCount > 0 || invitedCount > 0 ? ', ' : ''}${actualFailures} failed`;
      $modal.find('.gaam__alert--results').removeClass('gaam__alert--error').text(summary);
      showScreen('results');
      $confirmBtn.text('Confirm & Add');
      $modalFooter.hide();
      setTimeout(() => {
        closeModal();
        // Refresh page after modal closes (accounting for close animation duration)
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }, 3000);
    } catch (err) {
      showUploadError('Failed to process. Please try again.');
      console.error('[add-member-modal]', err);
      $confirmBtn.text('Confirm & Add');
      showScreen('review');
    } finally {
      $confirmBtn.prop('disabled', false);
    }
  });

  // Track group selection
  $(document).on('bys:groupSelected', (_, {
    groupId
  }) => {
    currentGroupId = groupId;
  });

  // Track the role chosen in the parent group-add-member block — fires
  // when the user clicks "Bulk Upload" so we know whether they're
  // uploading learners or leaders. Backend accepts either role.
  $(document).on('bys:bulkAddOpened', (_, {
    role
  }) => {
    currentRole = role === 'leader' ? 'leader' : 'learner';
    syncTitleToRole();
  });

  // Modal close
  function setupCloseHandlers() {
    $modal.find('.gaam__close').on('click', closeModal);
    $modal.find('.modal-backdrop').on('click', closeModal);
    $(document).on('keydown.addMemberModal', e => {
      if (e.key === 'Escape' && !$modal.hasClass('hidden')) closeModal();
    });
  }

  // Lock scroll, show upload screen, and remove dynamically created Preline backdrop
  const observer = new MutationObserver(() => {
    if (!$modal.hasClass('hidden')) {
      // Show upload screen when modal opens (for first open or after close/reopen)
      if (!$modal.hasClass('open')) {
        showScreen('upload');
      }
      $('html').css('overflow', 'hidden');
      // Remove Preline's dynamically created backdrop (we use our own .modal-backdrop)
      setTimeout(() => {
        $('.hs-overlay-backdrop').remove();
      }, 0);
    } else {
      $('html').css('overflow', '');
    }
  });
  observer.observe($modal[0], {
    attributes: true,
    attributeFilter: ['class']
  });
  setupCloseHandlers();
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map