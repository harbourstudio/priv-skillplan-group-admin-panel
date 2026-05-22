import { api, endpoints } from '../_shared/api-client.js';
import { bysConfirm } from '../_shared/confirm.js';
import store from '../_shared/store.js';

const PAGE_SIZE = 5;

function buildMemberRow(member, groupId, onRemove, canModify = true) {
    const name = `${member.first_name} ${member.last_name}`.trim() || member.display_name || member.email;
    const avatarHtml = member.avatar
        ? `<img src="${member.avatar}" alt="${name}" />`
        : `<span class="gm__avatar-initial">${name.charAt(0).toUpperCase()}</span>`;

    const $row = jQuery(`
        <div class="gm__item" data-user-id="${member.id}">
            <div class="gm__avatar">${avatarHtml}</div>
            <div class="gm__info">
                <span class="gm__name">${name}</span>
                <span class="gm__email">${member.email}</span>
            </div>
            ${canModify ? `<button class="gm__remove btn-unstyled" type="button" aria-label="Remove ${name}">&#x2715;</button>` : ''}
        </div>
    `);

    $row.find('.gm__remove').on('click', async function () {
        const $btn = jQuery(this);
        if (!await bysConfirm(`Remove ${name} from this group?`, 'Remove')) return;

        $btn.prop('disabled', true);
        try {
            await api.post(endpoints.removeGroupUser(groupId, member.id));
            // Keep the cache truthful: drop from store + invalidate api._cache
            // so a page nav doesn't resurrect the removed member from sessionStorage.
            store.removeUser(member.id);
            api.invalidate(`/groups/${groupId}/users`);
            onRemove(member.id, $row);
        } catch (err) {
            console.error('[group-members] Failed to remove member', err);
            $btn.prop('disabled', false);
        }
    });

    return $row;
}

jQuery(document).ready(async ($) => {
    const $block = $('.wp-block-bys-groups-group-members').first();
    if (!$block.length) return;

    const $skeletonHeader = $block.find('.skeleton');

    const $skeleton = $block.find('.gm__skeleton');
    const $list     = $block.find('.gm__list');
    const $count    = $block.find('.gm__count');
    const $showMore = $block.find('.gm__show-more');

    let allMembers     = [];
    let currentGroupId = null;
    let showAll        = false;
    let canModify      = true;

    function countLabel(n) {
        return `${n} member${n !== 1 ? 's' : ''} - sorted by date added`;
    }

    function showCountSkeleton() {
        $count.empty().append('<span class="skeleton-text" style="width:140px;" aria-hidden="true"></span>');
    }

    function renderList() {
        $list.empty();
        const visible = showAll ? allMembers : allMembers.slice(0, PAGE_SIZE);
        visible.forEach((member) => $list.append(buildMemberRow(member, currentGroupId, onRemove, canModify)));

        const remaining = allMembers.length - PAGE_SIZE;
        if (!showAll && remaining > 0) {
            $showMore.text(`Show ${remaining} more`).show();
        } else if (showAll && allMembers.length > PAGE_SIZE) {
            $showMore.text('Show less').show();
        } else {
            $showMore.hide();
        }
    }

    function onRemove(userId, $row) {
        allMembers = allMembers.filter((m) => m.id !== userId);
        $count.text(countLabel(allMembers.length));

        if (showAll) {
            $row.fadeOut(200, () => {
                $row.remove();
                if (allMembers.length <= PAGE_SIZE) {
                    $showMore.hide();
                }
            });
        } else {
            renderList();
        }
    }

    $showMore.on('click', () => {
        showAll = !showAll;
        renderList();
    });

    async function getUserIdsForGroup(groupId) {
        const stored = store.getCurrentGroup() === Number(groupId) ? store.getUserIds() : null;
        if (stored !== null) {
            console.log('[bys-store] group-members: HIT — read user_ids from store', stored);
            return stored;
        }

        console.log('[bys-store] group-members: MISS — waiting for store / will fall back to fetch');
        return new Promise((resolve) => {
            const off = store.subscribe(() => {
                if (store.getCurrentGroup() !== Number(groupId)) return;
                const ids = store.getUserIds();
                if (ids !== null) { off(); resolve(ids); }
            });

            api.get(endpoints.groupBaseUsersStats(groupId)).then((stats) => {
                if (store.getCurrentGroup() !== Number(groupId) || store.getUsers() !== null) return;
                console.log('[bys-store] group-members: self-fetched user_ids and wrote to store');
                store.setCurrentGroup(groupId);
                store.setUserIdsAsStubs(stats.user_ids || []);
            }).catch((err) => {
                console.error('[group-members] self-fetch base-user-stats failed', err);
                off(); resolve([]);
            });
        });
    }

    $(document).on('bys:groupSelected', async (_, { groupId }) => {
        currentGroupId = groupId;
        showAll        = false;
        canModify      = window.bysGroupsAuth?.isSiteEditor !== true;

        $skeleton.show();
        $list.empty();
        $showMore.hide();
        showCountSkeleton();

        const userIds = await getUserIdsForGroup(groupId);

        if (!userIds.length) {
            $skeleton.hide();
            $count.text(countLabel(0));
            $list.html('<p class="gm__empty">No members in this group.</p>');
            return;
        }

        try {
            // Hydrated-cache fast path: if every requested user_id is already
            // hydrated in the store (typical after the first fetch in this
            // session), skip the network call entirely.
            const cachedHydrated = store.getCurrentGroup() === Number(groupId)
                ? store.getHydratedUsers(userIds)
                : null;
            let members;
            if (cachedHydrated !== null) {
                console.log('[bys-store] group-members: HIT hydrated — rendering from store, skipping fetch');
                members = cachedHydrated;
            } else {
                console.log('[bys-store] group-members: MISS hydrated — fetching groupUsers and writing through');
                members = await api.get(endpoints.groupUsers(groupId, userIds.join(',')));
                store.setUsers(members);
            }

            allMembers = members.slice().sort((a, b) => {
                const da = a.enrolled_at ? new Date(a.enrolled_at) : new Date(0);
                const db = b.enrolled_at ? new Date(b.enrolled_at) : new Date(0);
                return db - da;
            });

            $skeleton.hide();
            $skeletonHeader.hide();
            $count.text(countLabel(allMembers.length));
            renderList();
        } catch (err) {
            console.error('[group-members] Failed to fetch members', err);
            $skeletonHeader.hide();
            $list.html('<p class="gm__empty">Could not load members.</p>');
        }
    });
});
