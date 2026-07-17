import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';

jQuery(document).ready(($) => {
    const $block      = $('.wp-block-bys-groups-group-communication-history-modal').first();
    if (!$block.length) return;

    const $modal      = $block.find('#communication-history-modal');
    const $backdrop   = $modal.find('.modal-backdrop');
    const $back       = $modal.find('.modal__back');
    const $promptName = $modal.find('.modal__prompt-name');
    const $senderName = $modal.find('.modal__sender-name');
    const $screen1    = $modal.find('.comm-screen--1');
    const $screen2    = $modal.find('.comm-screen--2');
    const $screen3    = $modal.find('.comm-screen--3');

    let screen = 1;
    let currentBatchId = null;
    let currentPromptType = null;
    let loadedRecipients = null; // Cache recipients so we don't refetch on back navigation
    let currentGroupId = null;
    let screen2DateString = null; // Cache the formatted date for back navigation
    // Tracks how the modal was opened: 'batch' (from the log block, Screen 1
    // is irrelevant) or 'history' (from the prompts block, Screen 1 is the
    // entry point). Drives back-button visibility.
    let entryMode = 'history';

    function showScreen(n, subtitle) {
        screen = n;
        $screen1.toggle(n === 1);
        $screen2.toggle(n === 2);
        $screen3.toggle(n === 3);
        // Back button is only meaningful when there's a previous screen to
        // return to. In 'batch' entry mode, Screen 2 IS the entry point, so
        // it has no previous screen.
        const hasPrevious = (entryMode === 'batch') ? (n > 2) : (n > 1);
        $back.toggle(hasPrevious);
        if (subtitle !== undefined) $promptName.text(subtitle);
    }

    function closeModal() {
        $modal.addClass('hidden');
        $('html').css('overflow', '');
        showScreen(1, '');
        currentBatchId = null;
        currentPromptType = null;
        loadedRecipients = null;
        entryMode = 'history';
        $senderName.hide().text('');
        // Show skeletons and clear content on close
        $screen1.find('.skeleton-wrapper').removeClass('hidden');
        $screen1.find('.comm-batch-list').find('tr:not(.skeleton-wrapper)').remove();
        $screen2.find('.skeleton-wrapper').removeClass('hidden');
        $screen2.find('.comm-user-list').find('tr:not(.skeleton-wrapper)').remove();
        setScreen3Loading(true);
    }

    $modal.find('.modal__close').on('click', closeModal);
    $backdrop.on('click', closeModal);

    $(document).on('keydown.commHistoryModal', (e) => {
        if (e.key === 'Escape' && !$modal.hasClass('hidden')) closeModal();
    });

    /**
     * Load all batches filtered by prompt_type
     */
    async function loadBatches(promptType) {
        const $tbody = $screen1.find('.comm-batch-list');
        const $loading = $screen1.find('.skeleton-wrapper');

        $loading.removeClass('hidden');
        $tbody.find('tr:not(.skeleton-wrapper)').remove();

        if (!currentGroupId) {
            $loading.addClass('hidden');
            $tbody.html(`<tr><td colspan="4" style="text-align:center;padding:20px;">No group selected</td></tr>`);
            return;
        }

        try {
            const data = await api.get(endpoints.groupCommunicationLog(currentGroupId));
            const batches = (data.messages || []).filter(msg => msg.prompt_type === promptType);

            $loading.addClass('hidden');
            renderBatches(batches);
        } catch (err) {
            console.error('[group-communication-history-modal] Error loading batches:', err);
            $loading.addClass('hidden');
            $tbody.find('tr:not(.skeleton-wrapper)').remove();
            $tbody.html(`<tr><td colspan="4" style="text-align:center;padding:20px;">Error loading history</td></tr>`);
        }
    }

    /**
     * Render batches into Screen 1 table
     */
    function renderBatches(batches) {
        const $tbody = $screen1.find('.comm-batch-list');
        $tbody.find('tr:not(.skeleton-wrapper)').remove();
        $screen1.find('.skeleton-wrapper').addClass('hidden');

        if (!batches || batches.length === 0) {
            $tbody.html(`<tr><td colspan="4" style="text-align:center;padding:20px;">No messages sent yet</td></tr>`);
            return;
        }

        // Reverse to show latest first
        const reversedBatches = [...batches].reverse();

        reversedBatches.forEach((batch) => {
            // sent_at is already in local time from the API (Y-m-d H:i:s format)
            let sentAt = null;
            if (batch.sent_at) {
                // Try parsing as MySQL format first (YYYY-MM-DD HH:MM:SS)
                const mysqlMatch = batch.sent_at.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
                if (mysqlMatch) {
                    sentAt = new Date(mysqlMatch[1], mysqlMatch[2] - 1, mysqlMatch[3], mysqlMatch[4], mysqlMatch[5], mysqlMatch[6]);
                } else {
                    // Fall back to standard Date parsing (ISO format)
                    sentAt = new Date(batch.sent_at);
                }
            }
            const dateStr = sentAt && !isNaN(sentAt.getTime()) ? sentAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';

            const statusText  = batchStatusLabel(batch.delivery_status);
            const statusClass = statusClassName(batch.delivery_status || 'delivered');

            // Fetch sender user info via the shared api client so the WP REST
            // nonce + plugin auth header are included (bare fetch hits 401 for
            // /wp/v2/users/{id} when the user has no public posts).
            let senderName = 'Unknown';
            if (batch.sender_user_id) {
                api.get(`/wp-json/wp/v2/users/${batch.sender_user_id}`)
                    .then(data => {
                        const name = data?.name || `User ${batch.sender_user_id}`;
                        $tbody.find(`tr[data-batch-id="${escapeHtml(batch.batch_id)}"] .comm-sender-name`).text(name);
                    })
                    .catch(() => {
                        // On error, just leave it as Unknown
                    });
            }

            const $row = $(`
                <tr class="comm-batch-row" data-batch-id="${escapeHtml(batch.batch_id)}">
                    <td>${escapeHtml(dateStr)}</td>
                    <td class="comm-sender-name">${escapeHtml(senderName)}</td>
                    <td class="comm-recipient-count">${batch.recipient_count || 0}</td>
                    <td><span class="comm-status-badge ${statusClass}">${escapeHtml(statusText)}</span></td>
                </tr>
            `);
            $tbody.append($row);
        });
    }

    /**
     * Load all recipients for a batch
     */
    async function loadRecipients(batchId) {
        // Return cached if available
        if (loadedRecipients && loadedRecipients.batch_id === batchId) {
            renderRecipients(loadedRecipients);
            return;
        }

        const $tbody = $screen2.find('.comm-user-list');
        const $loading = $screen2.find('.skeleton-wrapper');

        $loading.removeClass('hidden');
        $tbody.find('tr:not(.skeleton-wrapper)').remove();

        try {
            const recipients = await api.get(endpoints.communicationRecipients(batchId));
            loadedRecipients = { batch_id: batchId, recipients };
            $loading.addClass('hidden');
            renderRecipients(loadedRecipients);
        } catch (err) {
            console.error('[group-communication-history-modal] Error loading recipients:', err);
            $loading.addClass('hidden');
            $tbody.find('tr:not(.skeleton-wrapper)').remove();
            $tbody.html(`<tr><td colspan="3" style="text-align:center;padding:20px;">Error loading recipients</td></tr>`);
        }

    }

    /**
     * Render recipients into Screen 2 table
     */
    function renderRecipients(data) {
        const $tbody = $screen2.find('.comm-user-list');
        $tbody.find('tr:not(.skeleton-wrapper)').remove();
        $screen2.find('.skeleton-wrapper').addClass('hidden');

        if (!data.recipients || !Array.isArray(data.recipients)) {
            return;
        }

        data.recipients.forEach((recipient) => {
            const statusLabel = recipientStatusLabel(recipient.delivery_status);
            const statusClass = statusClassName(recipient.delivery_status);
            // Use message_id if available, otherwise fall back to DB row id
            const detailId = recipient.message_id || recipient.id;
            const $row = $(`
                <tr class="comm-user-row" data-detail-id="${escapeHtml(String(detailId))}" data-recipient-name="${escapeHtml(recipient.recipient_name)}">
                    <td>${escapeHtml(recipient.recipient_name)}</td>
                    <td class="comm-email">${escapeHtml(recipient.recipient_email)}</td>
                    <td><span class="comm-status-badge ${statusClass}">${escapeHtml(statusLabel)}</span></td>
                </tr>
            `);
            $tbody.append($row);
        });
    }

    /**
     * Load detail for a single message
     */
    /**
     * Show or hide every Screen 3 skeleton. `loading=true` blanks the
     * content fields and shows their skeletons; `loading=false` hides the
     * skeletons (subsequent text-setting reveals the content).
     */
    function setScreen3Loading(loading) {
        const $subject   = $screen3.find('.comm-message-subject');
        const $recipient = $screen3.find('.comm-message-recipient');
        const $badge     = $screen3.find('.comm-status-badge');
        const $body      = $screen3.find('.comm-message-body');
        const $bodySkel  = $screen3.find('.comm-message-body-skeleton');

        if (loading) {
            // Wipe content but keep skeleton spans, then ensure they're visible.
            [$subject, $recipient, $badge].forEach($el => {
                $el.find(':not(.skeleton)').remove();
                $el.find('.skeleton').show();
            });
            $body.empty();
            $bodySkel.show();
        } else {
            $screen3.find('.comm-meta-value .skeleton, .comm-status-badge .skeleton').hide();
            $bodySkel.hide();
        }
    }

    async function loadMessageDetail(detailId) {
        setScreen3Loading(true);

        try {
            // detailId is either a Postmark message_id or a DB row id (for failed/scheduled rows)
            const detail = await api.get(endpoints.communicationDetail(detailId));
            renderMessageDetail(detail);
        } catch (err) {
            console.error('[group-communication-history-modal] Error loading detail:', err);
            setScreen3Loading(false);
            $screen3.find('.comm-message-body').html(`<p style="color:red;">Error loading message details</p>`);
        }
    }

    /**
     * Render message detail into Screen 3
     */
    function renderMessageDetail(detail) {
        const statusLabel = recipientStatusLabel(detail.delivery_status);
        const statusClass = statusClassName(detail.delivery_status);

        setScreen3Loading(false);

        $screen3.find('.comm-message-subject').text(detail.subject || '(No subject)');

        $screen3.find('.comm-message-recipient').text(
            `${detail.recipient_name} <${detail.recipient_email}>`
        );

        const $badge = $screen3.find('.comm-status-badge');
        $badge.removeClass().addClass(`comm-status-badge ${statusClass}`).text(statusLabel);

        // Render email body (prefer HTML, fallback to text)
        const $body = $screen3.find('.comm-message-body');
        if (detail.body_html) {
            const bodyHtml = detail.body_html
                .replace(/<title[^>]*>.*?<\/title>/gi, '')
                .replace(/>\s+</g, '><')
                .replace(/\s\s+/g, ' ')
                .trim();
            $body.html(bodyHtml);
        } else {
            $body.text(detail.body_text || '(No content)');
        }
    }

    /**
     * Fetch a WP user's display name and render it in the header slot. Hides
     * the slot when no user id is given or the fetch fails.
     */
    async function renderSenderName(userId) {
        if (!userId) {
            $senderName.hide().text('');
            return;
        }

        // Optimistic placeholder so something appears immediately.
        $senderName.text(` • Sent by user #${userId}`).show();

        try {
            const data = await api.get(`/wp-json/wp/v2/users/${userId}`);
            const name = data?.name || `User ${userId}`;
            $senderName.text(` • Sent by ${name}`);
        } catch (err) {
            console.warn('[group-communication-history-modal] Failed to load sender name:', err);
            // Leave the placeholder text in place rather than going blank.
        }
    }

    /**
     * Called from the communication log block to open directly at screen 2
     */
    $(document).on('comm:open-batch', async (e, data) => {
        currentBatchId = data.batchId;
        currentGroupId = store.getCurrentGroup();
        entryMode = 'batch';
        $modal.removeClass('hidden');
        $('html').css('overflow', 'hidden');
        showScreen(2, data.date || '');

        renderSenderName(data.senderUserId);

        // Show skeleton before loading
        $screen2.find('.skeleton-wrapper').removeClass('hidden');

        await loadRecipients(data.batchId);
    });

    /**
     * Called from the communication prompts block to open history for a prompt_type
     */
    $(document).on('comm:open-history', async (e, data) => {
        currentPromptType = data.promptType;
        currentGroupId = store.getCurrentGroup();
        entryMode = 'history';
        $modal.removeClass('hidden');
        $('html').css('overflow', 'hidden');

        // Sender slot is only relevant for the per-batch view from the log.
        $senderName.hide().text('');
        showScreen(1, data.promptTitle || '');

        // Show skeleton before loading
        $screen1.find('.skeleton-wrapper').removeClass('hidden');

        await loadBatches(data.promptType);
    });

    /**
     * Back button handler
     */
    $back.on('click', () => {
        if (screen === 2 && entryMode === 'history') {
            // Only meaningful when we entered via the prompts block.
            showScreen(1, currentPromptType ? capitalize(currentPromptType.replace(/-/g, ' ')) : '');
        }
        if (screen === 3) {
            // Going back to Screen 2 — restore the cached date string
            showScreen(2, screen2DateString || '');
        }
    });

    /**
     * Screen 1: click batch row to view recipients
     */
    $screen1.on('click', '.comm-batch-row', async function () {
        const batchId = $(this).data('batchId');
        currentBatchId = batchId;
        const dateStr = $(this).find('td').eq(0).text();
        screen2DateString = dateStr; // Cache for back navigation
        showScreen(2, dateStr);
        await loadRecipients(batchId);
    });

    /**
     * Screen 2: click recipient row to view detail
     */
    $screen2.on('click', '.comm-user-row', async function () {
        const detailId = $(this).data('detailId');
        const recipientName = $(this).data('recipientName');
        showScreen(3, recipientName);
        await loadMessageDetail(detailId);
    });

    /**
     * Mutation observer for scroll lock
     */
    new MutationObserver(() => {
        $('html').css('overflow', $modal.hasClass('hidden') ? '' : 'hidden');
    }).observe($modal[0], { attributes: true, attributeFilter: ['class'] });
});

/**
 * Utility: capitalize first letter
 */
function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/**
 * Utility: DB delivery_status → CSS class name.
 */
function statusClassName(status) {
    return `comm-status-badge--${(status || 'pending').replace(/_/g, '-')}`;
}

// Screen 1 (batch aggregate) — server folds comms_disabled into failed /
// partial_failure, so this table never sees comms_disabled directly.
const BATCH_STATUS_LABELS = {
    delivered:       'All Success',
    scheduled:       'Scheduled',
    failed:          'None Delivered',
    partial_failure: 'Some Sent',
    bounced:         'None Delivered',
    spam:            'Some Sent',
    pending:         'Pending',
};

// Screen 2/3 (per-recipient) — comms_disabled surfaces here directly.
// Anything unmapped falls back to capitalize() for forward-compat with
// new statuses the backend might introduce.
const RECIPIENT_STATUS_LABELS = {
    pending:        'Pending',
    delivered:      'Delivered',
    scheduled:      'Scheduled',
    failed:         'Failed',
    bounced:        'Bounced',
    spam:           'Spam',
    comms_disabled: 'Communications: Off',
};

function batchStatusLabel(status) {
    return BATCH_STATUS_LABELS[status] || 'All Success';
}

function recipientStatusLabel(status) {
    const s = status || 'pending';
    return RECIPIENT_STATUS_LABELS[s] || capitalize(s);
}

/**
 * Utility: escape HTML in strings for safe DOM insertion
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
