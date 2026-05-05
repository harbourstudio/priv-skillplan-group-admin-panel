import { api, endpoints } from '../_shared/api-client.js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

const QUIZ_PAGE_SIZE = 3;

let currentGroupId     = null;
let memberCount        = 0;
let showingAllQuizzes  = false;
let quizAccessDatesMap = {};
let rowPickerMap       = {}; // quiz_id -> { startFp, endFp }

// Convert UTC ISO 8601 string to local datetime string (dateFormat for Flatpickr)
function convertFromUTC(utcDatetimeValue) {
    if (!utcDatetimeValue) return '';
    const dt = new Date(utcDatetimeValue);
    if (isNaN(dt.getTime())) return '';
    const Y  = dt.getFullYear();
    const m  = String(dt.getMonth() + 1).padStart(2, '0');
    const d  = String(dt.getDate()).padStart(2, '0');
    const H  = String(dt.getHours()).padStart(2, '0');
    const i  = String(dt.getMinutes()).padStart(2, '0');
    return `${Y}-${m}-${d}T${H}:${i}`;
}

// Convert Flatpickr dateFormat string (YYYY-MM-DDTHH:mm, local) to UTC ISO 8601
function convertToUTC(localDatetimeValue) {
    if (!localDatetimeValue) return '';
    const [datePart, timePart] = localDatetimeValue.split('T');
    const [year, month, day]   = datePart.split('-').map(Number);
    const [hours, minutes]     = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes).toISOString();
}

function courseTitle(course) {
    return typeof course.title === 'string'
        ? course.title
        : course.title?.rendered || 'Untitled';
}

const FP_SHARED = {
    enableTime:     true,
    dateFormat:     'Y-m-d\\TH:i',
    altInput:       true,
    altInputClass:  'flatpickr-input flatpickr-alt-input', // prevent inheriting original's classes
    altFormat:      'j M Y, H:i',
    time_24hr:      true,
    disableMobile:  true,
    allowInput:     false,
    onReady(_, __, fp) {
        fp.calendarContainer.classList.add('bys-fp');
        if (fp.altInput && fp.config.placeholder) {
            fp.altInput.placeholder = fp.config.placeholder;
        }
    },
};

function initRowPickers(quizId, startEl, endEl, startVal, endVal, $rowSaveBtn) {
    let startFp, endFp;

    startFp = flatpickr(startEl, {
        ...FP_SHARED,
        placeholder: 'No date restriction',
        onChange(_, dateStr) {
            endFp.set('minDate', dateStr || null);
            $rowSaveBtn.prop('disabled', false);
        },
    });

    endFp = flatpickr(endEl, {
        ...FP_SHARED,
        placeholder: 'No date restriction',
        onChange(_, dateStr) {
            startFp.set('maxDate', dateStr || null);
            $rowSaveBtn.prop('disabled', false);
        },
    });

    if (startVal) startFp.setDate(startVal, false);
    if (endVal)   endFp.setDate(endVal, false);
    if (startVal) endFp.set('minDate', startVal);
    if (endVal)   startFp.set('maxDate', endVal);

    // Clicking anywhere in the date-field (icon, gap) opens the picker
    jQuery(startEl).closest('.gqc__date-field').on('click', (e) => {
        if (!e.target.classList.contains('flatpickr-alt-input')) startFp.open();
    });
    jQuery(endEl).closest('.gqc__date-field').on('click', (e) => {
        if (!e.target.classList.contains('flatpickr-alt-input')) endFp.open();
    });

    rowPickerMap[quizId] = { startFp, endFp };
}

function destroyRowPickers() {
    Object.values(rowPickerMap).forEach(({ startFp, endFp }) => {
        startFp?.destroy();
        endFp?.destroy();
    });
    rowPickerMap = {};
}

function buildQuizRow(quiz, courseName, stat) {
    const completed   = stat.attempted_users || 0;
    const outstanding = Math.max(0, memberCount - completed);

    const templateEl = document.getElementById('gqc__row-template');
    if (!templateEl) {
        console.error('[gqc] Template #gqc__row-template not found');
        return jQuery('<div></div>');
    }

    const $row = jQuery(templateEl.content.cloneNode(true)).find('.gqc__item').first();

    $row.attr('data-quiz-id', quiz.step_id);
    $row.find('.gqc__quiz-name').text(quiz.step_title);
    $row.find('.gqc__course-name').text(courseName);

    $row.find('.gqc__badge--completed')
        .attr('data-quiz-id', quiz.step_id)
        .attr('data-quiz-name', quiz.step_title)
        .find('.gqc__badge-count').text(completed);

    $row.find('.gqc__badge--pending')
        .attr('data-quiz-id', quiz.step_id)
        .attr('data-quiz-name', quiz.step_title)
        .find('.gqc__badge-count').text(outstanding);

    return $row;
}

function applyQuizLimit($block) {
    const $showMore = $block.find('.gqc__show-more');
    const $items    = $block.find('.gqc__item');
    const total     = $items.length;

    if (total <= QUIZ_PAGE_SIZE) { $showMore.hide(); return; }

    $items.each(function (i) {
        jQuery(this).toggle(showingAllQuizzes || i < QUIZ_PAGE_SIZE);
    });

    const hidden = total - QUIZ_PAGE_SIZE;
    $showMore.text(showingAllQuizzes ? 'Show Less' : `Show ${hidden} More`).show();
}

async function loadQuizData($block, groupId, courses, readOnly = false) {
    const $skeleton = $block.find('.gqc__skeleton');
    const $list     = $block.find('.gqc__list');
    const $empty    = $block.find('.gqc__empty');
    const $showMore = $block.find('.gqc__show-more');

    destroyRowPickers();
    $skeleton.show();
    $list.empty();
    $empty.hide();
    $showMore.hide();

    try {
        const courseQuizData = await Promise.all(
            courses.map(async (course) => {
                try {
                    const steps = await api.get(endpoints.courseQuizStepsGrading(course.id));
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

        const [accessDates, stats] = await Promise.all([
            api.get(endpoints.groupQuizAccess(groupId)).catch(() => ({})),
            api.get(endpoints.groupQuizSubmissionStats(groupId, allQuizIds)),
        ]);

        quizAccessDatesMap = accessDates || {};
        const statsMap = {};
        (Array.isArray(stats) ? stats : []).forEach((s) => { statsMap[s.quiz_id] = s; });

        $skeleton.hide();

        courseQuizData.forEach(({ course, steps }) => {
            if (!steps.length) return;
            const title    = courseTitle(course);
            const $section = jQuery('<div class="gqc__course-section"></div>');
            steps.forEach((quiz) => {
                $section.append(buildQuizRow(quiz, title, statsMap[quiz.step_id] || {}));
            });
            $list.append($section);
        });

        // Initialise Flatpickr once all rows are in the DOM (skip for read-only users)
        $list.find('.gqc__item').each(function () {
            const $item  = jQuery(this);
            const quizId = $item.data('quiz-id');
            const dates  = quizAccessDatesMap[quizId] || {};
            const $rowSaveBtn = $item.find('.gqc__save-row');
            if (readOnly) {
                $item.find('.gqc__datetime--start, .gqc__datetime--end').prop('readonly', true);
                $rowSaveBtn.hide();
            } else {
                initRowPickers(
                    quizId,
                    $item.find('.gqc__datetime--start')[0],
                    $item.find('.gqc__datetime--end')[0],
                    convertFromUTC(dates.start || ''),
                    convertFromUTC(dates.end   || ''),
                    $rowSaveBtn
                );
            }
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

    $block.on('click', '.gqc__save-row', async function () {
        const $btn   = jQuery(this);
        const $item  = $btn.closest('.gqc__item');
        const quizId = $item.data('quiz-id');
        if (!quizId || !currentGroupId) return;

        const start = convertToUTC($item.find('.gqc__datetime--start').val() || '');
        const end   = convertToUTC($item.find('.gqc__datetime--end').val()   || '');

        $btn.prop('disabled', true).text('Saving…');

        try {
            await api.post(endpoints.groupQuizAccess(currentGroupId), { quiz_id: quizId, start, end });
            quizAccessDatesMap[quizId] = { start, end };
            api.invalidate('quiz-submission-stats');
            api.invalidate('quiz-attempts');
            $btn.text('Saved!');
            setTimeout(() => { $btn.text('Save'); }, 2000);
        } catch (err) {
            console.error('[quiz-config] Failed to save quiz access dates:', err);
            $btn.prop('disabled', false).text('Save');
        }
    });

    $block.on('click', '.gqc__show-more', function () {
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

    $(document).on('bys:groupSelected', (_, { groupId, baseUsersStats, courses, isSiteEditor }) => {
        currentGroupId = groupId;
        memberCount    = baseUsersStats?.total_members || 0;
        loadQuizData($block, groupId, Array.isArray(courses) ? courses : [], isSiteEditor);
    });

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
