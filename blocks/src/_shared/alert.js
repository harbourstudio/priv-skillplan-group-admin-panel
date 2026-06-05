/**
 * Shared alert component.
 *
 * Each call appends a fresh alert component to <body>. Clicking the overlay
 * or close button destroys (removes) the element so nothing lingers in the DOM.
 *
 * Usage:
 *     import { bysAlert } from '../_shared/alert.js';
 *     bysAlert('Something went wrong.');
 */

const $ = jQuery;

export function bysAlert(message) {
    const $alert = $(`
        <div class="bys-groups-alert" role="dialog" aria-modal="true">
            <div class="bys-groups-alert__dialog">
                <button class="bys-groups-alert__close btn-unstyled" type="button" aria-label="Close alert">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <p class="bys-groups-alert__message"></p>
            </div>
        </div>
    `);

    $alert.find('.bys-groups-alert__message').text(message);
    $('body').append($alert);

    // Force reflow so the open class triggers the transition.
    $alert[0].offsetHeight;
    $alert.addClass('bys-groups-alert--open');

    const prevHtmlOverflow = $('html').css('overflow');
    $('html').css('overflow', 'hidden');

    return new Promise((resolve) => {
        function destroy() {
            $alert.off('.bysAlert');
            $('html').css('overflow', prevHtmlOverflow || '');
            $alert.remove();
            resolve();
        }

        // Close button destroys (handler on the button so icon clicks still work).
        $alert.find('.bys-groups-alert__close').on('click.bysAlert', destroy);

        // Overlay click (but not clicks on the dialog itself) destroys.
        $alert.on('click.bysAlert', (e) => {
            if (e.target === $alert[0]) destroy();
        });
    });
}
