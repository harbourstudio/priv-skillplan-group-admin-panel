import { api, endpoints } from '../_shared/api-client.js';
import { convertToUTC } from '../_shared/helpers.js';
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
    const $subject = $modal.find('#gcsm__subject');
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
        $conditionQuiz.val('').empty().append('<option value="">Select a quiz…</option>');
        validateDaysInput(); // re-runs against the now-empty field, hides any stale error

        scheduleResolveRecipients();
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

    async function loadGroupCourses() {
        if (coursesLoaded || !currentGroupId) return;
        try {
            const courses = await api.get(endpoints.groupCourses(currentGroupId));
            $conditionCourse.empty().append('<option value="">Select a course…</option>');
            (courses || []).forEach(c => {
                const id = c.id ?? c.ID ?? c.course_id;
                const title = c.title?.rendered ?? c.title ?? c.post_title ?? `Course #${id}`;
                $conditionCourse.append(`<option value="${id}">${title}</option>`);
            });
            coursesLoaded = true;
        } catch (err) {
            console.error('[send-modal] Failed to load group courses:', err);
        }
    }

    async function loadCourseQuizzes(courseId) {
        $conditionQuiz.empty().append('<option value="">Select a quiz…</option>');
        if (!courseId) return;
        try {
            const quizzes = await api.get(endpoints.courseQuizzes(courseId));
            (quizzes || []).forEach(q => {
                $conditionQuiz.append(`<option value="${q.id}">${q.title}</option>`);
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

            recipients.forEach(r => {
                const $row = $('<li class="gcsm__recipients-preview-row" role="row"></li>');
                $row.append($('<span role="cell"></span>').text(r.display_name));
                $row.append($('<span role="cell"></span>').text(r.email));
                $row.append($('<span role="cell"></span>').text(r.user_id));
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

        const groupId = window.bysGroupData?.groupId;
        if (groupId) {
            currentGroupId = groupId;
            showForm();
            setupForm(promptType);
            return;
        }

        // Group ID not yet resolved — show skeleton and wait.
        showSkeleton();
        $(document).one('bys:groupSelected', (e, data) => {
            currentGroupId = data?.groupId ?? window.bysGroupData?.groupId;
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

        // Subject row stays visible for all prompt types; only its editable state changes.
        if (promptType === 'custom') {
            $subject.prop('disabled', false).removeClass('disabled');
            $message.show().prop('readonly', false);
            $preview.hide();
        } else {
            $subject.prop('disabled', true).addClass('disabled');
            await loadPromptTemplate(promptType, currentGroupId);
        }

        await populateGroupUsers(currentGroupId);
    }

    // Listen for jQuery custom event
    $(document).on('comm:open-send-modal', (e, data) => {
        handleOpenSendModal(data.promptType, data.promptTitle);
    });

    // Listen for native CustomEvent as fallback
    document.addEventListener('comm:open-send-modal', (e) => {
        handleOpenSendModal(e.detail.promptType, e.detail.promptTitle);
    });

    /**
     * Load and display prompt template preview from REST API
     */
    async function loadPromptTemplate(promptType, groupId) {
        try {
            const url = `/wp-json/bys-groups/v1/groups/${groupId}/template/${promptType}`;
            const response = await api.get(url);

            if (response && response.subject && response.html) {
                // Set subject field
                $subject.val(response.subject);

                // Hide textarea and show preview
                $message.hide();
                $preview.show();
                $preview.html(response.html);
            } else {
                console.error('[group-communication-send-modal] Invalid response:', response);
                $preview.hide();
                $message.show();
                $message.val('Template preview unavailable.');
            }
        } catch (err) {
            console.error('[group-communication-send-modal] Error:', err);
            $preview.hide();
            $message.show();
            $message.val('Error loading template preview.');
        }
    }

    /**
     * Populate group-users select for 'individual' sending
     */
    async function populateGroupUsers(groupId) {
        const $select = $modal.find('#gcsm__recipient-selection');
        const $recipientSkeleton = $modal.find('.gcsm__recipient-mode--individual .gcsm__skeleton');

        $recipientSkeleton.show();
        $select.hide();

        try {
            // First, get base user stats to get all user IDs
            const baseStats = await api.get(endpoints.groupBaseUsersStats(groupId));

            if (!baseStats || !Array.isArray(baseStats.user_ids) || baseStats.user_ids.length === 0) {
                console.warn('[group-communication-send-modal] No group members found');
                $select.html('<option disabled>No members in group</option>');
                return;
            }

            // Fetch user details using user IDs
            const userIds = baseStats.user_ids;
            const users = await api.get(endpoints.groupUsers(groupId, userIds.join(',')));

            if (!Array.isArray(users)) {
                console.error('[group-communication-send-modal] Invalid response');
                return;
            }

            $select.html('');
            users.forEach(user => {
                const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || user.email;
                const $option = $(`<option value="${user.id}"></option>`);
                $option.text(`${name} (${user.email})`);
                $select.append($option);
            });
        } catch (err) {
            console.error('[group-communication-send-modal] Error:', err);
            $select.html('<option disabled>Error loading members</option>');
        } finally {
            $recipientSkeleton.hide();
            $select.show();
        }
    }

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
            const customSubject = $subject.val();
            const customMessage = currentPromptType === 'custom' ? $message.val() : '';

            // Get selected recipient IDs for individual type
            let recipientIds = [];
            let conditionPayload = null;
            if (recipientType === 'individual') {
                recipientIds = Array.from($modal.find('#gcsm__recipient-selection').val() || []).map(v => parseInt(v, 10));
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
                custom_subject: customSubject,
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
