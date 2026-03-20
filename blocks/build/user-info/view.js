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
/* harmony export */   api: () => (/* binding */ api)
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
/*!*******************************!*\
  !*** ./src/user-info/view.js ***!
  \*******************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../_shared/api-client.js */ "./src/_shared/api-client.js");
/**
 * User Info Block - Frontend View
 * Fetches user data from REST API based on URL parameters
 */


jQuery(document).ready(async $ => {
  // Get user_id from URL parameters
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('user_id');
  const groupId = params.get('group_id');
  if (!userId || !groupId) {
    console.error('Missing user_id or group_id parameter');
    return;
  }

  // Wait for auth header to be available
  await waitForAuthHeader();
  try {
    // Fetch user details from custom endpoint
    const userUrl = `/wp-json/bys-groups/v1/groups/${groupId}/users/${userId}`;
    const userData = await _shared_api_client_js__WEBPACK_IMPORTED_MODULE_0__.api.get(userUrl, true);

    // Display user info
    displayUserInfo(userData);
  } catch (err) {
    console.error('Failed to fetch user details:', err);
  }
  async function waitForAuthHeader() {
    return new Promise(resolve => {
      const checkAuth = () => {
        if (window.bysGroupsAuth && window.bysGroupsAuth.header) {
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
    });
  }
  function displayUserInfo(user) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name;
    const statusClass = user.has_logged_in ? 'active' : 'inactive';
    const statusText = user.has_logged_in ? 'Active' : 'Inactive';

    // Format dates
    const enrolledDate = user.group_enrolled_date ? formatDate(user.group_enrolled_date) : 'Unknown';
    const lastActiveDate = user.last_login ? formatUnixTimestamp(user.last_login) : 'Never';

    // Build HTML
    const html = `
      <div class="user-progress__header">
        <div class="user-progress__avatar">
          <img src="https://i.pravatar.cc/80?u=${encodeURIComponent(user.email)}" alt="${escapeHtml(fullName)}" />
        </div>
        <div class="user-progress__user-info">
          <h1 class="user-progress__name">${escapeHtml(fullName)}</h1>
          <div class="user-progress__meta">
            <span class="user-progress__email">${escapeHtml(user.email)}</span>
            <span class="user-progress__meta-item">
              <i class="fa-solid fa-calendar"></i> Enrolled: ${enrolledDate}
            </span>
            <span class="user-progress__meta-item">
              <i class="fa-solid fa-clock"></i> Last Active: ${lastActiveDate}
            </span>
            <span class="user-progress__meta-item user-progress__meta-item--${statusClass}">
              <i class="fa-solid fa-circle"></i> ${statusText}
            </span>
          </div>
        </div>
      </div>
    `;

    // Insert HTML into block
    const $block = $('.wp-block-bys-groups-user-info');
    $block.html(html);
  }
  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }
  function formatUnixTimestamp(timestamp) {
    if (!timestamp) return '';
    try {
      // Convert Unix timestamp (seconds) to milliseconds
      const numTimestamp = parseInt(timestamp, 10);
      if (isNaN(numTimestamp)) return '';
      const date = new Date(numTimestamp * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '';
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
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map