import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
    const $block = $('.wp-block-bys-groups-group-archive').first();
    if (!$block.length) return;

    const $button = $block.find('.group-archive__button');
    const $notice = $block.find('.group-archive__notice');
    let currentGroupId = null;

    // canManageGroup is the matrix the archive REST endpoint enforces:
    // site admin OR org admin of the containing org OR (group leader AND
    // group is standalone). Group leaders of org-owned groups see the
    // notice; group leaders of standalone groups see the button.
    $(document).on('bys:groupSelected', (_, { groupId, canManageGroup }) => {
        currentGroupId = groupId;
        if (canManageGroup) {
            $button.prop('disabled', false).show();
            $notice.hide();
        } else {
            $button.prop('disabled', true).hide();
            $notice.show();
        }
    });

    $button.on('click', async function () {
        if (!currentGroupId) return;

        const confirmed = window.confirm(
            'Are you sure you want to archive this group? This action will lock the group in its current state.'
        );
        if (!confirmed) return;

        $button.prop('disabled', true).text('Archiving…');

        try {
            await api.post(endpoints.archiveGroup(currentGroupId));
            $button.text('Group Archived');
        } catch (err) {
            console.error('[group-archive] Failed to archive group', err);
            $button.prop('disabled', false).text('Archive Group');
        }
    });
});
