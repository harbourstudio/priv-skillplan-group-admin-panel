jQuery(document).ready(($) => {
    const $block = $('.wp-block-bys-groups-group-communication-prompts').first();
    if (!$block.length) return;

    $block.on('click', '[data-opens-modal]', function () {
        const targetId = $(this).data('opensModal');
        const $modal   = $(targetId);
        if (!$modal.length) return;

        $modal.removeClass('hidden');
        $('html').css('overflow', 'hidden');
    });
});
