import { api, endpoints } from '../_shared/api-client.js';
import { formatScore, formatDate, formatDateTime } from '../_shared/helpers.js';
import { createTooltip, destroyTooltip } from '../_shared/tooltip.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-user-quiz-attempts-modal').first();
  const $modal = $block.find('#quiz-attempts-modal');
  const $tbody = $modal.find('tbody');
  const $modeFilter = $modal.find('#quiz-attempts-mode-filter');
  const $userSearch = $modal.find('#quiz-attempts-user-search');
  const $userClear  = $modal.find('.user-search-clear');
  const $suggestions = $modal.find('#user-search-suggestions');
  const rowTemplate = $block.find('#user-quiz-attempts-modal__template-row')[0];

  let allAttempts   = [];
  let currentRows   = []; // tracks the currently rendered rows (for CSV export)
  let sortState     = { col: 'user', dir: 'asc' };
  let usersIndex    = []; // [{ id, name, email, label }] — built once after load
  let selectedUserId = null; // currently selected user ID (null = all)

  // Track current quiz/group context so the grading-page link can carry it forward
  let currentGroupId  = null;
  let currentQuizId   = null;
  let currentQuizTitle  = '';
  let currentCourse     = '';

  const round2 = (n) => n != null ? Math.round(n * 100) / 100 : n;

  function closeModal() {
    $modal.addClass('hidden').removeClass('open');
    $('html').css('overflow', 'unset');
  }

  // ── Sorting ────────────────────────────────────────────────────────────────

  function userName(attempt) {
    return [attempt.first_name, attempt.last_name].filter(Boolean).join(' ') || attempt.display_name || '';
  }

  function sortRows(rows) {
    if (!sortState.col) return rows;
    return [...rows].sort((a, b) => {
      let va, vb;
      switch (sortState.col) {
        case 'user':
          va = userName(a).toLowerCase();
          vb = userName(b).toLowerCase();
          break;
        case 'submitted':
          va = a.completed_gmt ?? '';
          vb = b.completed_gmt ?? '';
          break;
        case 'score':
          va = a.percentage ?? -1;
          vb = b.percentage ?? -1;
          break;
        case 'status':
          va = a.pass === true ? 2 : a.pass === false ? 1 : 0;
          vb = b.pass === true ? 2 : b.pass === false ? 1 : 0;
          break;
        default:
          return 0;
      }
      if (va < vb) return sortState.dir === 'asc' ? -1 : 1;
      if (va > vb) return sortState.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function updateSortIcons() {
    $modal.find('thead th[data-sort-col]').each(function() {
      const $icon = $(this).find('.sort-icon');
      const col = $(this).data('sortCol');
      $icon.removeClass('fa-sort fa-sort-up fa-sort-down');
      $icon.addClass(col === sortState.col
        ? (sortState.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down')
        : 'fa-sort'
      );
    });
  }

  $modal.find('thead th[data-sort-col]').on('click', function() {
    const col = $(this).data('sortCol');
    sortState = sortState.col === col
      ? { col, dir: sortState.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' };
    updateSortIcons();
    applyFilters();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  function renderRows(attempts) {
    currentRows = attempts; // snapshot for CSV export
    $tbody.empty();
    $tbody.off('mouseenter mouseleave click');

    if (!attempts.length) {
      $tbody.html('<tr><td colspan="5">No attempts found.</td></tr>');
      return;
    }

    attempts.forEach((attempt, index) => {
      const rowNode = rowTemplate.content.cloneNode(true);
      const $row = $(rowNode);

      $row.find('tr').attr('data-user-id', attempt.user_id).attr('data-activity-id', attempt.activity_id);
      $row.find('.cell_attempt_index').text(index + 1);
      $row.find('.cell_attempt_user').text(userName(attempt));

      const $date = $row.find('.cell_attempt_date');
      $date.text(formatDate(attempt.completed_gmt))
           .attr('data-tooltip', attempt.completed_gmt ? formatDateTime(attempt.completed_gmt) : '—');

      $row.find('.cell_attempt_score').text(
        formatScore(round2(attempt.percentage), attempt.points_scored, attempt.points_total)
      );

      const $badge = $row.find('.status-badge');
      if (attempt.pass === null) {
        $badge.addClass('status-badge--ungraded').text('Ungraded');
      } else if (attempt.pass) {
        $badge.addClass('status-badge--pass').text('Pass');
      } else {
        $badge.addClass('status-badge--fail').text('Fail');
      }

      $tbody.append($row);
    });

    $tbody.on('mouseenter', '[data-tooltip]', function() {
      createTooltip($(this), $(this).attr('data-tooltip'));
    }).on('mouseleave', '[data-tooltip]', destroyTooltip);

    // Collapsed view: click to drill into that user's attempts.
    // Expanded view (user selected): click to navigate to the grading page.
    $tbody.on('click', 'tr[data-user-id]', function() {
      if (selectedUserId) {
        const activityId = $(this).data('activityId');
        if (activityId) {
          const gradingUrl = $block.data('gradingUrl');
          const params = new URLSearchParams({
            attempt_id: activityId,
            group_id:   currentGroupId  ?? '',
            quiz_id:    currentQuizId   ?? '',
          });
          window.location.href = `${gradingUrl}?${params}`;
        }
      } else {
        selectUser(parseInt($(this).data('userId'), 10));
      }
    });
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  function collapseByUser(attempts, mode) {
    // Ungraded mode: show only users who have at least one ungraded attempt,
    // picking their most recent ungraded attempt as the representative row.
    if (mode === 'ungraded') {
      const best = {};
      attempts.filter(a => a.pass === null).forEach(a => {
        const existing = best[a.user_id];
        if (!existing || (a.completed_gmt ?? '') > (existing.completed_gmt ?? '')) {
          best[a.user_id] = a;
        }
      });
      return Object.values(best);
    }

    const best = {};
    attempts.forEach(a => {
      const existing = best[a.user_id];
      if (!existing) { best[a.user_id] = a; return; }
      if (mode === 'recent') {
        if ((a.completed_gmt ?? '') > (existing.completed_gmt ?? '')) best[a.user_id] = a;
      } else {
        if ((a.percentage ?? -1) > (existing.percentage ?? -1)) best[a.user_id] = a;
      }
    });
    return Object.values(best);
  }

  // ── CSV export ──────────────────────────────────────────────────────────────

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
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportToCsv() {
    const headers = ['#', 'User', 'Submitted', 'Score', 'Percentage', 'Status'];
    const dataRows = currentRows.map((attempt, index) => {
      const status = attempt.pass === null ? 'Ungraded' : attempt.pass ? 'Pass' : 'Fail';
      const hasPoints = attempt.points_scored !== null && attempt.points_total !== null;
      const score = hasPoints ? `${attempt.points_scored}/${attempt.points_total}` : '';
      const pct   = attempt.percentage !== null && attempt.percentage !== undefined
        ? `${round2(attempt.percentage)}%`
        : '';
      return [
        index + 1,
        userName(attempt),
        attempt.completed_gmt ? formatDateTime(attempt.completed_gmt) : '',
        score,
        pct,
        status,
      ];
    });

    const slug  = currentQuizTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const today = new Date().toISOString().split('T')[0];
    downloadCsv([headers, ...dataRows], `quiz-attempts-${slug}-${today}.csv`);
  }

  function applyFilters() {
    const mode = $modeFilter.val();

    let rows;
    if (selectedUserId) {
      rows = allAttempts.filter(a => a.user_id === selectedUserId);
      $tbody.removeClass('is-collapsed');
    } else {
      rows = collapseByUser(allAttempts, mode);
      $tbody.addClass('is-collapsed');
    }

    renderRows(sortRows(rows));
  }

  // ── User autosuggest ───────────────────────────────────────────────────────

  function buildUsersIndex(attempts) {
    const seen = new Set();
    const index = [];
    attempts.forEach(a => {
      if (seen.has(a.user_id)) return;
      seen.add(a.user_id);
      const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.display_name || '';
      index.push({
        id:    a.user_id,
        name,
        email: a.email || '',
        label: a.email ? `${name} (${a.email})` : name,
      });
    });
    index.sort((a, b) => a.name.localeCompare(b.name));
    return index;
  }

  function showSuggestions(query) {
    const q = query.toLowerCase().trim();
    const matches = q
      ? usersIndex.filter(u =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        )
      : usersIndex;

    $suggestions.empty();
    if (!matches.length) {
      $suggestions.append('<li class="user-suggestion user-suggestion--empty" role="option">No users found</li>');
    } else {
      matches.forEach(u => {
        $suggestions.append(
          `<li class="user-suggestion" role="option" data-user-id="${u.id}" data-user-name="${escapeAttr(u.name)}">${escapeHtml(u.label)}</li>`
        );
      });
    }
    $suggestions.removeClass('hidden');
    $userSearch.attr('aria-expanded', 'true');
  }

  function hideSuggestions() {
    $suggestions.addClass('hidden').empty();
    $userSearch.attr('aria-expanded', 'false');
  }

  function selectUser(userId) {
    const user = usersIndex.find(u => u.id === userId);
    if (!user) return;
    selectedUserId = userId;
    $userSearch.val(user.name).prop('readonly', true);
    $userClear.removeClass('hidden');
    $modeFilter.closest('.filter-bar__group').addClass('hidden');
    hideSuggestions();
    applyFilters();
  }

  function clearUserSelection() {
    selectedUserId = null;
    $userSearch.val('').prop('readonly', false).trigger('focus');
    $userClear.addClass('hidden');
    $modeFilter.closest('.filter-bar__group').removeClass('hidden');
    applyFilters();
  }

  const escapeHtml = s => $('<div>').text(s).html();
  const escapeAttr = s => s.replace(/"/g, '&quot;');

  $userSearch.on('input', function() {
    if (selectedUserId) return; // locked to a selection
    showSuggestions($(this).val());
  });

  $userSearch.on('focus', function() {
    if (!selectedUserId) showSuggestions($(this).val());
  });

  // Keyboard navigation in suggestions
  $userSearch.on('keydown', function(e) {
    if ($suggestions.hasClass('hidden')) return;
    const $items = $suggestions.find('.user-suggestion:not(.user-suggestion--empty)');
    const $active = $suggestions.find('.user-suggestion--active');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const $next = $active.length ? $active.removeClass('user-suggestion--active').next('.user-suggestion') : $items.first();
      $next.addClass('user-suggestion--active');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const $prev = $active.length ? $active.removeClass('user-suggestion--active').prev('.user-suggestion') : $items.last();
      $prev.addClass('user-suggestion--active');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if ($active.length) selectUser(parseInt($active.data('userId'), 10));
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  $suggestions.on('mousedown', '.user-suggestion:not(.user-suggestion--empty)', function(e) {
    e.preventDefault(); // prevent input blur before click fires
    selectUser(parseInt($(this).data('userId'), 10));
  });

  // Close suggestions when clicking outside
  $(document).on('click.userSearch', function(e) {
    if (!$(e.target).closest('.user-search-wrap').length) {
      hideSuggestions();
      // If nothing was selected, clear any partial text
      if (!selectedUserId) $userSearch.val('');
    }
  });

  $userClear.on('click', clearUserSelection);

  // ── Open event ─────────────────────────────────────────────────────────────

  $(window).on('bysQuizAttemptsOpen', async function(_event, data) {
    const { quizId, quizTitle, parentCourse, groupId, userId } = data;

    currentGroupId   = groupId;
    currentQuizId    = quizId;
    currentQuizTitle = quizTitle;
    currentCourse    = parentCourse;

    $modal.find('.quiz-title').text(quizTitle);
    $modal.find('.course-title').text(parentCourse);

    // Reset state
    selectedUserId = null;
    usersIndex = [];
    $userSearch.val('').prop('readonly', false);
    $userClear.addClass('hidden');
    hideSuggestions();
    $modeFilter.val('highest');
    $modeFilter.closest('.filter-bar__group').removeClass('hidden');
    sortState = { col: 'user', dir: 'asc' };
    updateSortIcons();

    $tbody.html('<tr><td colspan="5">Loading attempts…</td></tr>');
    $modal.removeClass('hidden').addClass('open');
    $('html').css('overflow', 'hidden');

    if (typeof HSStaticMethods !== 'undefined') HSStaticMethods.autoInit();

    try {
      allAttempts = await api.get(endpoints.groupQuizAttempts(groupId, quizId), true);
      usersIndex  = buildUsersIndex(allAttempts);

      if (userId) {
        selectUser(parseInt(userId, 10));
      } else {
        applyFilters();
      }

    } catch (err) {
      console.error('[user-quiz-attempts-modal] Failed to fetch quiz attempts:', err);
      $tbody.html('<tr><td colspan="5">Failed to load attempts.</td></tr>');
    }
  });

  // ── Filter change handlers ─────────────────────────────────────────────────

  $modeFilter.on('change', applyFilters);

  // ── Export handler ─────────────────────────────────────────────────────────

  $modal.find('.modal__export').on('click', function() {
    if (!currentRows.length) return;
    const $btn = $(this);
    $btn.prop('disabled', true);
    exportToCsv();
    $btn.prop('disabled', false);
  });

  // ── Close handlers ─────────────────────────────────────────────────────────

  $modal.find('.modal__close').on('click', closeModal);
  $modal.find('[data-hs-overlay]').on('click', function(e) {
    e.stopPropagation();
    closeModal();
  });
});
