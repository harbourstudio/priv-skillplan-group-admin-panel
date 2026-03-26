import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get('group_id');
    const userId = params.get('user_id');

    if (!groupId || !userId) {
        console.error('[user-quiz-details] Missing group_id or user_id URL parameter');
        return;
    }

    const $block = $('.wp-block-bys-groups-user-quiz-details').first(); // only one instance of the block
    const $tableBody = $block.find('table').find('tbody');
    const tableTemplate = $block.find('#user-quiz-details_template-row')[0];

    let dataLoaded = false;

    // Fetch and render quiz data
    const loadQuizData = async () => {
        if (dataLoaded) return; // Already loaded

        dataLoaded = true;
        $tableBody.html('<tr><td>Loading...</td></tr>');

        try {
        // Fetch quiz progress from custom endpoint
        // Pass course IDs from cache to avoid redundant server-side fetch
        const courseIds = (window.bysGroupsCache?.courses || []).map(c => c.id).join(',');
        const url = endpoints.userQuizProgress(userId) + `?group_id=${groupId}` + (courseIds ? `&course_ids=${courseIds}` : '');
        const quizzes = await api.get(url);

        if (!Array.isArray(quizzes) || quizzes.length === 0) {
            $tableBody.html('<tr><td>No quiz attempts found.</td></tr>');
            return;
        }

        // Clear the tbody and render table rows
        $tableBody.empty();

        quizzes.forEach((quiz) => {
            const rowNode = tableTemplate.content.cloneNode(true);
            const $row = $(rowNode);

            // Set data-quiz-id attribute on the row element
            $row.find('tr').attr('data-quiz-id', quiz.id);

            // Populate cells
            $row.find('.cell_quiz_title').html(quiz.title);
            $row.find('.cell_last_activity').text(formatDate(quiz.latest_timestamp));
            $row.find('.cell_parent_course').html(quiz.parent_course_title);

            // Populate attempts count and attach modal trigger
            $row.find('.attemps-count').text(quiz.total_attempts);

            $row.find('.cell_score_highest').text(formatPercent(quiz.percent_highest));
            $row.find('.cell_score_latest').text(formatPercent(quiz.percent_latest));

            // Render result badges
            const $resultHighest = $row.find('.cell_result_highest .status-badge');
            renderResultBadge($resultHighest, quiz.pass_highest);

            const $resultLatest = $row.find('.cell_result_latest .status-badge');
            renderResultBadge($resultLatest, quiz.pass_latest);

            // Attach click handler to modal trigger (ellipsis button)
            const $button = $row.find('.modal-quiz-attempts__trigger');
            $button.attr('data-quiz-id', quiz.id);

            // Add event handler for user-quiz-attempts-modal block interaction
            $button.on('click', function(e) {
              e.preventDefault();

              // trigger jQuery event for user-quiz-attempts-modal block
              // the user-quiz-attempts-modal itself will fetch full attempt details and render
              $(window).trigger('bysQuizAttemptsOpen', [{
                userId: userId,
                quizId: quiz.id,
                quizTitle: quiz.title,
                parentCourse: quiz.parent_course_title
              }]);
            });

            $tableBody.append($row);
        });
        } catch (err) {
            console.error('[user-quiz-details] Failed to fetch quiz progress:', err);
            $tableBody.html('<tr><td>Failed to load quiz data.</td></tr>');
        }
    };

    // CRITICAL: Listen for jQuery tab activation event from user-tabs block
    jQuery(window).on('bysUserTabActivated', function(_event, tabName) {
        if (tabName === 'user-quiz-details') {
            loadQuizData();
        }
    });
});

function formatDate(timestamp) {
    if (!timestamp) return '—';

    try {
        return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
        });
    } catch {
        return '—';
    }
}

function formatPercent(percent) {
    if (percent === null || percent === undefined) return '—';
    return percent + '%';
}

function renderResultBadge($badge, pass) {
    if (pass) {
        $badge.addClass('status-badge--pass').text('Pass');
    } else {
        $badge.addClass('status-badge--fail').text('Fail');
    }
}
