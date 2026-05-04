let _$overlay = null;

function getOverlay() {
    if (_$overlay) return _$overlay;

    _$overlay = jQuery(`
        <div class="bys-confirm-overlay" role="dialog" aria-modal="true">
            <div class="bys-confirm__dialog">
                <p class="bys-confirm__message"></p>
                <div class="bys-confirm__actions">
                    <button class="bys-confirm__cancel btn-unstyled" type="button">Cancel</button>
                    <button class="bys-confirm__ok btn-unstyled" type="button">Confirm</button>
                </div>
            </div>
        </div>
    `);

    jQuery('body').append(_$overlay);
    return _$overlay;
}

export function bysConfirm(message, confirmLabel = 'Confirm') {
    return new Promise((resolve) => {
        const $ov = getOverlay();
        $ov.find('.bys-confirm__message').text(message);
        $ov.find('.bys-confirm__ok').text(confirmLabel);
        $ov.addClass('bys-confirm-overlay--open');
        jQuery('html').css('overflow', 'hidden');

        function close(result) {
            $ov.removeClass('bys-confirm-overlay--open');
            jQuery('html').css('overflow', '');
            $ov.find('.bys-confirm__ok, .bys-confirm__cancel').off('.bysConfirm');
            $ov.off('.bysConfirm');
            document.removeEventListener('keydown', handleKey);
            resolve(result);
        }

        function handleKey(e) {
            if (e.key === 'Escape') close(false);
        }

        $ov.find('.bys-confirm__ok').on('click.bysConfirm', () => close(true));
        $ov.find('.bys-confirm__cancel').on('click.bysConfirm', () => close(false));
        $ov.on('click.bysConfirm', (e) => {
            if (jQuery(e.target).is($ov)) close(false);
        });
        document.addEventListener('keydown', handleKey);
    });
}
