import { api, endpoints } from '../_shared/api-client.js';

const QUIZ_PAGE_SIZE = 3;

let currentGroupId = null;
let memberCount    = 0;
let showingAllQuizzes = false;

function courseTitle(course) {
    return typeof course.title === 'string'
        ? course.title
        : course.title?.rendered || 'Untitled';
}

function buildQuizRow(quiz, courseName, stat) {
    const completed   = stat.attempted_users || 0;
    const outstanding = Math.max(0, memberCount - completed);

    return jQuery(`
        <div class="quiz-config__item" data-quiz-id="${quiz.step_id}">
            <div class="quiz-config__course-header">
                <span class="quiz-config__quiz-name">${jQuery('<span>').text(quiz.step_title).html()}</span>
                <span class="quiz-config__course-name">${jQuery('<span>').text(courseName).html()}</span>
            </div>

            <div class="quiz-config-date-row">
                <div class="quiz-config-date-field">
                    <i class="fa-solid fa-play quiz-config-date-icon" aria-hidden="true"></i>
                    <input type="datetime-local" class="quiz-config-datetime" aria-label="Start date" />
                </div>
                <div class="quiz-config-date-field">
                    <i class="fa-solid fa-flag quiz-config-date-icon" aria-hidden="true"></i>
                    <input type="datetime-local" class="quiz-config-datetime" aria-label="End date" />
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

    showingAllQuizzes = false;
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

        const stats    = await api.get(endpoints.groupQuizSubmissionStats(groupId, allQuizIds));
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
    const $block = $('.wp-block-bys-groups-group-quiz-config').first();
    if (!$block.length) return;

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

    if (window.bysGroupData?.courses) {
        currentGroupId = window.bysGroupData.groupId;
        memberCount    = window.bysGroupData.baseUsersStats?.total_members || 0;
        loadQuizData($block, currentGroupId, window.bysGroupData.courses);
    }
});
