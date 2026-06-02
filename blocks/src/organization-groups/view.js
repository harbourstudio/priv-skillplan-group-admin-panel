import { api, endpoints } from '../_shared/api-client.js';

const ARCHIVE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="21 8 21 21 3 21 3 8"></polyline>
    <rect x="1" y="3" width="22" height="5"></rect>
    <line x1="10" y1="12" x2="14" y2="12"></line>
</svg>`;

function formatArchivedDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return 'Archived ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildGroupRow(group) {
    const $row = jQuery(`
        <div class="org-groups__item" data-group-id="${group.id}">
            <span class="org-groups__group-name">${group.name}</span>
            <button class="org-groups__manage-btn btn-unstyled" type="button">
                Manage <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
        </div>
    `);

    $row.find('.org-groups__manage-btn').on('click', function () {
        sessionStorage.setItem('bys_selected_group_id', group.id);
        window.location.href = '/administrator-dashboard';
    });

    return $row;
}

function buildArchivedRow(group, $archivedSection) {
    const $row = jQuery(`
        <div class="org-groups__archived-item" data-group-id="${group.id}">
            <div class="org-groups__archived-icon">${ARCHIVE_ICON}</div>
            <div class="org-groups__archived-info">
                <span class="org-groups__archived-name">${group.name}</span>
                <span class="org-groups__archived-date">${formatArchivedDate(group.archived_date)}</span>
            </div>
            <button class="org-groups__unarchive-btn btn-unstyled" type="button">Unarchive</button>
        </div>
    `);

    $row.find('.org-groups__unarchive-btn').on('click', async function () {
        const $btn = jQuery(this);
        $btn.prop('disabled', true).text('Unarchiving…');

        try {
            await api.post(endpoints.unarchiveGroup(group.id));
            $row.fadeOut(300, () => {
                $row.remove();
                // Hide the whole archived section if nothing left
                if (!$archivedSection.find('.org-groups__archived-item').length) {
                    $archivedSection.hide();
                }
            });
        } catch (err) {
            console.error('[org-groups] Failed to unarchive group', err);
            $btn.prop('disabled', false).text('Unarchive');
        }
    });

    return $row;
}

function buildNewGroupFooter(orgId, $section) {
    const $footer = jQuery(`
        <div class="org-groups__new-group">
            <button class="org-groups__new-group-btn btn-unstyled" type="button">
                <i class="fa-solid fa-plus" aria-hidden="true"></i> New group
            </button>
            <div class="org-groups__new-group-form">
                <input
                    class="org-groups__new-group-input"
                    type="text"
                    placeholder="Group name…"
                    maxlength="100"
                />
                <button class="org-groups__new-group-submit btn-unstyled" type="button">Create</button>
                <button class="org-groups__new-group-cancel btn-unstyled" type="button">Cancel</button>
            </div>
            <div class="org-groups__created-confirm">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                <span class="org-groups__created-name"></span> created.
                <button class="org-groups__go-to-group btn-unstyled" type="button">
                    Manage group <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </button>
            </div>
        </div>
    `);

    const $btn     = $footer.find('.org-groups__new-group-btn');
    const $form    = $footer.find('.org-groups__new-group-form');
    const $input   = $footer.find('.org-groups__new-group-input');
    const $submit  = $footer.find('.org-groups__new-group-submit');
    const $cancel  = $footer.find('.org-groups__new-group-cancel');
    const $confirm = $footer.find('.org-groups__created-confirm');
    const $goBtn   = $footer.find('.org-groups__go-to-group');

    function openForm() {
        $btn.addClass('is-hidden');
        $form.addClass('is-open');
        $input.val('').trigger('focus');
    }

    function closeForm() {
        $form.removeClass('is-open');
        $btn.removeClass('is-hidden');
    }

    $btn.on('click', openForm);
    $cancel.on('click', closeForm);

    $input.on('keydown', function (e) {
        if (e.key === 'Enter') $submit.trigger('click');
        if (e.key === 'Escape') closeForm();
    });

    $submit.on('click', async function () {
        const name = $input.val().trim();
        if (!name) { $input.trigger('focus'); return; }

        $submit.prop('disabled', true).text('Creating…');
        $cancel.prop('disabled', true);

        try {
            const group = await api.post(endpoints.createOrganizationGroup(orgId), { name });

            // Clear search so the new group is always visible
            const $parentBlock = $section.closest('.wp-block-bys-groups-organization-groups');
            $parentBlock.find('.org-groups__search').val('');
            applySearch($parentBlock, '');

            // Add the new row to the active items list
            const $items = $section.find('.org-groups__items');
            $items.append(buildGroupRow(group));
            $section.find('.org-groups__empty').remove();

            // Update group count label
            const count = $section.find('.org-groups__item').length;
            $section.find('.org-groups__org-meta').text(`${count} group${count !== 1 ? 's' : ''}`);

            // Show confirmation
            $form.removeClass('is-open');
            $confirm.find('.org-groups__created-name').text(`"${group.name}"`);
            $confirm.addClass('is-open');

            $goBtn.on('click', function () {
                sessionStorage.setItem('bys_selected_group_id', group.id);
                window.location.href = '/administrator-dashboard';
            });
        } catch (err) {
            console.error('[org-groups] Failed to create group', err);
            $submit.prop('disabled', false).text('Create');
            $cancel.prop('disabled', false);
        }
    });

    return $footer;
}

function buildOrgSection(org) {
    const groupCount = org.groups.length;
    const countLabel = `${groupCount} group${groupCount !== 1 ? 's' : ''}`;

    const $section = jQuery(`
        <div class="org-groups__section" data-org-id="${org.id}">
            <div class="org-groups__org-header">
                <h3 class="org-groups__org-name">${org.name}</h3>
                <span class="org-groups__org-meta">${countLabel}</span>
            </div>
            <div class="org-groups__card">
                <div class="org-groups__items"></div>
                ${!groupCount ? '<p class="org-groups__empty">No groups yet — create one below.</p>' : ''}
            </div>
        </div>
    `);

    org.groups.forEach((group) => {
        $section.find('.org-groups__items').append(buildGroupRow(group));
    });

    if (org.is_admin) {
        $section.find('.org-groups__card').append(buildNewGroupFooter(org.id, $section));
    }

    // Archived groups section — only rendered for org admins with archived groups
    if (org.is_admin && org.archived_groups && org.archived_groups.length) {
        const $archived = jQuery(`
            <div class="org-groups__archived-section">
                <button class="org-groups__archived-toggle btn-unstyled" type="button">
                    <i class="fa-solid fa-chevron-right org-groups__archived-chevron" aria-hidden="true"></i>
                    Archived groups
                    <span class="org-groups__archived-badge">${org.archived_groups.length}</span>
                </button>
                <div class="org-groups__archived-list"></div>
            </div>
        `);

        const $toggle   = $archived.find('.org-groups__archived-toggle');
        const $list     = $archived.find('.org-groups__archived-list');
        const $chevron  = $archived.find('.org-groups__archived-chevron');

        org.archived_groups.forEach((group) => {
            $list.append(buildArchivedRow(group, $list));
        });

        $toggle.on('click', function () {
            const isOpen = $list.hasClass('is-open');
            $list.toggleClass('is-open', !isOpen);
            $chevron.toggleClass('is-rotated', !isOpen);
        });

        $section.append($archived);
    }

    return $section;
}

function buildUngroupedSection(groups) {
    const $section = jQuery(`
        <div class="org-groups__section org-groups__section--ungrouped">
            <div class="org-groups__org-header">
                <h3 class="org-groups__org-name">Other Groups</h3>
                <span class="org-groups__org-meta">${groups.length} group${groups.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="org-groups__card">
                <div class="org-groups__items"></div>
            </div>
        </div>
    `);

    groups.forEach((group) => {
        $section.find('.org-groups__items').append(buildGroupRow(group));
    });

    return $section;
}

function applySearch($block, query) {
    const q = query.toLowerCase().trim();

    $block.find('.org-groups__section').each(function () {
        const $section  = jQuery(this);
        const orgName   = $section.find('.org-groups__org-name').first().text().toLowerCase();
        const orgMatch  = !q || orgName.includes(q);
        let visibleCount = 0;

        $section.find('.org-groups__item').each(function () {
            const $row      = jQuery(this);
            const groupName = $row.find('.org-groups__group-name').text().toLowerCase();
            // Show group if: no query, org name matches, or group name matches
            const match = !q || orgMatch || groupName.includes(q);
            $row.toggleClass('is-hidden', !match);
            if (match) visibleCount++;
        });

        // Hide the section only when neither the org nor any group matched
        $section.toggleClass('is-hidden', !orgMatch && visibleCount === 0 && !!q);

        // Inline empty message when the org matched but has no groups (edge case)
        const $empty = $section.find('.org-groups__search-empty');
        if (q && !orgMatch && visibleCount === 0) {
            if (!$empty.length) {
                $section.find('.org-groups__items').after(
                    '<p class="org-groups__search-empty">No groups match your search.</p>'
                );
            }
        } else {
            $empty.remove();
        }
    });
}

jQuery(document).ready(async ($) => {
    const $block    = $('.wp-block-bys-groups-organization-groups').first();
    if (!$block.length) return;

    const $skeleton  = $block.find('.org-groups__skeleton');
    const $list      = $block.find('.org-groups__list');
    const $search    = $block.find('.org-groups__search');

    try {
        const data          = await api.get(endpoints.currentUserOrganizations());
        const organizations = data.organizations    || [];
        const ungrouped     = data.ungrouped_groups || [];

        $skeleton.hide();

        if (!organizations.length && !ungrouped.length) {
            $list.html('<p class="org-groups__no-orgs">You have no groups to manage.</p>');
            return;
        }

        organizations.forEach((org) => $list.append(buildOrgSection(org)));

        if (ungrouped.length) {
            $list.append(buildUngroupedSection(ungrouped));
        }

        $search.on('input', function () {
            applySearch($block, jQuery(this).val());
        });
    } catch (err) {
        console.error('[org-groups] Failed to load organizations', err);
        $skeleton.hide();
        $list.html('<p class="org-groups__no-orgs">Could not load groups.</p>');
    }
});
