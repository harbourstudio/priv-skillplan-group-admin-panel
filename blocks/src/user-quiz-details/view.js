import { api, endpoints } from '../_shared/api-client.js';
import { LOADING } from '../_shared/loading.js';
import { formatScore, formatDate, formatDateTime } from '../_shared/helpers.js';
import { createTooltip, destroyTooltip } from '../_shared/tooltip.js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

jQuery(document).ready(($) => {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get('group_id');
    const userId = params.get('user_id');

    if (!userId) {
        console.error('[user-quiz-details] Missing user_id URL parameter');
        return;
    }

    const $block = $('.wp-block-bys-groups-user-quiz-details').first();
    const $filterForm = $block.find('.filters__form');
    const $flatTable = $block.find('#quizzes-table-flat');
    const $groupedContainer = $block.find('#quizzes-grouped');
    const $flatTableBody = $flatTable.find('tbody');
    const tableTemplate = $block.find('#user-quiz-details_template-row')[0];
    const courseTableTemplate = $block.find('#user-quiz-details_template-course-table')[0];
    const $showMore = $block.find('.bys-show-more');

    let dataLoaded = false;
    let allQuizzes = [];
    let groupByCourse = false;
    let currentPage = 1;
    let totalPages = 0;
    let isLoadingMore = false;
    const PER_PAGE = 25;
    let coursePages = {}; // Track pagination per course in grouped view

    // Helper to escape HTML in data attributes
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // ── Flatpickr-backed date range filter ─────────────────────────────────
    // dateFormat stays ISO (Y-m-d) so the existing string-compare + Date()
    // parsing paths in renderDisplayedQuizzes() keep working unchanged.
    const $dateFrom = $block.find('#filter-date-from');
    const $dateTo   = $block.find('#filter-date-to');

    const FP_FILTER = {
        dateFormat:    'Y-m-d',
        altInput:      true,
        altInputClass: 'flatpickr-input filters__datetime',
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

    const syncClearButton = ($input, hasValue) => {
        const $btn = $input.parent().find('.filters__date-clear');
        if (hasValue) $btn.removeAttr('hidden');
        else          $btn.attr('hidden', '');
    };

    const updateDateRangeText = () => {
        const dateFrom = $dateFrom.val();
        const dateTo   = $dateTo.val();
        if (!dateFrom && !dateTo)    $block.find('#date-range-text').text('Select a date range');
        else if (dateFrom && dateTo) $block.find('#date-range-text').text(`${dateFrom} - ${dateTo}`);
        else if (dateFrom)           $block.find('#date-range-text').text(`From ${dateFrom}`);
        else                         $block.find('#date-range-text').text(`Until ${dateTo}`);
    };

    const fpFrom = flatpickr($dateFrom[0], {
        ...FP_FILTER,
        placeholder: 'Pick a date',
        onChange(_, dateStr) {
            fpTo.set('minDate', dateStr || null);
            syncClearButton($dateFrom, Boolean(dateStr));
            updateDateRangeText();
        },
    });
    const fpTo = flatpickr($dateTo[0], {
        ...FP_FILTER,
        placeholder: 'Pick a date',
        onChange(_, dateStr) {
            fpFrom.set('maxDate', dateStr || null);
            syncClearButton($dateTo, Boolean(dateStr));
            updateDateRangeText();
        },
    });

    const fpFor = new Map([
        [$dateFrom[0].id, fpFrom],
        [$dateTo[0].id,   fpTo],
    ]);

    // Clear-button handler — delegated so it survives any DOM rewrites.
    $block.on('click', '.filters__date-clear', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const fp = fpFor.get($(this).data('target'));
        if (fp) fp.clear(); // triggers onChange → syncClearButton + updateDateRangeText
    });

    // Wrap click → open picker. flatpickr's auto click-open can fail when the
    // original input is initialised inside a display:none parent (our dropdown
    // starts hidden), so we wire it explicitly.
    $block.on('click', '.filters__date-field__input', function (e) {
        if (e.target.closest('.filters__date-clear')) return;
        const inputId = $(this).find('input.filters__datetime').attr('id');
        const fp = fpFor.get(inputId);
        if (fp) fp.open();
    });

    const toggleDateRangeDropdown = () => {
        $block.find('#date-range-dropdown').toggleClass('hidden');
    };

    // Handle date range dropdown toggle
    $block.find('#date-range-trigger').on('click', function(e) {
        e.preventDefault();
        toggleDateRangeDropdown();
    });

    // Close date range dropdown when clicking outside.
    // Guard against clicks inside flatpickr's body-level calendar.
    $(document).on('click', function(e) {
        if ($(e.target).closest('.flatpickr-calendar').length) return;
        const $dateRangeField = $block.find('.filters__field--date-range');
        const dateRangeElement = $dateRangeField[0];
        if (dateRangeElement && !dateRangeElement.contains(e.target)) {
            $block.find('#date-range-dropdown').addClass('hidden');
        }
    });

    // Handle filter form submission
    $filterForm.on('submit', function(e) {
        e.preventDefault();
        currentPage = 1;
        coursePages = {}; // Reset per-course pagination
        renderDisplayedQuizzes();
    });

    // Handle filter form reset
    $filterForm.on('reset', function() {
        setTimeout(() => {
            // Native form reset clears the hidden inputs but leaves Flatpickr's
            // internal state — explicit clear() triggers onChange so the clear
            // buttons hide and the trigger text updates.
            fpFrom.clear();
            fpTo.clear();
            currentPage = 1;
            coursePages = {}; // Reset per-course pagination
            renderDisplayedQuizzes();
        }, 0);
    });

    // Handle show more button click
    $showMore.on('click', function(e) {
        e.preventDefault();
        if (!isLoadingMore && currentPage < totalPages) {
            isLoadingMore = true;
            currentPage++;
            renderDisplayedQuizzes();
            isLoadingMore = false;
        }
    });

    // Handle group by course toggle
    $block.find('.group-by-course-toggle').on('change', function() {
        groupByCourse = $(this).is(':checked');
        currentPage = 1;
        coursePages = {}; // Reset per-course pagination when toggling view
        renderDisplayedQuizzes();
    });

    // Handle score_sort radio button change
    const updateColumnVisibility = (sortMode) => {
        const isHighest = sortMode === 'highest';

        $flatTable.find('.col_score_highest, .col_result_highest').toggle(isHighest);
        $flatTableBody.find('.cell_score_highest, .cell_result_highest').toggle(isHighest);
        $flatTable.find('.col_score_latest, .col_result_latest').toggle(!isHighest);
        $flatTableBody.find('.cell_score_latest, .cell_result_latest').toggle(!isHighest);

        $groupedContainer.find('.col_score_highest, .col_result_highest').toggle(isHighest);
        $groupedContainer.find('.cell_score_highest, .cell_result_highest').toggle(isHighest);
        $groupedContainer.find('.col_score_latest, .col_result_latest').toggle(!isHighest);
        $groupedContainer.find('.cell_score_latest, .cell_result_latest').toggle(!isHighest);
    };

    $block.find('input[name="score_sort"]').on('change', function() {
        updateColumnVisibility($(this).val());
    });
    updateColumnVisibility('highest');

    // Update show more button visibility (flat view only)
    const updateShowMoreButton = () => {
        if (groupByCourse) {
            // In grouped view, show more buttons are per-course
            $showMore.addClass('hidden');
            return;
        }
        const displayedCount = $flatTableBody.find('tr').length;
        if (displayedCount >= applyFiltersToQuizzes().length) {
            $showMore.addClass('hidden');
        } else {
            $showMore.removeClass('hidden');
        }
    };

    // Render paginated quizzes (respects current page and filters)
    const renderDisplayedQuizzes = () => {
        const filtered = applyFiltersToQuizzes();
        if (groupByCourse) {
            // Grouped view: paginate per course
            renderQuizzes(filtered, true);
        } else {
            // Flat view: global pagination
            const start = 0;
            const end = currentPage * PER_PAGE;
            const paginated = filtered.slice(start, end);
            renderQuizzes(paginated, false);
            updateShowMoreButton();
        }
    };

    // Apply all active filters to quiz list (keyword, status, date range)
    const applyFiltersToQuizzes = () => {
        if (!allQuizzes.length) return [];

        return allQuizzes.filter((quiz) => {
            const keyword = $block.find('#filter-keyword').val().toLowerCase();
            if (keyword) {
                const matchesKeyword =
                    quiz.title.toLowerCase().includes(keyword) ||
                    quiz.parent_course_title.toLowerCase().includes(keyword);
                if (!matchesKeyword) return false;
            }

            const status = $block.find('#filter-status').val();
            if (status) {
                if (status === 'pass' && !quiz.pass_latest) return false;
                if (status === 'fail' && quiz.pass_latest) return false;
                if (status === 'ungraded' && quiz.pass_latest !== null) return false;
            }

            // Date range filter on latest_timestamp (last activity date)
            const dateFrom = $block.find('#filter-date-from').val();
            const dateTo = $block.find('#filter-date-to').val();
            if (dateFrom || dateTo) {
                const quizDate = new Date(quiz.latest_timestamp);
                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    if (quizDate < fromDate) return false;
                }
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    // Include full day by extending to end of day
                    toDate.setHours(23, 59, 59, 999);
                    if (quizDate > toDate) return false;
                }
            }

            return true;
        });
    };

    const loadQuizData = async () => {
        if (dataLoaded) return;
        dataLoaded = true;

        const loadingCells = Array(6).fill(`<td>${LOADING}</td>`).join('');
        $flatTableBody.html(`<tr>${loadingCells}</tr>`);

        try {
            const url = endpoints.userQuizProgress(userId);
            const quizzes = await api.get(url);

            if (!Array.isArray(quizzes) || quizzes.length === 0) {
                $flatTableBody.html('<tr><td colspan="8">No quiz attempts found.</td></tr>');
                return;
            }

            allQuizzes = quizzes;

            // Count passed quizzes for user-stats coordination
            const passedCount = quizzes.filter(q => q.pass_highest === true).length;
            window.bysGroupsCache ??= {};
            window.bysGroupsCache.quizzesPassed = passedCount;
            jQuery(window).trigger('bys:statsUpdated', [{ key: 'total_quizzes_passed', value: passedCount }]);

            currentPage = 1;
            totalPages = Math.ceil(allQuizzes.length / PER_PAGE);
            renderDisplayedQuizzes();
        } catch (err) {
            console.error('[user-quiz-details] Failed to fetch quiz progress:', err);
            $flatTableBody.html('<tr><td colspan="8">Failed to load quiz data.</td></tr>');
        }
    };

    const renderQuizzes = (quizzes, grouped = false) => {
        if (quizzes.length === 0) {
            $flatTableBody.html('<tr><td colspan="8">No quizzes match your filters.</td></tr>');
            $groupedContainer.html('');
            return;
        }

        if (grouped) {
            // Group by course and render separate tables with per-course pagination
            $flatTable.hide();
            $groupedContainer.show().empty();

            const groupedQuizzes = {};
            quizzes.forEach(quiz => {
                const courseTitle = quiz.parent_course_title || 'Uncategorized';
                if (!groupedQuizzes[courseTitle]) groupedQuizzes[courseTitle] = [];
                groupedQuizzes[courseTitle].push(quiz);
            });

            Object.entries(groupedQuizzes).forEach(([courseTitle, courseQuizzes]) => {
                // Initialize course pagination if needed
                if (!coursePages[courseTitle]) {
                    coursePages[courseTitle] = 1;
                }

                const coursePageNum = coursePages[courseTitle];
                const courseStart = 0;
                const courseEnd = coursePageNum * PER_PAGE;
                const coursePaginated = courseQuizzes.slice(courseStart, courseEnd);

                const courseTableNode = courseTableTemplate.content.cloneNode(true);
                const $courseGroup = $(courseTableNode);
                const $courseTbody = $courseGroup.find('.course-group__tbody');

                $courseGroup.find('.course-group__title').html(courseTitle);

                coursePaginated.forEach(quiz => {
                    renderQuizRow(quiz, $courseTbody, tableTemplate);
                });

                // Add show more button for this course if there are more quizzes
                if (coursePaginated.length < courseQuizzes.length) {
                    const $showMoreBtn = $('<button class="bys-show-more bys-course-show-more btn-unstyled" type="button" data-course-title="' + escapeHtml(courseTitle) + '">' + 'Show More Results' + '</button>');
                    $courseGroup.append($showMoreBtn);
                }

                $groupedContainer.append($courseGroup);
            });

            // Bind per-course show more button click handlers
            $groupedContainer.on('click', '.bys-course-show-more', function(e) {
                e.preventDefault();
                const courseTitle = $(this).data('courseTitle');
                if (coursePages[courseTitle] !== undefined) {
                    coursePages[courseTitle]++;
                    renderDisplayedQuizzes();
                }
            });

            // Bind tooltips in grouped view
            $groupedContainer.on('mouseenter', '[data-tooltip]', function() {
                createTooltip($(this), $(this).attr('data-tooltip'));
            }).on('mouseleave', '[data-tooltip]', destroyTooltip);
        } else {
            // Flat view: single table
            $flatTable.show();
            $groupedContainer.hide().empty();

            // Only clear table body if starting fresh pagination
            if (currentPage === 1) {
                $flatTableBody.empty();
            }

            quizzes.forEach(quiz => {
                renderQuizRow(quiz, $flatTableBody, tableTemplate);
            });

            // Bind tooltips in flat view
            $flatTableBody.on('mouseenter', '[data-tooltip]', function() {
                createTooltip($(this), $(this).attr('data-tooltip'));
            }).on('mouseleave', '[data-tooltip]', destroyTooltip);
        }
    };

    const renderQuizRow = (quiz, $tbody, template) => {
        const rowNode = template.content.cloneNode(true);
        const $row = $(rowNode);
        const $tr = $row.find('tr');

        $tr.attr('data-quiz-id', quiz.id).attr('data-course-id', quiz.parent_course_id);

        $row.find('.cell_quiz_title').html(quiz.title);
        const $lastActivity = $row.find('.cell_last_activity');
        $lastActivity.text(formatDate(quiz.latest_timestamp)).attr('data-tooltip', quiz.latest_timestamp ? formatDateTime(quiz.latest_timestamp) : '—');
        $row.find('.cell_parent_course').html(quiz.parent_course_title);
        $row.find('.attemps-count').text(quiz.total_attempts);

        $row.find('.cell_score_highest').text(formatScore(quiz.percent_highest, quiz.points_scored_highest, quiz.points_total_highest));
        $row.find('.cell_score_latest').text(formatScore(quiz.percent_latest, quiz.points_scored_latest, quiz.points_total_latest));

        const $resultHighest = $row.find('.cell_result_highest .status-badge');
        renderStatusBadge($resultHighest, quiz.pass_highest);

        const $resultLatest = $row.find('.cell_result_latest .status-badge');
        renderStatusBadge($resultLatest, quiz.pass_latest);

        // Clickable attempts cell
        const $attempsCell = $row.find('.cell_total_attempts');
        $attempsCell.on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const cachedCourse = (window.bysGroupsCache?.courses || []).find(c => c.id === quiz.parent_course_id);
            $(window).trigger('bysQuizAttemptsOpen', [{
                groupId: groupId,
                userId: userId,
                quizId: quiz.id,
                quizTitle: quiz.title,
                parentCourse: cachedCourse?.shortname || quiz.parent_course_title
            }]);
        });

        $attempsCell.on('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                $attempsCell.trigger('click');
            }
        });

        $tbody.append($row);
    };

    jQuery(window).on('bysUserTabActivated', function(_event, tabName) {
        if (tabName === 'user-quiz-details') {
            loadQuizData();
        }
    });
});

function renderStatusBadge($badge, pass) {
    if (pass) {
        $badge.addClass('status-badge--pass').text('Pass');
    } else {
        $badge.addClass('status-badge--fail').text('Fail');
    }
}
