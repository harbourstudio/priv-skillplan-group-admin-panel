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
  courseHierarchialBreakdown: courseId => `/wp-json/bys-groups/v1/courses/${courseId}/steps`,
  groupUserCourseProgress: (userId, courseIds) => `/wp-json/bys-groups/v1/users/${userId}/course-progress?course_ids=${courseIds}`,
  courseQuizSteps: courseId => `/wp-json/bys-groups/v1/courses/${courseId}/quiz-steps`,
  userQuizAttempts: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts?course_id=${courseId}`
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
/*!***********************************!*\
  !*** ./src/user-progress/view.js ***!
  \***********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");

jQuery(document).ready(async $ => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get('group_id');
  const userId = params.get('user_id');
  if (!groupId || !userId) {
    console.error('[user-progress] Missing group_id or user_Id URL parameter');
    return;
  }
  const $block = $('.wp-block-bys-groups-user-progress').first(); // only one block instance per page
  const $coursesList = $block.find('#user-progress-courses-list');

  // Template references
  const courseTemplate = $block.find('#user-progress-course-template')[0];
  const lessonTemplate = $block.find('#user-progress-lesson-template')[0];
  const topicTemplate = $block.find('#user-progress-topic-template')[0];
  try {
    // 1. Fetch group courses
    const courses = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.groupCourses(groupId));
    if (!Array.isArray(courses) || courses.length === 0) {
      console.log('[user-progress] No courses found for group:', groupId);
      return;
    }

    // 2. Render course shells (without lessons/topics yet)
    /**
     * NOTE: we render course accordions without the full lessons/topics breakdown to avoid making parallel requests to the LD API. Requesting full breakdowns for ALL courses on page load will cause timeout issues. Instead, we fetch the lessons/topics breakdown for a single course when its accordion is clicked, so only one course is being requested at a time.
     */
    courses.forEach((course, courseIndex) => {
      const courseNode = courseTemplate.content.cloneNode(true);
      const $course = $(courseNode);
      const courseNum = courseIndex + 1;

      // Set course name (use title.rendered to get the nice name)
      const courseTitle = typeof course.title === 'string' ? course.title : course.title?.rendered || 'Untitled';
      $course.find('.accordion-toggle__course-name').text(courseTitle);

      // Set unique IDs for accordion functionality
      const courseId = `hs-course-heading-${courseNum}`;
      const contentId = `hs-course-collapse-${courseNum}`;
      $course.find('.hs-accordion').attr('id', courseId).data('course-id', course.id);
      $course.find('.hs-accordion-toggle').attr('aria-controls', contentId);
      $course.find('.hs-accordion-content').attr('id', contentId).attr('aria-labelledby', courseId);
      const $accordionContent = $course.find('.accordion-content__inner');

      // Set loading state
      $accordionContent.html('<p>Click to load lessons...</p>');

      // Attach click handler to fetch lessons on expand
      const $toggle = $course.find('.hs-accordion-toggle');
      let lessonsLoaded = false;

      // 3. Fetch lessons on-demand on accordion click
      $toggle.on('click', async function () {
        if (lessonsLoaded) return; // Already loaded

        lessonsLoaded = true;
        $accordionContent.html('<p>Loading...</p>');
        try {
          const lessons = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(_shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.endpoints.courseLessonsWithTopics(course.id));

          // Clear loading state
          $accordionContent.empty();

          // Render lessons
          if (Array.isArray(lessons) && lessons.length > 0) {
            lessons.forEach(lesson => {
              const lessonNode = lessonTemplate.content.cloneNode(true);
              const $lesson = $(lessonNode);
              $lesson.find('.module__name').text(lesson.title);
              const $tbody = $lesson.find('tbody');

              // Render topics for this lesson
              if (Array.isArray(lesson.topics)) {
                lesson.topics.forEach(topic => {
                  const topicNode = topicTemplate.content.cloneNode(true);
                  const $topic = $(topicNode);
                  $topic.find('.topic-name').text(topic.title);
                  $tbody.append($topic);
                });
              }
              $accordionContent.append($lesson);
            });
          } else {
            $accordionContent.html('<p>No lessons found.</p>');
          }
        } catch (err) {
          console.error(`[user-progress] Failed to fetch lessons for course ${course.id}:`, err);
          $accordionContent.html('<p>Failed to load lessons.</p>');
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