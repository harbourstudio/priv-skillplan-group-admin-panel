import { api, endpoints } from '../_shared/api-client.js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

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

jQuery(document).ready(function($) {
    const $block = $('.wp-block-bys-groups-group-communication-send-modal').first();
    if (!$block.length) return;

    const $modal = $block.find('#communication-send-modal');
    const $backdrop = $modal.find('.csm__modal-backdrop');
    const $form = $modal.find('.csm__form');
    const $radios = $modal.find('input[name="recipient"]');
    const $individual = $modal.find('.csm__form-group--individual');
    const $condition = $modal.find('.csm__form-group--condition');
    const $subject = $modal.find('#csm__subject');
    const $message = $modal.find('#csm__message');
    const $preview = $modal.find('#csm__preview');
    const $messageGroup = $message.closest('.csm__form-group');
    const $submitBtn = $modal.find('.csm__form-submit');
    const $promptName = $modal.find('.csm__modal-prompt');
    const $feedback = $modal.find('.csm__feedback');

    let currentPromptType = null;
    let currentGroupId = null;
    let isSubmitting = false;

    // ── Flatpickr init ────────────────────────────────────────────────────────

    const FP_SHARED = {
        enableTime:     true,
        dateFormat:     'Y-m-d\\TH:i',
        altInput:       true,
        altInputClass:  'flatpickr-input flatpickr-alt-input',
        altFormat:      'j M Y, H:i',
        time_24hr:      true,
        disableMobile:  true,
        static: true,
        position: 'above right',
        onReady(_, __, fp) {
            fp.calendarContainer.classList.add('bys-fp');
            if (fp.altInput && fp.config.placeholder) {
                fp.altInput.placeholder = fp.config.placeholder;
            }
        },
    };

    const scheduleFp = flatpickr($modal.find('#csm__schedule-datetime')[0], {
        ...FP_SHARED,
        placeholder: 'No schedule',
    });

    // Clicking anywhere in the schedule field (icon, gap) opens the picker
    $modal.find('#csm__schedule-datetime')
        .closest('.csm__form-schedule')
        .on('click', (e) => {
            if (!e.target.classList.contains('flatpickr-alt-input')) scheduleFp.open();
        });

    /**
     * Modal management
     */
    function closeModal() {
        $modal.addClass('hidden');
        $('html').css('overflow', '');
    }

    $modal.find('.csm__modal-close').on('click', closeModal);
    $backdrop.on('click', closeModal);

    // Recipient type toggle
    $radios.on('change', function () {
        const val = $(this).val();
        $individual.toggle(val === 'individual');
        $condition.toggle(val === 'condition');
    });

    /**
     * Handle 'open modal' event from group-communication-prompts block
     */
    async function handleOpenSendModal(promptType, promptTitle) {
        currentPromptType = promptType;
        currentGroupId = window.bysGroupData?.groupId;

        if (!currentGroupId) {
            console.error('[comm:open-send-modal] Group ID not found');
            return;
        }

        // Update modal title
        $promptName.text(promptTitle);
        $form.attr('data-prompt-type', promptType);

        // Reset form and set default recipient type
        $form[0].reset();
        $modal.find('input[name="recipient"][value="group"]').prop('checked', true).trigger('change');

        // Clear scheduled datetime
        scheduleFp.clear();

        // Show/hide subject field based on prompt type
        const $subjectGroup = $subject.closest('.csm__form-group');
        $subjectGroup.show();
        $feedback.hide();

        if (promptType === 'custom') {
            $subject.prop('disabled', false);
            $subject.removeClass('csm__input--disabled');
            $message.show();
            $preview.hide();
            $message.prop('readonly', false);
        } else {
            $subject.prop('disabled', true);
            $subject.addClass('csm__input--disabled');
            // Load and display prompt template preview
            await loadPromptTemplate(promptType, currentGroupId);
        }

        // Populate group users in 'individual' recipient
        await populateGroupUsers(currentGroupId);
    }

    // Listen for jQuery custom event
    $(document).on('comm:open-send-modal', async function (e, data) {
        await handleOpenSendModal(data.promptType, data.promptTitle);
    });

    // Listen for native CustomEvent as fallback
    document.addEventListener('comm:open-send-modal', async function (e) {
        await handleOpenSendModal(e.detail.promptType, e.detail.promptTitle);
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
        const $select = $modal.find('#csm__bulk-recipient');

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
            if (recipientType === 'individual') {
                recipientIds = Array.from($modal.find('#csm__bulk-recipient').val() || []).map(v => parseInt(v, 10));
            }

            // Get scheduled datetime from flatpickr (convert to UTC if set)
            const localDatetime = $modal.find('#csm__schedule-datetime').val() || '';
            const scheduledAt = localDatetime ? convertToUTC(localDatetime) : '';

            // POST to REST endpoint
            const url = `/wp-json/bys-groups/v1/groups/${currentGroupId}/send-communication`;
            const response = await api.post(url, {
                prompt_type: currentPromptType,
                recipient_type: recipientType,
                recipient_ids: recipientIds,
                custom_subject: customSubject,
                custom_message: customMessage,
                scheduled_at: scheduledAt,
            });

            if (response && response.success) {
                showFeedback(`Email sent to ${response.sent_count} recipient(s)`, 'success');
                // Close modal after delay to let user see success message
                setTimeout(() => closeModal(), 5000);
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
        $feedback.removeClass('csm__feedback--success csm__feedback--error');
        $feedback.addClass(`csm__feedback--${variant}`);
        $feedback.show();
    }

    // MutationObserver for scroll lock
    new MutationObserver(() => {
        $('html').css('overflow', $modal.hasClass('hidden') ? '' : 'hidden');
    }).observe($modal[0], { attributes: true, attributeFilter: ['class'] });
});
