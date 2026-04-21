jQuery(document).ready(($) => {
    const $block     = $('.wp-block-bys-groups-group-communication-send-modal').first();
    if (!$block.length) return;

    const $modal     = $block.find('#communication-send-modal');
    const $backdrop  = $modal.find('.modal-backdrop');
    const $radios    = $modal.find('input[name="comm_recipients"]');
    const $individual = $modal.find('.comm-form-group--individual');
    const $condition  = $modal.find('.comm-form-group--condition');

    function closeModal() {
        $modal.addClass('hidden');
        $('html').css('overflow', '');
    }

    $modal.find('.modal__close').on('click', closeModal);
    $backdrop.on('click', closeModal);

    $(document).on('keydown.commSendModal', (e) => {
        if (e.key === 'Escape' && !$modal.hasClass('hidden')) closeModal();
    });

    $radios.on('change', function () {
        const val = $(this).val();
        $individual.toggle(val === 'individual');
        $condition.toggle(val === 'condition');
    });

    new MutationObserver(() => {
        $('html').css('overflow', $modal.hasClass('hidden') ? '' : 'hidden');
    }).observe($modal[0], { attributes: true, attributeFilter: ['class'] });
});
