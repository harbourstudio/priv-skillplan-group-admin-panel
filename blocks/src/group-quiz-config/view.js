import { api, endpoints } from '../_shared/api-client.js';

const QUIZ_PAGE_SIZE = 3;

let currentGroupId = null;
let memberCount    = 0;
let showingAllQuizzes = false;
let quizAccessDatesMap = {}; // quiz_id -> { start, end } (stored in UTC)
let changedAccessDates = new Set(); // track which quizzes have been modified
let tzData = { timezone: 'UTC', utc_offset_hours: 0 };

// Initialize timezone data from server
function initTimezoneData() {
    const tzDataEl = document.getElementById('bys-quiz-config-tz-data');
    tzData = tzDataEl ? JSON.parse(tzDataEl.textContent) : { timezone: 'UTC', utc_offset_hours: 0 };
}

// Convert UTC ISO 8601 string to browser-local datetime-local value for display
function convertFromUTC(utcDatetimeValue) {
    if (!utcDatetimeValue) return '';

    // Parse ISO 8601 UTC datetime (e.g., "2025-09-01T13:00:00Z")
    const dt = new Date(utcDatetimeValue);
    if (isNaN(dt.getTime())) return '';

    // Convert to browser-local time
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Convert browser-local datetime-local value to UTC ISO 8601 string for storage
function convertToUTC(localDatetimeValue) {
    if (!localDatetimeValue) return '';

    // Parse the datetime-local value (format: YYYY-MM-DDTHH:mm)
    const [datePart, timePart] = localDatetimeValue.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    // Create a Date in browser-local time
    const localDate = new Date(year, month - 1, day, hours, minutes, 0);

    // Convert to ISO 8601 UTC string
    return localDate.toISOString();
}

function courseTitle(course) {
    return typeof course.title === 'string'
        ? course.title
        : course.title?.rendered || 'Untitled';
}

function buildQuizRow(quiz, courseName, stat) {
    const completed   = stat.attempted_users || 0;
    const outstanding = Math.max(0, memberCount - completed);
    const accessDates = quizAccessDatesMap[quiz.step_id] || {};

    // Convert stored UTC times to browser local for display in inputs
    const startValue = convertFromUTC(accessDates.start || '');
    const endValue = convertFromUTC(accessDates.end || '');

    return jQuery(`
        <div class="quiz-config__item" data-quiz-id="${quiz.step_id}">
            <div class="quiz-config__course-header">
                <span class="quiz-config__quiz-name">${jQuery('<span>').text(quiz.step_title).html()}</span>
                <span class="quiz-config__course-name">${jQuery('<span>').text(courseName).html()}</span>
            </div>

            <div class="quiz-config-date-row">
                <div class="quiz-config-date-field">
                    <i class="fa-solid fa-play quiz-config-date-icon" aria-hidden="true"></i>
                    <input type="datetime-local" class="quiz-config-datetime quiz-config-datetime--start" aria-label="Start date" value="${startValue}" />
                </div>
                <div class="quiz-config-date-field">
                    <i class="fa-solid fa-flag quiz-config-date-icon" aria-hidden="true"></i>
                    <input type="datetime-local" class="quiz-config-datetime quiz-config-datetime--end" aria-label="End date" value="${endValue}" />
                </div>
            </div>

            <div class="quiz-config__badges">
                <button
                    class="quiz-config__badge quiz-config__badge--completed btn-unstyled"
                    type="button"
                    data-opens-modal="#quiz-attempts-modal"
                    data-quiz-id="${quiz.step_id}"
                    data-quiz-name="${jQuery('<span>').text(quiz.step_title).html()}"
                >
                    <span class="quiz-config__badge-count">${completed}</span> Completed
                </button>
                <button
                    class="quiz-config__badge quiz-config__badge--pending btn-unstyled"
                    type="button"
                    data-opens-modal="#quiz-attempts-modal"
                    data-quiz-id="${quiz.step_id}"
                    data-quiz-name="${jQuery('<span>').text(quiz.step_title).html()}"
                >
                    <span class="quiz-config__badge-count">${outstanding}</span> Outstanding
                </button>
            </div>
        </div>
    `);
}

function applyQuizLimit($block) {
    const $showMore = $block.find('.quiz-config__show-more');
    const $items    = $block.find('.quiz-config__item');
    const total     = $items.length;

    if (total <= QUIZ_PAGE_SIZE) {
        $showMore.hide();
        return;
    }

    $items.each(function (i) {
        jQuery(this).toggle(showingAllQuizzes || i < QUIZ_PAGE_SIZE);
    });

    const hidden = total - QUIZ_PAGE_SIZE;
    $showMore
        .text(showingAllQuizzes ? 'Show Less' : `Show ${hidden} More`)
        .show();
}

async function loadQuizData($block, groupId, courses) {
    const $skeleton = $block.find('.quiz-config__skeleton');
    const $list     = $block.find('.quiz-config__list');
    const $empty    = $block.find('.quiz-config__empty');
    const $showMore = $block.find('.quiz-config__show-more');

    changedAccessDates.clear();
    $skeleton.show();
    $list.empty();
    $empty.hide();
    $showMore.hide();

    try {
        const courseQuizData = await Promise.all(
            courses.map(async (course) => {
                try {
                    const steps = await api.get(endpoints.courseQuizSteps(course.id));
                    return { course, steps: Array.isArray(steps) ? steps : [] };
                } catch {
                    return { course, steps: [] };
                }
            })
        );

        const allQuizIds = courseQuizData.flatMap(({ steps }) => steps.map((s) => s.step_id));

        if (!allQuizIds.length) {
            $skeleton.hide();
            $empty.text('No quizzes found for this group\'s courses.').show();
            return;
        }

        // Fetch quiz accessDates and submission stats in parallel
        const [accessDates, stats] = await Promise.all([
            api.get(endpoints.groupQuizAccess(groupId)).catch(() => ({})),
            api.get(endpoints.groupQuizSubmissionStats(groupId, allQuizIds))
        ]);

        quizAccessDatesMap = accessDates || {};
        const statsMap = {};
        (Array.isArray(stats) ? stats : []).forEach((s) => { statsMap[s.quiz_id] = s; });

        $skeleton.hide();

        courseQuizData.forEach(({ course, steps }) => {
            if (!steps.length) return;
            const title    = courseTitle(course);
            const $section = jQuery('<div class="quiz-config__course-section"></div>');
            steps.forEach((quiz) => {
                $section.append(buildQuizRow(quiz, title, statsMap[quiz.step_id] || {}));
            });
            $list.append($section);
        });

        if (!$list.children().length) {
            $empty.text('No quizzes found for this group\'s courses.').show();
        } else {
            applyQuizLimit($block);
        }
    } catch (err) {
        console.error('[quiz-config] Failed to load quiz data', err);
        $skeleton.hide();
        $empty.text('Failed to load quiz data.').show();
    }
}

jQuery(document).ready(($) => {
    // Initialize timezone data first
    initTimezoneData();

    const $block = $('.wp-block-bys-groups-group-quiz-config').first();
    if (!$block.length) return;

    const $saveBtn = $block.find('.quiz-config__actions button[type="button"]');

    // Track datetime changes
    $block.on('change', '.quiz-config-datetime', function() {
        const $item = $(this).closest('.quiz-config__item');
        const quizId = $item.data('quizId');
        if (quizId) {
            changedAccessDates.add(quizId);
            $saveBtn.prop('disabled', false);
        }
    });

    // Save button handler
    $saveBtn.on('click', async function() {
        if (changedAccessDates.size === 0 || !currentGroupId) return;

        $saveBtn.prop('disabled', true).text('Saving...');

        try {
            // Collect all changes and send in parallel
            const saveRequests = Array.from(changedAccessDates).map((quizId) => {
                const $item = $block.find(`.quiz-config__item[data-quiz-id="${quizId}"]`);
                const startValue = $item.find('.quiz-config-datetime--start').val() || '';
                const endValue = $item.find('.quiz-config-datetime--end').val() || '';

                // Convert browser-local to UTC before sending and caching
                const start = convertToUTC(startValue);
                const end = convertToUTC(endValue);

                // Update local cache
                quizAccessDatesMap[quizId] = { start, end };

                // Send to server
                return api.post(
                    endpoints.groupQuizAccess(currentGroupId),
                    { quiz_id: quizId, start, end }
                );
            });

            await Promise.all(saveRequests);

            changedAccessDates.clear();

            // Invalidate cached quiz-related data since quiz configuration changed
            api.invalidate('quiz-submission-stats');
            api.invalidate('quiz-attempts');

            $saveBtn.prop('disabled', true).text('Changes saved!');
            setTimeout(() => {
                $saveBtn.text('Save Changes');
            }, 2000);
        } catch (err) {
            console.error('[quiz-config] Failed to save changes:', err);
            $saveBtn.prop('disabled', false).text('Save Changes');
            alert('Failed to save changes. Please try again.');
        }
    });

    $block.on('click', '.quiz-config__show-more', function () {
        showingAllQuizzes = !showingAllQuizzes;
        applyQuizLimit($block);
    });

    $block.on('click', '[data-opens-modal]', function () {
        const targetId = $(this).data('opensModal');
        const quizId   = $(this).data('quizId');
        const quizName = $(this).data('quizName');
        const $modal   = $(targetId);
        if (!$modal.length) return;

        $modal.removeClass('hidden');
        $('html').css('overflow', 'hidden');
        $(document).trigger('quiz:open', { quizId, quizName });
    });

    $(document).on('bys:groupSelected', (_, { groupId, baseUsersStats, courses }) => {
        currentGroupId = groupId;
        memberCount    = baseUsersStats?.total_members || 0;
        loadQuizData($block, groupId, Array.isArray(courses) ? courses : []);
    });

    // Refresh data when page becomes visible (user returns from another tab/window)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && currentGroupId && memberCount > 0) {
            api.invalidate('quiz-steps');
            api.invalidate('quiz-submission-stats');
            api.invalidate('quiz-attempts');
            loadQuizData($block, currentGroupId, window.bysGroupData?.courses || []);
        }
    });

    if (window.bysGroupData?.courses) {
        currentGroupId = window.bysGroupData.groupId;
        memberCount    = window.bysGroupData.baseUsersStats?.total_members || 0;
        loadQuizData($block, currentGroupId, window.bysGroupData.courses);
    }
});
