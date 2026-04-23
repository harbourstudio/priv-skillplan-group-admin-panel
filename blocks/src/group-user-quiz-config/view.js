import { api, endpoints } from '../_shared/api-client.js';

let allMembers = [];  // [{ id, display_name, first_name, last_name, email }]
let allQuizzes = [];  // [{ step_id, step_title, course_name }]
let userQuizAccessDatesMap = {}; // quiz_id -> { start, end } (stored in UTC)

let currentGroupId = null;
let selectedUserId = null;
let selectedQuizId = null;

let tzData = { timezone: 'UTC', utc_offset_hours: 0 };

// Initialize timezone data from server
function initTimezoneData() {
    const tzDataEl = document.getElementById('bys-user-quiz-config-tz-data');
    tzData = tzDataEl ? JSON.parse(tzDataEl.textContent) : { timezone: 'UTC', utc_offset_hours: 0 };
}

// Convert UTC ISO 8601 string to browser-local datetime-local value for display
function convertFromUTC(utcDatetimeValue) {
    if (!utcDatetimeValue) return '';

    const dt = new Date(utcDatetimeValue);
    if (isNaN(dt.getTime())) return '';

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

    const [datePart, timePart] = localDatetimeValue.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    const localDate = new Date(year, month - 1, day, hours, minutes, 0);
    return localDate.toISOString();
}

function courseTitle(course) {
    return typeof course.title === 'string'
        ? course.title
        : course.title?.rendered || 'Untitled';
}

jQuery(document).ready(($) => {
    // Initialize timezone data first
    initTimezoneData();

    const $block      = $('.wp-block-bys-groups-group-user-quiz-config').first();
    if (!$block.length) return;

    const $learnerInput = $block.find('#guqc__learner-search');
    const $learnerList  = $block.find('.guqc__suggestions--learner');
    const $quizInput    = $block.find('#guqc__quiz-search');
    const $quizList     = $block.find('.guqc__suggestions--quiz');
    const $startInput   = $block.find('.guqc__datetime[aria-label="Start date"]');
    const $endInput     = $block.find('.guqc__datetime[aria-label="End date"]');
    const $saveBtn      = $block.find('.guqc__save');
    const $notifyBtn    = $block.find('.guqc__notify');

    function updateActions() {
        $saveBtn.prop('disabled', !(selectedUserId && selectedQuizId));
        $notifyBtn.prop('disabled', !selectedUserId);
    }

    // Load user quiz access dates when quiz is selected
    async function loadQuizAccessDates() {
        if (!selectedUserId || !selectedQuizId || !currentGroupId) {
            $startInput.val('');
            $endInput.val('');
            return;
        }

        try {
            const accessDates = await api.get(endpoints.userQuizAccess(currentGroupId, selectedUserId));
            const dates = accessDates[selectedQuizId] || {};
            $startInput.val(convertFromUTC(dates.start || ''));
            $endInput.val(convertFromUTC(dates.end || ''));
            userQuizAccessDatesMap = accessDates;
        } catch (err) {
            console.error('[uqc] Failed to load quiz access dates:', err);
            $startInput.val('');
            $endInput.val('');
        }
    }

    // ── Learner suggestions ───────────────────────────────────────────────────

    function showLearnerSuggestions(query) {
        const q = query.toLowerCase().trim();
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

    function hideLearnerSuggestions() {
        $learnerList.addClass('hidden').empty();
    }

    $learnerInput.on('focus', function () {
        showLearnerSuggestions($(this).val());
    });

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
        const q = query.toLowerCase().trim();
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

    function hideQuizSuggestions() {
        $quizList.addClass('hidden').empty();
    }

    $quizInput.on('focus', function () {
        showQuizSuggestions($(this).val());
    });

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

    // ── Click outside to close ────────────────────────────────────────────────

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

    // ── Datetime change handler with start/end date restrictions ────────────────

    $block.on('change', '.guqc__datetime', function() {
        const startVal = $startInput.val();
        const endVal = $endInput.val();
        const changedFieldType = $(this).data('field-type');

        // If both dates are set, enforce start <= end
        if (startVal && endVal) {
            const startTime = new Date(startVal).getTime();
            const endTime = new Date(endVal).getTime();

            if (startTime > endTime) {
                // Start date is after end date - clear the field that was just changed
                if (changedFieldType === 'start') {
                    $startInput.val('');
                } else {
                    $endInput.val('');
                }
            }
        }
    });

    // ── Save button handler ───────────────────────────────────────────────────

    $saveBtn.on('click', async function() {
        if (!selectedUserId || !selectedQuizId || !currentGroupId) return;

        $saveBtn.prop('disabled', true).text('Saving...');

        try {
            const startValue = $startInput.val() || '';
            const endValue = $endInput.val() || '';

            // Convert browser-local to UTC before sending
            const start = convertToUTC(startValue);
            const end = convertToUTC(endValue);

            // Send to server
            await api.post(
                endpoints.userQuizAccess(currentGroupId, selectedUserId),
                { quiz_id: selectedQuizId, start, end }
            );

            // Update local cache
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
                        const steps = await api.get(endpoints.courseQuizSteps(course.id));
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
        $startInput.val('');
        $endInput.val('');
        hideLearnerSuggestions();
        hideQuizSuggestions();
        updateActions();

        const userIds = baseUsersStats?.user_ids || [];
        await Promise.all([
            loadMembers(groupId, userIds),
            loadQuizzes(courses),
        ]);
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
