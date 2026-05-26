import { api, endpoints } from '../_shared/api-client.js';
import { bysConfirm } from '../_shared/confirm.js';
import store from '../_shared/store.js';

const PAGE_SIZE = 5;

function buildMemberRow(member, groupId, onRemove, canModify) {
    const name = `${member.first_name} ${member.last_name}`.trim() || member.display_name;

    // Clone the #gm__template-member <template> and fill
    const template = document.getElementById('gm__template-member');
    const $row = jQuery(template.content.cloneNode(true)).find('.gm__item');

    $row.attr('data-user-id', member.id);
    $row.find('.gm__name').text(name);
    $row.find('.gm__email').text(member.email || '');

    // Avatar: <img> when a URL is provided
    const $avatar = $row.find('.gm__avatar');
    if (member.avatar) {
        const img = document.createElement('img');
        img.src = member.avatar;
        img.alt = name;
        $avatar.append(img);
    }

    // Remove button only shown to viewers who have manage-member permission
    // (site admins + org admins + group-leaders). Graders see the row but
    // not the button. Server enforces the same gate via can_manage_user_in_group.
    const $removeBtn = $row.find('.gm__remove');
    if (canModify) {
        $removeBtn.attr('aria-label', `Remove ${name}`).text('✕');

        $removeBtn.on('click', async function () {
            const $btn = jQuery(this);
            if (!await bysConfirm(`Remove ${name} from this group?`, 'Remove')) return;

            $btn.prop('disabled', true);
            try {
                await api.post(endpoints.removeGroupUser(groupId, member.id));
                store.removeUser(member.id);
                api.invalidate(`/groups/${groupId}/users`);
                onRemove(member.id, $row);
            } catch (err) {
                console.error('[group-members] Failed to remove member', err);
                $btn.prop('disabled', false);
            }
        });
    } else {
        $removeBtn.remove();
    }

    return $row;
}

jQuery(document).ready(async ($) => {
    const $block = $('.wp-block-bys-groups-group-members').first();
    if (!$block.length) return;

    const $skeleton      = $block.find('.gm__skeleton');
    const $list          = $block.find('.gm__list');
    const $message       = $block.find('.gm__message');
    const $showMore      = $block.find('.gm__show-more');
    const $countVal      = $block.find('.gm__count-val');

    let allMembers     = [];
    let currentGroupId = null;
    let displayedCount = 0; // how many members are currently rendered
    let canModify      = false;

    function setCount(n) {
        $countVal.text(String(n));
    }

    function showMessage(text, variant) {
        $message
            .removeClass('gm__message--empty gm__message--error')
            .addClass(`gm__message--${variant}`)
            .text(text)
            .show();
    }

    function hideMessage() {
        $message.hide().text('').removeClass('gm__message--empty gm__message--error');
    }

    function buildRowsFragment(members) {
        const frag = document.createDocumentFragment();
        members.forEach((m) => {
            const $r = buildMemberRow(m, currentGroupId, onRemove, canModify);
            frag.appendChild($r[0]);
        });
        return frag;
    }

    function updateShowMoreButton() {
        const hasMore = displayedCount < allMembers.length;
        $showMore.toggle(hasMore);
    }

    // Initial render: empty the list, then paint the first PAGE_SIZE rows.
    function renderInitial() {
        $list.empty();
        const firstBatch = allMembers.slice(0, PAGE_SIZE);
        $list[0].appendChild(buildRowsFragment(firstBatch));
        displayedCount = firstBatch.length;
        updateShowMoreButton();
    }

    // Append the next PAGE_SIZE rows
    function loadMore() {
        const nextBatch = allMembers.slice(displayedCount, displayedCount + PAGE_SIZE);
        if (!nextBatch.length) return;
        $list[0].appendChild(buildRowsFragment(nextBatch));
        displayedCount += nextBatch.length;
        updateShowMoreButton();
    }

    function onRemove(userId, $row) {
        allMembers = allMembers.filter((m) => m.id !== userId);
        setCount(allMembers.length);

        $row.fadeOut(200, () => {
            $row.remove();
            displayedCount = Math.max(0, displayedCount - 1);
            updateShowMoreButton();

            // if last member was removed, show empty message right away
            if (allMembers.length === 0) {
                showMessage('No members in this group.', 'empty');
            }
        });
    }

    $showMore.on('click', loadMore);

    async function getUserIdsForGroup(groupId) {
        const stored = store.getCurrentGroup() === Number(groupId) ? store.getUserIds() : null;
        if (stored !== null) {
            // console.log('[bys-store] group-members: HIT — read user_ids from store', stored);
            return stored;
        }

        // console.log('[bys-store] group-members: MISS — waiting for store / will fall back to fetch');
        return new Promise((resolve) => {
            const off = store.subscribe(() => {
                if (store.getCurrentGroup() !== Number(groupId)) return;
                const ids = store.getUserIds();
                if (ids !== null) { off(); resolve(ids); }
            });

            api.get(endpoints.groupBaseUsersStats(groupId)).then((stats) => {
                if (store.getCurrentGroup() !== Number(groupId) || store.getUsers() !== null) return;
                // console.log('[bys-store] group-members: self-fetched user_ids and wrote to store');
                store.setCurrentGroup(groupId);
                store.setUserIdsAsStubs(stats.user_ids || []);
            }).catch((err) => {
                console.error('[group-members] self-fetch base-user-stats failed', err);
                off(); resolve([]);
            });
        });
    }

    $(document).on('bys:groupSelected', async (_, { groupId, canManageMembers }) => {
        currentGroupId = groupId;
        displayedCount = 0;
        canModify      = !!canManageMembers;

        $skeleton.show();
        $list.empty();
        $showMore.hide();
        hideMessage();
        $countVal.text('');

        const userIds = await getUserIdsForGroup(groupId);

        if (!userIds.length) {
            $skeleton.hide();
            setCount(0);
            showMessage('No members in this group.', 'empty');
            return;
        }

        try {
            // read the store and fallback to a REST request otherwise
            // hydrated in the store (typical after the first fetch in this
            // session), skip the network call entirely.
            const cachedHydrated = store.getCurrentGroup() === Number(groupId)
                ? store.getHydratedUsers(userIds)
                : null;
            let members;
            if (cachedHydrated !== null) {
                // console.log('[bys-store] group-members: HIT hydrated — rendering from store, skipping fetch');
                members = cachedHydrated;
            } else {
                // console.log('[bys-store] group-members: MISS hydrated — fetching groupUsers and writing through');
                members = await api.get(endpoints.groupUsers(groupId, userIds.join(',')));
                store.setUsers(members);
            }

            // Pre-compute the sort key once (Date.parse → ms number)
            allMembers = members
                .map((m) => ({ ...m, _enrolledMs: m.enrolled_at ? Date.parse(m.enrolled_at) : 0 }))
                .sort((a, b) => b._enrolledMs - a._enrolledMs);

            $skeleton.hide();
            setCount(allMembers.length);
            renderInitial();
        } catch (err) {
            console.error('[group-members] Failed to fetch members', err);
            $skeleton.hide();
            setCount(0);
            showMessage('Could not load members.', 'error');
        }
    });
});
