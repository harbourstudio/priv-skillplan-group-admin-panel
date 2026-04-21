jQuery(document).ready(($) => {
    const $modal = $('#add-member-modal');
    if (!$modal.length) return;

    function closeModal() {
        $modal.addClass('hidden');
        $('html').css('overflow', '');
    }

    // Lock scroll when Preline opens the modal by removing the 'hidden' class
    const observer = new MutationObserver(() => {
        if (!$modal.hasClass('hidden')) {
            $('html').css('overflow', 'hidden');
        }
    });
    observer.observe($modal[0], { attributes: true, attributeFilter: ['class'] });

    $modal.find('.modal__close').on('click', closeModal);
    $modal.find('.modal-backdrop').on('click', closeModal);

    $(document).on('keydown.addMemberModal', (e) => {
        if (e.key === 'Escape' && !$modal.hasClass('hidden')) closeModal();
    });
});
