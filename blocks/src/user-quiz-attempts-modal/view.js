import { api, endpoints } from '../_shared/api-client.js';
import { formatScore, formatDate, formatDateTime } from '../_shared/helpers.js';
import { createTooltip, destroyTooltip } from '../_shared/tooltip.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-user-quiz-attempts-modal').first();
  const $modal = $block.find('#quiz-attempts-modal');
  const $tbody = $modal.find('tbody');
  const $userFilter = $modal.find('#quiz-attempts-user-filter');
  const $modeFilter = $modal.find('#quiz-attempts-mode-filter');
  const rowTemplate = $block.find('#user-quiz-attempts-modal__template-row')[0];

  let allAttempts = [];
  let sortState = { col: null, dir: 'asc' };

  const round2 = (n) => n != null ? Math.round(n * 100) / 100 : n;

  function closeModal() {
    $modal.addClass('hidden').removeClass('open');
    $('html').css('overflow', 'unset');
  }

  // ── Sorting ────────────────────────────────────────────────────────────────

  function sortRows(rows) {
    if (!sortState.col) return rows;
    return [...rows].sort((a, b) => {
      let va, vb;
      switch (sortState.col) {
        case 'user':
          va = (a.display_name || '').toLowerCase();
          vb = (b.display_name || '').toLowerCase();
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
    $tbody.empty();
    $tbody.off('mouseenter mouseleave click');

    if (!attempts.length) {
      $tbody.html('<tr><td colspan="5">No attempts found.</td></tr>');
      return;
    }

    attempts.forEach((attempt, index) => {
      const rowNode = rowTemplate.content.cloneNode(true);
      const $row = $(rowNode);

      $row.find('tr').attr('data-user-id', attempt.user_id);
      $row.find('.cell_attempt_index').text(index + 1);
      $row.find('.cell_attempt_user').text(attempt.display_name);

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

    // Click a collapsed row to drill into that user's full attempts
    $tbody.on('click', 'tr[data-user-id]', function() {
      if (!$userFilter.val()) {
        $userFilter.val(String($(this).data('userId'))).trigger('change');
      }
    });
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  function collapseByUser(attempts, mode) {
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

  function applyFilters() {
    const selectedUserId = parseInt($userFilter.val()) || null;
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

  // ── Open event ─────────────────────────────────────────────────────────────

  $(window).on('bysQuizAttemptsOpen', async function(_event, data) {
    const { quizId, quizTitle, parentCourse, groupId, userId } = data;

    $modal.find('.quiz-title').text(quizTitle);
    $modal.find('.course-title').text(parentCourse);

    // Reset filters and sort
    $userFilter.find('option:not(:first)').remove();
    $userFilter.val('');
    $modeFilter.val('highest');
    $modeFilter.closest('.filter-bar__group').removeClass('hidden');
    sortState = { col: null, dir: 'asc' };
    updateSortIcons();

    $tbody.html('<tr><td colspan="5">Loading attempts…</td></tr>');
    $modal.removeClass('hidden').addClass('open');
    $('html').css('overflow', 'hidden');

    if (typeof HSStaticMethods !== 'undefined') HSStaticMethods.autoInit();

    try {
      allAttempts = await api.get(endpoints.groupQuizAttempts(groupId, quizId), true);

      const usersMap = {};
      allAttempts.forEach(a => { usersMap[a.user_id] = a.display_name; });
      Object.entries(usersMap).forEach(([id, name]) => {
        $userFilter.append(`<option value="${id}">${name}</option>`);
      });

      if (userId) {
        $userFilter.val(String(userId));
        $modeFilter.closest('.filter-bar__group').addClass('hidden');
      }

      applyFilters();

    } catch (err) {
      console.error('[user-quiz-attempts-modal] Failed to fetch quiz attempts:', err);
      $tbody.html('<tr><td colspan="5">Failed to load attempts.</td></tr>');
    }
  });

  // ── Filter change handlers ─────────────────────────────────────────────────

  $userFilter.on('change', function() {
    $modeFilter.closest('.filter-bar__group').toggleClass('hidden', !!$userFilter.val());
    applyFilters();
  });
  $modeFilter.on('change', applyFilters);

  // ── Close handlers ─────────────────────────────────────────────────────────

  $modal.find('.modal__close').on('click', closeModal);
  $modal.find('[data-hs-overlay]').on('click', function(e) {
    e.stopPropagation();
    closeModal();
  });
});
