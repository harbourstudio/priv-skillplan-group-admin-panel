import { api, endpoints } from '../_shared/api-client.js';

const PAGE_SIZE = 5;

function buildMemberRow(member, groupId, onRemove) {
    const name = `${member.first_name} ${member.last_name}`.trim() || member.display_name || member.email;
    const avatarHtml = member.avatar
        ? `<img src="${member.avatar}" alt="${name}" />`
        : `<span class="group-members__avatar-initial">${name.charAt(0).toUpperCase()}</span>`;

    const $row = jQuery(`
        <div class="group-members__item" data-user-id="${member.id}">
            <div class="group-members__avatar">${avatarHtml}</div>
            <div class="group-members__info">
                <span class="group-members__name">${name}</span>
                <span class="group-members__email">${member.email}</span>
            </div>
            <button class="group-members__remove btn-unstyled" type="button" aria-label="Remove ${name}">&#x2715;</button>
        </div>
    `);

    $row.find('.group-members__remove').on('click', async function () {
        const $btn = jQuery(this);
        if (!window.confirm(`Remove ${name} from this group?`)) return;

        $btn.prop('disabled', true);
        try {
            await api.post(endpoints.removeGroupUser(groupId, member.id));
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

    const $skeleton = $block.find('.group-members__skeleton');
    const $list     = $block.find('.group-members__list');
    const $count    = $block.find('.group-members__count');
    const $showMore = $block.find('.group-members__show-more');

    let allMembers     = [];
    let currentGroupId = null;
    let showAll        = false;

    function countLabel(n) {
        return `${n} member${n !== 1 ? 's' : ''} - sorted by date added`;
    }

    function showCountSkeleton() {
        $count.empty().append('<span class="skeleton-text" style="width:140px;" aria-hidden="true"></span>');
    }

    function renderList() {
        $list.empty();
        const visible = showAll ? allMembers : allMembers.slice(0, PAGE_SIZE);
        visible.forEach((member) => $list.append(buildMemberRow(member, currentGroupId, onRemove)));

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

    $(document).on('bys:groupSelected', async (_, { groupId, baseUsersStats }) => {
        currentGroupId = groupId;
        showAll        = false;
        const userIds  = baseUsersStats?.user_ids ?? [];

        $skeleton.show();
        $list.empty();
        $showMore.hide();
        showCountSkeleton();

        if (!userIds.length) {
            $skeleton.hide();
            $count.text(countLabel(0));
            $list.html('<p class="group-members__empty">No members in this group.</p>');
            return;
        }

        try {
            const members = await api.get(endpoints.groupUsers(groupId, userIds.join(',')));

            allMembers = members.slice().sort((a, b) => {
                const da = a.enrolled_at ? new Date(a.enrolled_at) : new Date(0);
                const db = b.enrolled_at ? new Date(b.enrolled_at) : new Date(0);
                return db - da;
            });

            $skeleton.hide();
            $count.text(countLabel(allMembers.length));
            renderList();
        } catch (err) {
            console.error('[group-members] Failed to fetch members', err);
            $skeleton.hide();
            $list.html('<p class="group-members__empty">Could not load members.</p>');
        }
    });
});
