import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';
import { bysAlert } from '../_shared/alert.js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import JSZip from 'jszip';

jQuery(document).ready(function($) {
  const $block = $('.wp-block-bys-groups-group-reporting').first(); // assume only 1 block instance per page
  const $table = $block.find('.reporting-table');
  if (!$table.length) return;

  const detailUrl = $table.data('detailUrl') || '/administrator-dashboard/user-progress-detail/'; // used to direct to group users' single pages 

  const $filtersToggle      = $block.find('.group-reporting__filters-toggle');
  const $filtersBox         = $block.find('.group-reporting__filters-box');
  const $filtersForm        = $block.find('.filters__form');
  const $submitBtn          = $block.find('.group-reporting__submit');
  const $resetBtn           = $block.find('.group-reporting__reset');

  const $sortSelect         = $block.find('#sort-select');
  const $sortOptionsCompletion = $block.find('.group-reporting__sort-option--completion');

  const $filterStatus       = $block.find('#filter-status');
  const $filterUserStatus   = $block.find('#filter-user-status');
  const $filterEnrolFrom    = $block.find('#filter-enrolment-date-from');
  const $filterEnrolTo      = $block.find('#filter-enrolment-date-to');
  const $filterComplFrom    = $block.find('#filter-completion-date-from');
  const $filterComplTo      = $block.find('#filter-completion-date-to');
  const $enrolRangeText     = $block.find('#enrolment-date-range-text');
  const $enrolRangeDropdown = $block.find('#enrolment-date-range-dropdown');
  const $enrolRangeTrigger  = $block.find('#enrolment-date-range-trigger');
  const $complRangeText     = $block.find('#completion-date-range-text');
  const $complRangeDropdown = $block.find('#completion-date-range-dropdown');
  const $complRangeTrigger  = $block.find('#completion-date-range-trigger');

  const $courseDepFields    = $block.find('.group-reporting__field--course-dep');

  const $msCourse           = $block.find('#bys-multiselect-course');
  const $msUsers            = $block.find('#bys-multiselect-users');

  const $showMoreBtn        = $block.find('.group-reporting__show-more');
  const $exportBtn          = $block.find('.group-reporting__export a');
  
  const PAGE_SIZE  = 10;
  let expandedIdx = null;
  let usersInView = [];         // current page of users
  let coursesInView = [];       // current courses (from bys:groupSelected)
  let userCourseProgressAll = {}; // promoted to module scope: { [userId]: [...progress] }
  let courseQuizLoadedIdx = new Set();
  let courseQuizStepsCache    = {}; // { [courseId]: [...steps] }
  let userQuizProgressCache   = {}; // { [courseId]: { [userId]: { [quizId]: quizData } } }
  let loadedOffset = 0;             // how many users have been loaded into the table
  let currentSort  = 'first_name_asc';
  let sortedUsers  = [];            // sorted order after an explicit sort; empty = use lazy-load order
  let displayedCount = 0;           // how many of sortedUsers are currently rendered

  // ── Filter state ────────────────────────────────────────────────────────────
  let selectedCourseIds   = []; // course multiselect state
  let selectedUserIds     = []; // user multiselect state
  let allGroupUserIds     = []; // full list of user IDs for current group (from bysGroupsStore)
  let allGroupUsers       = []; // full fetched user objects for the filter list (lazy-loaded)
  let allGroupUsersLoaded = false; // whether the full user list has been fetched

  let activeFilters = {         
    courseIds:      [],
    userIds:        [],
    courseStatus:   '',
    userStatus:     '',
    enrolmentDate:  { from: '', to: '' },
    completionDate: { from: '', to: '' },
  };

  // ── Filter panel toggle ──────────────────────────────────────────────────────
  $filtersToggle.on('click', function() {
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
  $table.on('click', '.group-reporting__course-toggle', function(e) {
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
    $table.find('.group-reporting__course-header')
      .removeClass('group-reporting__course-header--expanded')
      .addClass('group-reporting__course-header--collapsed')
      .removeClass('group-reporting__col--hidden')
      .find('.group-reporting__course-toggle')
      .attr('aria-expanded', 'false');
    $table.find('.group-reporting__cell--badge').removeClass('group-reporting__col--hidden');
    $table.find('.group-reporting__sub-col, .group-reporting__sub-cell').addClass('group-reporting__sub-col--hidden');

    // Re-apply course column filter after reset
    applyColumnFilter();
  }

  function expandCourse(idx) {
    const $header = $table.find(`.group-reporting__course-header[data-course-idx="${idx}"]`);
    $header
      .removeClass('group-reporting__course-header--collapsed')
      .addClass('group-reporting__course-header--expanded')
      .find('.group-reporting__course-toggle')
      .attr('aria-expanded', 'true');

    $table.find(`.group-reporting__sub-col[data-course-idx="${idx}"]`).removeClass('group-reporting__sub-col--hidden');
    $table.find(`.group-reporting__sub-cell[data-course-idx="${idx}"]`).removeClass('group-reporting__sub-col--hidden');
    $table.find(`.group-reporting__course-header:not([data-course-idx="${idx}"])`).addClass('group-reporting__col--hidden');
    $table.find(`.group-reporting__cell--badge:not([data-course-idx="${idx}"])`).addClass('group-reporting__col--hidden');
  }

  // ── Row click to detail page ─────────────────────────────────────────────────
  $table.on('click', '.group-reporting__row', function(e) {
    if ($(e.target).closest('.group-reporting__course-toggle').length) return;
    if ($(e.target).closest('a').length) return;

    const userId = $(this).data('userId');
    if (userId) window.location.href = detailUrl + '?user_id=' + userId + '&group_id=' + currentGroupId;
  });

  // ── Status badge ─────────────────────────────────────────────────────────────
  // shared handler for rendering the .status-badge cell
  function applyStatusBadge($badge, user) {
    const userStatus = user.status || 'never';
    $badge.attr('class', `status-badge status-badge--${userStatus}`);
  }

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
      top: (triggerRect.top + triggerRect.height + 6) + 'px',
      left: triggerRect.left + 'px'
    });
  }

  function destroyTooltip() {
    $('.bys-tooltip-instance').remove();
  }

  $table.on('mouseenter', '.group-reporting__quiz-icon[data-quiz-id]:not([data-tip-loaded])', async function() {
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
      $icon.attr('data-tip', tip).attr('data-tip-loaded', '1');
      createAndShowTooltip($icon);
    } catch (err) {
      console.error(`[group-reporting] Failed to fetch quiz attempts for user ${userId}, quiz ${quizId}:`, err);
      $icon.attr('data-tip-loaded', '1');
      createAndShowTooltip($icon);
    }
  });

  $table.on('mouseenter', '.group-reporting__quiz-icon[data-tip-loaded]', function() {
    createAndShowTooltip($(this));
  });

  $table.on('mouseleave', '.group-reporting__quiz-icon', function() {
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

  // Fast first paint: if the store has the current group + courses + user_ids
  // cached from a prior page in this session, pre-render the table header and
  // skeleton rows so the user sees structure before group-select's fetches
  // complete. The bys:groupSelected handler below will re-render with fresh
  // data shortly after.
  (function preRenderFromCache() {
    const cachedGroupId = store.getCurrentGroup();
    const cachedCourses = store.getCourses();
    const cachedUserIds = store.getUserIds();

    const cachedHydratedUsers = store.getUsers();
    if (cachedGroupId !== null && cachedCourses !== null && cachedHydratedUsers !== null) {
      currentGroupId  = cachedGroupId;
      coursesInView   = cachedCourses;
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
    selectedCourseIds   = [];
    selectedUserIds     = [];
    allGroupUserIds     = userIds;
    allGroupUsers       = [];
    allGroupUsersLoaded = false;
    activeFilters = {
      courseIds:      [],
      userIds:        [],
      courseStatus:   '',
      userStatus:     '',
      enrolmentDate:  { from: '', to: '' },
      completionDate: { from: '', to: '' },
    };
    userCourseProgressAll = {};
    courseQuizStepsCache  = {};
    userQuizProgressCache = {};
    loadedOffset   = 0;
    currentSort    = 'first_name_asc';
    sortedUsers    = [];
    displayedCount = 0;
    $sortSelect.val('first_name_asc');
    resetFilterFormUI();
    updateCourseDepFieldState();
    updateCompletionSortVisibility();
  }

  $(document).on('bys:groupSelected', async function(_, data) {
    const groupId = data.groupId;
    if (!groupId) return;
    currentGroupId = groupId;

    // Read from the store now — group-select wrote both before firing this event.
    const userIds = store.getUserIds() || [];
    const courses = store.getCourses() || [];

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
      const cachedHydrated = store.getCurrentGroup() === Number(groupId)
        ? store.getHydratedUsers(firstTenUserIds)
        : null;

      let usersResponse;
      if (cachedHydrated !== null) {
        console.log('[bys-store] group-reporting: HIT hydrated — skipping /users fetch');
        usersResponse = cachedHydrated;
      } else {
        console.log('[bys-store] group-reporting: MISS hydrated — fetching /users');
        const usersUrl = `/wp-json/bys-groups/v1/groups/${groupId}/users?user_ids=${firstTenUserIds.join(',')}`;
        usersResponse = await api.get(usersUrl, true);
        if (!usersResponse || !Array.isArray(usersResponse)) {
          console.error('Invalid users response:', usersResponse);
          return;
        }
        store.setUsers(usersResponse); // write-through so other blocks reuse it
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
      usersResponse.forEach((user) => {
        if (!courseIds) {
          userCourseProgressAll[user.id] = [];
          return;
        }
        const endpoint = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
        api.get(endpoint, true)
          .then((progressArray) => {
            userCourseProgressAll[user.id] = Array.isArray(progressArray) ? progressArray : [];
            const $row = $tbody.find(`tr[data-user-id="${user.id}"]`);
            if ($row.length) applyCourseProgressToRow($row, courses, userCourseProgressAll[user.id]);
          })
          .catch((err) => {
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
      return { from, to };
    }
    return {
      courseIds:     filters.courseIds,
      userIds:       filters.userIds,
      courseStatus:  filters.courseStatus,
      userStatus:    filters.userStatus,
      enrolment:     parseRange(filters.enrolmentDate),
      completion:    parseRange(filters.completionDate),
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
    const coursesToCheck = ctx.courseIds.length > 0
      ? userProgress.filter((p) => ctx.courseIds.includes(p.course_id))
      : userProgress;

    if (ctx.courseStatus) {
      const expected = ctx.courseStatus === 'inactive' ? 'not_started' : ctx.courseStatus;
      if (!coursesToCheck.some((p) => (p.progress_status || 'not_started') === expected)) return false;
    }

    if (ctx.enrolment) {
      const ok = coursesToCheck.some((p) => {
        if (!p.enrolled_at) return false;
        const d = new Date(p.enrolled_at);
        if (ctx.enrolment.from && d < ctx.enrolment.from) return false;
        if (ctx.enrolment.to   && d > ctx.enrolment.to)   return false;
        return true;
      });
      if (!ok) return false;
    }

    if (ctx.completion) {
      const ok = coursesToCheck.some((p) => {
        if (!p.date_completed) return false;
        const d = new Date(p.date_completed);
        if (ctx.completion.from && d < ctx.completion.from) return false;
        if (ctx.completion.to   && d > ctx.completion.to)   return false;
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
    $table.find('tbody tr.group-reporting__row').each(function() {
      const userId = parseInt($(this).data('userId'), 10);
      const user = usersInView.find((u) => u.id === userId);
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
  $filtersForm.on('submit', async function(e) {
    e.preventDefault();

    const singleCourse = selectedCourseIds.length === 1;

    activeFilters.courseIds      = selectedCourseIds.slice();
    activeFilters.userIds        = selectedUserIds.slice();
    activeFilters.courseStatus   = singleCourse ? $filterStatus.val() : '';
    activeFilters.userStatus     = $filterUserStatus.val();
    activeFilters.enrolmentDate  = singleCourse ? { from: $filterEnrolFrom.val(), to: $filterEnrolTo.val() } : { from: '', to: '' };
    activeFilters.completionDate = singleCourse ? { from: $filterComplFrom.val(), to: $filterComplTo.val() } : { from: '', to: '' };

    closeMultiselect($msCourse);
    closeMultiselect($msUsers);

    // Row filters may match users not yet loaded — drain remaining pages first
    const hasRowFilter = activeFilters.userIds.length > 0 ||
      activeFilters.courseStatus || activeFilters.userStatus ||
      activeFilters.enrolmentDate.from || activeFilters.enrolmentDate.to ||
      activeFilters.completionDate.from || activeFilters.completionDate.to;

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
  $resetBtn.on('click', function() {
    selectedCourseIds = [];
    selectedUserIds   = [];
    activeFilters = { courseIds: [], userIds: [], courseStatus: '', userStatus: '', enrolmentDate: { from: '', to: '' }, completionDate: { from: '', to: '' } };

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
    dateFormat:    'd-m-y',
    altInput:      true,
    altInputClass: 'flatpickr-input group-reporting__datetime',
    altFormat:     'j M Y',
    disableMobile: true,
    allowInput:    false,
    onReady(_, __, fp) {
      fp.calendarContainer.classList.add('bys-fp');
      if (fp.altInput && fp.config.placeholder) {
        fp.altInput.placeholder = fp.config.placeholder;
      }
    },
  };

  function syncClearButton($input, hasValue) {
    // Clear button is a sibling of the (hidden) original input; flatpickr's alt
    // input sits between them. Use the input's parent to find the button.
    const $btn = $input.parent().find('.group-reporting__date-clear');
    if (hasValue) $btn.removeAttr('hidden');
    else          $btn.attr('hidden', '');
  }

  let fpEnrolFrom, fpEnrolTo, fpComplFrom, fpComplTo;

  fpEnrolFrom = flatpickr($filterEnrolFrom[0], {
    ...FP_FILTER,
    placeholder: 'Pick a date',
    onChange(_, dateStr) {
      fpEnrolTo.set('minDate', dateStr || null);
      syncClearButton($filterEnrolFrom, Boolean(dateStr));
      updateDateRangeText($filterEnrolFrom, $filterEnrolTo, $enrolRangeText);
    },
  });
  fpEnrolTo = flatpickr($filterEnrolTo[0], {
    ...FP_FILTER,
    placeholder: 'Pick a date',
    onChange(_, dateStr) {
      fpEnrolFrom.set('maxDate', dateStr || null);
      syncClearButton($filterEnrolTo, Boolean(dateStr));
      updateDateRangeText($filterEnrolFrom, $filterEnrolTo, $enrolRangeText);
    },
  });
  fpComplFrom = flatpickr($filterComplFrom[0], {
    ...FP_FILTER,
    placeholder: 'Pick a date',
    onChange(_, dateStr) {
      fpComplTo.set('minDate', dateStr || null);
      syncClearButton($filterComplFrom, Boolean(dateStr));
      updateDateRangeText($filterComplFrom, $filterComplTo, $complRangeText);
    },
  });
  fpComplTo = flatpickr($filterComplTo[0], {
    ...FP_FILTER,
    placeholder: 'Pick a date',
    onChange(_, dateStr) {
      fpComplFrom.set('maxDate', dateStr || null);
      syncClearButton($filterComplTo, Boolean(dateStr));
      updateDateRangeText($filterComplFrom, $filterComplTo, $complRangeText);
    },
  });

  // Map each input to its flatpickr instance — used by resetDateRangeField
  // and the clear-button handler.
  const fpFor = new Map([
    [$filterEnrolFrom[0].id, fpEnrolFrom],
    [$filterEnrolTo[0].id,   fpEnrolTo],
    [$filterComplFrom[0].id, fpComplFrom],
    [$filterComplTo[0].id,   fpComplTo],
  ]);

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
    const fpTo   = fpFor.get($to[0].id);
    if (fpFrom) fpFrom.clear();
    if (fpTo)   fpTo.clear();
    $text.text('Select a date range');
    $dropdown.addClass('hidden');
  }

  function updateDateRangeText($from, $to, $text) {
    const dateFrom = $from.val();
    const dateTo   = $to.val();
    if (!dateFrom && !dateTo)     $text.text('Select a date range');
    else if (dateFrom && dateTo)  $text.text(`${dateFrom} – ${dateTo}`);
    else if (dateFrom)            $text.text(`From ${dateFrom}`);
    else                          $text.text(`Until ${dateTo}`);
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
      $headers.find('.group-reporting__course-toggle')
        .html(truncateTitle(courseTitle))
        .attr('title', courseTitle)
        .attr('data-course-idx', idx);
      if (course.required) {
        $headers.find('.group-reporting__required-badge').removeClass('hidden');
      }
      $headers.find('.group-reporting__download').attr('data-course-idx', idx);

      $headers.children().each(function() {
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
    const bars = quizData.map((quiz) => {
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
    const rowTemplate  = document.getElementById('group-reporting__row-template');
    const cellTemplate = document.getElementById('group-reporting__cell-template');

    const $fragment = $(rowTemplate.content.cloneNode(true));
    const $tr       = $fragment.find('tr');

    $tr.attr('data-user-id', user.id);

    // Status dot — toggle modifier class for online/offline/never AND
    // wrap the icon with the "Last checked" tooltip. Must use the same
    // helper as appendTableRows() so both render paths stay in sync
    // (fast first paint vs full rebuild after fetch).
    applyStatusBadge($tr.find('.status-badge'), user);

    // Name + detail link.
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || '';
    $tr.find('.group-reporting__name-link')
      .attr('href', detailUrl + '?group_id=' + currentGroupId + '&user_id=' + user.id)
      .text(fullName);

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
    users.forEach((user) => $tbody.append(buildUserRowFragment(courses, user)));
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
    users.forEach((user) => $tbody.append(buildUserRowFragment(courses, user)));
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
    const status = progressStatus === 'completed' ? 'completed'
                 : progressStatus === 'in_progress' ? 'in-progress'
                 : 'not-started';

    // Badge cell
    $scope.find(`.group-reporting__cell--badge[data-course-idx="${idx}"] span`)
      .attr('class', `completion-badge completion-badge--${status}`);

    // Progress sub-cell
    const stepsCompleted = courseData?.steps_completed || 0;
    const stepsTotal     = courseData?.steps_total     || 0;
    const percentage     = typeof courseData?.percent_complete === 'number'
      ? courseData.percent_complete
      : (stepsTotal > 0 ? Math.min(100, Math.round((stepsCompleted / stepsTotal) * 100)) : 0);
    const percentClass   = percentage === 100 ? 'complete' : percentage === 0 ? 'not-started' : 'in-progress';

    $scope.find(`.group-reporting__sub-cell--progress[data-course-idx="${idx}"]`).html(`
      <div class="group-reporting__progress-wrap"><div class="group-reporting__progress-bar" style="width:${percentage}%;"></div></div>
      <span class="group-reporting__percent group-reporting__percent--${percentClass}">${percentage}%</span>
    `);

    // Quizzing sub-cell — loading spinner until the course column is expanded
    // and loadQuizDataForCourse replaces it with the real bars.
    $scope.find(`.group-reporting__sub-cell--quizzing[data-course-idx="${idx}"]`)
      .html('<span class="group-reporting__quiz-loading"><i class="fa-regular fa-spinner-third fa-spin"></i></span>');

    // Date sub-cells
    const enrolledAt    = courseData?.enrolled_at    || '';
    const dateCompleted = courseData?.date_completed || '';
    $scope.find(`.group-reporting__sub-cell--enrolment[data-course-idx="${idx}"]`)
      .html(`<span class="group-reporting__date">${enrolledAt ? formatDate(enrolledAt) : 'Not started'}</span>`);
    $scope.find(`.group-reporting__sub-cell--completion[data-course-idx="${idx}"]`)
      .html(`<span class="group-reporting__date">${dateCompleted ? formatDate(dateCompleted) : 'Not completed'}</span>`);
  }

  /**
   * Update one existing row's course cells in place — used by the trickle-in
   * path in populateTableFromAPI when a single user's progress fetch resolves.
   */
  function applyCourseProgressToRow($tr, courses, userProgress) {
    const progress = Array.isArray(userProgress) ? userProgress : [];
    courses.forEach((course, idx) => {
      const courseData = progress.find((cp) => cp.course_id === course.id);
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
        const courseData = userProgress.find((cp) => cp.course_id === course.id);

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

    $table.find(`.group-reporting__sub-cell--quizzing[data-course-idx="${courseIdx}"]`).each(function() {
      const userId = $(this).closest('tr').data('userId');
      const userQuizProgress = (userQuizProgressCache[course.id] || {})[userId] || {};
      $(this).html(buildQuizBars(quizSteps, userId, userQuizProgress));
    });
  }

  // ── Show More / lazy load ─────────────────────────────────────────────────────

  function updateShowMoreButton() {
    const $btn = $showMoreBtn;
    const hasMore = sortedUsers.length > 0
      ? displayedCount < sortedUsers.length
      : loadedOffset < allGroupUserIds.length;
    $btn.toggleClass('hidden', !hasMore);
  }

  $block.on('click', '.group-reporting__show-more', function() {
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
    const newUsers = await api.get(usersUrl, true);
    if (!newUsers || !Array.isArray(newUsers)) return [];

    // Append rows now — name/email/status synchronously; course cells are skeletons.
    appendUserRowsToTable(coursesInView, newUsers);
    if (expandedIdx !== null) expandCourse(expandedIdx);

    usersInView = usersInView.concat(newUsers);
    loadedOffset += newUsers.length;

    // Per-user progress fetches in parallel — each .then() fills only its row.
    const courseIds = coursesInView.map(c => c.id).join(',');
    newUsers.forEach((user) => {
      if (!courseIds) {
        userCourseProgressAll[user.id] = [];
        return;
      }
      const endpoint = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
      api.get(endpoint, true)
        .then((progressArray) => {
          userCourseProgressAll[user.id] = Array.isArray(progressArray) ? progressArray : [];
          const $row = $table.find(`tr[data-user-id="${user.id}"]`);
          if ($row.length) applyCourseProgressToRow($row, coursesInView, userCourseProgressAll[user.id]);
          // When a course column is expanded, fill THIS row's quiz cells too —
          // the column-level loader (loadQuizDataForNewUsers) batches a single
          // round of cells, so the row needs its quiz fill once progress arrives.
          if (expandedIdx !== null && courseQuizLoadedIdx.has(expandedIdx)) {
            loadQuizDataForNewUsers(expandedIdx, [user]);
          }
        })
        .catch((err) => {
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
    const newUsers = await api.get(usersUrl, true);
    if (!newUsers || !Array.isArray(newUsers)) return [];

    const courseIds = coursesInView.map(c => c.id).join(',');
    await Promise.all(newUsers.map(async (user) => {
      if (!courseIds) { userCourseProgressAll[user.id] = []; return; }
      const endpoint = `/wp-json/bys-groups/v1/users/${user.id}/course-progress?course_ids=${courseIds}`;
      try {
        userCourseProgressAll[user.id] = await api.get(endpoint, true);
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
    if (!nextIds.length) { $btn.addClass('hidden'); return; }

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
      $table.find(`tr[data-user-id="${user.id}"] .group-reporting__sub-cell--quizzing[data-course-idx="${courseIdx}"]`)
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
        $table.find(`.group-reporting__sub-cell--quizzing[data-course-idx="${wasExpanded}"]`).each(function() {
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
      const requiredMark = course.required
        ? ' <span class="group-reporting__required-badge" aria-hidden="true">*</span>'
        : '';
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
  $block.on('click', '#bys-multiselect-course .bys-multiselect__toggle', function(e) {
    e.stopPropagation();
    toggleMultiselect($msCourse);
  });

  $block.on('click', '#bys-multiselect-course .bys-multiselect__control', function(e) {
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

  $(document).on('click', function(e) {
    if (!$(e.target).closest('#bys-multiselect-course').length) {
      closeMultiselect($msCourse);
    }
    if (!$(e.target).closest('#bys-multiselect-users').length) {
      closeMultiselect($msUsers);
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
    syncPills($msCourse);
    updateCourseDepFieldState();
  });

  // Pill remove
  $block.on('click', '.bys-multiselect__pill-remove', function(e) {
    e.stopPropagation();
    const id = parseInt($(this).data('courseId'), 10);
    selectedCourseIds = selectedCourseIds.filter(x => x !== id);
    $block.find(`#bys-multiselect-course-dropdown input[value="${id}"]`).prop('checked', false)
      .closest('li').attr('aria-selected', 'false');
    syncPills($msCourse);
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
    toggleMultiselect($msUsers);
  });

  $block.on('click', '#bys-multiselect-users .bys-multiselect__control', function(e) {
    if ($(e.target).closest('.bys-multiselect__pill-remove').length) return;
    toggleMultiselect($msUsers);
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
    syncUserPills($msUsers);
  });

  // Pill remove — users
  $block.on('click', '#bys-multiselect-users .bys-multiselect__pill-remove', function(e) {
    e.stopPropagation();
    const id = parseInt($(this).data('userId'), 10);
    selectedUserIds = selectedUserIds.filter(x => x !== id);
    $block.find(`#bys-multiselect-users-dropdown input[value="${id}"]`).prop('checked', false)
      .closest('li').attr('aria-selected', 'false');
    syncUserPills($msUsers);
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

  $(document).on('click.group-reporting__date-range', function(e) {
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

  $exportBtn.on('click', async function(e) {
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

  $table.on('click', '.group-reporting__download', async function(e) {
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
      bysAlert('Bulk certificate download failed.');
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
    return ordered.filter((user) => userPassesRowFilter(user, ctx));
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
    // mirrors the progress sub-cell
    const stepsCompleted = courseData?.steps_completed || 0;
    const stepsTotal = courseData?.steps_total || 0;
    const percentage = typeof courseData?.percent_complete === 'number'
      ? courseData.percent_complete
      : (stepsTotal > 0 ? Math.min(100, Math.round((stepsCompleted / stepsTotal) * 100)) : 0);
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
    // ── Step 1: quiz steps ──────────────────────────────────────────────────
    // Prefer the per-course quizzes_show_in_reporting baked into /base-group-data
    // (already in the store). Fall back to the network only if the store
    // hasn't been populated yet for this group.
    let quizSteps = courseQuizStepsCache[course.id];
    if (!quizSteps) {
      const cachedCourse = (store.getCourses() || []).find((c) => c.id === course.id);
      if (cachedCourse && Array.isArray(cachedCourse.quizzes_show_in_reporting)) {
        console.log('[bys-store] group-reporting: HIT quizzes_show_in_reporting from store for course', course.id);
        quizSteps = cachedCourse.quizzes_show_in_reporting;
        courseQuizStepsCache[course.id] = quizSteps;
      } else {
        try {
          console.log('[bys-store] group-reporting: MISS — fetching courseQuizSteps for course', course.id);
          quizSteps = await api.get(endpoints.courseQuizSteps(course.id)) || [];
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
    const response = await api.get(
      `/wp-json/bys-groups/v1/groups/${currentGroupId}/courses/${course.id}/certificate-urls`,
      true // forceRefresh - never serve a stale list
    );
    const users = Array.isArray(response?.users) ? response.users : [];
    const courseTitle = response?.course_title || course.title?.rendered || course.title || `course-${course.id}`;

    // Course has no certificate configured - abandon download
    if (response?.has_certificate_template === false) {
      bysAlert(`"${courseTitle}" has no certificate configured.`);
      // console.warn('[group-reporting] Course has no certificate template:', course.id);
      return;
    }

    if (!users.length) {
      bysAlert('No group members to download certificates for.')
      // console.warn('[group-reporting] No group members to download certificates for.');
      return;
    }
    // no group-users have achieved completion yet
    if (!users.some((u) => !!u.certificate_url)) {
      bysAlert(`No group members have completed "${courseTitle}".`);
      // console.warn('[group-reporting] No completers for course:', course.id);
      return;
    }

    // create a new ZIP file container
    const zip = new JSZip();

    // Sanitise once — used for both the per-PDF filename and the outer
    // ZIP filename. Filesystems differ on what they tolerate; the
    // intersection of safe chars is conservative.
    const safe = (str) => String(str).replace(/[^a-zA-Z0-9-_.]+/g, '_').replace(/^_+|_+$/g, '');

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
            const resp = await fetch(user.certificate_url, { credentials: 'include' });
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
    await Promise.all(Array.from({ length: PARALLEL }, worker));

    // Summary CSV at the root of the ZIP. UTF-8 BOM for Excel compatibility,
    // matching downloadCsv's behaviour for the table-level export.
    const summaryFile = summaryRows.map((row) =>
      row.map((cell) => {
        const str = String(cell ?? '');
        return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    ).join('\n');
    zip.file('_summary.csv', '﻿' + summaryFile);

    // make the ZIP a downloadable file and trigger browser download by simulating a click on a hidden link 
    const blob = await zip.generateAsync({ type: 'blob' });
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