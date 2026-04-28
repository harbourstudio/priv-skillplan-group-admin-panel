import { api, endpoints } from '../_shared/api-client.js';

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

    let currentPromptType = null;
    let currentGroupId = null;
    let isSubmitting = false;

    // Modal management
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

    // Handle 'open modal' event from group-communication-prompts block
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

        // Show/hide subject field based on prompt type
        const $subjectGroup = $subject.closest('.csm__form-group');
        $subjectGroup.show();

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

    // MutationObserver for scroll lock
    new MutationObserver(() => {
        $('html').css('overflow', $modal.hasClass('hidden') ? '' : 'hidden');
    }).observe($modal[0], { attributes: true, attributeFilter: ['class'] });
});
