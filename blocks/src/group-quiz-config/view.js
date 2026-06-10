import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';
import { convertFromUTC, convertToUTC } from '../_shared/helpers.js';
import { bysAlert } from '../_shared/alert.js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

const QUIZ_PAGE_SIZE = 3;

let currentGroupId     = null;
let memberCount        = 0;
let showingAllQuizzes  = false;
let quizAccessDatesMap = {};
let rowPickerMap       = {}; // quiz_id -> { startFp, endFp }

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

function syncClearButton($btn, hasValue) {
    if (hasValue) $btn.removeAttr('hidden');
    else          $btn.attr('hidden', '');
}

function initRowPickers(quizId, startEl, endEl, startVal, endVal, $rowSaveBtn) {
    let startFp, endFp;

    const $startClear = jQuery(startEl).closest('.gqc__date-field').find('.gqc__date-clear[data-field-type="start"]');
    const $endClear   = jQuery(endEl).closest('.gqc__date-field').find('.gqc__date-clear[data-field-type="end"]');

    startFp = flatpickr(startEl, {
        ...FP_SHARED,
        placeholder: 'No date restriction',
        onChange(_, dateStr) {
            endFp.set('minDate', dateStr || null);
            syncClearButton($startClear, Boolean(dateStr));
            $rowSaveBtn.prop('disabled', false);
        },
    });

    endFp = flatpickr(endEl, {
        ...FP_SHARED,
        placeholder: 'No date restriction',
        onChange(_, dateStr) {
            startFp.set('maxDate', dateStr || null);
            syncClearButton($endClear, Boolean(dateStr));
            $rowSaveBtn.prop('disabled', false);
        },
    });

    if (startVal) startFp.setDate(startVal, false);
    if (endVal)   endFp.setDate(endVal, false);
    if (startVal) endFp.set('minDate', startVal);
    if (endVal)   startFp.set('maxDate', endVal);

    // setDate(_, false) skips onChange — sync clear-button visibility for
    // the initial values explicitly.
    syncClearButton($startClear, Boolean(startVal));
    syncClearButton($endClear,   Boolean(endVal));

    jQuery(startEl).closest('.gqc__date-field').on('click', (e) => {
        if (e.target.closest('.gqc__date-clear')) return;
        if (!e.target.classList.contains('flatpickr-alt-input')) startFp.open();
    });
    jQuery(endEl).closest('.gqc__date-field').on('click', (e) => {
        if (e.target.closest('.gqc__date-clear')) return;
        if (!e.target.classList.contains('flatpickr-alt-input')) endFp.open();
    });

    // Clear-button handlers
    $startClear.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startFp.clear();
        syncClearButton($startClear, false);
        $rowSaveBtn.prop('disabled', false);
    });
    $endClear.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        endFp.clear();
        syncClearButton($endClear, false);
        $rowSaveBtn.prop('disabled', false);
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
        // Grading-flagged quizzes (and their access date windows) are pre-baked
        // into each course's quizzes_show_test_grading_config by /base-group-data.
        // Reading from the store eliminates both N per-course /quiz-steps?filter=grading
        // calls AND the /quiz-access fetch on cold load.
        const cachedCourses = store.getCourses() || [];
        const courseQuizData = courses.map((course) => {
            const cached = cachedCourses.find((c) => c.id === course.id);
            const steps = Array.isArray(cached?.quizzes_show_test_grading_config)
                ? cached.quizzes_show_test_grading_config
                : [];
            return { course, steps };
        });

        const allQuizIds = courseQuizData.flatMap(({ steps }) => steps.map((s) => s.step_id));

        if (!allQuizIds.length) {
            $skeleton.hide();
            $empty.text('No quizzes found for this group\'s courses.').show();
            return;
        }

        // Rebuild the local access-date map from the store-baked start/end values.
        // (quiz-submission-stats is volatile — still fetched live.)
        quizAccessDatesMap = {};
        courseQuizData.forEach(({ steps }) => {
            steps.forEach((q) => {
                quizAccessDatesMap[q.step_id] = { start: q.start || '', end: q.end || '' };
            });
        });

        const stats = await api.get(endpoints.groupQuizSubmissionStats(groupId, allQuizIds));
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

    /**
     * Persist a row's start/end window — pure data op, throws on failure
     * so callers decide the UI response. Shared by the explicit Save
     * click AND the auto-save embedded in the Notify click (leaders
     * routinely change dates and forget to save before notifying).
     */
    async function persistRowAccessDates($item, quizId) {
        const start = convertToUTC($item.find('.gqc__datetime--start').val() || '');
        const end   = convertToUTC($item.find('.gqc__datetime--end').val()   || '');

        await api.post(endpoints.groupQuizAccess(currentGroupId), { quiz_id: quizId, start, end });
        quizAccessDatesMap[quizId] = { start, end };

        // Mutation write-through: update the cached course shape so the
        // new dates survive a same-tab page nav until the next
        // /base-group-data forceRefresh.
        const cachedCourses = store.getCourses();
        if (Array.isArray(cachedCourses)) {
            const updated = cachedCourses.map((c) => ({
                ...c,
                quizzes_show_test_grading_config: Array.isArray(c.quizzes_show_test_grading_config)
                    ? c.quizzes_show_test_grading_config.map((q) =>
                        q.step_id === quizId ? { ...q, start, end } : q
                      )
                    : [],
            }));
            store.setCourses(updated);
        }

        api.invalidate('quiz-access');
        api.invalidate('quiz-submission-stats');
        api.invalidate('quiz-attempts');
    }

    $block.on('click', '.gqc__save-row', async function () {
        const $btn   = jQuery(this);
        const $item  = $btn.closest('.gqc__item');
        const quizId = $item.data('quiz-id');
        if (!quizId || !currentGroupId) return;

        $btn.prop('disabled', true).text('Saving…');

        try {
            await persistRowAccessDates($item, quizId);
            $btn.text('Saved!');
            setTimeout(() => { $btn.text('Save'); }, 2000);
        } catch (err) {
            console.error('[quiz-config] Failed to save quiz access dates:', err);
            $btn.prop('disabled', false).text('Save');
            bysAlert('Failed to save the quiz access window. Please try again.');
        }
    });

    // Notify Learners — broadcasts the group-level access for THIS quiz to group users.
    // Auto-saves the row's start/end first so the email reflects what's
    // currently in the inputs (leaders often edit dates then click Notify
    // without explicitly hitting Save).
    $block.on('click', '.gqc__notify', async function () {
        const $btn   = jQuery(this);
        const $item  = $btn.closest('.gqc__item');
        const quizId = $item.data('quiz-id');
        if (!quizId || !currentGroupId) return;

        const originalLabel = $btn.text();
        $btn.prop('disabled', true).text('Notifying…');

        try {
            await persistRowAccessDates($item, quizId);

            const result = await api.post(`/wp-json/bys-groups/v1/groups/${currentGroupId}/quizzes/${quizId}/notify-access`)
            const sent = result?.sent_count ?? 0;
            $btn.text(`Notified ${sent}`);
            setTimeout(() => {
                $btn.text(originalLabel).prop('disabled', false);
            }, 2500);
        } catch (err) {
            console.error('[quiz-config] Failed to save + notify:', err);
            $btn.text('Failed');
            setTimeout(() => {
                $btn.text(originalLabel).prop('disabled', false);
            }, 2500);
            bysAlert('Failed to save the quiz access window and notify learners. Please try again.');
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

    $(document).on('bys:groupSelected', (_, { groupId }) => {
        currentGroupId = groupId;
        // users + courses come from the store — guaranteed populated by group-select
        // before this event fires.
        memberCount    = store.getUsers()?.length ?? 0;
        const isSiteEditor = window.bysGroupsAuth?.isSiteEditor === true;
        loadQuizData($block, groupId, store.getCourses() || [], isSiteEditor);
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && currentGroupId && memberCount > 0) {
            api.invalidate('quiz-steps');
            api.invalidate('quiz-submission-stats');
            api.invalidate('quiz-attempts');
            loadQuizData($block, currentGroupId, store.getCourses() || []);
        }
    });

    // Read from store if available until bys:groupSelected handler above finishes its forceRefresh fetch
    const cachedGroupId = store.getCurrentGroup();
    const cachedCourses = store.getCourses();
    const cachedUsers   = store.getUsers();
    if (cachedGroupId !== null && cachedCourses !== null) {
        console.log('[bys-store] group-quiz-config: HIT — loading quiz data from cached courses', cachedCourses);
        currentGroupId = cachedGroupId;
        memberCount    = cachedUsers ? cachedUsers.length : 0;
        loadQuizData($block, currentGroupId, cachedCourses);
    } else {
        console.log('[bys-store] group-quiz-config: MISS — waiting for bys:groupSelected');
    }
});
