import { api } from '../_shared/api-client.js';

jQuery(document).ready(function($) {
  const $block = $('.wp-block-bys-groups-group-reporting').first();
  const $table = $block.find('.reporting-table');
  const detailUrl = $table.data('detailUrl') || '/administrator-dashboard/user-progress-detail/';
  const $tooltip = $('.bys-tooltip');

  if (!$table.length) return;

  let expandedIdx = null;

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

  // Quiz icon tooltips
  $table.on('mouseenter', '.bys-quiz-icon[data-tip]', function() {
    const $icon = $(this);
    $tooltip.text($icon.data('tip')).attr('aria-hidden', 'false');
    const rect = this.getBoundingClientRect();
    $tooltip.css({
      top: (window.scrollY + rect.bottom + 6) + 'px',
      left: (window.scrollX + rect.left + rect.width / 2 - $tooltip.outerWidth() / 2) + 'px'
    });
  });

  $table.on('mouseleave', '.bys-quiz-icon', function() {
    $tooltip.attr('aria-hidden', 'true').text('');
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

      if (!firstTenUserIds.length) {
        // console.log('No users in group');
        rebuildTableHeader(courses);
        rebuildTableBody(courses, [], {});
        return;
      }

      // Fetch user details for the first 10 users
      const usersUrl = `/wp-json/bys-groups/v1/groups/${groupId}/users?user_ids=${firstTenUserIds.join(',')}`;
      const usersResponse = await api.get(usersUrl, true); // Force refresh

      if (!usersResponse || !Array.isArray(usersResponse)) {
        console.error('Invalid users response:', usersResponse);
        return;
      }

      // Fetch course progress for each user
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

      // Update status badge
      const statusClass = user.has_logged_in ? 'status-badge--online' : 'status-badge--never';
      $row.find('.status-badge').attr('class', `status-badge ${statusClass}`);

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
        const percentage = courseData?.percentage || 0;
        $cells.find('.course-sub-cell--progress').html(`
          <div class="bys-progress-wrap"><div class="bys-progress-bar" style="width:${percentage}%;"></div></div>
          <span class="bys-pct">${percentage}%</span>
        `);

        // Update date cells
        const enrolledDate = courseData?.enrolled_date || '';
        const completedDate = courseData?.completed_date || '';
        const enrolledDateDisplay = enrolledDate ? formatDate(enrolledDate) : 'Not Started';
        const completedDateDisplay = completedDate ? formatDate(completedDate) : 'Not Completed';

        $cells.find('.course-sub-cell--enrolment').html(`<span class="bys-date">${enrolledDateDisplay}</span>`);
        $cells.find('.course-sub-cell--completion').html(`<span class="bys-date">${completedDateDisplay}</span>`);

        // Append cells to row
        $row.find('tr').append($cells);
      });

      $tbody.append($row);
    });
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
