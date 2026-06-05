import { api, endpoints } from '../_shared/api-client.js';
import { convertToUTC } from '../_shared/helpers.js';
import store from '../_shared/store.js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

jQuery(document).ready(function($) {
    const $block = $('.wp-block-bys-groups-group-communication-send-modal').first();
    if (!$block.length) return;

    const $modal = $block.find('#communication-send-modal');
    const $backdrop = $modal.find('.gcsm__modal-backdrop');
    const $formSkeleton = $modal.find('.gcsm__modal-body > .gcsm__skeleton');
    const $form = $modal.find('.gcsm__form');
    const $radios = $modal.find('input[name="recipient"]');
    const $individual = $modal.find('.gcsm__recipient-mode--individual');
    const $condition = $modal.find('.gcsm__recipient-mode--condition');
    const $conditionSelect = $modal.find('#gcsm__condition');
    const $conditionDaysWrap = $modal.find('.gcsm__condition-field--days');
    const $conditionDays = $modal.find('#gcsm__condition-days');
    const $conditionDaysError = $modal.find('.gcsm__hint--days-error');
    const $conditionCourseWrap = $modal.find('.gcsm__condition-field--course');
    const $conditionCourse = $modal.find('#gcsm__condition-course');
    const $conditionQuizWrap = $modal.find('.gcsm__condition-field--quiz');
    const $conditionQuiz = $modal.find('#gcsm__condition-quiz');
    const $conditionalRecipientsWrap = $modal.find('.gcsm__recipients-preview');
    const $conditionalRecipientsList = $modal.find('.gcsm__recipients-preview-list');
    const $conditionalRecipientsTable = $modal.find('.gcsm__recipients-preview-table');
    const $conditionalRecipientsEmpty = $modal.find('.gcsm__hint--recipients-empty');
    const $conditionalRecipientsSkeleton = $modal.find('.gcsm__recipients-preview .gcsm__skeleton');
    const $subjectInput = $modal.find('#gcsm__subject');
    const $message = $modal.find('#gcsm__message');
    const $preview = $modal.find('#gcsm__preview');
    const $submitBtn = $modal.find('.gcsm__form-submit');
    const $promptName = $modal.find('.gcsm__modal-prompt');
    const $feedback = $modal.find('.gcsm__feedback');

    let currentPromptType = null;
    let currentGroupId = null;
    let isSubmitting = false;
    let conditionRecipients = [];
    let coursesLoaded = false;
    let resolveTimer = null;


    // Per-condition required-input map. Drives both UI toggles and validation.
    const CONDITION_INPUTS = {
        outstanding_login:      { days: false, course: false, quiz: false },
        inactive_days:        { days: true,  course: false, quiz: false },
        outstanding_course_access:     { days: false, course: true,  quiz: false },
        outstanding_quiz_completed:   { days: false, course: true,  quiz: true  },
        outstanding_course_completed: { days: false, course: true,  quiz: false },
        registered_for_days:  { days: true,  course: false, quiz: false },
        enrolled_for_days:    { days: true,  course: true,  quiz: false },
        course_completed:     { days: false, course: true,  quiz: false },
    };

    // Conditions allowed per prompt type. Use null to mean "no restriction"
    // (every condition is selectable — used by 'custom'). Unknown prompt
    // types fall through to the no-restriction default so a future prompt
    // doesn't silently lose its conditions before this map is updated.
    const PROMPT_TYPE_CONDITIONS = {
        'password-reset':      ['outstanding_login'],
        'course-progress':     ['outstanding_login', 'inactive_days', 'outstanding_course_access', 'outstanding_course_completed', 'outstanding_quiz_completed'],
        'assessment-deadline': ['outstanding_course_access', 'outstanding_quiz_completed'],
        'welcome-reminder':    ['outstanding_course_access', 'outstanding_login'],
        'custom':              null,
    };

    // ── Flatpickr init ────────────────────────────────────────────────────────

    const FP_SHARED = {
        enableTime:     true,
        dateFormat:     'Y-m-d\\TH:i',
        altInput:       true,
        altInputClass:  'flatpickr-input flatpickr-alt-input',
        altFormat:      'j M Y, H:i',
        time_24hr:      true,
        disableMobile:  true,
        minDate:        'today',
        maxDate:        new Date().fp_incr(365),
        position:       'above',
        onReady(_, __, fp) {
            fp.calendarContainer.classList.add('bys-fp');
            if (fp.altInput && fp.config.placeholder) {
                fp.altInput.placeholder = fp.config.placeholder;
            }
        },
    };

    const $scheduleClear = $modal.find('.gcsm__schedule-clear');

    const scheduleFp = flatpickr($modal.find('#gcsm__schedule-datetime')[0], {
        ...FP_SHARED,
        placeholder: 'No schedule',
        onChange: (selectedDates) => {
            $scheduleClear.toggle(selectedDates.length > 0);
        },
    });

    // Clicking anywhere in the schedule field (icon, gap) opens the picker —
    // except the clear button, which has its own handler.
    $modal.find('#gcsm__schedule-datetime')
        .closest('.gcsm__form-schedule')
        .on('click', (e) => {
            if (e.target.closest('.gcsm__schedule-clear')) return;
            if (!e.target.classList.contains('flatpickr-alt-input')) scheduleFp.open();
        });

    // Clear button — empties the picker. Submit handler treats an empty
    // schedule value as an immediate send (no scheduled_at in payload).
    $scheduleClear.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        scheduleFp.clear();
        $scheduleClear.hide();
    });

    /**
     * Modal management
     */
    function closeModal() {
        $modal.addClass('hidden');
        $('html').css('overflow', '');
    }

    $modal.find('.gcsm__modal-close').on('click', closeModal);
    $backdrop.on('click', closeModal);

    // Recipient type toggle
    $radios.on('change', function () {
        const val = $(this).val();
        $individual.toggle(val === 'individual');
        $condition.toggle(val === 'condition');
        $conditionalRecipientsWrap.toggle(val === 'condition');

        if (val === 'condition') {
            loadGroupCourses();
        } else {
            resetConditionState();
        }
        // Switching to/from 'condition' changes whether the condition's
        // course_id contributes to the CTA URL; re-render the preview.
        refreshPreviewForCurrentSelection();
    });

    // Condition select — toggle which sub-inputs are visible and trigger resolve
    $conditionSelect.on('change', function () {
        const cond = $(this).val();
        const inputs = CONDITION_INPUTS[cond] || { days: false, course: false, quiz: false };
        $conditionDaysWrap.toggle(inputs.days);
        $conditionCourseWrap.toggle(inputs.course);
        $conditionQuizWrap.toggle(inputs.quiz);

        // Reset sub-inputs on condition change to avoid stale values
        $conditionDays.val('');
        $conditionCourse.val('');
        $conditionQuiz.val('').empty();
        appendOption($conditionQuiz, '', 'Select a quiz…');
        validateDaysInput(); // re-runs against the now-empty field, hides any stale error

        scheduleResolveRecipients();
        // Condition change resets $conditionCourse to '' — preview should
        // revert to the template's default URL until a course is picked.
        refreshPreviewForCurrentSelection();
    });

    // Sub-input bindings — debounced resolve
    $conditionDays.on('input change', function () {
        validateDaysInput();
        scheduleResolveRecipients();
    });
    $conditionCourse.on('change', async function () {
        const cond = $conditionSelect.val();
        if (cond === 'outstanding_quiz_completed') {
            await loadCourseQuizzes(parseInt($(this).val(), 10) || 0);
        }
        scheduleResolveRecipients();
        // Deep-link the CTA in the preview to the newly picked course
        // (or revert to the template default if the course was cleared).
        refreshPreviewForCurrentSelection();
    });
    $conditionQuiz.on('change', scheduleResolveRecipients);

    // Clears the recipient preview area. Does NOT touch the days-validation
    // error — that is owned solely by validateDaysInput() so an invalid entry
    // persists its error message until the user fixes or clears the field.
    function resetConditionState() {
        conditionRecipients = [];
        $conditionalRecipientsList.empty();
        $conditionalRecipientsTable.hide();
        $conditionalRecipientsSkeleton.hide();
        $conditionalRecipientsEmpty.text('Select a condition to preview recipients.').show();
    }

    // Format a server-supplied `details` payload (see attach_details in
    // class-conditional-emails.php) into the single string the table cell
    // shows. The server emits `since_at` as ISO 8601 UTC; we render it in
    // the LEADER's browser timezone (with TZ abbreviation) so the moment
    // is unambiguous and doesn't depend on the site's gmt_offset.
    //
    // Returns an em-dash when the anchor timestamp wasn't available — e.g.
    // user has never logged in for inactive_days.
    function formatDetails(details) {
        if (!details || !details.kind || !details.since_at) return '—';

        const LABELS = {
            inactive:   'Last active',
            registered: 'Registered',
            enrolled:   'Enrolled',
        };
        const label = LABELS[details.kind];
        if (!label) return '';

        // `new Date(isoUtcString)` parses the offset correctly and produces
        // a Date in browser-local time; toLocaleString respects that.
        const fmt = new Date(details.since_at).toLocaleString('en-US', {
            year:         'numeric',
            month:        'short',
            day:          'numeric',
            hour:         'numeric',
            minute:       '2-digit',
            timeZoneName: 'short',
        });
        return `${label}: ${fmt}`;
    }

    // Same moment as formatDetails(), rendered in UTC. Used as the hover
    // tooltip so the leader can disambiguate without any mental TZ math
    // (and so a screenshotted preview is portable between leaders in
    // different timezones).
    function formatDetailsUtcTooltip(sinceAt) {
        if (!sinceAt) return '';
        return new Date(sinceAt).toLocaleString('en-US', {
            year:         'numeric',
            month:        'short',
            day:          'numeric',
            hour:         'numeric',
            minute:       '2-digit',
            timeZone:     'UTC',
            timeZoneName: 'short',
        });
    }

    // Returns true when the days input is empty OR a positive integer.
    function validateDaysInput() {
        const raw = String($conditionDays.val() ?? '').trim();
        if (raw === '') {
            $conditionDaysError.hide();
            return true;
        }
        const isValid = /^[1-9]\d*$/.test(raw);
        $conditionDaysError.toggle(!isValid);
        return isValid;
    }

    /**
     * Append an <option> to $select using the shared template.
     */
    function appendOption($select, value, label) {
        const tpl = $block.find('template.gcsm__template-select-option')[0];
        const $opt = $(tpl.content.firstElementChild.cloneNode(true));
        $opt.attr('value', value).text(label);
        $select.append($opt);
    }

    /**
     * Append a disabled "empty state" row to a multiselect list.
     */
    function appendMultiselectEmpty($list, label) {
        const tpl = $block.find('template.gcsm__template-multiselect-empty')[0];
        const $li = $(tpl.content.firstElementChild.cloneNode(true));
        $li.find('[data-field="label"]').text(label);
        $list.append($li);
    }

    async function loadGroupCourses() {
        if (coursesLoaded || !currentGroupId) return;
        try {
            // Prefer cached courses from the store — group-select forceRefreshes
            // them on every page load, so this is fresh and avoids a redundant
            // round trip when the user opens the modal.
            const cachedCourses = store.getCurrentGroup() === Number(currentGroupId)
                ? store.getCourses()
                : null;
            let courses;
            if (cachedCourses !== null) {
                console.log('[bys-store] send-modal: HIT — courses from store', cachedCourses);
                courses = cachedCourses;
            } else {
                console.log('[bys-store] send-modal: MISS — fetching group courses');
                courses = await api.get(endpoints.groupCourses(currentGroupId));
            }
            $conditionCourse.empty();
            appendOption($conditionCourse, '', 'Select a course…');
            (courses || []).forEach(c => {
                const id = c.id ?? c.ID ?? c.course_id;
                const title = c.title?.rendered ?? c.title ?? c.post_title ?? `Course #${id}`;
                appendOption($conditionCourse, id, title);
            });
            coursesLoaded = true;
        } catch (err) {
            console.error('[send-modal] Failed to load group courses:', err);
        }
    }

    async function loadCourseQuizzes(courseId) {
        $conditionQuiz.empty();
        appendOption($conditionQuiz, '', 'Select a quiz…');
        if (!courseId) return;
        try {
            const quizzes = await api.get(endpoints.courseQuizzes(courseId));
            (quizzes || []).forEach(q => {
                appendOption($conditionQuiz, q.id, q.title);
            });
        } catch (err) {
            console.error('[send-modal] Failed to load course quizzes:', err);
        }
    }

    function scheduleResolveRecipients() {
        clearTimeout(resolveTimer);
        resolveTimer = setTimeout(resolveRecipients, 300);
    }

    function buildConditionPayload() {
        const cond = $conditionSelect.val();
        if (!cond) return null;
        const inputs = CONDITION_INPUTS[cond];
        if (!inputs) return null;

        const payload = { condition: cond };
        if (inputs.days) {
            if (!validateDaysInput()) return null;
            const d = parseInt($conditionDays.val(), 10);
            if (!d || d < 1) return null;
            payload.days = d;
        }
        if (inputs.course) {
            const c = parseInt($conditionCourse.val(), 10);
            if (!c) return null;
            payload.course_id = c;
        }
        if (inputs.quiz) {
            const q = parseInt($conditionQuiz.val(), 10);
            if (!q) return null;
            payload.quiz_id = q;
        }
        return payload;
    }

    async function resolveRecipients() {
        const payload = buildConditionPayload();
        if (!payload || !currentGroupId) {
            resetConditionState();
            return;
        }

        $conditionalRecipientsTable.hide();
        $conditionalRecipientsEmpty.hide();
        $conditionalRecipientsList.empty();
        $conditionalRecipientsSkeleton.show();

        try {
            const url = endpoints.conditionalRecipients(currentGroupId);
            const response = await api.post(url, payload);

            const recipients = (response && Array.isArray(response.recipients)) ? response.recipients : [];
            conditionRecipients = recipients.map(r => r.user_id);

            if (recipients.length === 0) {
                $conditionalRecipientsTable.hide();
                $conditionalRecipientsEmpty.text('No users match this condition.').show();
                return;
            }

            // Toggle the Details column on for day-based conditions.
            // The class controls both the grid layout and per-cell visibility.
            const hasDetails = recipients.some(r => r.details && r.details.kind);
            $conditionalRecipientsTable.toggleClass('gcsm__recipients-preview-table--with-details', hasDetails);

            const rowTpl = $block.find('template.gcsm__template-recipient-row')[0];
            recipients.forEach(r => {
                const $row = $(rowTpl.content.firstElementChild.cloneNode(true));
                $row.find('[data-field="name"]').text(r.display_name);
                $row.find('[data-field="email"]').text(r.email);
                $row.find('[data-field="user-id"]').text(r.user_id);

                const $detailsLine = $row.find('[data-field="details"] .gcsm__details-line');
                $detailsLine.text(formatDetails(r.details));
                $detailsLine.attr('title', formatDetailsUtcTooltip(r.details?.since_at));

                $conditionalRecipientsList.append($row);
            });
            $conditionalRecipientsTable.show();
        } catch (err) {
            console.error('[send-modal] Failed to resolve conditional recipients:', err);
            $conditionalRecipientsTable.hide();
            $conditionalRecipientsEmpty.text('Error loading recipients.').show();
            conditionRecipients = [];
        } finally {
            $conditionalRecipientsSkeleton.hide();
        }
    }

    /**
     * Show the skeleton while waiting for the group ID to resolve.
     */
    function showSkeleton() {
        $formSkeleton.show();
        $form.hide();
    }

    /**
     * Hide the skeleton and show the form once data is ready.
     */
    function showForm() {
        $formSkeleton.hide();
        $form.show();
    }

    /**
     * Entry point for opening the modal. If the group ID hasn't resolved
     * yet (group-select is still fetching), show the skeleton and defer
     * setup until the `bys:groupSelected` event fires.
     */
    function handleOpenSendModal(promptType, promptTitle) {
        currentPromptType = promptType;
        $promptName.text(promptTitle);
        $form.attr('data-prompt-type', promptType);

        // Prefer the store's current group; fall back to legacy global.
        const groupId = store.getCurrentGroup();
        if (groupId) {
            currentGroupId = groupId;
            showForm();
            setupForm(promptType);
            return;
        }

        // Group ID not yet resolved — show skeleton and wait.
        showSkeleton();
        $(document).one('bys:groupSelected', (e, data) => {
            currentGroupId = data?.groupId ?? store.getCurrentGroup();
            if (!currentGroupId) {
                console.error('[comm:open-send-modal] Group ID still unresolved after bys:groupSelected');
                return;
            }
            showForm();
            setupForm(promptType);
        });
    }

    /**
     * Reset form state and populate dynamic fields for the chosen prompt.
     * Assumes currentGroupId is set.
     */
    async function setupForm(promptType) {
        $form[0].reset();
        resetConditionState();
        validateDaysInput(); // hide stale days error after form reset
        $conditionDaysWrap.hide();
        $conditionCourseWrap.hide();
        $conditionQuizWrap.hide();
        $modal.find('input[name="recipient"][value="group"]').prop('checked', true).trigger('change');

        scheduleFp.clear();
        $feedback.hide();

        await populateGroupUsers(currentGroupId);
        await loadPromptTemplate(promptType, currentGroupId);
        applyConditionFilterForPrompt(promptType);
    }

    /**
     * Narrow #gcsm__condition's option list to the conditions relevant to
     * the active prompt type. Non-allowed options are both hidden (so they
     * don't render in the dropdown) AND disabled (so keyboard navigation
     * skips them). The empty placeholder is always preserved.
     *
     * Called from setupForm — re-applied on every modal open because the
     * prompt type can change between opens. PROMPT_TYPE_CONDITIONS[type] of
     * null (or an unknown type) means "no restriction" and re-enables every
     * option, which matters when switching from a restrictive prompt back
     * to 'custom' on the same page load.
     */
    function applyConditionFilterForPrompt(promptType) {
        const allowed = PROMPT_TYPE_CONDITIONS[promptType];
        $conditionSelect.find('option').each(function () {
            const $opt = $(this);
            const value = $opt.attr('value');
            if (value === '') return; // never hide the placeholder
            const visible = !allowed || allowed.includes(value);
            $opt.prop('hidden', !visible).prop('disabled', !visible);
        });
    }

    /**
     * Re-render the preview pane to match the leader's current selection.
     *
     * Called whenever a control that the mailer's CTA-URL logic depends on
     * changes (recipient mode, condition select, course select). Reads the
     * live state, derives the course_id to send to the template endpoint,
     * and delegates to loadPromptTemplate.
     *
     * Mirrors the server's send-time rule: course_id only matters when
     * recipient mode is 'condition'. For 'group' and 'individual' modes the
     * mailer ignores any picked course, so the preview should fall back to
     * the template's default URL too.
     */
    async function refreshPreviewForCurrentSelection() {
        if (!currentPromptType || !currentGroupId) return;
        const recipientMode = $modal.find('input[name="recipient"]:checked').val();
        const courseId = (recipientMode === 'condition')
            ? (parseInt($conditionCourse.val(), 10) || 0)
            : 0;
        await loadPromptTemplate(currentPromptType, currentGroupId, courseId);
    }

    // The prompts block dispatches both a jQuery custom event and a native
    // CustomEvent for the same click. Listen on jQuery only — both events
    // carry identical data, and listening to both would fire setup twice.
    $(document).on('comm:open-send-modal', (e, data) => {
        handleOpenSendModal(data.promptType, data.promptTitle);
    });

    /**
     * Populate the modal's subject + body UI for the selected prompt.
     *
     * Subjects are now fixed per prompt type (see bys_get_*_email helpers
     * in includes/emails/group-comms.php) — including the 'custom' prompt
     * which uses the fixed line "Build Your Skills | You have received a
     * message from your group leader". The leader never edits the subject
     * directly; the disabled input reflects what the server will send.
     *
     * Body UI branches on prompt type:
     *  - 'custom': textarea visible so the leader writes the message body;
     *    preview pane hidden (rendering the template with an empty body
     *    would only show the wrapper chrome, which is misleading).
     *  - any other prompt: textarea hidden, preview pane shows the
     *    server-rendered HTML with the group's name + site context already
     *    substituted in.
     */
    async function loadPromptTemplate(promptType, groupId, courseId = 0) {
        try {
            // courseId > 0 deep-links the CTA button to that course's page —
            // mirrors what the mailer does at send time when the chosen
            // condition has a course_id. Server ignores the param for
            // templates without a navigational CTA (password-reset, custom).
            let url = `/wp-json/bys-groups/v1/groups/${groupId}/template/${promptType}`;
            if (courseId > 0) url += `?course_id=${courseId}`;
            const response = await api.get(url);

            if (!response || !response.subject) {
                console.error('[group-communication-send-modal] Invalid template response:', response);
                $subjectInput.val('');
                $preview.hide();
                $message.show().val('').prop('disabled', false);
                return;
            }

            $subjectInput.val(response.subject);

            if (promptType === 'custom') {
                $preview.hide().empty();
                $message.show().val('').prop('disabled', false);
            } else {
                $message.hide().val('');
                $preview.show().html(response.html || '');
            }
        } catch (err) {
            console.error('[group-communication-send-modal] Template fetch failed:', err);
            $subjectInput.val('');
            $preview.hide();
            $message.show().val('Error loading template preview.').prop('disabled', true);
        }
    }

    /**
     * Populate group-users multiselect for 'individual' sending.
     * Fills the dropdown with one checkbox per member.
     *
     * Reads user_ids from bysGroupsStore (canonical source after group-select
     * runs). No round trip to the user/stats endpoint.
     */
    async function populateGroupUsers(groupId) {
        const $multiselect = $modal.find('#gcsm__recipient-selection');
        const $list = $multiselect.find('.bys-multiselect__list');
        const $recipientSkeleton = $modal.find('.gcsm__recipient-mode--individual .gcsm__skeleton');

        $recipientSkeleton.show();
        $multiselect.hide();
        $list.empty();

        try {
            // user_ids come from the store. Modal can only be opened after a
            // group is selected, so the store is guaranteed populated.
            const userIds = store.getCurrentGroup() === Number(groupId)
                ? store.getUserIds()
                : null;
            console.log('[bys-store] send-modal: user_ids from store', userIds);

            if (!Array.isArray(userIds) || userIds.length === 0) {
                console.warn('[group-communication-send-modal] No group members found');
                appendMultiselectEmpty($list, 'No members in group');
                return;
            }

            // Hydrated-cache fast path for the recipient list
            const cachedHydrated = store.getCurrentGroup() === Number(groupId)
                ? store.getHydratedUsers(userIds)
                : null;
            let users;
            if (cachedHydrated !== null) {
                console.log('[bys-store] send-modal: HIT hydrated users — populating from store, skipping fetch');
                users = cachedHydrated;
            } else {
                console.log('[bys-store] send-modal: MISS hydrated — fetching groupUsers and writing through');
                users = await api.get(endpoints.groupUsers(groupId, userIds.join(',')));
                if (Array.isArray(users)) store.setUsers(users);
            }

            if (!Array.isArray(users)) {
                console.error('[group-communication-send-modal] Invalid response');
                return;
            }

            const optionTpl = $block.find('template.gcsm__template-multiselect-option')[0];
            users.forEach(user => {
                const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || user.email;
                const $li = $(optionTpl.content.firstElementChild.cloneNode(true));
                $li.find('input.bys-multiselect__checkbox')
                    .attr('value', user.id)
                    .attr('data-name', name);
                $li.find('[data-field="label"]').text(`${name} (${user.email})`);
                $list.append($li);
            });
        } catch (err) {
            console.error('[group-communication-send-modal] Error:', err);
            appendMultiselectEmpty($list, 'Error loading members');
        } finally {
            $recipientSkeleton.hide();
            $multiselect.show();
            renderRecipientPills();
        }
    }

    /**
     * Re-render the pill row inside the recipient multiselect based on which
     * checkboxes are currently checked.
     */
    function renderRecipientPills() {
        const $multiselect = $modal.find('#gcsm__recipient-selection');
        const $pills = $multiselect.find('.bys-multiselect__pills');
        const $checked = $multiselect.find('.bys-multiselect__checkbox:checked');

        $pills.empty();

        if ($checked.length === 0) {
            const placeholderTpl = $block.find('template.gcsm__template-multiselect-placeholder')[0];
            const $placeholder = $(placeholderTpl.content.firstElementChild.cloneNode(true));
            $placeholder.text('Select recipients…');
            $pills.append($placeholder);
            return;
        }

        const pillTpl = $block.find('template.gcsm__template-multiselect-pill')[0];
        $checked.each(function () {
            const value = $(this).val();
            const name = $(this).attr('data-name') || value;
            const $pill = $(pillTpl.content.firstElementChild.cloneNode(true));
            $pill.attr('data-value', value);
            $pill.find('[data-field="label"]').text(name);
            $pill.find('.bys-multiselect__pill-remove').attr('data-value', value);
            $pills.append($pill);
        });
    }

    // Toggle dropdown open/closed
    $modal.on('click', '#gcsm__recipient-selection .bys-multiselect__control', function (e) {
        // Ignore clicks on pill-remove (handled separately)
        if ($(e.target).closest('.bys-multiselect__pill-remove').length) return;
        const $multiselect = $modal.find('#gcsm__recipient-selection');
        const isOpen = $multiselect.attr('aria-expanded') === 'true';
        $multiselect.attr('aria-expanded', !isOpen);
        $multiselect.find('.bys-multiselect__dropdown').toggleClass('hidden', isOpen);
    });

    // Sync pill row + aria-selected state on checkbox change
    $modal.on('change', '#gcsm__recipient-selection .bys-multiselect__checkbox', function () {
        $(this).closest('.bys-multiselect__option').attr('aria-selected', this.checked);
        renderRecipientPills();
    });

    // Pill remove → uncheck the matching option
    $modal.on('click', '#gcsm__recipient-selection .bys-multiselect__pill-remove', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const value = $(this).data('value');
        $modal.find(`#gcsm__recipient-selection .bys-multiselect__checkbox[value="${value}"]`)
            .prop('checked', false)
            .trigger('change');
    });

    // Close dropdown on outside click
    $(document).on('click', (e) => {
        if (!$(e.target).closest('#gcsm__recipient-selection').length) {
            const $multiselect = $modal.find('#gcsm__recipient-selection');
            $multiselect.attr('aria-expanded', 'false');
            $multiselect.find('.bys-multiselect__dropdown').addClass('hidden');
        }
    });

    /**
     * Form submit handler
     */
    $form.on('submit', async function (e) {
        e.preventDefault();

        if (isSubmitting || !currentPromptType || !currentGroupId) {
            return;
        }

        isSubmitting = true;
        $submitBtn.prop('disabled', true).text('Sending...');

        try {
            const recipientType = $form.find('input[name="recipient"]:checked').val();
            const customMessage = currentPromptType === 'custom' ? $message.val() : '';

            // Get selected recipient IDs for individual type
            let recipientIds = [];
            let conditionPayload = null;
            if (recipientType === 'individual') {
                recipientIds = $modal
                    .find('#gcsm__recipient-selection .bys-multiselect__checkbox:checked')
                    .map(function () { return parseInt($(this).val(), 10); })
                    .get();
            } else if (recipientType === 'condition') {
                const built = buildConditionPayload();
                if (!built || conditionRecipients.length === 0) {
                    showFeedback('Please pick a condition with matching recipients.', 'error');
                    isSubmitting = false;
                    $submitBtn.prop('disabled', false).text('Send Prompt');
                    return;
                }
                recipientIds = conditionRecipients.slice();
                conditionPayload = {
                    type:      built.condition,
                    days:      built.days ?? 0,
                    course_id: built.course_id ?? 0,
                    quiz_id:   built.quiz_id ?? 0,
                };
            }

            // Get scheduled datetime from flatpickr (convert to UTC if set)
            const localDatetime = $modal.find('#gcsm__schedule-datetime').val() || '';
            const scheduledAt = localDatetime ? convertToUTC(localDatetime) : '';

            // POST to REST endpoint
            const url = `/wp-json/bys-groups/v1/groups/${currentGroupId}/send-communication`;
            const body = {
                prompt_type: currentPromptType,
                recipient_type: recipientType,
                recipient_ids: recipientIds,
                custom_message: customMessage,
                scheduled_at: scheduledAt,
            };
            if (conditionPayload) body.condition = conditionPayload;
            const response = await api.post(url, body);

            if (response && response.success) {
                showFeedback(`Email sent to ${response.sent_count} recipient(s)`, 'success');
                // Close modal after delay to let user see success message, refresh after
                setTimeout(() => {
                    closeModal();

                    setTimeout(() => {
                        window.location.reload();
                    }, 300);
                }, 5000);
            } else {
                const errors = (response && response.errors) ? response.errors.join(', ') : 'Unknown error';
                showFeedback(`Failed to send: ${errors}`, 'error');
            }
        } catch (err) {
            console.error('[group-communication-send-modal] Submit error:', err);
            showFeedback(`Error: ${err.message}`, 'error');
        } finally {
            isSubmitting = false;
            $submitBtn.prop('disabled', false).text('Send Prompt');
        }
    });

    /**
     * Show feedback message (success or error)
     */
    function showFeedback(message, variant = 'success') {
        $feedback.text(message);
        $feedback.removeClass('gcsm__feedback--success gcsm__feedback--error');
        $feedback.addClass(`gcsm__feedback--${variant}`);
        $feedback.show();
    }

    // MutationObserver for scroll lock
    new MutationObserver(() => {
        $('html').css('overflow', $modal.hasClass('hidden') ? '' : 'hidden');
    }).observe($modal[0], { attributes: true, attributeFilter: ['class'] });
});
