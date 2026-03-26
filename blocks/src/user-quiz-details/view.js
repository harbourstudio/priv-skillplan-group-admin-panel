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
    const $table = $block.find('table');
    const tableTemplate = $block.find('#user-quiz-details_template-row')[0];

    let dataLoaded = false;

    // Handle score_sort radio button change
    const updateColumnVisibility = (sortMode) => {
        const isHighest = sortMode === 'highest';

        // Show/hide highest columns
        $table.find('.col_score_highest, .col_result_highest').toggle(isHighest);
        $tableBody.find('.cell_score_highest, .cell_result_highest').toggle(isHighest);

        // Show/hide latest columns
        $table.find('.col_score_latest, .col_result_latest').toggle(!isHighest);
        $tableBody.find('.cell_score_latest, .cell_result_latest').toggle(!isHighest);
    };

    // Bind change event to radio buttons
    $block.find('input[name="score_sort"]').on('change', function() {
        updateColumnVisibility($(this).val());
    });

    // Initialize with default 'highest' mode
    updateColumnVisibility('highest');

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

            $row.find('.cell_score_highest').text(formatScore(quiz.percent_highest, quiz.points_scored_highest, quiz.points_total_highest));
            $row.find('.cell_score_latest').text(formatScore(quiz.percent_latest, quiz.points_scored_latest, quiz.points_total_latest));

            // Render result badges
            const $resultHighest = $row.find('.cell_result_highest .status-badge');
            renderStatusBadge($resultHighest, quiz.pass_highest);

            const $resultLatest = $row.find('.cell_result_latest .status-badge');
            renderStatusBadge($resultLatest, quiz.pass_latest);

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

function formatScore(percent, pointsScored, pointsTotal) {
  if (percent === null || percent === undefined) return '—';

  if (pointsScored === null || pointsTotal === null) return `${percent}%`;
  
  return `${pointsScored}/${pointsTotal} (${percent}%)`;
}


function renderStatusBadge($badge, pass) {
    if (pass) {
        $badge.addClass('status-badge--pass').text('Pass');
    } else {
        $badge.addClass('status-badge--fail').text('Fail');
    }
}
