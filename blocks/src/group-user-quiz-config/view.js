import { api, endpoints } from '../_shared/api-client.js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

let allMembers             = [];
let allQuizzes             = [];
let userQuizAccessDatesMap = {};

let currentGroupId = null;
let selectedUserId = null;
let selectedQuizId = null;

let startFp = null;
let endFp   = null;

// Convert UTC ISO 8601 string to local datetime string (Flatpickr dateFormat)
function convertFromUTC(utcDatetimeValue) {
    if (!utcDatetimeValue) return '';
    const dt = new Date(utcDatetimeValue);
    if (isNaN(dt.getTime())) return '';
    const Y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const H = String(dt.getHours()).padStart(2, '0');
    const i = String(dt.getMinutes()).padStart(2, '0');
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

jQuery(document).ready(($) => {
    const $block = $('.wp-block-bys-groups-group-user-quiz-config').first();
    if (!$block.length) return;

    const $learnerInput = $block.find('#guqc__learner-search');
    const $learnerList  = $block.find('.guqc__suggestions--learner');
    const $quizInput    = $block.find('#guqc__quiz-search');
    const $quizList     = $block.find('.guqc__suggestions--quiz');
    const $saveBtn      = $block.find('.guqc__save');
    const $notifyBtn    = $block.find('.guqc__notify');

    // ── Flatpickr init ────────────────────────────────────────────────────────

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

    startFp = flatpickr($block.find('.guqc__datetime[data-field-type="start"]')[0], {
        ...FP_SHARED,
        placeholder: 'No date restriction',
        onChange(_, dateStr) {
            endFp.set('minDate', dateStr || null);
        },
    });

    endFp = flatpickr($block.find('.guqc__datetime[data-field-type="end"]')[0], {
        ...FP_SHARED,
        placeholder: 'No date restriction',
        onChange(_, dateStr) {
            startFp.set('maxDate', dateStr || null);
        },
    });

    // Clicking anywhere in the date-field (icon, gap) opens the picker
    $block.find('.guqc__datetime[data-field-type="start"]')
        .closest('.guqc__date-field')
        .on('click', (e) => { if (!e.target.classList.contains('flatpickr-alt-input')) startFp.open(); });
    $block.find('.guqc__datetime[data-field-type="end"]')
        .closest('.guqc__date-field')
        .on('click', (e) => { if (!e.target.classList.contains('flatpickr-alt-input')) endFp.open(); });

    // ── Helpers ───────────────────────────────────────────────────────────────

    function updateActions() {
        $saveBtn.prop('disabled', !(selectedUserId && selectedQuizId));
        $notifyBtn.prop('disabled', !selectedUserId);
    }

    function setDates(startUtc, endUtc) {
        if (startUtc) {
            startFp.setDate(convertFromUTC(startUtc), false);
            endFp.set('minDate', convertFromUTC(startUtc));
        } else {
            startFp.clear();
            endFp.set('minDate', null);
        }
        if (endUtc) {
            endFp.setDate(convertFromUTC(endUtc), false);
            startFp.set('maxDate', convertFromUTC(endUtc));
        } else {
            endFp.clear();
            startFp.set('maxDate', null);
        }
    }

    function clearDates() {
        startFp.clear();
        endFp.clear();
        startFp.set('maxDate', null);
        endFp.set('minDate', null);
    }

    // ── Quiz access date loading ───────────────────────────────────────────────

    async function loadQuizAccessDates() {
        if (!selectedUserId || !selectedQuizId || !currentGroupId) {
            clearDates();
            return;
        }

        try {
            const accessDates = await api.get(endpoints.userQuizAccess(currentGroupId, selectedUserId));
            const dates       = accessDates[selectedQuizId] || {};
            setDates(dates.start || '', dates.end || '');
            userQuizAccessDatesMap = accessDates;
        } catch (err) {
            console.error('[uqc] Failed to load quiz access dates:', err);
            clearDates();
        }
    }

    // ── Learner suggestions ───────────────────────────────────────────────────

    function showLearnerSuggestions(query) {
        const q       = query.toLowerCase().trim();
        const matches = (q
            ? allMembers.filter((m) =>
                m.display_name.toLowerCase().includes(q) ||
                m.first_name.toLowerCase().includes(q)   ||
                m.last_name.toLowerCase().includes(q)    ||
                m.email.toLowerCase().includes(q)
            )
            : allMembers
        ).slice(0, 10);

        $learnerList.empty();
        if (!matches.length) {
            $learnerList.append('<li class="guqc__suggestion guqc__suggestion--empty" role="option">No learners found</li>');
        } else {
            matches.forEach((m) => {
                $learnerList.append(
                    `<li class="guqc__suggestion" role="option"
                        data-user-id="${m.id}"
                        data-display-name="${m.display_name.replace(/"/g, '&quot;')}">
                        <span class="guqc__suggestion-name">${$('<span>').text(m.display_name).html()}</span>
                        <span class="guqc__suggestion-meta">${$('<span>').text(m.email).html()}</span>
                    </li>`
                );
            });
        }
        $learnerList.removeClass('hidden');
    }

    function hideLearnerSuggestions() { $learnerList.addClass('hidden').empty(); }

    $learnerInput.on('focus', function () { showLearnerSuggestions($(this).val()); });
    $learnerInput.on('input', function () {
        selectedUserId = null;
        updateActions();
        showLearnerSuggestions($(this).val());
    });

    $learnerList.on('mousedown', '.guqc__suggestion:not(.guqc__suggestion--empty)', function (e) {
        e.preventDefault();
        selectedUserId = parseInt($(this).data('userId'), 10);
        $learnerInput.val($(this).data('displayName'));
        updateActions();
        hideLearnerSuggestions();
    });

    // ── Quiz suggestions ──────────────────────────────────────────────────────

    function showQuizSuggestions(query) {
        const q       = query.toLowerCase().trim();
        const matches = (q
            ? allQuizzes.filter((qz) =>
                qz.step_title.toLowerCase().includes(q) ||
                qz.course_name.toLowerCase().includes(q)
            )
            : allQuizzes
        ).slice(0, 10);

        $quizList.empty();
        if (!matches.length) {
            $quizList.append('<li class="guqc__suggestion guqc__suggestion--empty" role="option">No quizzes found</li>');
        } else {
            matches.forEach((qz) => {
                $quizList.append(
                    `<li class="guqc__suggestion" role="option"
                        data-step-id="${qz.step_id}"
                        data-step-title="${qz.step_title.replace(/"/g, '&quot;')}">
                        <span class="guqc__suggestion-name">${$('<span>').text(qz.step_title).html()}</span>
                        <span class="guqc__suggestion-meta">${$('<span>').text(qz.course_name).html()}</span>
                    </li>`
                );
            });
        }
        $quizList.removeClass('hidden');
    }

    function hideQuizSuggestions() { $quizList.addClass('hidden').empty(); }

    $quizInput.on('focus', function () { showQuizSuggestions($(this).val()); });
    $quizInput.on('input', function () {
        selectedQuizId = null;
        updateActions();
        showQuizSuggestions($(this).val());
    });

    $quizList.on('mousedown', '.guqc__suggestion:not(.guqc__suggestion--empty)', function (e) {
        e.preventDefault();
        selectedQuizId = parseInt($(this).data('stepId'), 10);
        $quizInput.val($(this).data('stepTitle'));
        updateActions();
        hideQuizSuggestions();
        loadQuizAccessDates();
    });

    // ── Click outside ─────────────────────────────────────────────────────────

    const $learnerWrap = $learnerInput.closest('.guqc__combobox-wrap');
    const $quizWrap    = $quizInput.closest('.guqc__combobox-wrap');

    $(document).on('click.uqc', (e) => {
        const $t = $(e.target);
        if (!$t.closest($learnerWrap).length) {
            hideLearnerSuggestions();
            if (!selectedUserId) $learnerInput.val('');
        }
        if (!$t.closest($quizWrap).length) {
            hideQuizSuggestions();
            if (!selectedQuizId) $quizInput.val('');
        }
    });

    // ── Save ──────────────────────────────────────────────────────────────────

    $saveBtn.on('click', async function () {
        if (!selectedUserId || !selectedQuizId || !currentGroupId) return;

        $saveBtn.prop('disabled', true).text('Saving...');

        try {
            // Read from the hidden inputs Flatpickr writes its dateFormat value to
            const startValue = $block.find('.guqc__datetime[data-field-type="start"]').val() || '';
            const endValue   = $block.find('.guqc__datetime[data-field-type="end"]').val()   || '';
            const start      = convertToUTC(startValue);
            const end        = convertToUTC(endValue);

            await api.post(
                endpoints.userQuizAccess(currentGroupId, selectedUserId),
                { quiz_id: selectedQuizId, start, end }
            );

            userQuizAccessDatesMap[selectedQuizId] = { start, end };

            $saveBtn.prop('disabled', true).text('Changes saved!');
            setTimeout(() => {
                $saveBtn.text('Save Changes');
                $saveBtn.prop('disabled', !(selectedUserId && selectedQuizId));
            }, 2000);
        } catch (err) {
            console.error('[uqc] Failed to save changes:', err);
            $saveBtn.prop('disabled', false).text('Save Changes');
            alert('Failed to save changes. Please try again.');
        }
    });

    // ── Data loading ──────────────────────────────────────────────────────────

    async function loadMembers(groupId, userIds) {
        if (!userIds?.length) { allMembers = []; return; }
        try {
            const users = await api.get(endpoints.groupUsers(groupId, userIds.join(',')));
            allMembers = (Array.isArray(users) ? users : []).map((u) => ({
                id:           u.id,
                display_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.display_name || '',
                first_name:   u.first_name || '',
                last_name:    u.last_name  || '',
                email:        u.email      || '',
            }));
        } catch (err) {
            console.error('[uqc] Failed to load members', err);
            allMembers = [];
        }
    }

    async function loadQuizzes(courses) {
        if (!courses?.length) { allQuizzes = []; return; }
        try {
            const results = await Promise.all(
                courses.map(async (course) => {
                    try {
                        const steps = await api.get(endpoints.courseQuizStepsGrading(course.id));
                        const name  = courseTitle(course);
                        return (Array.isArray(steps) ? steps : []).map((s) => ({
                            step_id:     s.step_id,
                            step_title:  s.step_title,
                            course_name: name,
                        }));
                    } catch {
                        return [];
                    }
                })
            );
            allQuizzes = results.flat();
        } catch (err) {
            console.error('[uqc] Failed to load quizzes', err);
            allQuizzes = [];
        }
    }

    async function init(groupId, baseUsersStats, courses) {
        currentGroupId = groupId;
        selectedUserId = null;
        selectedQuizId = null;
        userQuizAccessDatesMap = {};
        $learnerInput.val('');
        $quizInput.val('');
        clearDates();
        hideLearnerSuggestions();
        hideQuizSuggestions();
        updateActions();

        const userIds = baseUsersStats?.user_ids || [];
        await Promise.all([loadMembers(groupId, userIds), loadQuizzes(courses)]);
    }

    $(document).on('bys:groupSelected', (_, { groupId, baseUsersStats, courses }) => {
        init(groupId, baseUsersStats, Array.isArray(courses) ? courses : []);
    });

    if (window.bysGroupData?.groupId) {
        init(
            window.bysGroupData.groupId,
            window.bysGroupData.baseUsersStats,
            window.bysGroupData.courses || []
        );
    }
});
