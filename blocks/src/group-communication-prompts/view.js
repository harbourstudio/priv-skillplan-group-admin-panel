jQuery(document).ready(($) => {
    const $block = $('.wp-block-bys-groups-group-communication-prompts').first();
    if (!$block.length) return;

    $block.on('click', '[data-opens-modal]', function () {
        const targetId = $(this).data('opensModal');
        const $modal   = $(targetId);
        if (!$modal.length) return;

        $modal.removeClass('hidden');
        $('html').css('overflow', 'hidden');

        // If this is the send modal, emit a custom event with prompt data
        if (targetId === '#communication-send-modal') {
            const promptType = $(this).data('prompt-type');
            const promptTitle = $(this).data('prompt-title');

            // Create jQuery custom event
            if ($(document).trigger) {
                $(document).trigger('comm:open-send-modal', { promptType, promptTitle });
            }

            // Try CustomEvent API as a fallback
            try {
                const event = new CustomEvent('comm:open-send-modal', {
                    detail: { promptType, promptTitle },
                    bubbles: false,
                    cancelable: true
                });
                document.dispatchEvent(event);
            } catch (err) {
                console.warn('[group-communication-prompts] Error:', err);
            }
        }
    });
});
