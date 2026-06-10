import { api } from '../_shared/api-client.js';
import store from '../_shared/store.js';

jQuery(document).ready(($) => {
    const $block   = $('.wp-block-bys-groups-group-add-member').first();
    if (!$block.length) return;

    const $input   = $block.find('#gam-email');
    const $enrol   = $block.find('.gam__enrol');
    const $message = $block.find('.gam__message');

    function isValidEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    }

    function showMessage(text, type) {
        $message
            .text(text)
            .removeClass('gam__message--success gam__message--error gam__message--info')
            .addClass(`gam__message--${type}`)
            .show();
    }

    function clearMessage() {
        $message.hide().text('');
    }

    $input.on('input', function () {
        clearMessage();
        $enrol.prop('disabled', !isValidEmail($(this).val()));
    });

    const $leaderRadio    = $block.find('.gam__radio--leader');
    const $bulkBtn        = $block.find('.gam__bulk');
    const $permissionNote = $block.find('.gam__note-permission');

    /**
     * Visibility of the 'leader' radio choice depends on canManageGroup. It's always visible for users that satisfies canManageGroup (EG group-leaders of standalone groups, site-admins, group/org-admins...).
     * 
     * Permission note only shows for group-leaders of org-associated groups. Anyone that satisfies canManageGroup (as described above) won't see the note.
     * 
     * Bulk Upload supports both 'learner' and 'leader' role.
     */
    $(document).on('bys:groupSelected', (_, { canManageGroup, canManageMembers }) => {
        $leaderRadio.toggleClass('is-hidden', !canManageGroup);
        if (!canManageGroup) {
            $block.find('input[name="gam-role"][value="learner"]').prop('checked', true);
        }
        $permissionNote.toggle(!!canManageMembers && !canManageGroup);
    });

    // broadcast the selected role when 'Bulk Upload' button is clicked so group-add-member-modal block knows which role to process
    $bulkBtn.on('click', function () {
        const role = $block.find('input[name="gam-role"]:checked').val() || 'learner';
        $(document).trigger('bys:bulkAddOpened', { role });
    });

    $enrol.on('click', async function () {
        const email   = $input.val().trim();
        const role    = $block.find('input[name="gam-role"]:checked').val() || 'learner';
        const groupId = store.getCurrentGroup();

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
                showMessage(`${email} has been enrolled in the group. Refreshing…`, 'success');
            } else {
                showMessage(`Invitation sent to ${email}. Refreshing…`, 'success');
                $(document).trigger('bys:inviteSent');
            }

            $input.val('');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            const msg = err.responseJSON?.error || 'Something went wrong. Please try again.';
            showMessage(msg, 'error');
        } finally {
            $enrol.text('Enrol').prop('disabled', true);
        }
    });
});
