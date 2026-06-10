import { api, endpoints } from '../_shared/api-client.js';

const ARCHIVE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="21 8 21 21 3 21 3 8"></polyline>
    <rect x="1" y="3" width="22" height="5"></rect>
    <line x1="10" y1="12" x2="14" y2="12"></line>
</svg>`;

function formatArchivedDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return 'Archived ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildGroupRow(group) {
    // Group leaders see the row read-only — the server emits can_unarchive
    // per row (true only for site admins and the org admin of the
    // containing org), and we render the action button accordingly.
    const $row = jQuery(`
        <div class="archived-groups__item" data-group-id="${group.id}">
            <div class="archived-groups__icon">${ARCHIVE_ICON}</div>
            <div class="archived-groups__info">
                <span class="archived-groups__name"></span>
                <span class="archived-groups__date"></span>
            </div>
        </div>
    `);

    $row.find('.archived-groups__name').text(group.title);
    $row.find('.archived-groups__date').text(formatArchivedDate(group.archived_date));

    if (!group.can_unarchive) {
        return $row;
    }

    const $btn = jQuery(
        '<button class="archived-groups__button" type="button">Unarchive</button>'
    ).attr('data-group-id', group.id);

    $btn.on('click', async function () {
        const groupId = $btn.data('group-id');
        $btn.prop('disabled', true).text('Unarchiving…');

        try {
            await api.post(endpoints.unarchiveGroup(groupId));
            $row.fadeOut(300, () => $row.remove());
            checkEmpty($row.closest('.archived-groups__list'));
        } catch (err) {
            console.error('[group-unarchive] Failed to unarchive group', err);
            $btn.prop('disabled', false).text('Unarchive');
        }
    });

    $row.append($btn);
    return $row;
}

function checkEmpty($list) {
    if ($list.find('.archived-groups__item').length === 0) {
        $list.html('<p class="archived-groups__empty">No archived groups.</p>');
    }
}

jQuery(document).ready(async ($) => {
    const $block = $('.wp-block-bys-groups-group-unarchive').first();
    if (!$block.length) return;

    const $list = $block.find('.archived-groups__list');

    try {
        const data = await api.get(endpoints.archivedGroups());
        const groups = data?.groups ?? [];

        $list.empty();

        if (!groups.length) {
            $list.html('<p class="archived-groups__empty">No archived groups.</p>');
            return;
        }

        const $card = $('<div class="archived-groups__card"></div>');
        groups.forEach((group) => $card.append(buildGroupRow(group)));
        $list.append($card);
    } catch (err) {
        console.error('[group-unarchive] Failed to fetch archived groups', err);
        $list.html('<p class="archived-groups__empty">Could not load archived groups.</p>');
    }
});
