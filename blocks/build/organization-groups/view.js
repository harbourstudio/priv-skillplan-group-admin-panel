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
  !*** ./src/organization-groups/view.js ***!
  \*****************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");

const ARCHIVE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="21 8 21 21 3 21 3 8"></polyline>
    <rect x="1" y="3" width="22" height="5"></rect>
    <line x1="10" y1="12" x2="14" y2="12"></line>
</svg>`;
function formatArchivedDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return 'Archived ' + date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
function buildGroupRow(group) {
  const $row = jQuery(`
        <div class="org-groups__item" data-group-id="${group.id}">
            <span class="org-groups__group-name">${group.name}</span>
            <button class="org-groups__manage-btn btn-unstyled" type="button">
                Manage <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
        </div>
    `);
  $row.find('.org-groups__manage-btn').on('click', function () {
    sessionStorage.setItem('bys_selected_group_id', group.id);
    window.location.href = '/administrator-dashboard';
  });
  return $row;
}
function buildArchivedRow(group, $archivedSection, canUnarchive) {
  const $row = jQuery(`
        <div class="org-groups__archived-item" data-group-id="${group.id}">
            <div class="org-groups__archived-icon">${ARCHIVE_ICON}</div>
            <div class="org-groups__archived-info">
                <span class="org-groups__archived-name">${group.name}</span>
                <span class="org-groups__archived-date">${formatArchivedDate(group.archived_date)}</span>
            </div>
            ${canUnarchive ? '<button class="org-groups__unarchive-btn btn-unstyled" type="button">Unarchive</button>' : ''}
        </div>
    `);
  if (!canUnarchive) return $row;
  $row.find('.org-groups__unarchive-btn').on('click', async function () {
    const $btn = jQuery(this);
    $btn.prop('disabled', true).text('Unarchiving…');
    try {
      await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.post(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.unarchiveGroup(group.id));
      $row.fadeOut(300, () => {
        $row.remove();
        // Hide the whole archived section if nothing left
        if (!$archivedSection.find('.org-groups__archived-item').length) {
          $archivedSection.hide();
        }
      });
    } catch (err) {
      console.error('[org-groups] Failed to unarchive group', err);
      $btn.prop('disabled', false).text('Unarchive');
    }
  });
  return $row;
}
function buildNewGroupFooter(createFn, $section) {
  const $footer = jQuery(`
        <div class="org-groups__new-group">
            <button class="org-groups__new-group-btn btn-unstyled" type="button">
                <i class="fa-solid fa-plus" aria-hidden="true"></i> New group
            </button>
            <div class="org-groups__new-group-form">
                <input
                    class="org-groups__new-group-input"
                    type="text"
                    placeholder="Group name…"
                    maxlength="100"
                />
                <button class="org-groups__new-group-submit btn-unstyled" type="button">Create</button>
                <button class="org-groups__new-group-cancel btn-unstyled" type="button">Cancel</button>
            </div>
            <div class="org-groups__created-confirm">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                <span class="org-groups__created-name"></span> created.
                <button class="org-groups__go-to-group btn-unstyled" type="button">
                    Manage group <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </button>
            </div>
        </div>
    `);
  const $btn = $footer.find('.org-groups__new-group-btn');
  const $form = $footer.find('.org-groups__new-group-form');
  const $input = $footer.find('.org-groups__new-group-input');
  const $submit = $footer.find('.org-groups__new-group-submit');
  const $cancel = $footer.find('.org-groups__new-group-cancel');
  const $confirm = $footer.find('.org-groups__created-confirm');
  const $goBtn = $footer.find('.org-groups__go-to-group');
  function openForm() {
    $btn.addClass('is-hidden');
    $form.addClass('is-open');
    $input.val('').trigger('focus');
  }
  function closeForm() {
    $form.removeClass('is-open');
    $btn.removeClass('is-hidden');
  }
  $btn.on('click', openForm);
  $cancel.on('click', closeForm);
  $input.on('keydown', function (e) {
    if (e.key === 'Enter') $submit.trigger('click');
    if (e.key === 'Escape') closeForm();
  });
  $submit.on('click', async function () {
    const name = $input.val().trim();
    if (!name) {
      $input.trigger('focus');
      return;
    }
    $submit.prop('disabled', true).text('Creating…');
    $cancel.prop('disabled', true);
    try {
      const group = await createFn(name);

      // Clear search so the new group is always visible
      const $parentBlock = $section.closest('.wp-block-bys-groups-organization-groups');
      $parentBlock.find('.org-groups__search').val('');
      applySearch($parentBlock, '');

      // Add the new row to the active items list
      const $items = $section.find('.org-groups__items');
      $items.append(buildGroupRow(group));
      $section.find('.org-groups__empty').remove();

      // Update group count label
      const count = $section.find('.org-groups__item').length;
      $section.find('.org-groups__org-meta').text(`${count} group${count !== 1 ? 's' : ''}`);

      // Show confirmation
      $form.removeClass('is-open');
      $confirm.find('.org-groups__created-name').text(`"${group.name}"`);
      $confirm.addClass('is-open');
      $goBtn.on('click', function () {
        sessionStorage.setItem('bys_selected_group_id', group.id);
        window.location.href = '/administrator-dashboard';
      });
    } catch (err) {
      console.error('[org-groups] Failed to create group', err);
      $submit.prop('disabled', false).text('Create');
      $cancel.prop('disabled', false);
    }
  });
  return $footer;
}
function buildOrgSection(org) {
  const groupCount = org.groups.length;
  const countLabel = `${groupCount} group${groupCount !== 1 ? 's' : ''}`;
  const $section = jQuery(`
        <div class="org-groups__section" data-org-id="${org.id}">
            <div class="org-groups__org-header">
                <h3 class="org-groups__org-name">${org.name}</h3>
                <span class="org-groups__org-meta">${countLabel}</span>
            </div>
            <div class="org-groups__card">
                <div class="org-groups__items"></div>
                ${!groupCount ? '<p class="org-groups__empty">No groups yet — create one below.</p>' : ''}
            </div>
        </div>
    `);
  org.groups.forEach(group => {
    $section.find('.org-groups__items').append(buildGroupRow(group));
  });
  if (org.is_admin) {
    $section.find('.org-groups__card').append(buildNewGroupFooter(name => _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.post(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.createOrganizationGroup(org.id), {
      name
    }), $section));
  }

  // Archived groups section — rendered whenever the server returned any.
  // The server only includes archived groups for users entitled to see them
  // (org admins, site admins, graders, or leaders of any group in the org).
  // Unarchive is org-admin-only, so the button is hidden for non-admins.
  if (org.archived_groups && org.archived_groups.length) {
    const $archived = jQuery(`
            <div class="org-groups__archived-section">
                <button class="org-groups__archived-toggle btn-unstyled" type="button">
                    <i class="fa-solid fa-chevron-right org-groups__archived-chevron" aria-hidden="true"></i>
                    Archived groups
                    <span class="org-groups__archived-badge">${org.archived_groups.length}</span>
                </button>
                <div class="org-groups__archived-list"></div>
            </div>
        `);
    const $toggle = $archived.find('.org-groups__archived-toggle');
    const $list = $archived.find('.org-groups__archived-list');
    const $chevron = $archived.find('.org-groups__archived-chevron');
    org.archived_groups.forEach(group => {
      $list.append(buildArchivedRow(group, $list, !!org.is_admin));
    });
    $toggle.on('click', function () {
      const isOpen = $list.hasClass('is-open');
      $list.toggleClass('is-open', !isOpen);
      $chevron.toggleClass('is-rotated', !isOpen);
    });
    $section.append($archived);
  }
  return $section;
}
function buildUngroupedSection(groups, archivedGroups) {
  const groupCount = groups.length;
  const countLabel = `${groupCount} group${groupCount !== 1 ? 's' : ''}`;
  const $section = jQuery(`
        <div class="org-groups__section org-groups__section--ungrouped">
            <div class="org-groups__org-header">
                <h3 class="org-groups__org-name">Other Groups</h3>
                <span class="org-groups__org-meta">${countLabel}</span>
            </div>
            <div class="org-groups__card">
                <div class="org-groups__items"></div>
                ${!groupCount ? '<p class="org-groups__empty">No standalone groups.</p>' : ''}
            </div>
        </div>
    `);
  groups.forEach(group => {
    $section.find('.org-groups__items').append(buildGroupRow(group));
  });

  // Standalone archived groups — site-admin-only (the server only returns
  // ungrouped_archived_groups when the requester is a site admin), so
  // anyone seeing rows here can unarchive them.
  if (archivedGroups && archivedGroups.length) {
    const $archived = jQuery(`
            <div class="org-groups__archived-section">
                <button class="org-groups__archived-toggle btn-unstyled" type="button">
                    <i class="fa-solid fa-chevron-right org-groups__archived-chevron" aria-hidden="true"></i>
                    Archived groups
                    <span class="org-groups__archived-badge">${archivedGroups.length}</span>
                </button>
                <div class="org-groups__archived-list"></div>
            </div>
        `);
    const $toggle = $archived.find('.org-groups__archived-toggle');
    const $list = $archived.find('.org-groups__archived-list');
    const $chevron = $archived.find('.org-groups__archived-chevron');
    archivedGroups.forEach(group => {
      $list.append(buildArchivedRow(group, $list, true));
    });
    $toggle.on('click', function () {
      const isOpen = $list.hasClass('is-open');
      $list.toggleClass('is-open', !isOpen);
      $chevron.toggleClass('is-rotated', !isOpen);
    });
    $section.append($archived);
  }
  return $section;
}
function applySearch($block, query) {
  const q = query.toLowerCase().trim();
  $block.find('.org-groups__section').each(function () {
    const $section = jQuery(this);
    const orgName = $section.find('.org-groups__org-name').first().text().toLowerCase();
    const orgMatch = !q || orgName.includes(q);
    let visibleActiveCount = 0;
    let visibleArchivedCount = 0;

    // Published groups
    $section.find('.org-groups__item').each(function () {
      const $row = jQuery(this);
      const groupName = $row.find('.org-groups__group-name').text().toLowerCase();
      const match = !q || orgMatch || groupName.includes(q);
      $row.toggleClass('is-hidden', !match);
      if (match) visibleActiveCount++;
    });

    // Archived groups — filter the same way; auto-expand the subsection
    // when a query is present so matches aren't hidden behind the toggle.
    const $archivedSection = $section.find('.org-groups__archived-section');
    if ($archivedSection.length) {
      $archivedSection.find('.org-groups__archived-item').each(function () {
        const $row = jQuery(this);
        const groupName = $row.find('.org-groups__archived-name').text().toLowerCase();
        const match = !q || orgMatch || groupName.includes(q);
        $row.toggleClass('is-hidden', !match);
        if (match) visibleArchivedCount++;
      });
      const $list = $archivedSection.find('.org-groups__archived-list');
      const $chevron = $archivedSection.find('.org-groups__archived-chevron');
      if (q) {
        // Hide the whole archived subsection if nothing matches; otherwise
        // open it so matches are immediately visible.
        $archivedSection.toggleClass('is-hidden', visibleArchivedCount === 0 && !orgMatch);
        $list.toggleClass('is-open', visibleArchivedCount > 0);
        $chevron.toggleClass('is-rotated', visibleArchivedCount > 0);
      } else {
        // Reset to default collapsed state when search is cleared.
        $archivedSection.removeClass('is-hidden');
        $list.removeClass('is-open');
        $chevron.removeClass('is-rotated');
      }
    }

    // Section is hidden only when neither org name, any published row,
    // nor any archived row matched.
    const sectionHasMatch = orgMatch || visibleActiveCount > 0 || visibleArchivedCount > 0;
    $section.toggleClass('is-hidden', !sectionHasMatch && !!q);

    // Inline empty message when the section header matched but no rows did.
    const $empty = $section.find('.org-groups__search-empty');
    if (q && !orgMatch && visibleActiveCount === 0 && visibleArchivedCount === 0) {
      if (!$empty.length) {
        $section.find('.org-groups__items').after('<p class="org-groups__search-empty">No groups match your search.</p>');
      }
    } else {
      $empty.remove();
    }
  });
}
jQuery(document).ready(async $ => {
  const $block = $('.wp-block-bys-groups-organization-groups').first();
  if (!$block.length) return;
  const $skeleton = $block.find('.org-groups__skeleton');
  const $list = $block.find('.org-groups__list');
  const $search = $block.find('.org-groups__search');
  try {
    const data = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.currentUserOrganizations());
    const organizations = data.organizations || [];
    const ungrouped = data.ungrouped_groups || [];
    const ungroupedArchived = data.ungrouped_archived_groups || [];
    $skeleton.hide();
    if (!organizations.length && !ungrouped.length && !ungroupedArchived.length) {
      $list.html('<p class="org-groups__no-orgs">You have no groups to manage.</p>');
      return;
    }
    organizations.forEach(org => $list.append(buildOrgSection(org)));
    if (ungrouped.length || ungroupedArchived.length) {
      $list.append(buildUngroupedSection(ungrouped, ungroupedArchived));
    }
    $search.on('input', function () {
      applySearch($block, jQuery(this).val());
    });
  } catch (err) {
    console.error('[org-groups] Failed to load organizations', err);
    $skeleton.hide();
    $list.html('<p class="org-groups__no-orgs">Could not load groups.</p>');
  }
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map