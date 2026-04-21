import { api, endpoints } from '../_shared/api-client.js';

function buildLeaderRow(leader) {
    const name = `${leader.first_name} ${leader.last_name}`.trim() || leader.display_name || leader.email;
    const avatarHtml = leader.avatar
        ? `<img src="${leader.avatar}" alt="${name}" />`
        : `<span class="group-leaders__avatar-initial">${name.charAt(0).toUpperCase()}</span>`;

    return jQuery(`
        <div class="group-leaders__item" data-user-id="${leader.id}">
            <div class="group-leaders__avatar">${avatarHtml}</div>
            <span class="group-leaders__name">${name}</span>
        </div>
    `);
}

jQuery(document).ready(async ($) => {
    const $block = $('.wp-block-bys-groups-group-leaders').first();
    if (!$block.length) return;

    const $skeleton = $block.find('.group-leaders__skeleton');
    const $list     = $block.find('.group-leaders__list');
    const $empty    = $block.find('.group-leaders__empty');

    $(document).on('bys:groupSelected', async (_, { groupId }) => {
        $skeleton.show();
        $list.empty();
        $empty.hide();

        try {
            const leaders = await api.get(endpoints.groupLeaders(groupId));

            $skeleton.hide();

            if (!leaders.length) {
                $empty.text('No leaders assigned to this group.').show();
                return;
            }

            leaders.forEach((leader) => $list.append(buildLeaderRow(leader)));
        } catch (err) {
            console.error('[group-leaders] Failed to fetch leaders', err);
            $skeleton.hide();
            $empty.text('Could not load group leaders.').show();
        }
    });
});
