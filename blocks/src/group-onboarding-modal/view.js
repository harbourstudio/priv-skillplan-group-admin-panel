import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
    const $block = $('.wp-block-bys-groups-group-onboarding-modal');
    if (!$block.length) return;

    const $modal = $block.find('#onboarding-modal');
    if (!$modal.length) return;

    const autoOpen   = $modal.attr('data-auto-open') === 'true';
    const $slides    = $modal.find('.gom__slide');
    const $dots      = $modal.find('.gom__dot');
    const totalSlides = $slides.length;
    let currentSlide  = 1;

    // ── Slide navigation ──────────────────────────────────────────────────────

    function goToSlide(n) {
        if (n < 1 || n > totalSlides) return;

        $slides.removeClass('is-active').attr('aria-hidden', 'true');
        $slides.filter(`[data-slide="${n}"]`).addClass('is-active').attr('aria-hidden', 'false');

        $dots.removeClass('is-active').attr('aria-selected', 'false');
        $dots.filter(`[data-dot="${n}"]`).addClass('is-active').attr('aria-selected', 'true');

        // Update the dialog's labelled-by to the active slide's heading.
        $modal.attr('aria-labelledby', `gom-slide-title-${n}`);

        currentSlide = n;
    }

    // Next button — delegated because each slide has its own .gom__next
    $modal.on('click', '.gom__next', () => goToSlide(currentSlide + 1));

    // Dot nav
    $modal.on('click', '.gom__dot', function () {
        goToSlide(parseInt($(this).data('dot'), 10));
    });

    // ── Open / close ──────────────────────────────────────────────────────────

    function openModal() {
        goToSlide(1);
        $modal.removeClass('hidden');
        $('html').css('overflow', 'hidden');
        setTimeout(() => { $('.hs-overlay-backdrop').remove(); }, 0);
    }

    function closeModal() {
        $modal.addClass('hidden');
        $('html').css('overflow', '');
        $('.hs-overlay-backdrop').remove();
    }

    function markSeen() {
        api.post(endpoints.markTutorialSeen()).catch(() => {});
    }

    function handleClose() {
        closeModal();
        markSeen();
    }

    $modal.find('.gom__close').on('click', handleClose);
    $modal.on('click', '.gom__finish', handleClose);
    $modal.on('click', '.gom__restart', () => goToSlide(1));
    $modal.find('.modal-backdrop').on('click', handleClose);

    $(document).on('keydown.onboardingModal', (e) => {
        if (e.key === 'Escape' && !$modal.hasClass('hidden')) handleClose();
    });

    // Admin/editor preview trigger — opens without marking seen.
    $block.find('.gom__preview-trigger').on('click', openModal);

    if (autoOpen) {
        setTimeout(openModal, 600);
    }
});
