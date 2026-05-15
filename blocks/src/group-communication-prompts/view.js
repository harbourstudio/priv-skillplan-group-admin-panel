jQuery(document).ready(($) => {
    const $block = $('.wp-block-bys-groups-group-communication-prompts').first();
    if (!$block.length) return;

    $block.on('click', '[data-opens-modal]', function () {
        const targetId = $(this).data('opensModal');
        const $modal   = $(targetId);
        if (!$modal.length) return;

        $modal.removeClass('hidden');
        $('html').css('overflow', 'hidden');

        const promptType = $(this).data('prompt-type');
        const promptTitle = $(this).data('prompt-title');

        // If this is the send modal, emit send event
        if (targetId === '#communication-send-modal') {
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

        // If this is the history modal, emit history event
        if (targetId === '#communication-history-modal') {
            if ($(document).trigger) {
                $(document).trigger('comm:open-history', { promptType, promptTitle });
            }

            try {
                const event = new CustomEvent('comm:open-history', {
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
