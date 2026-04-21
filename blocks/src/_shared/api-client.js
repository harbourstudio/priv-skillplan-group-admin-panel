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
  groupCourseCompletionStats: (groupId) => `/wp-json/bys-groups/v1/groups/${groupId}/course-completion-stats`,
  courseHierarchialBreakdown: (courseId) => `/wp-json/bys-groups/v1/courses/${courseId}/steps`,
  groupUserCourseProgress: (userId, courseIds) => `/wp-json/bys-groups/v1/users/${userId}/course-progress?course_ids=${courseIds}`,
  courseQuizSteps: (courseId) => `/wp-json/bys-groups/v1/courses/${courseId}/quiz-steps`,
  courseQuizProgressBatch: (courseId, userIds) => `/wp-json/bys-groups/v1/courses/${courseId}/quiz-progress-batch?user_ids=${userIds}`,
  groupQuizSubmissionStats: (groupId, quizIds) => `/wp-json/bys-groups/v1/groups/${groupId}/quiz-submission-stats?quiz_ids=${quizIds.join(',')}`,
  groupQuizAttempts: (groupId, quizId) => `/wp-json/bys-groups/v1/groups/${groupId}/quizzes/${quizId}/attempts`,
  userQuizAttempts: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts?course_id=${courseId}`,
  userQuizProgress: (userId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-progress`,
  userQuizAttemptsDetails: (userId, quizId) => `/wp-json/bys-groups/v1/users/${userId}/quiz-attempts/${quizId}`,
  attemptDetail: (activityId) => `/wp-json/bys-groups/v1/attempts/${activityId}`,
  attemptQuestions: (activityId) => `/wp-json/bys-groups/v1/attempts/${activityId}/questions`,
  userActivity: (userId) => `/wp-json/bys-groups/v1/users/${userId}/activity`,
  userCourseActivity: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/activity?course_id=${courseId}`,
  userCourseStepsProgress: (userId, courseId) => `/wp-json/bys-groups/v1/users/${userId}/course-progress-steps/${courseId}`,
  trackTopicVisit: (userId) => `/wp-json/bys-groups/v1/users/${userId}/track-topic-visit`,
  groupLeaders: (groupId) => `/wp-json/bys-groups/v1/groups/${groupId}/leaders`,
  allCourses: () => '/wp-json/bys-groups/v1/all-courses',
  addGroupCourse: (groupId, courseId) => `/wp-json/bys-groups/v1/groups/${groupId}/courses/${courseId}/add`,
  removeGroupCourse: (groupId, courseId) => `/wp-json/bys-groups/v1/groups/${groupId}/courses/${courseId}/remove`,
  toggleRequiredCourse: (groupId, courseId) => `/wp-json/bys-groups/v1/groups/${groupId}/courses/${courseId}/toggle-required`,
  removeGroupUser: (groupId, userId) => `/wp-json/bys-groups/v1/groups/${groupId}/users/${userId}/remove`,
  archiveGroup: (groupId) => `/wp-json/bys-groups/v1/groups/${groupId}/archive`,
  unarchiveGroup: (groupId) => `/wp-json/bys-groups/v1/groups/${groupId}/unarchive`,
  archivedGroups: () => {
    const userId = window.bysGroupsAuth?.userId ?? '';
    return `/wp-json/bys-groups/v1/me/archived-groups${userId ? `?user_id=${userId}` : ''}`;
  },
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
    // Always include the WP REST nonce so cookie-based auth works and
    // get_current_user_id() resolves to the actual logged-in user.
    if (window.bysGroupsAuth?.nonce) {
      headers['X-WP-Nonce'] = window.bysGroupsAuth.nonce;
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
   * Fire-and-forget POST. Does not cache. Auth header included automatically.
   */
  post(url, body = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const authHeader = getAuthorizationHeader();
    if (authHeader) headers['Authorization'] = authHeader;
    if (window.bysGroupsAuth?.nonce) headers['X-WP-Nonce'] = window.bysGroupsAuth.nonce;

    return jQuery.ajax({
      url,
      type: 'POST',
      headers,
      data: JSON.stringify(body),
      dataType: 'json',
    }).catch((jqXHR) => {
      console.error(`POST failed for ${url}:`, jqXHR.status, jqXHR.responseText?.substring(0, 200));
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