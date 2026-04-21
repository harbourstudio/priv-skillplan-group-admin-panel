jQuery(document).ready(($) => {
    const $block = $('.wp-block-bys-groups-group-communication-log').first();
    if (!$block.length) return;

    const $showMore  = $block.find('.comm-log__show-more');
    const $hidden    = $block.find('.comm-log__row--hidden');

    $showMore.on('click', () => {
        $hidden.removeClass('comm-log__row--hidden');
        $showMore.hide();
    });

    $block.on('click', '[data-opens-modal]', function () {
        const targetId  = $(this).data('opensModal');
        const batchDate = $(this).data('batchDate');
        const $modal    = $(targetId);
        if (!$modal.length) return;

        $modal.removeClass('hidden');
        $('html').css('overflow', 'hidden');

        $(document).trigger('comm:open-batch', { date: batchDate });
    });
});
