import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';

function buildLeaderRow(leader, groupId, onRemove, canRemove) {
    const name = `${leader.first_name} ${leader.last_name}`.trim() || leader.display_name || leader.email;

    // Clone the #gl__template-leader <template> and fill
    const template = document.getElementById('gl__template-leader');
    const $row = jQuery(template.content.cloneNode(true)).find('.gl__item');

    $row.attr('data-user-id', leader.id);
    $row.find('.gl__name').text(name);

    // Avatar: <img> when a URL is provided, otherwise an initial-letter circle.
    const $avatar = $row.find('.gl__avatar');
    if (leader.avatar) {
        const img = document.createElement('img');
        img.src = leader.avatar;
        img.alt = name;
        $avatar.append(img);
    }

    // Remove button only shown to users who have manage permissions
    const $removeBtn = $row.find('.gl__remove');
    if (canRemove) {
        $removeBtn.attr('aria-label', `Remove ${name} as group leader`).text('×');

        $removeBtn.on('click', async function () {
            const $btn = jQuery(this);
            $btn.prop('disabled', true);

            try {
                await api.delete(endpoints.removeGroupLeader(groupId, leader.id));
                api.invalidate(endpoints.groupLeaders(groupId));
                const remaining = (store.getLeaders() || []).filter((l) => l.id !== leader.id);
                store.setLeaders(remaining);
                onRemove(leader.id, $row);
            } catch (err) {
                console.error('[group-leaders] Failed to remove leader', err);
                $btn.prop('disabled', false);
            }
        });
    } else {
        $removeBtn.remove();
    }

    return $row;
}

jQuery(document).ready(async ($) => {
    const $block = $('.wp-block-bys-groups-group-leaders').first();
    if (!$block.length) return;

    const $skeleton = $block.find('.gl__skeleton');
    const $list     = $block.find('.gl__list');
    const $message  = $block.find('.gl__message');

    let allLeaders = [];

    function showMessage(text, variant) {
        $message
            .removeClass('gl__message--empty gl__message--error')
            .addClass(`gl__message--${variant}`)
            .text(text)
            .show();
    }

    function hideMessage() {
        $message.hide().text('').removeClass('gl__message--empty gl__message--error');
    }

    // Build N row nodes into a single DocumentFragment — one reflow on insert
    // instead of one per append.
    function buildRowsFragment(leaders, groupId, canRemove) {
        const frag = document.createDocumentFragment();
        leaders.forEach((l) => {
            const $r = buildLeaderRow(l, groupId, onRemove, canRemove);
            frag.appendChild($r[0]);
        });
        return frag;
    }

    function onRemove(userId, $row) {
        allLeaders = allLeaders.filter((l) => l.id !== userId);

        $row.fadeOut(200, () => {
            $row.remove();

            // last leader removed; show empty message right away
            if (allLeaders.length === 0) {
                showMessage('No leaders assigned to this group.', 'empty');
            }
        });
    }

    $(document).on('bys:groupSelected', async (_, { groupId, canManageLeaders }) => {
        $skeleton.show();
        $list.empty();
        hideMessage();

        try {

            // read from store first, fallback to REST request otherwise
            const cachedLeaders = store.getCurrentGroup() === Number(groupId) ? store.getLeaders() : null;
            let leaders;

            if (cachedLeaders !== null) {
                leaders = cachedLeaders;
            } else {
                leaders = await api.get(endpoints.groupLeaders(groupId));
                store.setLeaders(leaders);
            }

            allLeaders = Array.isArray(leaders) ? leaders : [];

            $skeleton.hide();

            if (!allLeaders.length) {
                showMessage('No leaders assigned to this group.', 'empty');
                return;
            }

            $list[0].appendChild(buildRowsFragment(allLeaders, groupId, !!canManageLeaders));
        } catch (err) {
            console.error('[group-leaders] Failed to fetch leaders', err);
            $skeleton.hide();
            showMessage('Could not load group leaders.', 'error');
        }
    });
});
