import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(function($) {
  const $block = $('.wp-block-bys-groups-group-reporting').first();
  const $table = $block.find('.reporting-table');
  const detailUrl = $table.data('detailUrl') || '/administrator-dashboard/user-progress-detail/';

  if (!$table.length) return;

  let expandedIdx = null;
  let usersInView = [];         // current page of users
  let coursesInView = [];       // current courses (from bys:groupSelected)
  let userCourseProgressAll = {}; // promoted to module scope: { [userId]: [...progress] }
  let courseQuizLoadedIdx = new Set();
  let courseQuizStepsCache    = {}; // { [courseId]: [...steps] }
  let userQuizProgressCache   = {}; // { [courseId]: { [userId]: { [quizId]: quizData } } }
  let loadedOffset = 0;             // how many users have been loaded into the table
  let currentSort  = 'first_name_asc';
  const PAGE_SIZE  = 10;
  let sortedUsers  = [];            // sorted order after an explicit sort; empty = use lazy-load order
  let displayedCount = 0;           // how many of sortedUsers are currently rendered

  // ── Filter state ────────────────────────────────────────────────────────────
  let selectedCourseIds   = []; // course multiselect state
  let selectedUserIds     = []; // user multiselect state
  let allGroupUserIds     = []; // full list of user IDs for current group (from baseUsersStats)
  let allGroupUsers       = []; // full fetched user objects for the filter list (lazy-loaded)
  let allGroupUsersLoaded = false; // whether the full user list has been fetched

  let activeFilters = {         // current applied filter values
    courseIds:      [],         // array of course IDs (empty = all)
    userIds:        [],         // array of user IDs (empty = all)
    courseStatus:   '',         // course-level: completed | in_progress | inactive
    userStatus:     '',         // user-level: online | offline | never
    enrolmentDate:  { from: '', to: '' },
    completionDate: { from: '', to: '' },
  };

  // ── Filter panel toggle ──────────────────────────────────────────────────────
  $block.find('.filters__toggle').on('click', function() {
    const $toggle = $(this);
    const $box = $block.find('#filters-box');
    const isOpen = $toggle.attr('aria-expanded') === 'true';
    $toggle.attr('aria-expanded', !isOpen);
    $box.attr('aria-hidden', isOpen);
    $box.toggleClass('hidden', isOpen);
    if (!isOpen) {
      populateCourseMultiselect();
      populateUserMultiselect(); // lazy-fetches full user list if needed
    }
  });

  // ── Course column expand/collapse ────────────────────────────────────────────
  $table.on('click', '.bys-course-toggle', function(e) {
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
    $table.find('.course-col-header')
      .removeClass('course-col-header--expanded')
      .addClass('course-col-header--collapsed')
      .removeClass('course-col--hidden')
      .find('.bys-course-toggle')
      .attr('aria-expanded', 'false');
    $table.find('.course-cell--badge').removeClass('course-col--hidden');
    $table.find('.course-sub-col, .course-sub-cell').addClass('course-sub-col--hidden');

    // Re-apply course column filter after reset
    applyColumnFilter();
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

  // ── Row click to detail page ─────────────────────────────────────────────────
  $table.on('click', '.reporting-table__row', function(e) {
    if ($(e.target).closest('.bys-course-toggle').length) return;
    if ($(e.target).closest('a').length) return;

    const userId = $(this).data('userId');
    if (userId) window.location.href = detailUrl + '?user_id=' + userId + '&group_id=' + currentGroupId;
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

  $table.on('mouseenter', '.bys-quiz-icon[data-quiz-id]:not([data-tip-loaded])', async function() {
    const $icon = $(this);
    const quizId = parseInt($icon.data('quizId'));
    const userId = parseInt($icon.data('userId'));

    if (!userId || !quizId) {
      createAndShowTooltip($icon);
      return;
    }

    try {
      const attempts = await api.get(endpoints.userQuizAttemptsDetails(userId, quizId));
      if (!Array.isArray(attempts) || attempts.length === 0) {
        $icon.attr('data-tip-loaded', '1');
        createAndShowTooltip($icon);
        return;
      }

      const highest = attempts.reduce((best, a) =>
        parseFloat(a.percentage || 0) >= parseFloat(best.percentage || 0) ? a : best, attempts[0]);

      const pointsFraction = (highest.points_scored != null && highest.points_total != null)
        ? `${highest.points_scored}/${highest.points_total}`
        : 'N/A';

      const tip = `${$icon.data('quizTitle')}|${pointsFraction}|${$icon.data('percent')}%`;
      $icon.attr('data-tip', escapeHtml(tip)).attr('data-tip-loaded', '1');
      createAndShowTooltip($icon);
    } catch (err) {
      console.error(`[group-reporting] Failed to fetch quiz attempts for user ${userId}, quiz ${quizId}:`, err);
      $icon.attr('data-tip-loaded', '1');
      createAndShowTooltip($icon);
    }
  });

  $table.on('mouseenter', '.bys-quiz-icon[data-tip-loaded]', function() {
    createAndShowTooltip($(this));
  });

  $table.on('mouseleave', '.bys-quiz-icon', function() {
    destroyTooltip();
  });

  $table.on('mouseenter', '.status-badge__icon[data-tip]', function() {
    createAndShowTooltip($(this));
  });

  $table.on('mouseleave', '.status-badge__icon', function() {
    destroyTooltip();
  });

  $table.on('click', '[data-tip]', function(e) {
    e.stopPropagation();
    createAndShowTooltip($(this));
  });

  $(document).on('click', function() {
    destroyTooltip();
  });

  // ── Group selection ───────────────────────────────────────────────────────────
  let currentGroupId = null;

  $(document).on('bys:groupSelected', async function(_, data) {
    const groupId = data.groupId;
    const baseUsersStats = data.baseUsersStats || {};
    const courses = data.courses || [];
    if (!groupId) return;
    currentGroupId = groupId;

    // Reset filter state on group change
    selectedCourseIds = [];
    selectedUserIds   = [];
    allGroupUserIds   = data.baseUsersStats?.user_ids || [];
    allGroupUsers     = [];
    allGroupUsersLoaded = false;
    activeFilters = { courseIds: [], userIds: [], courseStatus: '', userStatus: '', enrolmentDate: { from: '', to: '' }, completionDate: { from: '', to: '' } };
    userCourseProgressAll = {};
    courseQuizStepsCache  = {};
    userQuizProgressCache = {};
    loadedOffset  = 0;
    currentSort   = 'first_name_asc';
    sortedUsers   = [];
    displayedCount = 0;
    $block.find('#sort-select').val('first_name_asc');
    resetFilterFormUI();
    updateCompletionSortVisibility();

    await populateTableFromAPI(groupId, baseUsersStats, courses);
  });

  // ── Table population ──────────────────────────────────────────────────────────
  async function populateTableFromAPI(groupId, baseUsersStats, courses) {
    try {
      const userIds = baseUsersStats.user_ids || [];
      const firstTenUserIds = userIds.slice(0, 10);

      rebuildTableHeader(courses);
      showSkeletonRows(firstTenUserIds.length || PAGE_SIZE, courses.length);

      if (!firstTenUserIds.length) {
        rebuildTableBody(courses, [], {});
        return;
      }

      const usersUrl = `/wp-json/bys-groups/v1/groups/${groupId}/users?user_ids=${firstTenUserIds.join(',')}`;
      const usersResponse = await api.get(usersUrl, true);

      if (!usersResponse || !Array.isArray(usersResponse)) {
        console.error('Invalid users response:', usersResponse);
        return;
      }

      usersInView = usersResponse;
      coursesInView = courses;
      courseQuizLoadedIdx.clear();

      const courseIds = courses.map(c => c.id).join(',');

      await Promise.all(usersResponse.map(async (user) => {
        if (!courseIds) { userCourseProgressAll[user.id] = []; return; }
        const progressUrl = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
        try {
          userCourseProgressAll[user.id] = await api.get(progressUrl, true);
        } catch (err) {
          console.error(`Failed to fetch course progress for user ${user.id}:`, err);
          userCourseProgressAll[user.id] = [];
        }
      }));

      rebuildTableHeader(courses);
      rebuildTableBody(courses, usersResponse, userCourseProgressAll);
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
   * Works by toggling course-col--hidden on matching [data-course-idx] elements.
   */
  function applyColumnFilter() {
    const filtered = activeFilters.courseIds.length > 0;

    coursesInView.forEach((course, idx) => {
      const visible = !filtered || activeFilters.courseIds.includes(course.id);

      // Sub-columns only matter if this course is the expanded one — leave their
      // own hidden state alone; just hide the whole group if column is filtered out.
      if (!visible) {
        $table.find(`[data-course-idx="${idx}"]`).addClass('course-col--hidden');
      } else if (expandedIdx !== idx) {
        // Visible but not expanded: clear course-col--hidden from everything for
        // this course (the toggle button inside the header also receives it when
        // hidden), then keep sub-cols hidden via their own class.
        $table.find(`[data-course-idx="${idx}"]`).removeClass('course-col--hidden');
        $table.find(`.course-sub-col[data-course-idx="${idx}"]`).addClass('course-sub-col--hidden');
        $table.find(`.course-sub-cell[data-course-idx="${idx}"]`).addClass('course-sub-col--hidden');
      }
    });
  }

  /**
   * Pure predicate: returns true if a user object passes all active row filters.
   * Works against in-memory data — no DOM access.
   */
  function userPassesRowFilter(user) {
    const { userIds, courseStatus, userStatus, enrolmentDate, completionDate } = activeFilters;
    let visible = true;

    if (userIds.length > 0) {
      visible = userIds.includes(user.id);
    }

    if (visible && userStatus) {
      visible = (user.status || 'never') === userStatus;
    }

    if (visible && courseStatus) {
      const userProgress = userCourseProgressAll[user.id] || [];
      const coursesToCheck = activeFilters.courseIds.length > 0
        ? userProgress.filter(p => activeFilters.courseIds.includes(p.course_id))
        : userProgress;
      const progressStatus = courseStatus === 'inactive' ? 'not_started' : courseStatus;
      visible = coursesToCheck.some(p => (p.progress_status || 'not_started') === progressStatus);
    }

    if (visible && (enrolmentDate.from || enrolmentDate.to)) {
      const userProgress = userCourseProgressAll[user.id] || [];
      const coursesToCheck = activeFilters.courseIds.length > 0
        ? userProgress.filter(p => activeFilters.courseIds.includes(p.course_id))
        : userProgress;
      visible = coursesToCheck.some(p => {
        if (!p.enrolled_at) return false;
        const d = new Date(p.enrolled_at);
        if (enrolmentDate.from && d < new Date(enrolmentDate.from)) return false;
        if (enrolmentDate.to) {
          const to = new Date(enrolmentDate.to);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
        return true;
      });
    }

    if (visible && (completionDate.from || completionDate.to)) {
      const userProgress = userCourseProgressAll[user.id] || [];
      const coursesToCheck = activeFilters.courseIds.length > 0
        ? userProgress.filter(p => activeFilters.courseIds.includes(p.course_id))
        : userProgress;
      visible = coursesToCheck.some(p => {
        if (!p.date_completed) return false;
        const d = new Date(p.date_completed);
        if (completionDate.from && d < new Date(completionDate.from)) return false;
        if (completionDate.to) {
          const to = new Date(completionDate.to);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
        return true;
      });
    }

    return visible;
  }

  /**
   * Show/hide rows based on user search, status, enrolment date, completion date.
   * All filtering is against in-memory data — no re-fetch.
   */
  function applyRowFilters() {
    $table.find('tbody tr.reporting-table__row').each(function() {
      const userId = parseInt($(this).data('userId'), 10);
      const user = usersInView.find(u => u.id === userId);
      if (!user) return;
      const visible = userPassesRowFilter(user);
      $(this).toggleClass('reporting-table__row--filtered', !visible);
      $(this).css('display', visible ? '' : 'none');
    });
  }

  // ── Course-dependent field enable/disable ────────────────────────────────────
  function updateCourseDepFieldState() {
    const singleCourse = selectedCourseIds.length === 1;
    const $depFields = $block.find('.filters__field--course-dep');
    $depFields.toggleClass('is-disabled', !singleCourse);
    $depFields.find('select, input[type="date"], .date-range__trigger').prop('disabled', !singleCourse);

    if (!singleCourse) {
      $block.find('#filter-status').val('').addClass('is-placeholder');
      resetDateRangeField('filter-enrolment-date-from', 'filter-enrolment-date-to', 'enrolment-date-range-text', 'enrolment-date-range-dropdown');
      resetDateRangeField('filter-completion-date-from', 'filter-completion-date-to', 'completion-date-range-text', 'completion-date-range-dropdown');
    }
  }

  function updateCompletionSortVisibility() {
    const singleCourse = activeFilters.courseIds.length === 1;
    const $opts = $block.find('.sort-option--completion');
    $opts.toggleClass('hidden', !singleCourse);
    // If a completion sort is active but the option is now hidden, fall back to default
    if (!singleCourse && (currentSort === 'completion_date_asc' || currentSort === 'completion_date_desc')) {
      currentSort = 'first_name_asc';
      $block.find('#sort-select').val('first_name_asc');
    }
  }

  // ── Filter form submit ────────────────────────────────────────────────────────
  $block.find('.filters__form').on('submit', async function(e) {
    e.preventDefault();

    const singleCourse = selectedCourseIds.length === 1;

    activeFilters.courseIds      = selectedCourseIds.slice();
    activeFilters.userIds        = selectedUserIds.slice();
    activeFilters.courseStatus   = singleCourse ? $block.find('#filter-status').val() : '';
    activeFilters.userStatus     = $block.find('#filter-user-status').val();
    activeFilters.enrolmentDate  = singleCourse ? { from: $block.find('#filter-enrolment-date-from').val(), to: $block.find('#filter-enrolment-date-to').val() } : { from: '', to: '' };
    activeFilters.completionDate = singleCourse ? { from: $block.find('#filter-completion-date-from').val(), to: $block.find('#filter-completion-date-to').val() } : { from: '', to: '' };

    closeMultiselect($block.find('#bys-multiselect-course'));
    closeMultiselect($block.find('#bys-multiselect-users'));

    // Row filters may match users not yet loaded — drain remaining pages first
    const hasRowFilter = activeFilters.userIds.length > 0 ||
      activeFilters.courseStatus || activeFilters.userStatus ||
      activeFilters.enrolmentDate.from || activeFilters.enrolmentDate.to ||
      activeFilters.completionDate.from || activeFilters.completionDate.to;

    if (hasRowFilter && loadedOffset < allGroupUserIds.length) {
      const $btn = $block.find('.filters__submit');
      $btn.prop('disabled', true).text('Loading…');
      await loadAllRemainingUsers();
      $btn.prop('disabled', false).text('Filter');
    }

    applyFilters();
    updateCompletionSortVisibility();
  });

  // ── Filter reset ──────────────────────────────────────────────────────────────
  $block.find('.filters__reset').on('click', function() {
    selectedCourseIds = [];
    selectedUserIds   = [];
    activeFilters = { courseIds: [], userIds: [], courseStatus: '', userStatus: '', enrolmentDate: { from: '', to: '' }, completionDate: { from: '', to: '' } };

    resetFilterFormUI();
    updateCourseDepFieldState();
    updateCompletionSortVisibility();
    closeMultiselect($block.find('#bys-multiselect-course'));
    closeMultiselect($block.find('#bys-multiselect-users'));
    populateCourseMultiselect();
    populateUserMultiselect();

    // Restore all rows and columns
    $table.find('tbody tr').css('display', '').removeClass('reporting-table__row--filtered');
    $table.find('[data-course-idx]').removeClass('course-col--hidden');
    $table.find('.course-sub-col, .course-sub-cell').addClass('course-sub-col--hidden');
    expandedIdx = null;
  });

  function resetDateRangeField(fromId, toId, textId, dropdownId) {
    $block.find('#' + fromId).val('').removeAttr('min').removeAttr('max');
    $block.find('#' + toId).val('').removeAttr('min').removeAttr('max');
    $block.find('#' + textId).text('Select a date range');
    $block.find('#' + dropdownId).addClass('hidden');
  }

  function validateDateRange(fromId, toId) {
    const $from = $block.find('#' + fromId);
    const $to   = $block.find('#' + toId);
    const dateFrom = $from.val();
    const dateTo   = $to.val();
    if (dateFrom) $to.attr('min', dateFrom); else $to.removeAttr('min');
    if (dateTo)   $from.attr('max', dateTo); else $from.removeAttr('max');
    if (dateFrom && dateTo && dateFrom > dateTo) $from.val(dateTo);
  }

  function updateDateRangeText(fromId, toId, textId) {
    const dateFrom = $block.find('#' + fromId).val();
    const dateTo   = $block.find('#' + toId).val();
    if (!dateFrom && !dateTo)     $block.find('#' + textId).text('Select a date range');
    else if (dateFrom && dateTo)  $block.find('#' + textId).text(`${dateFrom} – ${dateTo}`);
    else if (dateFrom)            $block.find('#' + textId).text(`From ${dateFrom}`);
    else                          $block.find('#' + textId).text(`Until ${dateTo}`);
  }

  function resetFilterFormUI() {
    $block.find('#filter-status').val('').addClass('is-placeholder');
    $block.find('#filter-user-status').val('').addClass('is-placeholder');
    resetDateRangeField('filter-enrolment-date-from', 'filter-enrolment-date-to', 'enrolment-date-range-text', 'enrolment-date-range-dropdown');
    resetDateRangeField('filter-completion-date-from', 'filter-completion-date-to', 'completion-date-range-text', 'completion-date-range-dropdown');
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
        td.className = 'course-cell course-cell--badge';
        const span = document.createElement('span');
        span.style.width = '24px';
        td.appendChild(span);
        tr.appendChild(td);
      }
      $tbody.append(row);
    }
  }

  function showSkeletonCourseHeaders(count) {
    const headerRow = $table.find('thead .reporting-table__head')[0];
    if (!headerRow) return;
    // Remove any existing skeleton course headers
    $(headerRow).find('.course-col-header--skeleton').remove();
    const skeletonTemplate = document.getElementById('skeleton-course-header-template');
    for (let i = 0; i < count; i++) {
      headerRow.appendChild(skeletonTemplate.content.cloneNode(true));
    }
  }

  function rebuildTableHeader(courses) {
    const $thead = $table.find('thead');
    $thead.html('');

    const headerRow = document.createElement('tr');
    headerRow.className = 'reporting-table__head';

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

    const courseHeaderTemplate = document.getElementById('course-header-template');
    courses.forEach((course, idx) => {
      const headerContent = courseHeaderTemplate.content.cloneNode(true);
      const $headers = $(headerContent);

      $headers.find('[data-course-idx]').attr('data-course-idx', idx);

      const courseTitle = course.title?.rendered || course.title || '';
      $headers.find('.bys-course-toggle')
        .text(truncateTitle(courseTitle))
        .attr('title', courseTitle)
        .attr('data-course-idx', idx);
      if (course.required) {
        $headers.find('.bys-required-badge').removeClass('hidden');
      }
      $headers.find('.bys-dl-link').attr('title', `Download ${escapeHtml(courseTitle)}`).attr('data-course-idx', idx);

      $headers.children().each(function() {
        headerRow.appendChild(this);
      });
    });

    $thead.append(headerRow);
  }

  function buildQuizBars(quizData, userId, userQuizProgress) {
    if (!quizData || quizData.length === 0) {
      return '<span class="bys-quiz-empty">—</span>';
    }

    const barsMaxHeight = 24;
    const bars = quizData.map((quiz) => {
      const quizId = quiz.step_id;
      const quizTitle = quiz.step_title;
      const summary = userQuizProgress[quizId];

      if (!summary || summary.total_attempts === 0) {
        const tip = `${quizTitle}|Not attempted`;
        return `<span class="bys-quiz-icon bys-quiz-icon--neutral" data-tip="${escapeHtml(tip)}" data-quiz-id="${quizId}" data-quiz-title="${escapeHtml(quizTitle)}"></span>`;
      }

      const cls = summary.pass_highest ? 'bys-quiz-icon--pass' : 'bys-quiz-icon--fail';
      const barHeight = barsMaxHeight * (summary.percent_highest * 0.01);
      const tip = `${quizTitle}|Loading...|${Math.round(summary.percent_highest)}%`;

      return `<span class="bys-quiz-icon ${cls}" data-tip="${escapeHtml(tip)}" data-quiz-id="${quizId}" data-user-id="${userId}" data-quiz-title="${escapeHtml(quizTitle)}" data-percent="${Math.round(summary.percent_highest)}" style="height: ${barHeight}px"></span>`;
    });
    return `<div class="bys-quiz-icons">${bars.join('')}</div>`;
  }

  function rebuildTableBody(courses, users, userCourseProgress) {
    $table.find('tbody').html('');
    appendTableRows(courses, users, userCourseProgress);
  }

  function appendTableRows(courses, users, userCourseProgress) {
    const $tbody = $table.find('tbody');

    const rowTemplate = document.getElementById('skeleton-row-template');
    const cellTemplate = document.getElementById('course-cell-template');

    users.forEach(user => {
      const userProgress = userCourseProgress[user.id] || [];

      const rowContent = rowTemplate.content.cloneNode(true);
      const $row = $(rowContent);

      $row.find('tr').attr('data-user-id', user.id).removeClass('reporting-table__row--loading');

      const userStatus = user.status || 'never';
      const statusClass = `status-badge--${userStatus}`;

      let statusBadge = `<i class="fa-solid fa-circle"></i>`;
      if (user.last_login) {
        const readableDateTime = formatDate(user.last_login);
        const unixTimestamp = user.last_login_unix || '';
        const tooltipText = `Last login: ${readableDateTime} (${unixTimestamp})`;
        statusBadge = `<span class="status-badge__icon" data-tip="${escapeHtml(tooltipText)}"><i class="fa-solid fa-circle"></i></span>`;
      }

      $row.find('.status-badge').attr('class', `status-badge ${statusClass}`).html(statusBadge);

      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || '';
      $row.find('.col-name').html(`
        <a href="${detailUrl}?group_id=${currentGroupId}&user_id=${user.id}" class="reporting-table__name-link" onclick="event.stopPropagation();">
          ${escapeHtml(fullName)}
        </a>
      `);
      $row.find('.col-email').html(escapeHtml(user.email));

      courses.forEach((course, idx) => {
        const courseData = userProgress.find(cp => cp.course_id === course.id);
        const progressStatus = courseData?.progress_status || 'not_started';

        let status = 'not-started';
        if (progressStatus === 'completed') status = 'completed';
        else if (progressStatus === 'in_progress') status = 'in-progress';

        const cellContent = cellTemplate.content.cloneNode(true);
        const $cells = $(cellContent);

        $cells.find('td').attr('data-course-idx', idx);
        $cells.find('.course-cell--badge span').attr('class', `completion-badge completion-badge--${status}`);

        const stepsCompleted = courseData?.steps_completed || 0;
        const stepsTotal = courseData?.steps_total || 0;
        const percentage = stepsTotal > 0 ? Math.round((stepsCompleted / stepsTotal) * 100) : 0;
        let percentageClass = percentage === 100 ? 'complete' : percentage === 0 ? 'not-started' : 'in-progress';

        $cells.find('.course-sub-cell--progress').html(`
          <div class="bys-progress-wrap"><div class="bys-progress-bar" style="width:${percentage}%;"></div></div>
          <span class="bys-percent bys-percent--${percentageClass}">${percentage}%</span>
        `);

        $cells.find('.course-sub-cell--quizzing').html('<span class="bys-quiz-loading"><i class="fa-regular fa-spinner-third fa-spin"></i></span>');

        const enrolledAt = courseData?.enrolled_at || '';
        const dateCompleted = courseData?.date_completed || '';
        $cells.find('.course-sub-cell--enrolment').html(`<span class="bys-date">${enrolledAt ? formatDate(enrolledAt) : 'Not started'}</span>`);
        $cells.find('.course-sub-cell--completion').html(`<span class="bys-date">${dateCompleted ? formatDate(dateCompleted) : 'Not completed'}</span>`);

        // Apply expanded-course visibility state at creation time so new rows
        // are correct immediately, without depending on a post-append fixup pass.
        if (expandedIdx !== null) {
          if (idx !== expandedIdx) {
            // Non-expanded course: hide badge, keep sub-cells hidden (template default)
            $cells.find('.course-cell--badge').addClass('course-col--hidden');
          } else {
            // Expanded course: show sub-cells
            $cells.find('.course-sub-cell').removeClass('course-sub-col--hidden');
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

    $table.find(`.course-sub-cell--quizzing[data-course-idx="${courseIdx}"]`).each(function() {
      const userId = $(this).closest('tr').data('userId');
      const userQuizProgress = (userQuizProgressCache[course.id] || {})[userId] || {};
      $(this).html(buildQuizBars(quizSteps, userId, userQuizProgress));
    });
  }

  // ── Show More / lazy load ─────────────────────────────────────────────────────

  function updateShowMoreButton() {
    const $btn = $block.find('.bys-show-more');
    const hasMore = sortedUsers.length > 0
      ? displayedCount < sortedUsers.length
      : loadedOffset < allGroupUserIds.length;
    $btn.toggleClass('hidden', !hasMore);
  }

  $block.on('click', '.bys-show-more', function() {
    loadMoreUsers();
  });

  /**
   * Core: fetch a specific batch of user IDs, get their progress, append rows.
   * Returns the array of newly loaded users (or empty array on failure).
   */
  async function fetchAndAppendUsers(nextIds) {
    const usersUrl = `/wp-json/bys-groups/v1/groups/${currentGroupId}/users?user_ids=${nextIds.join(',')}`;
    const newUsers = await api.get(usersUrl, true);
    if (!newUsers || !Array.isArray(newUsers)) return [];

    const courseIds = coursesInView.map(c => c.id).join(',');
    await Promise.all(newUsers.map(async (user) => {
      if (!courseIds) { userCourseProgressAll[user.id] = []; return; }
      const progressUrl = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
      try {
        userCourseProgressAll[user.id] = await api.get(progressUrl, true);
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
    const $btn = $block.find('.bys-show-more');

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
    if (!nextIds.length) { $btn.addClass('hidden'); return; }

    $btn.prop('disabled', true).text('Loading…');
    try {
      await fetchAndAppendUsers(nextIds);
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
      $table.find(`tr[data-user-id="${user.id}"] .course-sub-cell--quizzing[data-course-idx="${courseIdx}"]`)
        .html(buildQuizBars(quizSteps, user.id, userQuizProgress));
    });
  }

  // ── Sort ──────────────────────────────────────────────────────────────────────

  $block.on('change', '#sort-select', async function() {
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
    const coursesToCheck = activeFilters.courseIds.length > 0
      ? userProgress.filter(p => activeFilters.courseIds.includes(p.course_id))
      : userProgress;
    const dates = coursesToCheck
      .map(p => p.enrolled_at ? new Date(p.enrolled_at).getTime() : 0)
      .filter(d => d > 0);
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
      case 'completion_date_desc': {
        const courseId = activeFilters.courseIds[0];
        const getCompletionDate = (user) => {
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
        $table.find(`.course-sub-cell--quizzing[data-course-idx="${wasExpanded}"]`).each(function() {
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
    const $ms = $block.find('#bys-multiselect-course');
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
      const requiredMark = course.required
        ? ' <span class="bys-required-badge" aria-hidden="true">*</span>'
        : '';
      $list.append(`
        <li class="bys-multiselect__option" role="option" aria-selected="${isChecked}" data-course-id="${id}">
          <label>
            <input type="checkbox" value="${id}" ${isChecked ? 'checked' : ''} />
            <span>${escapeHtml(title)}${requiredMark}</span>
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
          ${escapeHtml(title)}
          <button class="bys-multiselect__pill-remove btn-unstyled" type="button" aria-label="Remove ${escapeHtml(title)}" data-course-id="${id}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </span>
      `);
    });
  }

  // Open/close toggle
  $block.on('click', '#bys-multiselect-course .bys-multiselect__toggle', function(e) {
    e.stopPropagation();
    toggleMultiselect($block.find('#bys-multiselect-course'));
  });

  $block.on('click', '#bys-multiselect-course .bys-multiselect__control', function(e) {
    if ($(e.target).closest('.bys-multiselect__pill-remove').length) return;
    toggleMultiselect($block.find('#bys-multiselect-course'));
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

  $(document).on('click', function(e) {
    if (!$(e.target).closest('#bys-multiselect-course').length) {
      closeMultiselect($block.find('#bys-multiselect-course'));
    }
    if (!$(e.target).closest('#bys-multiselect-users').length) {
      closeMultiselect($block.find('#bys-multiselect-users'));
    }
  });

  // Checkbox toggle — courses
  $block.on('change', '#bys-multiselect-course-dropdown input[type="checkbox"]', function() {
    const id = parseInt($(this).val(), 10);
    if ($(this).is(':checked')) {
      if (!selectedCourseIds.includes(id)) selectedCourseIds.push(id);
      $(this).closest('li').attr('aria-selected', 'true');
    } else {
      selectedCourseIds = selectedCourseIds.filter(x => x !== id);
      $(this).closest('li').attr('aria-selected', 'false');
    }
    syncPills($block.find('#bys-multiselect-course'));
    updateCourseDepFieldState();
  });

  // Pill remove
  $block.on('click', '.bys-multiselect__pill-remove', function(e) {
    e.stopPropagation();
    const id = parseInt($(this).data('courseId'), 10);
    selectedCourseIds = selectedCourseIds.filter(x => x !== id);
    $block.find(`#bys-multiselect-course-dropdown input[value="${id}"]`).prop('checked', false)
      .closest('li').attr('aria-selected', 'false');
    syncPills($block.find('#bys-multiselect-course'));
    updateCourseDepFieldState();
  });

  // Search within course dropdown
  $block.on('input', '#bys-multiselect-course .bys-multiselect__search', function() {
    const q = $(this).val().toLowerCase().trim();
    const $options = $block.find('#bys-multiselect-course-dropdown .bys-multiselect__option');
    let visibleCount = 0;
    $options.each(function() {
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
    const $ms = $block.find('#bys-multiselect-users');
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
      const response = await api.get(url, true);
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
  $block.on('click', '#bys-multiselect-users .bys-multiselect__toggle', function(e) {
    e.stopPropagation();
    toggleMultiselect($block.find('#bys-multiselect-users'));
  });

  $block.on('click', '#bys-multiselect-users .bys-multiselect__control', function(e) {
    if ($(e.target).closest('.bys-multiselect__pill-remove').length) return;
    toggleMultiselect($block.find('#bys-multiselect-users'));
  });

  // Checkbox toggle — users
  $block.on('change', '#bys-multiselect-users-dropdown input[type="checkbox"]', function() {
    const id = parseInt($(this).val(), 10);
    if ($(this).is(':checked')) {
      if (!selectedUserIds.includes(id)) selectedUserIds.push(id);
      $(this).closest('li').attr('aria-selected', 'true');
    } else {
      selectedUserIds = selectedUserIds.filter(x => x !== id);
      $(this).closest('li').attr('aria-selected', 'false');
    }
    syncUserPills($block.find('#bys-multiselect-users'));
  });

  // Pill remove — users
  $block.on('click', '#bys-multiselect-users .bys-multiselect__pill-remove', function(e) {
    e.stopPropagation();
    const id = parseInt($(this).data('userId'), 10);
    selectedUserIds = selectedUserIds.filter(x => x !== id);
    $block.find(`#bys-multiselect-users-dropdown input[value="${id}"]`).prop('checked', false)
      .closest('li').attr('aria-selected', 'false');
    syncUserPills($block.find('#bys-multiselect-users'));
  });

  // Search within users dropdown
  $block.on('input', '#bys-multiselect-users .bys-multiselect__search', function() {
    const q = $(this).val().toLowerCase().trim();
    const $options = $block.find('#bys-multiselect-users-dropdown .bys-multiselect__option');
    let visibleCount = 0;
    $options.each(function() {
      const name = $(this).data('name') || '';
      const email = $(this).data('email') || '';
      const match = !q || name.includes(q) || email.includes(q);
      $(this).toggleClass('hidden', !match);
      if (match) visibleCount++;
    });
    $block.find('#bys-multiselect-users .bys-multiselect__empty').toggleClass('hidden', visibleCount > 0);
  });

  // ── Placeholder class for native select/date ─────────────────────────────────
  $block.on('change', '#filter-status, #filter-user-status', function() {
    $(this).toggleClass('is-placeholder', !$(this).val());
  });

  // ── Date range dropdowns ──────────────────────────────────────────────────────
  $block.on('click', '#enrolment-date-range-trigger', function(e) {
    e.preventDefault();
    $block.find('#enrolment-date-range-dropdown').toggleClass('hidden');
  });

  $block.on('click', '#completion-date-range-trigger', function(e) {
    e.preventDefault();
    $block.find('#completion-date-range-dropdown').toggleClass('hidden');
  });

  $(document).on('click.bys-date-range', function(e) {
    if (!$(e.target).closest('#filters__field--enrolment-date').length) {
      $block.find('#enrolment-date-range-dropdown').addClass('hidden');
    }
    if (!$(e.target).closest('#filters__field--completion-date').length) {
      $block.find('#completion-date-range-dropdown').addClass('hidden');
    }
  });

  $block.on('change', '#filter-enrolment-date-from, #filter-enrolment-date-to', function() {
    validateDateRange('filter-enrolment-date-from', 'filter-enrolment-date-to');
    updateDateRangeText('filter-enrolment-date-from', 'filter-enrolment-date-to', 'enrolment-date-range-text');
  });

  $block.on('change', '#filter-completion-date-from, #filter-completion-date-to', function() {
    validateDateRange('filter-completion-date-from', 'filter-completion-date-to');
    updateDateRangeText('filter-completion-date-from', 'filter-completion-date-to', 'completion-date-range-text');
  });

  // ── Export ────────────────────────────────────────────────────────────────────

  $block.on('click', '.table__actions__export a', async function(e) {
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

  $table.on('click', '.bys-dl-link', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentGroupId) return;

    const courseIdx = parseInt($(this).data('courseIdx'), 10);
    const course = coursesInView[courseIdx];
    if (!course) return;

    const $link = $(this);
    $link.addClass('is-loading').html('<i class="fa-regular fa-spinner fa-spin"></i>');

    try {
      await exportCourseToCsv(course);
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
    return ordered.filter(user => userPassesRowFilter(user));
  }

  /**
   * Shared: serialize a 2-D array of strings to a UTF-8 CSV blob and trigger download.
   */
  function downloadCsv(rows, filename) {
    const csv = rows.map(row =>
      row.map(cell => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
    const progressLabel = { completed: 'Completed', in_progress: 'In Progress', not_started: 'Not Started' };
    const progressStatus = courseData?.progress_status || 'not_started';
    const stepsCompleted = courseData?.steps_completed || 0;
    const stepsTotal = courseData?.steps_total || 0;
    const percentage = stepsTotal > 0 ? Math.round((stepsCompleted / stepsTotal) * 100) : 0;
    return [
      progressLabel[progressStatus] || progressStatus,
      `${percentage}%`,
      courseData?.enrolled_at ? formatDate(courseData.enrolled_at) : '',
      courseData?.date_completed ? formatDate(courseData.date_completed) : '',
    ];
  }

  /**
   * Ensure quiz steps + per-user progress are cached for a course.
   * Uses a single batch endpoint so export never makes N per-user calls.
   * Returns the array of quiz steps (may be empty if the course has none).
   */
  async function ensureQuizDataForCourse(course, users) {
    // ── Step 1: quiz steps (cached per course) ──────────────────────────────
    let quizSteps = courseQuizStepsCache[course.id];
    if (!quizSteps) {
      try {
        quizSteps = await api.get(endpoints.courseQuizSteps(course.id)) || [];
        courseQuizStepsCache[course.id] = quizSteps;
      } catch (err) {
        console.error(`[group-reporting] Failed to fetch quiz steps for course ${course.id}:`, err);
        quizSteps = [];
        courseQuizStepsCache[course.id] = quizSteps;
      }
    }

    if (!quizSteps.length) return quizSteps;

    // ── Step 2: batch-fetch progress for any users not yet cached ───────────
    if (!userQuizProgressCache[course.id]) userQuizProgressCache[course.id] = {};

    const uncached = users.filter(u => userQuizProgressCache[course.id][u.id] === undefined);
    if (!uncached.length) return quizSteps;

    try {
      const userIds = uncached.map(u => u.id).join(',');
      const url = endpoints.courseQuizProgressBatch(course.id, userIds);
      // forceRefresh=true so the cache key (which includes all user IDs) is always fresh
      const batchResult = await api.get(url, true);

      // batchResult: { [userId]: { [quizId]: { total_attempts, percent_highest, pass_highest } } }
      uncached.forEach(user => {
        const userData = (batchResult && batchResult[user.id]) ? batchResult[user.id] : {};
        // Re-key as integers to match buildQuizBars / quizProgressCell lookup by step_id
        const map = {};
        Object.keys(userData).forEach(qid => { map[parseInt(qid, 10)] = userData[qid]; });
        userQuizProgressCache[course.id][user.id] = map;
      });
    } catch (err) {
      console.error(`[group-reporting] Batch quiz progress fetch failed for course ${course.id}:`, err);
      uncached.forEach(user => { userQuizProgressCache[course.id][user.id] = {}; });
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
    const coursesToExport = activeFilters.courseIds.length > 0
      ? coursesInView.filter(c => activeFilters.courseIds.includes(c.id))
      : [...coursesInView];

    // Pre-fetch all quiz data for exported courses
    const quizStepsPerCourse = {};
    for (const course of coursesToExport) {
      quizStepsPerCourse[course.id] = await ensureQuizDataForCourse(course, filteredUsers);
    }

    const statusLabel = { online: 'Online', offline: 'Offline', never: 'Never Logged In' };

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

  async function exportCourseToCsv(course) {
    const filteredUsers = await getExportUsers();
    const quizSteps = await ensureQuizDataForCourse(course, filteredUsers);

    const title = course.shortname || course.title?.rendered || course.title || '';
    const req = course.required ? ' (Required)' : '';

    const headers = ['Name', 'Email', `${title}${req} - Course Status`, `${title}${req} - Progress`, `${title}${req} - Enrolled`, `${title}${req} - Completed`];
    quizSteps.forEach(quiz => headers.push(`${title}${req} - ${quiz.step_title}`));

    const rows = [headers];
    filteredUsers.forEach(user => {
      const userProgress = userCourseProgressAll[user.id] || [];
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || '';
      const userQuizProgress = (userQuizProgressCache[course.id] || {})[user.id] || {};
      const quizCells = quizSteps.map(quiz => quizProgressCell(quiz, userQuizProgress));
      rows.push([fullName, user.email || '', ...courseProgressCells(userProgress.find(cp => cp.course_id === course.id)), ...quizCells]);
    });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const today = new Date().toISOString().split('T')[0];
    downloadCsv(rows, `course-report-${slug}-${today}.csv`);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────────
  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    } catch (e) {
      return dateString;
    }
  }

  function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // Truncate a column header title to at most maxChars at a word boundary, appending '…'
  function truncateTitle(title, maxChars = 28) {
    if (!title || title.length <= maxChars) return title;
    const cut = title.lastIndexOf(' ', maxChars);
    return (cut > 0 ? title.substring(0, cut) : title.substring(0, maxChars)) + '\u2026';
  }
});