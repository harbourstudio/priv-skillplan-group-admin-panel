import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(function($) {
  const $block = $('.wp-block-bys-groups-group-reporting').first();
  const $table = $block.find('.reporting-table');
  const detailUrl = $table.data('detailUrl') || '/administrator-dashboard/user-progress-detail/';

  if (!$table.length) return;

  let expandedIdx = null;
  let usersInView = []; // current page of users (usersResponse)
  let coursesInView = []; // current courses (from bys:groupSelected)
  let courseQuizLoadedIdx = new Set(); // tracks which course-idx quiz data has been loaded

  // Filter panel toggle
  $block.find('.filters__toggle').on('click', function() {
    const $toggle = $(this);
    const $box = $block.find('#filters-box');
    const isOpen = $toggle.attr('aria-expanded') === 'true';
    $toggle.attr('aria-expanded', !isOpen);
    $box.attr('aria-hidden', isOpen);
    $box.toggleClass('hidden', isOpen);
  });

  // Course column expand/collapse
  $table.on('click', '.bys-course-toggle', function(e) {
    e.stopPropagation();
    const idx = parseInt($(this).data('courseIdx'), 10);
    const opening = expandedIdx !== idx;

    resetAllCourses();
    if (opening) {
      expandCourse(idx);
      expandedIdx = idx;
      // Defer quiz data fetch to click, only if not already loaded
      if (!courseQuizLoadedIdx.has(idx)) {
        loadQuizDataForCourse(idx);
      }
    } else {
      expandedIdx = null;
    }
  });

  function resetAllCourses() {
    $table.find('.course-col-header')
      .removeClass('course-col-header--expanded')
      .addClass('course-col-header--collapsed')
      .removeClass('course-col--hidden')
      .find('.bys-course-toggle')
      .attr('aria-expanded', 'false');
    $table.find('.course-cell--badge').removeClass('course-col--hidden');
    $table.find('.course-sub-col, .course-sub-cell').addClass('course-sub-col--hidden');
  }

  function expandCourse(idx) {
    const $header = $table.find(`.course-col-header[data-course-idx="${idx}"]`);
    $header
      .removeClass('course-col-header--collapsed')
      .addClass('course-col-header--expanded')
      .find('.bys-course-toggle')
      .attr('aria-expanded', 'true');

    $table.find(`.course-sub-col[data-course-idx="${idx}"]`).removeClass('course-sub-col--hidden');
    $table.find(`.course-sub-cell[data-course-idx="${idx}"]`).removeClass('course-sub-col--hidden');
    $table.find(`.course-col-header:not([data-course-idx="${idx}"])`).addClass('course-col--hidden');
    $table.find(`.course-cell--badge:not([data-course-idx="${idx}"])`).addClass('course-col--hidden');
  }

  // Row click to detail page
  $table.on('click', '.reporting-table__row', function(e) {
    if ($(e.target).closest('.bys-course-toggle').length) return;
    if ($(e.target).closest('a').length) return;

    const userId = $(this).data('userId');
    if (userId) window.location.href = detailUrl + '?user_id=' + userId + '&group_id=' + currentGroupId;
  });

  // Create tooltip instance on demand
  function createAndShowTooltip($trigger) {
    const tipData = $trigger.data('tip');
    if (!tipData) return;

    // Remove any existing tooltip
    $('.bys-tooltip-instance').remove();

    // Parse tooltip data (format: "Quiz Title|points_earned/points_total|percentage")
    let quizTitle = tipData;
    let pointsFraction = '';
    let percentage = '';

    // If it contains pipe separators, parse the full format
    if (tipData.includes('|')) {
      const parts = tipData.split('|');
      quizTitle = parts[0] || '';
      pointsFraction = parts[1] || '';
      percentage = parts[2] || '';
    }

    // Create tooltip with structured content
    const $tip = $('<div class="bys-tooltip-instance" role="tooltip"></div>');

    if (pointsFraction || percentage) {
      $tip.html(`
        <div class="bys-tooltip__title">${escapeHtml(quizTitle)}</div>
        <div class="bys-tooltip__content">
          <div class="bys-tooltip__fraction">${escapeHtml(pointsFraction)}</div>
          <div class="bys-tooltip__percentage">${escapeHtml(percentage)}</div>
        </div>
      `);
    } else {
      $tip.text(quizTitle);
    }

    $tip.appendTo('body');

    // Position absolutely below the trigger element
    const triggerRect = $trigger[0].getBoundingClientRect();
    $tip.css({
      position: 'fixed',
      top: (triggerRect.top + triggerRect.height + 6) + 'px',
      left: triggerRect.left + 'px'
    });
  }

  function destroyTooltip() {
    $('.bys-tooltip-instance').remove();
  }

  // Quiz icon tooltips — lazy-fetch points on first hover, then show tooltip
  $table.on('mouseenter', '.bys-quiz-icon[data-quiz-id]:not([data-tip-loaded])', async function() {
    const $icon = $(this);
    const quizId = parseInt($icon.data('quizId'));
    const userId = parseInt($icon.data('userId'));

    // Skip if not attempted (no user/quiz data)
    if (!userId || !quizId) {
      createAndShowTooltip($icon);
      return;
    }

    // Fetch detailed attempts to get points fraction
    try {
      const attempts = await api.get(endpoints.userQuizAttemptsDetails(userId, quizId));
      if (!Array.isArray(attempts) || attempts.length === 0) {
        $icon.attr('data-tip-loaded', '1');
        createAndShowTooltip($icon);
        return;
      }

      // Find highest attempt
      const highest = attempts.reduce((best, a) =>
        parseFloat(a.percentage || 0) >= parseFloat(best.percentage || 0) ? a : best, attempts[0]);

      // Build points fraction
      const pointsFraction = (highest.points_scored != null && highest.points_total != null)
        ? `${highest.points_scored}/${highest.points_total}`
        : 'N/A';

      // Update tooltip with actual points
      const tip = `${$icon.data('quizTitle')}|${pointsFraction}|${$icon.data('percent')}%`;
      $icon.attr('data-tip', escapeHtml(tip)).attr('data-tip-loaded', '1');
      createAndShowTooltip($icon);
    } catch (err) {
      console.error(`[group-reporting] Failed to fetch quiz attempts for user ${userId}, quiz ${quizId}:`, err);
      $icon.attr('data-tip-loaded', '1');
      createAndShowTooltip($icon);
    }
  });

  // Show tooltip for already-loaded icons (not attempted, or already fetched)
  $table.on('mouseenter', '.bys-quiz-icon[data-tip-loaded]', function() {
    createAndShowTooltip($(this));
  });

  $table.on('mouseleave', '.bys-quiz-icon', function() {
    destroyTooltip();
  });

  // Status badge tooltips — hover (desktop) and click (mobile/tablet)
  $table.on('mouseenter', '.status-badge__icon[data-tip]', function() {
    createAndShowTooltip($(this));
  });

  $table.on('mouseleave', '.status-badge__icon', function() {
    destroyTooltip();
  });

  // Touch/click support for mobile/tablet (quiz icons and status badges)
  $table.on('click', '[data-tip]', function(e) {
    e.stopPropagation();
    createAndShowTooltip($(this));
  });

  // Hide tooltip when clicking elsewhere
  $(document).on('click', function() {
    destroyTooltip();
  });

  // Store current group ID for use in detail links
  let currentGroupId = null;

  // Listen for group selection event
  $(document).on('bys:groupSelected', async function(_, data) {
    // console.log('bys:groupSelected event received:', data);
    const groupId = data.groupId;
    const baseUsersStats = data.baseUsersStats || {};
    const courses = data.courses || [];
    if (!groupId) return;
    currentGroupId = groupId;
    await populateTableFromAPI(groupId, baseUsersStats, courses);
  });

  // Fetch and populate table from custom endpoint
  async function populateTableFromAPI(groupId, baseUsersStats, courses) {
    try {
      // console.log('Fetching users for group:', groupId);
      const userIds = baseUsersStats.user_ids || [];
      const firstTenUserIds = userIds.slice(0, 10);

      // Build table header immediately (we have courses data)
      rebuildTableHeader(courses);

      if (!firstTenUserIds.length) {
        // console.log('No users in group');
        rebuildTableBody(courses, [], {}, {}, {});
        return;
      }

      // Fetch user details for the first 10 users
      const usersUrl = `/wp-json/bys-groups/v1/groups/${groupId}/users?user_ids=${firstTenUserIds.join(',')}`;
      const usersResponse = await api.get(usersUrl, true); // Force refresh

      if (!usersResponse || !Array.isArray(usersResponse)) {
        console.error('Invalid users response:', usersResponse);
        return;
      }

      // Store state for toggle handler to access
      usersInView = usersResponse;
      coursesInView = courses;
      courseQuizLoadedIdx.clear();

      // Fetch course progress for each user (quiz fetch is deferred to toggle click)
      const userCourseProgress = {};
      const courseIds = courses.map(c => c.id).join(',');

      if (courseIds) {
        for (const user of usersResponse) {
          const progressUrl = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
          try {
            userCourseProgress[user.id] = await api.get(progressUrl, true);
          } catch (err) {
            console.error(`Failed to fetch course progress for user ${user.id}:`, err);
            userCourseProgress[user.id] = [];
          }
        }
      } else {
        // No courses, set empty progress for all users
        usersResponse.forEach(user => {
          userCourseProgress[user.id] = [];
        });
      }

      rebuildTableHeader(courses);
      rebuildTableBody(courses, usersResponse, userCourseProgress);

    } catch (err) {
      console.error('Failed to fetch group reporting data:', err);
    }
  }

  function rebuildTableHeader(courses) {
    const $thead = $table.find('thead');
    $thead.html('');

    const headerRow = document.createElement('tr');
    headerRow.className = 'reporting-table__head';

    // Add fixed columns
    const statusTh = document.createElement('th');
    statusTh.className = 'col-status';
    headerRow.appendChild(statusTh);

    const nameTh = document.createElement('th');
    nameTh.className = 'col-name';
    nameTh.textContent = 'Name';
    headerRow.appendChild(nameTh);

    const emailTh = document.createElement('th');
    emailTh.className = 'col-email';
    emailTh.textContent = 'Email';
    headerRow.appendChild(emailTh);

    // Add course headers using template
    const courseHeaderTemplate = document.getElementById('course-header-template');
    courses.forEach((course, idx) => {
      const headerContent = courseHeaderTemplate.content.cloneNode(true);
      const $headers = $(headerContent);

      // Update data-course-idx for all header cells
      $headers.find('[data-course-idx]').attr('data-course-idx', idx);

      // Update course title and download link
      // API Note: course.title is an object. Use .rendered for the nice title
      $headers.find('.bys-course-toggle').html(course.title.rendered).attr('data-course-idx', idx);
      $headers.find('.bys-dl-link').attr('title', `Download ${escapeHtml(course.title.rendered)}`);

      // Append cloned headers to the row
      $headers.children().each(function() {
        headerRow.appendChild(this);
      });
    });

    $thead.append(headerRow);
  }

  function buildQuizBars(quizData, userId, userQuizProgress) {
    // quizData is an array of { step_id, step_title }
    // userQuizProgress is { [quizId]: { id, percent_highest, pass_highest, total_attempts, ... } }
    if (!quizData || quizData.length === 0) {
      return '<span class="bys-quiz-empty">—</span>';
    }

    const barsMaxHeight = 24; // 24px represents 100%
    const bars = quizData.map((quiz) => {
      const quizId = quiz.step_id;
      const quizTitle = quiz.step_title;
      const summary = userQuizProgress[quizId];

      // Not attempted
      if (!summary || summary.total_attempts === 0) {
        const tip = `${quizTitle}|Not attempted`;
        return `<span class="bys-quiz-icon bys-quiz-icon--neutral" data-tip="${escapeHtml(tip)}" data-quiz-id="${quizId}" data-quiz-title="${escapeHtml(quizTitle)}"></span>`;
      }

      // Attempted — bar represents highest attempt
      const cls = summary.pass_highest ? 'bys-quiz-icon--pass' : 'bys-quiz-icon--fail';
      const barHeight = barsMaxHeight * (summary.percent_highest * 0.01);
      // Tooltip initially shows "Loading..." for points; actual points fetched on hover via userQuizAttemptsDetails
      const tip = `${quizTitle}|Loading...|${Math.round(summary.percent_highest)}%`;

      return `<span class="bys-quiz-icon ${cls}" data-tip="${escapeHtml(tip)}" data-quiz-id="${quizId}" data-user-id="${userId}" data-quiz-title="${escapeHtml(quizTitle)}" data-percent="${Math.round(summary.percent_highest)}" style="height: ${barHeight}px"></span>`;
    });
    return `<div class="bys-quiz-icons">${bars.join('')}</div>`;
  }

  function rebuildTableBody(courses, users, userCourseProgress) {
    const $tbody = $table.find('tbody');
    $tbody.html('');

    const rowTemplate = document.getElementById('skeleton-row-template');
    const cellTemplate = document.getElementById('course-cell-template');

    users.forEach(user => {
      const userProgress = userCourseProgress[user.id] || [];

      // Clone the row template
      const rowContent = rowTemplate.content.cloneNode(true);
      const $row = $(rowContent);

      // Set row user ID
      $row.find('tr').attr('data-user-id', user.id);

      // Update status badge (status is calculated in PHP based on last_login)
      const userStatus = user.status || 'never'; // 'online', 'offline', or 'never'
      const statusClass = `status-badge--${userStatus}`;

      // Build tooltip with last login info
      let statusBadge = `<i class="fa-solid fa-circle"></i>`;
      if (user.last_login) {
        const readableDateTime = formatDate(user.last_login);
        const unixTimestamp = user.last_login_unix || '';
        const tooltipText = `Last login: ${readableDateTime} (${unixTimestamp})`;
        statusBadge = `<span class="status-badge__icon" data-tip="${escapeHtml(tooltipText)}"><i class="fa-solid fa-circle"></i></span>`;
      }

      $row.find('.status-badge').attr('class', `status-badge ${statusClass}`).html(statusBadge);

      // Update name and email
      $row.find('.col-name').html(`
        <a href="${detailUrl}?group_id=${currentGroupId}&user_id=${user.id}" class="reporting-table__name-link" onclick="event.stopPropagation();">
          ${escapeHtml(user.display_name)}
        </a>
      `);
      $row.find('.col-email').html(escapeHtml(user.email));

      // Add course cells
      courses.forEach((course, idx) => {
        const courseData = userProgress.find(cp => cp.course_id === course.id);
        const progressStatus = courseData?.progress_status || 'not_started';

        // Map API progress_status to CSS class names
        let status = 'not-started';
        if (progressStatus === 'completed') {
          status = 'completed';
        } else if (progressStatus === 'in_progress') {
          status = 'in-progress';
        }

        // Clone cell template
        const cellContent = cellTemplate.content.cloneNode(true);
        const $cells = $(cellContent);

        // Set data-course-idx for all cells
        $cells.find('td').attr('data-course-idx', idx);

        // Update badge cell with status class only (no icons or colors in script)
        $cells.find('.course-cell--badge span').attr('class', `completion-badge completion-badge--${status}`);

        // Update progress cell
        const stepsCompleted = courseData?.steps_completed || 0;
        const stepsTotal = courseData?.steps_total || 0;
        const percentage = stepsTotal > 0 ? Math.round((stepsCompleted / stepsTotal) * 100) : 0;
        let percentageClass = '';
        if (percentage === 100) {
          percentageClass = 'complete';
        } else if (percentage === 0 ) {
          percentageClass = 'not-started';
        } else {
          percentageClass = 'in-progress';
        }
        $cells.find('.course-sub-cell--progress').html(`
          <div class="bys-progress-wrap"><div class="bys-progress-bar" style="width:${percentage}%;"></div></div>
          <span class="bys-percent bys-percent--${percentageClass}">${percentage}%</span>
        `);

        // Update quizzing cell — render as loading placeholder, fetch on toggle click
        $cells.find('.course-sub-cell--quizzing').html('<span class="bys-quiz-loading">—</span>');

        // Update date cells
        const enrolledAt = courseData?.enrolled_at || '';
        const dateCompleted = courseData?.date_completed || '';
        const enrolledDateDisplay = enrolledAt ? formatDate(enrolledAt) : 'Not started';
        const completedDateDisplay = dateCompleted ? formatDate(dateCompleted) : 'Not completed';

        $cells.find('.course-sub-cell--enrolment').html(`<span class="bys-date">${enrolledDateDisplay}</span>`);
        $cells.find('.course-sub-cell--completion').html(`<span class="bys-date">${completedDateDisplay}</span>`);

        // Append cells to row
        $row.find('tr').append($cells);
      });

      $tbody.append($row);
    });
  }

  /**
   * Lazy-load quiz data for a course on toggle click
   * Fetches courseQuizSteps and userQuizProgress for visible users, scoped to this course
   */
  async function loadQuizDataForCourse(courseIdx) {
    const course = coursesInView[courseIdx];
    if (!course) return;

    courseQuizLoadedIdx.add(courseIdx); // Mark as loading to prevent double-fetch

    let quizSteps = [];
    try {
      quizSteps = await api.get(endpoints.courseQuizSteps(course.id)) || [];
    } catch (err) {
      console.error(`[group-reporting] Failed to fetch quiz steps for course ${course.id}:`, err);
    }

    // Fetch quiz progress for each visible user, scoped to this course
    const userQuizProgressMap = {};
    for (const user of usersInView) {
      try {
        const url = endpoints.userQuizProgress(user.id) + `?group_id=${currentGroupId}&course_ids=${course.id}`;
        const quizzes = await api.get(url);
        userQuizProgressMap[user.id] = {};
        if (Array.isArray(quizzes)) {
          quizzes.forEach(q => { userQuizProgressMap[user.id][q.id] = q; });
        }
      } catch (err) {
        console.error(`[group-reporting] Failed to fetch quiz progress for user ${user.id}:`, err);
        userQuizProgressMap[user.id] = {};
      }
    }

    // Populate quizzing cells in-place for this course column
    $table.find(`.course-sub-cell--quizzing[data-course-idx="${courseIdx}"]`).each(function() {
      const userId = $(this).closest('tr').data('userId');
      const userQuizProgress = userQuizProgressMap[userId] || {};
      $(this).html(buildQuizBars(quizSteps, userId, userQuizProgress));
    });
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const dateFormat = date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return dateFormat;
    } catch (e) {
      return dateString;
    }
  }

  function escapeHtml(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
});
