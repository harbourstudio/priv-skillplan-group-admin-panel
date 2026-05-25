import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';
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

    const $learnerInput  = $block.find('#guqc__learner-search');
    const $learnerList   = $block.find('.guqc__suggestions--learner');
    const $quizInput     = $block.find('#guqc__quiz-search');
    const $quizList      = $block.find('.guqc__suggestions--quiz');
    const $saveBtn       = $block.find('.guqc__save');
    const $notifyBtn     = $block.find('.guqc__notify');
    // Skeletons are scoped: one over the quiz field, two over the date fields.
    const $quizSkeleton  = $block.find('.guqc__combobox-wrap .guqc__field-skeleton');
    const $dateSkeletons = $block.find('.guqc__date-field .guqc__field-skeleton');
    const $startClear    = $block.find('.guqc__date-clear[data-field-type="start"]');
    const $endClear      = $block.find('.guqc__date-clear[data-field-type="end"]');

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

    /**
     * Toggle a date-clear button based on whether the picker has a value.
     * Called from flatpickr's onChange and any programmatic clear/set path.
     */
    function syncClearButton($btn, hasValue) {
        if (hasValue) {
            $btn.removeAttr('hidden');
        } else {
            $btn.attr('hidden', '');
        }
    }

    startFp = flatpickr($block.find('.guqc__datetime[data-field-type="start"]')[0], {
        ...FP_SHARED,
        placeholder: 'No date restriction',
        onChange(_, dateStr) {
            endFp.set('minDate', dateStr || null);
            syncClearButton($startClear, Boolean(dateStr));
            updateActions();
        },
    });

    endFp = flatpickr($block.find('.guqc__datetime[data-field-type="end"]')[0], {
        ...FP_SHARED,
        placeholder: 'No date restriction',
        onChange(_, dateStr) {
            startFp.set('maxDate', dateStr || null);
            syncClearButton($endClear, Boolean(dateStr));
            updateActions();
        },
    });

    // Clicking anywhere in the date-field (icon, gap) opens the picker —
    // except the clear button, which has its own handler.
    $block.find('.guqc__datetime[data-field-type="start"]')
        .closest('.guqc__date-field')
        .on('click', (e) => {
            if (e.target.closest('.guqc__date-clear')) return;
            if (!e.target.classList.contains('flatpickr-alt-input')) startFp.open();
        });
    $block.find('.guqc__datetime[data-field-type="end"]')
        .closest('.guqc__date-field')
        .on('click', (e) => {
            if (e.target.closest('.guqc__date-clear')) return;
            if (!e.target.classList.contains('flatpickr-alt-input')) endFp.open();
        });

    // Clear button handlers — empty the picker, hide the button. The change
    // is committed when the leader clicks Save (an empty start/end pair tells
    // the backend to remove any access restriction for this user/quiz).
    $startClear.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startFp.clear();
        syncClearButton($startClear, false);
    });
    $endClear.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        endFp.clear();
        syncClearButton($endClear, false);
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    function updateActions() {
        // Both Save and Notify require a selected learner and a selected quiz.
        // (The email template handles the "no window set" case explicitly, so
        // we don't gate notify on hasAnyDate().)
        const ready = Boolean(selectedUserId && selectedQuizId);
        $saveBtn.prop('disabled', !ready);
        $notifyBtn.prop('disabled', !ready);
    }

    /**
     * Toggle a skeleton-overlay jQuery set on or off using the native
     * `hidden` attribute (semantic + screen-reader friendly).
     */
    function setSkeleton($skel, showing) {
        if (showing) {
            $skel.removeAttr('hidden').attr('aria-busy', 'true');
        } else {
            $skel.attr('hidden', '').removeAttr('aria-busy');
        }
    }

    function setAwaitingQuiz(awaiting) {
        // Quiz field + date fields are both stale when the user changes.
        setSkeleton($quizSkeleton, awaiting);
        setSkeleton($dateSkeletons, awaiting);
    }

    function setAwaitingDates(awaiting) {
        // Quiz field is fine — only the date fields need invalidating.
        setSkeleton($dateSkeletons, awaiting);
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
        // setDate(_, false) skips onChange, so sync the clear buttons here.
        syncClearButton($startClear, Boolean(startUtc));
        syncClearButton($endClear, Boolean(endUtc));
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

    /**
     * Invalidate the quiz selection + dates when the user changes. The
     * previously visible quiz/dates were tied to the previous user, so
     * leaving them on screen would be misleading.
     */
    function invalidateQuizForUserChange() {
        selectedQuizId = null;
        $quizInput.val('');
        clearDates();
        setAwaitingQuiz(true);
    }

    $learnerInput.on('focus', function () { showLearnerSuggestions($(this).val()); });
    $learnerInput.on('input', function () {
        if (selectedUserId !== null) {
            invalidateQuizForUserChange();
        }
        selectedUserId = null;
        updateActions();
        showLearnerSuggestions($(this).val());
    });

    $learnerList.on('mousedown', '.guqc__suggestion:not(.guqc__suggestion--empty)', function (e) {
        e.preventDefault();
        const newUserId = parseInt($(this).data('userId'), 10);
        // Only invalidate when SWITCHING from one user to a different user.
        // The first selection (selectedUserId === null) is not a "change" —
        // there's no stale quiz/date state to invalidate yet.
        if (selectedUserId !== null && newUserId !== selectedUserId) {
            invalidateQuizForUserChange();
        }
        selectedUserId = newUserId;
        $learnerInput.val($(this).data('displayName'));
        // A user is now selected — quiz and date fields return to their
        // unset/reset state, ready for the leader's next pick.
        setAwaitingQuiz(false);
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

    /**
     * Invalidate just the dates when the quiz changes. The quiz field itself
     * stays interactive — only the start/end dates are stale.
     */
    function invalidateDatesForQuizChange() {
        clearDates();
        setAwaitingDates(true);
    }

    $quizInput.on('focus', function () { showQuizSuggestions($(this).val()); });
    $quizInput.on('input', function () {
        if (selectedQuizId !== null && selectedUserId !== null) {
            invalidateDatesForQuizChange();
        }
        selectedQuizId = null;
        updateActions();
        showQuizSuggestions($(this).val());
    });

    $quizList.on('mousedown', '.guqc__suggestion:not(.guqc__suggestion--empty)', function (e) {
        e.preventDefault();
        const newQuizId = parseInt($(this).data('stepId'), 10);
        // Only invalidate dates when SWITCHING from one quiz to a different
        // one. The first quiz selection has no stale dates to invalidate.
        if (selectedQuizId !== null && newQuizId !== selectedQuizId) {
            invalidateDatesForQuizChange();
        }
        selectedQuizId = newQuizId;
        $quizInput.val($(this).data('stepTitle'));
        // Quiz is now picked — hide both skeletons. The date skeletons will
        // remain visible only until loadQuizAccessDates() populates them.
        setSkeleton($quizSkeleton, false);
        updateActions();
        hideQuizSuggestions();
        loadQuizAccessDates().then(() => setAwaitingDates(false));
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

    // ── Notify learner ────────────────────────────────────────────────────────

    $notifyBtn.on('click', async function () {
        // Notify is valid even when both dates are empty — the email template
        // renders an explicit "no restriction" message in that case, which is
        // useful for telling a learner that gating has been lifted.
        if (!selectedUserId || !selectedQuizId || !currentGroupId) return;

        const originalLabel = $notifyBtn.text();
        $notifyBtn.prop('disabled', true).text('Notifying...');

        try {
            await api.post(
                endpoints.notifyUserQuizAccess(currentGroupId, selectedUserId),
                { quiz_id: selectedQuizId }
            );
            $notifyBtn.text('Learner notified!');
            setTimeout(() => {
                $notifyBtn.text(originalLabel);
                updateActions();
            }, 2000);
        } catch (err) {
            console.error('[uqc] Failed to notify learner:', err);
            $notifyBtn.text('Failed — try again');
            setTimeout(() => {
                $notifyBtn.text(originalLabel);
                updateActions();
            }, 2500);
        }
    });

    // ── Data loading ──────────────────────────────────────────────────────────

    async function loadMembers(groupId, userIds) {
        if (!userIds?.length) { allMembers = []; return; }
        try {
            // Hydrated-cache fast path
            const cachedHydrated = store.getCurrentGroup() === Number(groupId)
                ? store.getHydratedUsers(userIds)
                : null;
            let users;
            if (cachedHydrated !== null) {
                console.log('[bys-store] group-user-quiz-config: HIT hydrated — using store, skipping fetch');
                users = cachedHydrated;
            } else {
                console.log('[bys-store] group-user-quiz-config: MISS hydrated — fetching and writing through');
                users = await api.get(endpoints.groupUsers(groupId, userIds.join(',')));
                if (Array.isArray(users)) store.setUsers(users);
            }
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

        // Grading-flagged quizzes per course are pre-baked into the store.
        // Derive allQuizzes from there — no per-course /quiz-steps fetches.
        const cachedCourses = store.getCourses() || [];
        const cachedById = new Map(cachedCourses.map((c) => [c.id, c]));
        const hasCachedQuizzes = courses.every((c) =>
            Array.isArray(cachedById.get(c.id)?.quizzes_show_test_grading_config)
        );

        if (hasCachedQuizzes) {
            allQuizzes = courses.flatMap((course) => {
                const cached = cachedById.get(course.id);
                const name = courseTitle(course);
                return (cached.quizzes_show_test_grading_config || []).map((q) => ({
                    step_id:     q.step_id,
                    step_title:  q.step_title,
                    course_name: name,
                }));
            });
            return;
        }

        // Cache miss (rare — would mean store hasn't been populated yet).
        // Fall back to per-course REST.
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

    async function init(groupId, userIds, courses) {
        currentGroupId = groupId;
        selectedUserId = null;
        selectedQuizId = null;
        userQuizAccessDatesMap = {};
        $learnerInput.val('');
        $quizInput.val('');
        clearDates();
        hideLearnerSuggestions();
        hideQuizSuggestions();
        setAwaitingQuiz(false); // Fresh group → no stale quiz to invalidate.
        updateActions();

        await Promise.all([loadMembers(groupId, userIds), loadQuizzes(courses)]);
    }

    $(document).on('bys:groupSelected', (_, { groupId }) => {
        // users + courses come from the store — guaranteed populated by group-select.
        init(groupId, store.getUserIds() || [], store.getCourses() || []);
    });

    // Fast first paint: if the store has group_id + courses + users cached
    // from a prior page in this session, kick off init() immediately. The
    // bys:groupSelected handler above re-fires when group-select finishes its
    // forceRefresh fetch (init re-renders cleanly).
    const cachedGroupId = store.getCurrentGroup();
    const cachedCourses = store.getCourses();
    const cachedUserIds = store.getUserIds();
    if (cachedGroupId !== null && cachedCourses !== null && cachedUserIds !== null) {
        console.log('[bys-store] group-user-quiz-config: HIT — init from cache', {
            group_id: cachedGroupId,
            courses: cachedCourses.length,
            users: cachedUserIds.length,
        });
        init(cachedGroupId, cachedUserIds, cachedCourses);
    } else {
        console.log('[bys-store] group-user-quiz-config: MISS — waiting for bys:groupSelected');
    }
});
