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
export const endpoints = {
  currentUserGroups: () => '/wp-json/bys-groups/v1/me/groups',
  groupBaseUsersStats: (groupId) => `/wp-json/bys-groups/v1/groups/${groupId}/base-user-stats`,
  groupUsers: (groupId, userIds) => `/wp-json/bys-groups/v1/groups/${groupId}/users?user_ids=${userIds}`,
  groupUserInfo: (groupId, userId ) => `/wp-json/bys-groups/v1/groups/${groupId}/users/${userId}`,
  groupCourses: (groupId) => `/wp-json/bys-groups/v1/groups/${groupId}/courses`,
  courseHierarchialBreakdown: (courseId) => `/wp-json/bys-groups/v1/courses/${courseId}/steps`,
  groupUserCourseProgress: (userId, courseIds) => `/wp-json/bys-groups/v1/users/${userId}/course-progress?course_ids=${courseIds}`,
  courseQuizSteps: (courseId) => `/wp-json/bys-groups/v1/courses/${courseId}/quiz-steps`,
  userQuizAttempts: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts?course_id=${courseId}`,
};

export const api = {
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

    const promise = jQuery
      .ajax({
        url: url,
        type: 'GET',
        headers: headers,
        dataType: 'json',
      })
      .done((data, textStatus, jqXHR) => {
        console.log(`Success for ${url}:`, { status: jqXHR.status, data });
      })
      .then((data) => {
        this._cache.set(url, data);
        return data;
      })
      .catch((jqXHR, textStatus, errorThrown) => {
        console.error(`API request failed for ${url}:`, {
          status: jqXHR.status,
          statusText: jqXHR.statusText,
          responseText: jqXHR.responseText?.substring(0, 500),
          textStatus: textStatus,
          errorThrown: errorThrown?.message,
        });
        throw new Error(`API request failed: ${jqXHR.status} ${jqXHR.statusText} - ${jqXHR.responseText?.substring(0, 100)}`);
      })
      .always(() => {
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