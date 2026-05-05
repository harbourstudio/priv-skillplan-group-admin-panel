import { api } from '../_shared/api-client.js';

const PAGE_SIZE = 10;

jQuery(document).ready(($) => {
    const $block    = $('.wp-block-bys-groups-group-pending-enrolments').first();
    if (!$block.length) return;

    const $skeleton  = $block.find('.pending-enrolments__skeleton');
    const $list      = $block.find('.pending-enrolments__list');
    const $empty     = $block.find('.pending-enrolments__empty');
    const $showMore  = $block.find('.pending-enrolments__show-more');

    let currentGroupId = null;
    let allInvites     = [];
    let showing        = PAGE_SIZE;

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const canModify = window.bysGroupsAuth?.isSiteEditor !== true;

    function buildRow(invite) {
        const $row = $(`
            <div class="pending-enrolments__item" data-invite-id="${invite.id}">
                <span class="pending-enrolments__email">${$('<span>').text(invite.email).html()}</span>
                <span class="pending-enrolments__date">${formatDate(invite.invited_at)}</span>
                <span class="pending-enrolments__badge">Pending</span>
                ${canModify ? `<button class="pending-enrolments__cancel btn-unstyled" type="button" aria-label="Cancel invitation">&#x2715;</button>` : ''}
            </div>
        `);

        $row.find('.pending-enrolments__cancel').on('click', async function () {
            const $btn = $(this);
            $btn.prop('disabled', true);

            try {
                await api.post(`/wp-json/bys-groups/v1/groups/${currentGroupId}/invites/${invite.id}/cancel`, {});
                allInvites = allInvites.filter((i) => i.id !== invite.id);
                $row.remove();
                renderShowMore();
                if (!$list.children().length) {
                    $list.hide();
                    $empty.show();
                }
            } catch {
                $btn.prop('disabled', false);
            }
        });

        return $row;
    }

    function renderShowMore() {
        const total = allInvites.length;
        if (total <= PAGE_SIZE) {
            $showMore.hide();
            return;
        }
        const remaining = total - showing;
        if (remaining > 0) {
            $showMore.text(`Show ${remaining} More`).show();
        } else {
            $showMore.text('Show Less').show();
        }
    }

    function renderList() {
        $list.empty();

        if (!allInvites.length) {
            $list.hide();
            $skeleton.hide();
            $empty.show();
            $showMore.hide();
            return;
        }

        const visible = allInvites.slice(0, showing);
        visible.forEach((invite) => $list.append(buildRow(invite)));

        $skeleton.hide();
        $empty.hide();
        $list.show();
        renderShowMore();
    }

    $showMore.on('click', () => {
        if (showing >= allInvites.length) {
            showing = PAGE_SIZE;
        } else {
            showing = Math.min(showing + PAGE_SIZE, allInvites.length);
        }
        renderList();
    });

    async function loadInvites(groupId) {
        currentGroupId = groupId;
        showing        = PAGE_SIZE;

        $skeleton.show();
        $list.hide().empty();
        $empty.hide();
        $showMore.hide();

        try {
            allInvites = await api.get(`/wp-json/bys-groups/v1/groups/${groupId}/pending-invites`);
            renderList();
        } catch (err) {
            console.error('[pending-enrolments] Failed to load invites', err);
            $skeleton.hide();
            $empty.text('Failed to load pending enrolments.').show();
        }
    }

    $(document).on('bys:groupSelected', (_, { groupId }) => loadInvites(groupId));

    $(document).on('bys:inviteSent', () => {
        if (currentGroupId) loadInvites(currentGroupId);
    });

    if (window.bysGroupData?.groupId) {
        loadInvites(window.bysGroupData.groupId);
    }
});
