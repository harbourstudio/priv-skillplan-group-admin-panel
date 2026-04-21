jQuery(document).ready(($) => {
    const $block      = $('.wp-block-bys-groups-group-communication-history-modal').first();
    if (!$block.length) return;

    const $modal      = $block.find('#communication-history-modal');
    const $backdrop   = $modal.find('.modal-backdrop');
    const $back       = $modal.find('.modal__back');
    const $promptName = $modal.find('.modal__prompt-name');
    const $screen1    = $modal.find('.comm-screen--1');
    const $screen2    = $modal.find('.comm-screen--2');
    const $screen3    = $modal.find('.comm-screen--3');

    let screen = 1;

    function showScreen(n, subtitle) {
        screen = n;
        $screen1.toggle(n === 1);
        $screen2.toggle(n === 2);
        $screen3.toggle(n === 3);
        $back.toggle(n > 1);
        if (subtitle !== undefined) $promptName.text(subtitle);
    }

    function closeModal() {
        $modal.addClass('hidden');
        $('html').css('overflow', '');
        showScreen(1, 'Password reset');
    }

    $modal.find('.modal__close').on('click', closeModal);
    $backdrop.on('click', closeModal);

    $(document).on('keydown.commHistoryModal', (e) => {
        if (e.key === 'Escape' && !$modal.hasClass('hidden')) closeModal();
    });

    // Called from the communication log block to open directly at screen 2
    $(document).on('comm:open-batch', (e, data) => {
        showScreen(2, data.date || '');
    });

    $back.on('click', () => {
        if (screen === 2) showScreen(1, 'Password reset');
        if (screen === 3) {
            const batchDate = $screen2.data('active-batch') || '';
            showScreen(2, batchDate);
        }
    });

    $screen1.on('click', '.comm-batch-row', function () {
        const date = $(this).data('batchDate');
        $screen2.data('active-batch', date);
        showScreen(2, date);
    });

    $screen2.on('click', '.comm-user-row', function () {
        const name = $(this).data('userName');
        $modal.find('.comm-message-recipient').text(name);
        showScreen(3, name);
    });

    new MutationObserver(() => {
        $('html').css('overflow', $modal.hasClass('hidden') ? '' : 'hidden');
    }).observe($modal[0], { attributes: true, attributeFilter: ['class'] });
});
