import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
    const $block      = $('.wp-block-bys-groups-group-communication-history-modal').first();
    if (!$block.length) return;

    const $modal      = $block.find('#communication-history-modal');
    const $backdrop   = $modal.find('.modal-backdrop');
    const $back       = $modal.find('.modal__back');
    const $promptName = $modal.find('.modal__prompt-name');
    const $screen1    = $modal.find('.comm-screen--1');
    const $screen2    = $modal.find('.comm-screen--2');
    const $screen3    = $modal.find('.comm-screen--3');

    let screen = 1;
    let currentBatchId = null;
    let currentPromptType = null;
    let loadedRecipients = null; // Cache recipients so we don't refetch on back navigation
    let currentGroupId = null;

    function showScreen(n, subtitle) {
        screen = n;
        $screen1.toggle(n === 1);
        $screen2.toggle(n === 2);
        $screen3.toggle(n === 3);
        $back.toggle(n > 1);
        if (subtitle !== undefined) $promptName.text(subtitle);
    }

    function closeModal() {
        $modal.addClass('hidden');
        $('html').css('overflow', '');
        showScreen(1, '');
        currentBatchId = null;
        currentPromptType = null;
        loadedRecipients = null;
        // Show skeletons and clear content on close
        $screen1.find('.skeleton-wrapper').removeClass('hidden');
        $screen1.find('.comm-batch-list').find('tr:not(.skeleton-wrapper)').remove();
        $screen2.find('.skeleton-wrapper').removeClass('hidden');
        $screen2.find('.comm-user-list').find('tr:not(.skeleton-wrapper)').remove();
        $screen3.find('.comm-message-subject').find('.skeleton').parent().show().find(':not(.skeleton)').remove();
        $screen3.find('.comm-message-recipient').find('.skeleton').parent().show().find(':not(.skeleton)').remove();
        $screen3.find('.comm-status-badge').find('.skeleton').parent().show().find(':not(.skeleton)').remove();
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

            // Calculate status based on delivery_status
            let statusText = 'All Success';
            let statusClass = 'comm-status-badge--delivered';

            if (batch.delivery_status === 'scheduled') {
                statusText = 'Scheduled';
                statusClass = 'comm-status-badge--scheduled';
            } else if (batch.delivery_status === 'bounced') {
                statusText = 'All Failed';
                statusClass = 'comm-status-badge--bounced';
            } else if (batch.delivery_status === 'spam') {
                statusText = 'Some Failed';
                statusClass = 'comm-status-badge--spam';
            } else if (batch.delivery_status === 'pending') {
                statusText = 'Pending';
                statusClass = 'comm-status-badge--pending';
            }

            // Fetch sender user info
            let senderName = 'Unknown';
            if (batch.sender_user_id) {
                fetch(`/wp-json/wp/v2/users/${batch.sender_user_id}`)
                    .then(res => res.json())
                    .then(data => {
                        senderName = data.name || `User ${batch.sender_user_id}`;
                        // Update the row with the actual sender name
                        $tbody.find(`tr[data-batch-id="${escapeHtml(batch.batch_id)}"] .comm-sender-name`).text(senderName);
                    })
                    .catch(() => {
                        // On error, just leave it as Unknown
                    });
            }

            const $row = $(`
                <tr class="comm-batch-row" data-batch-id="${escapeHtml(batch.batch_id)}">
                    <td>${escapeHtml(dateStr)}</td>
                    <td class="comm-sender-name">${escapeHtml(senderName)}</td>
                    <td style="text-align:center;">${batch.recipient_count || 0}</td>
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
            const statusLabel = capitalize(recipient.delivery_status || 'pending');
            const statusClass = `comm-status-badge--${recipient.delivery_status}`;
            const $row = $(`
                <tr class="comm-user-row" data-message-id="${escapeHtml(recipient.message_id)}" data-recipient-name="${escapeHtml(recipient.recipient_name)}">
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
    async function loadMessageDetail(messageId) {
        // Show all skeletons in Screen 3
        $screen3.find('.comm-message-subject').find('.skeleton').show();
        $screen3.find('.comm-message-recipient').find('.skeleton').show();
        $screen3.find('.comm-status-badge').find('.skeleton').show();
        const $bodySkeleton = $screen3.find('.skeleton--body');
        $bodySkeleton.show();

        // Clear previous content
        $screen3.find('.comm-message-subject').find(':not(.skeleton)').remove();
        $screen3.find('.comm-message-recipient').find(':not(.skeleton)').remove();
        $screen3.find('.comm-status-badge').find(':not(.skeleton)').remove();
        $screen3.find('.comm-message-body').empty();

        try {
            const detail = await api.get(endpoints.communicationDetail(messageId));
            renderMessageDetail(detail);
        } catch (err) {
            console.error('[group-communication-history-modal] Error loading detail:', err);
            $bodySkeleton.remove();
            $screen3.find('.comm-message-body').html(`<p style="color:red;">Error loading message details</p>`);
        }
    }

    /**
     * Render message detail into Screen 3
     */
    function renderMessageDetail(detail) {
        const statusLabel = capitalize(detail.delivery_status || 'pending');
        const statusClass = `comm-status-badge--${detail.delivery_status}`;

        // Remove skeletons and populate fields
        $screen3.find('.comm-message-subject').find('.skeleton').remove();
        $screen3.find('.comm-message-subject').text(detail.subject || '(No subject)');

        $screen3.find('.comm-message-recipient').find('.skeleton').remove();
        $screen3.find('.comm-message-recipient').text(
            `${escapeHtml(detail.recipient_name)} <${escapeHtml(detail.recipient_email)}>`
        );

        const $badge = $screen3.find('.comm-status-badge');
        $badge.find('.skeleton').remove();
        $badge.removeClass().addClass(`comm-status-badge ${statusClass}`).text(statusLabel);

        // Render email body (prefer HTML, fallback to text)
        let bodyHtml = detail.body_html || detail.body_text || '(No content)';
        const $body = $screen3.find('.comm-message-body');
        $screen3.find('.skeleton--body').remove();

        if (detail.body_html) {
            // Clean up HTML: remove <title> tags and collapse whitespace
            bodyHtml = bodyHtml
                .replace(/<title[^>]*>.*?<\/title>/gi, '') // Remove <title> tags
                .replace(/>\s+</g, '><') // Remove whitespace between tags
                .replace(/\s\s+/g, ' ') // Collapse multiple whitespaces to single space
                .trim();
            $body.html(bodyHtml);
        } else {
            $body.text(bodyHtml);
        }
    }

    /**
     * Called from the communication log block to open directly at screen 2
     */
    $(document).on('comm:open-batch', async (e, data) => {
        currentBatchId = data.batchId;
        currentGroupId = window.bysGroupData?.groupId;
        $modal.removeClass('hidden');
        $('html').css('overflow', 'hidden');
        showScreen(2, data.date || '');

        // Show skeleton before loading
        $screen2.find('.skeleton-wrapper').removeClass('hidden');

        await loadRecipients(data.batchId);
    });

    /**
     * Called from the communication prompts block to open history for a prompt_type
     */
    $(document).on('comm:open-history', async (e, data) => {
        currentPromptType = data.promptType;
        currentGroupId = window.bysGroupData?.groupId;
        $modal.removeClass('hidden');
        $('html').css('overflow', 'hidden');
        showScreen(1, data.promptTitle || '');

        // Show skeleton before loading
        $screen1.find('.skeleton-wrapper').removeClass('hidden');

        await loadBatches(data.promptType);
    });

    /**
     * Back button handler
     */
    $back.on('click', () => {
        if (screen === 2) {
            // Going back to Screen 1 — show prompt type name
            showScreen(1, currentPromptType ? capitalize(currentPromptType.replace(/-/g, ' ')) : '');
        }
        if (screen === 3) {
            showScreen(2, loadedRecipients ? new Date(loadedRecipients.created_at).toLocaleString() : '');
        }
    });

    /**
     * Screen 1: click batch row to view recipients
     */
    $screen1.on('click', '.comm-batch-row', async function () {
        const batchId = $(this).data('batchId');
        currentBatchId = batchId;
        showScreen(2, $(this).find('td').eq(0).text());
        await loadRecipients(batchId);
    });

    /**
     * Screen 2: click recipient row to view detail
     */
    $screen2.on('click', '.comm-user-row', async function () {
        const messageId = $(this).data('messageId');
        const recipientName = $(this).data('recipientName');
        showScreen(3, recipientName);
        await loadMessageDetail(messageId);
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
 * Utility: escape HTML in strings for safe DOM insertion
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
