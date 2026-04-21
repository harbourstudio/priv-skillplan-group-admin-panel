import { api } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
    const $block   = $('.wp-block-bys-groups-group-add-member').first();
    if (!$block.length) return;

    const $input   = $block.find('#add-member-email');
    const $enrol   = $block.find('.add-member__enrol');
    const $message = $block.find('.add-member__message');

    function isValidEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    }

    function showMessage(text, type) {
        $message
            .text(text)
            .removeClass('add-member__message--success add-member__message--error add-member__message--info')
            .addClass(`add-member__message--${type}`)
            .show();
    }

    function clearMessage() {
        $message.hide().text('');
    }

    $input.on('input', function () {
        clearMessage();
        $enrol.prop('disabled', !isValidEmail($(this).val()));
    });

    $enrol.on('click', async function () {
        const email   = $input.val().trim();
        const role    = $block.find('input[name="add-member-role"]:checked').val() || 'learner';
        const groupId = window.bysGroupData?.groupId;

        if (!isValidEmail(email) || !groupId) return;

        $enrol.prop('disabled', true).text('Adding…');
        clearMessage();

        try {
            const result = await api.post(
                `/wp-json/bys-groups/v1/groups/${groupId}/invite`,
                {
                    email,
                    role,
                    invited_by_user_id: window.bysGroupsAuth?.userId || 0,
                }
            );

            if (result.status === 'enrolled') {
                showMessage(`${email} already has an account and has been enrolled in the group.`, 'success');
            } else {
                showMessage(`Invitation sent to ${email}. They'll be enrolled automatically when they register.`, 'success');
                $(document).trigger('bys:inviteSent');
            }

            $input.val('');
        } catch (err) {
            const msg = err.responseJSON?.error || 'Something went wrong. Please try again.';
            showMessage(msg, 'error');
        } finally {
            $enrol.text('Enrol').prop('disabled', true);
        }
    });
});
