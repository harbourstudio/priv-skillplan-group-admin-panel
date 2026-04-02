import { api, endpoints } from '../_shared/api-client.js';
import { LOADING } from '../_shared/loading.js';
import { formatScore, formatDate, formatDateTime } from '../_shared/helpers.js';
import { createTooltip, destroyTooltip } from '../_shared/tooltip.js';

jQuery(document).ready(($) => {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get('group_id');
    const userId = params.get('user_id');

    if (!groupId || !userId) {
        console.error('[user-quiz-details] Missing group_id or user_id URL parameter');
        return;
    }

    const $block = $('.wp-block-bys-groups-user-quiz-details').first();
    const $filterForm = $block.find('.filters__form');
    const $quizzesContainer = $block.find('#quizzes-container');
    const $flatTable = $block.find('#quizzes-table-flat');
    const $groupedContainer = $block.find('#quizzes-grouped');
    const $flatTableBody = $flatTable.find('tbody');
    const tableTemplate = $block.find('#user-quiz-details_template-row')[0];
    const courseTableTemplate = $block.find('#user-quiz-details_template-course-table')[0];

    let dataLoaded = false;
    let allQuizzes = [];
    let groupByCourse = false;

    // Handle group by course toggle
    $block.find('.group-by-course-toggle').on('change', function() {
        groupByCourse = $(this).is(':checked');
        renderQuizzes(allQuizzes, groupByCourse);
    });

    // Handle score_sort radio button change
    const updateColumnVisibility = (sortMode) => {
        const isHighest = sortMode === 'highest';

        $flatTable.find('.col_score_highest, .col_result_highest').toggle(isHighest);
        $flatTableBody.find('.cell_score_highest, .cell_result_highest').toggle(isHighest);
        $flatTable.find('.col_score_latest, .col_result_latest').toggle(!isHighest);
        $flatTableBody.find('.cell_score_latest, .cell_result_latest').toggle(!isHighest);

        // Also update grouped tables
        $groupedContainer.find('.col_score_highest, .col_result_highest').toggle(isHighest);
        $groupedContainer.find('.cell_score_highest, .cell_result_highest').toggle(isHighest);
        $groupedContainer.find('.col_score_latest, .col_result_latest').toggle(!isHighest);
        $groupedContainer.find('.cell_score_latest, .cell_result_latest').toggle(!isHighest);
    };

    $block.find('input[name="score_sort"]').on('change', function() {
        updateColumnVisibility($(this).val());
    });
    updateColumnVisibility('highest');

    const loadQuizData = async () => {
        if (dataLoaded) return;
        dataLoaded = true;

        const loadingCells = Array(6).fill(`<td>${LOADING}</td>`).join('');
        $flatTableBody.html(`<tr>${loadingCells}</tr>`);


        try {
            const courseIds = (window.bysGroupsCache?.courses || []).map(c => c.id).join(',');
            const url = endpoints.userQuizProgress(userId) + `?group_id=${groupId}` + (courseIds ? `&course_ids=${courseIds}` : '');
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

            renderQuizzes(quizzes, groupByCourse);

            $filterForm.on('submit', function(e) {
                e.preventDefault();
                applyFilters();
            });

            $filterForm.find('.filters__reset').on('click', function() {
                $filterForm[0].reset();
                groupByCourse = false;
                $block.find('.group-by-course-toggle').prop('checked', false);
                renderQuizzes(allQuizzes, groupByCourse);
            });
        } catch (err) {
            console.error('[user-quiz-details] Failed to fetch quiz progress:', err);
            $flatTableBody.html('<tr><td colspan="8">Failed to load quiz data.</td></tr>');
        }
    };

    const applyFilters = () => {
        const keyword = $filterForm.find('#filter-keyword').val().toLowerCase();
        const status = $filterForm.find('#filter-status').val();
        const dateRange = $filterForm.find('#filter-date_range').val();

        const filtered = allQuizzes.filter((quiz) => {
            if (keyword) {
                const matchesKeyword =
                    quiz.title.toLowerCase().includes(keyword) ||
                    quiz.parent_course_title.toLowerCase().includes(keyword);
                if (!matchesKeyword) return false;
            }

            if (status) {
                if (status === 'pass' && !quiz.pass_latest) return false;
                if (status === 'fail' && quiz.pass_latest) return false;
                if (status === 'ungraded' && quiz.pass_latest !== null) return false;
            }

            if (dateRange) {
                const selectedDate = new Date(dateRange).getTime();
                const quizDate = new Date(quiz.latest_timestamp).getTime();
                if (quizDate < selectedDate) return false;
            }

            return true;
        });

        renderQuizzes(filtered, groupByCourse);
    };

    const renderQuizzes = (quizzes, grouped = false) => {
        if (quizzes.length === 0) {
            $flatTableBody.html('<tr><td colspan="8">No quizzes match your filters.</td></tr>');
            $groupedContainer.html('');
            return;
        }

        if (grouped) {
            // Group by course and render separate tables
            $flatTable.hide();
            $groupedContainer.show().empty();

            const groupedQuizzes = {};
            quizzes.forEach(quiz => {
                const courseTitle = quiz.parent_course_title || 'Uncategorized';
                if (!groupedQuizzes[courseTitle]) groupedQuizzes[courseTitle] = [];
                groupedQuizzes[courseTitle].push(quiz);
            });

            Object.entries(groupedQuizzes).forEach(([courseTitle, courseQuizzes]) => {
                const courseTableNode = courseTableTemplate.content.cloneNode(true);
                const $courseGroup = $(courseTableNode);
                const $courseTbody = $courseGroup.find('.course-group__tbody');

                $courseGroup.find('.course-group__title').html(courseTitle);

                courseQuizzes.forEach(quiz => {
                    renderQuizRow(quiz, $courseTbody, tableTemplate);
                });

                $groupedContainer.append($courseGroup);
            });

            // Bind tooltips in grouped view
            $groupedContainer.on('mouseenter', '[data-tooltip]', function() {
                createTooltip($(this), $(this).attr('data-tooltip'));
            }).on('mouseleave', '[data-tooltip]', destroyTooltip);
        } else {
            // Flat view: single table
            $flatTable.show();
            $groupedContainer.hide().empty();
            $flatTableBody.empty();

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
        $lastActivity.text(formatDate(quiz.latest_timestamp)).attr('data-tooltip', quiz.latest_timestamp_gmt ? formatDateTime(quiz.latest_timestamp_gmt) : '—');
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
            $(window).trigger('bysQuizAttemptsOpen', [{
                userId: userId,
                quizId: quiz.id,
                quizTitle: quiz.title,
                parentCourse: quiz.parent_course_title
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
