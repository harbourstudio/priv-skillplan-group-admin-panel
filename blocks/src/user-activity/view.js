import { api, endpoints } from '../_shared/api-client.js';
import { LOADING } from '../_shared/loading.js';
import { formatDate, formatTime } from '../_shared/helpers.js';

jQuery(document).ready(($) => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('user_id');

  if (!userId) {
    return; // User ID is required
  }

  const $block = $('.wp-block-bys-groups-user-activity').first();
  const $tbody = $block.find('table tbody');
  const $form = $block.find('.filters__form');
  const $resetBtn = $block.find('.filters__reset');
  const rowTemplate = $block.find('#user-activity-template-row')[0];

  // Load activity configuration from PHP (label + icon mapping)
  const activityConfigEl = $block.find('#bys-activity-config');
  const activityConfig = activityConfigEl.length ? JSON.parse(activityConfigEl.html()) : {};

  // Map object types to frontend labels (sfwd-lesson=Module, sfwd-topic=Lesson)
  const objectTypeLabels = {
    'lesson': 'Module',
    'topic': 'Lesson',
    'quiz': 'Quiz',
    'course': 'Course',
  };

  let currentPage = 1;
  let currentFilters = {};
  let selectedActivities = []; // Track selected activity values

  /**
   * Sync activity pills display from selectedActivities array
   */
  const syncActivityPills = () => {
    const $pills = $block.find('#bys-multiselect-activity-pills');
    $pills.html('');

    if (!selectedActivities.length) {
      $pills.html('<span class="bys-multiselect__placeholder">' + (window.bysActivity?.translations?.allActivities || 'All activities') + '</span>');
      return;
    }

    selectedActivities.forEach(value => {
      const $checkbox = $block.find(`#bys-multiselect-activity-dropdown input[value="${value}"]`);
      if (!$checkbox.length) return;
      const label = $checkbox.closest('label').find('span').text();
      $pills.append(`
        <span class="bys-multiselect__pill" data-activity-value="${value}">
          ${label}
          <button class="bys-multiselect__pill-remove btn-unstyled" type="button" aria-label="Remove ${label}" data-activity-value="${value}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </span>
      `);
    });
  };

  /**
   * Toggle activity multiselect dropdown
   */
  const toggleActivityDropdown = () => {
    const $multiselect = $block.find('#bys-multiselect-activity');
    const isOpen = $multiselect.attr('aria-expanded') === 'true';
    $multiselect.attr('aria-expanded', !isOpen);
    $block.find('#bys-multiselect-activity-dropdown').toggleClass('hidden', isOpen);
  };

  /**
   * Toggle date range dropdown
   */
  const toggleDateRangeDropdown = () => {
    const $dropdown = $block.find('#date-range-dropdown');
    $dropdown.toggleClass('hidden');
  };

  /**
   * Update the date range button text based on selected dates
   */
  const updateDateRangeText = () => {
    const dateFrom = $block.find('#filter-date-from').val();
    const dateTo = $block.find('#filter-date-to').val();

    if (!dateFrom && !dateTo) {
      $block.find('#date-range-text').text('Select a date range');
    } else if (dateFrom && dateTo) {
      $block.find('#date-range-text').text(`${dateFrom} - ${dateTo}`);
    } else if (dateFrom) {
      $block.find('#date-range-text').text(`From ${dateFrom}`);
    } else {
      $block.find('#date-range-text').text(`Until ${dateTo}`);
    }
  };


  /**
   * Load activity data from API
   */
  const loadActivity = async (page = 1) => {
    const $loadingRow = jQuery(`<tr><td>${LOADING}</td></tr>`);
    $tbody.html($loadingRow);
    currentPage = page;

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('per_page', $block.find('[name="per_page"]').val() || 20);

      // Add activity filters (multiple values)
      if (currentFilters.activity && Array.isArray(currentFilters.activity)) {
        currentFilters.activity.forEach(activity => {
          if (activity) {
            queryParams.append('activity[]', activity);
          }
        });
      }

      // Add date range filters
      if (currentFilters.date_from) {
        queryParams.append('date_from', currentFilters.date_from);
      }
      if (currentFilters.date_to) {
        queryParams.append('date_to', currentFilters.date_to);
      }

      const url = `${endpoints.userActivity(userId)}?${queryParams.toString()}`;
      const result = await api.get(url);

      $tbody.empty();

      if (!result.items || result.items.length === 0) {
        $tbody.html('<tr><td>No activity found.</td></tr>');
        return;
      }

      result.items.forEach((item) => {
        const $row = $(rowTemplate.content.cloneNode(true)).find('tr');

        // Get activity config (label and icon) based on activity type
        const config = activityConfig[item.activity] || {};
        const label = config.label || item.activity_label || '—';
        const icon = config.icon || '';

        $row.attr('data-activity', item.activity);
        $row.find('.cell-activity__icon').addClass(icon);
        $row.find('.cell-activity__label').text(label);

        $row.find('.cell-created-at__date').text(formatDate(item.created_at));
        $row.find('.cell-created-at__time').text(formatTime(item.created_at));

        $row.find('.cell-object-title').html(item.object_title || '—');

        const objectType = item.object_type || '—';
        const objectTypeLabel = objectTypeLabels[objectType] || objectType.charAt(0).toUpperCase() + objectType.slice(1);
        $row.find('.cell-object-type .cell-object-type__label').text(objectTypeLabel);
        $row.find('.cell-object-type .cell-object-type__dot').addClass(`cell-object-type__dot--${objectType}`);

        const initiatedBy = item.initiated_by || '—';
        $row.find('.cell-initiated-by').text(initiatedBy.charAt(0).toUpperCase() + initiatedBy.slice(1));

        // Store full metadata as data attribute for modal access
        $row.data('meta', item.meta || {});
        $row.data('activity-label', label);

        $tbody.append($row);

      });
    } catch (err) {
      console.error('[user-activity] Failed to fetch activity:', err);
      $tbody.html('<tr><td>Failed to load activity.</td></tr>');
    }
  };

  /**
   * Handle activity details trigger click
   * Opens modal with metadata for selected activity
   */
  const openActivityModal = (activityData) => {
    const $modal = $block.find('#user-activity-modal');

    // Set modal title
    $modal.find('.title').text(activityData.activity_label || activityData.activity);
    $modal.find('.subtitle').text(activityData.object_title || '—');

    // Display metadata as formatted JSON
    const metaDisplay = activityData.meta && Object.keys(activityData.meta).length > 0
      ? JSON.stringify(activityData.meta, null, 2)
      : 'No metadata available';

    $modal.find('.activity-details').text(metaDisplay);

    // Open modal - prevent layout shift by compensating for scrollbar
    $modal.removeClass('hidden').addClass('open');
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    $('html').css({
      'overflow': 'hidden',
      'padding-right': scrollbarWidth + 'px'
    });
  };

  /**
   * Click handler for cell-details__trigger buttons
   */
  $block.on('click', '.cell-details__trigger', function (e) {
    e.preventDefault();
    e.stopPropagation();

    const $row = $(this).closest('tr');
    const activityData = {
      activity: $row.data('activity') || '',
      activity_label: $row.find('.cell-activity__label').text(),
      object_title: $row.find('.cell-object-title').text(),
      created_at: $row.find('.cell-created-at__date').text(),
      object_type: $row.find('.cell-object-type__label').text(),
      initiated_by: $row.find('.cell-initiated-by').text(),
      // Store full activity data from the original API response
      meta: $row.data('meta') || {}
    };

    openActivityModal(activityData);
  });

  /**
   * Close modal handlers
   */
  const $modal = $block.find('#user-activity-modal');
  $modal.find('[data-hs-overlay]').on('click', function(e) {
    e.stopPropagation();
    $modal.addClass('hidden').removeClass('open');
    $('html').css({
      'overflow': 'unset',
      'padding-right': '0px'
    });
  });

  /**
   * Activity multiselect toggle - click anywhere on the control
   */
  $block.on('click', '#bys-multiselect-activity .bys-multiselect__control', function (e) {
    // Don't toggle if clicking the remove button
    if ($(e.target).closest('.bys-multiselect__pill-remove').length) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    toggleActivityDropdown();
  });

  /**
   * Handle activity checkbox changes
   */
  $block.on('change', '#bys-multiselect-activity-dropdown .bys-multiselect__checkbox', function () {
    const value = $(this).val();

    if (this.checked) {
      if (!selectedActivities.includes(value)) {
        selectedActivities.push(value);
      }
    } else {
      selectedActivities = selectedActivities.filter(v => v !== value);
    }

    syncActivityPills();
    $(this).closest('.bys-multiselect__option').attr('aria-selected', this.checked);
  });

  /**
   * Remove pill via X button
   */
  $block.on('click', '#bys-multiselect-activity .bys-multiselect__pill-remove', function (e) {
    e.stopPropagation();
    const value = $(this).data('activity-value');
    selectedActivities = selectedActivities.filter(v => v !== value);
    $block.find(`#bys-multiselect-activity-dropdown input[value="${value}"]`)
      .prop('checked', false)
      .closest('li').attr('aria-selected', 'false');
    syncActivityPills();
  });

  /**
   * Date range trigger toggle
   */
  $block.on('click', '#date-range-trigger', function (e) {
    e.preventDefault();
    toggleDateRangeDropdown();
  });

  /**
   * Handle date input changes
   */
  $block.on('change', '#filter-date-from, #filter-date-to', function () {
    updateDateRangeText();
  });

  /**
   * Close dropdowns when clicking outside
   */
  $(document).on('click', function (e) {
    const $target = $(e.target);
    const $activityField = $block.find('#bys-multiselect-activity');
    const $dateField = $block.find('.filters__field--date-range');

    // Close activity dropdown if click is outside the entire field (including dropdown)
    if (!$target.closest($activityField).length && $activityField.attr('aria-expanded') === 'true') {
      $activityField.attr('aria-expanded', 'false');
      $block.find('#bys-multiselect-activity-dropdown').addClass('hidden');
    }

    // Close date range dropdown if click is outside the field
    if (!$target.closest($dateField).length) {
      $block.find('#date-range-dropdown').addClass('hidden');
    }
  });

  /**
   * Handle filter form submission
   */
  $form.on('submit', function (e) {
    e.preventDefault();
    currentFilters = {
      activity: selectedActivities,
      date_from: $block.find('#filter-date-from').val() || '',
      date_to: $block.find('#filter-date-to').val() || '',
    };
    loadActivity(1);
  });

  /**
   * Handle reset button
   */
  $resetBtn.on('click', function () {
    currentFilters = {};
    selectedActivities = [];
    $form[0].reset();
    $block.find('#bys-multiselect-activity-dropdown .bys-multiselect__checkbox').prop('checked', false);
    $block.find('#bys-multiselect-activity .bys-multiselect__option').removeAttr('aria-selected');
    syncActivityPills();
    updateDateRangeText();
    loadActivity(1);
  });

  /**
   * Initialize pills and date range text on page load
   */
  syncActivityPills();
  updateDateRangeText();

  /**
   * Listen for tab activation event from user-tabs block
   * Only fetch activity data when the user-activity tab is activated
   */
  jQuery(window).on('bysUserTabActivated', function (_event, tabName) {
    if (tabName === 'user-activity') {
      loadActivity(1);
    }
  });
});
