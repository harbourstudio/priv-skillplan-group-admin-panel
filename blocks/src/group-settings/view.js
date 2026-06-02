import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
    const $block = $('.wp-block-bys-groups-group-settings').first();
    if (!$block.length) return;

    const $input   = $block.find('.group-settings__input');
    const $button  = $block.find('.group-settings__submit');
    const $message = $block.find('.group-settings__message');
    const $notice  = $block.find('.group-settings__notice');

    let currentGroupId = null;
    let originalName   = '';

    function showMessage(text, variant) {
        $message
            .removeClass('group-settings__message--success group-settings__message--error')
            .addClass(`group-settings__message--${variant}`)
            .text(text)
            .show();
    }

    function hideMessage() {
        $message.hide().text('').removeClass('group-settings__message--success group-settings__message--error');
    }

    function syncSaveButton() {
        const val = $input.val().trim();
        const changed = val !== '' && val !== originalName;
        $button.prop('disabled', !changed);
    }

    // canManageGroup is the matrix the rename REST endpoint enforces:
    // site admin OR org admin of the containing org OR (group leader AND
    // group is standalone). Group leaders of org-owned groups see the
    // notice; group leaders of standalone groups can rename.
    $(document).on('bys:groupSelected', (_, { groupId, groupTitle, canManageGroup }) => {
        currentGroupId = groupId;
        hideMessage();

        // groupTitle comes from group-select's option text — surfaced via
        // the event payload so this block doesn't need to know about the
        // group-select DOM.
        originalName = (groupTitle || '').trim();
        $input.val(originalName);

        if (canManageGroup) {
            $input.prop('disabled', false);
            $button.prop('disabled', true); // re-enabled once the user changes the value
            $notice.hide();
        } else {
            $input.prop('disabled', true);
            $button.prop('disabled', true);
            $notice.show();
        }
    });

    $input.on('input', () => {
        hideMessage();
        syncSaveButton();
    });

    $input.on('keydown', (e) => {
        if (e.key === 'Enter' && !$button.prop('disabled')) {
            e.preventDefault();
            $button.trigger('click');
        }
    });

    $button.on('click', async function () {
        if (!currentGroupId) return;
        const newName = $input.val().trim();
        if (!newName || newName === originalName) return;

        $input.prop('disabled', true);
        $button.prop('disabled', true).text('Saving…');
        hideMessage();

        try {
            const res = await api.post(endpoints.renameGroup(currentGroupId), { name: newName });
            const updated = res?.name || newName;

            originalName = updated;
            $input.val(updated);

            showMessage('Group renamed. Refreshing…', 'success');

            // Reload after a short pause so other blocks (group-select,
            // group-tabs, etc.) re-render with the new title — cheaper
            // than tracking every consumer of the group name client-side.
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            console.error('[group-settings] Rename failed', err);
            const msg = err.responseJSON?.error || 'Could not rename group. Please try again.';
            showMessage(msg, 'error');
            $input.prop('disabled', false);
            $button.text('Save');
            syncSaveButton();
        }
    });
});
