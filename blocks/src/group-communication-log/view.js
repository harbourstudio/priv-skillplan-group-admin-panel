import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
    const $block = $('.wp-block-bys-groups-group-communication-log').first();
    if (!$block.length) return;

    const $list = $block.find('.gcl__list');

    /**
     * Fetch and render email log
     */
    async function loadLog(groupId) {
        try {
            const data = await api.get(endpoints.groupCommunicationLog(groupId));
            renderLog(data.messages || [], false);
        } catch (err) {
            $list.html('<p class="gcl__error">Failed to load message log.</p>');
            console.error('[group-communication-log] Error:', err);
        }
    }

    /**
     * Render log items
     */
    function renderLog(messages, isAppending = false) {

        if (!messages.length && !isAppending) {
            $list.html('<div class="gcl__feedback"><p>No sent messages yet.</p></div>');
            return;
        }

        // Get template
        const template = document.getElementById('gcl-item-template');
        if (!template) {
            $list.html('<p class="gcl__error">Template not found.</p>');
            return;
        }

        // Clear list only on initial load
        if (!isAppending) {
            $list.html('');
        }

        // Reverse messages to show newest first
        const reversed = [...messages].reverse();

        // Build items from template
        const startIndex = isAppending ? $list.find('.gcl__item').length : 0;
        reversed.forEach((msg, i) => {
            // sent_at is already in local time from the API (Y-m-d H:i:s format)
            // Parse it for display (handle both ISO format and MySQL format)
            let sentAt = null;
            if (msg.sent_at) {
                // Try parsing as MySQL format first (YYYY-MM-DD HH:MM:SS)
                const mysqlMatch = msg.sent_at.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
                if (mysqlMatch) {
                    sentAt = new Date(mysqlMatch[1], mysqlMatch[2] - 1, mysqlMatch[3], mysqlMatch[4], mysqlMatch[5], mysqlMatch[6]);
                } else {
                    // Fall back to standard Date parsing (ISO format)
                    sentAt = new Date(msg.sent_at);
                }
            }

            const dateStr = sentAt && !isNaN(sentAt.getTime())
                ? sentAt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                : '';
            const batchLabel = msg.subject || '(No subject)';
            const batchDate = sentAt && !isNaN(sentAt.getTime())
                ? sentAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                : '';

            // Clone template and populate
            const $button = $(template.content.cloneNode(true));
            $button.find('.gcl__date').text(dateStr);
            $button.find('.gcl__label').text(batchLabel);
            $button.find('.gcl__item')
                .attr('data-batch-date', batchDate)
                .attr('data-batch-label', batchLabel)
                .attr('data-prompt-type', msg.prompt_type)
                .attr('data-batch-id', msg.batch_id)
                .attr('data-message-id', msg.message_id);

            // Set badge class and text based on badge_type
            const badgeType = msg.badge_type || 'prompt';
            const badgeLabel = badgeType === 'custom' ? 'Custom' : 'Prompt';
            $button.find('.gcl__badge')
                .addClass(`gcl__badge--${badgeType}`)
                .text(badgeLabel);

            // Set delivery status attribute if present
            if (msg.delivery_status) {
                $button.find('.gcl__item').attr('data-delivery-status', msg.delivery_status);
            }

            // Add hidden class for items beyond the 5th visible item
            if (startIndex + i >= 5) {
                $button.find('.gcl__item').addClass('gcl__item--hidden');
            }

            $list.append($button);
        });

        // Bind modal open handler
        $block.off('click', '[data-opens-modal]').on('click', '[data-opens-modal]', function () {
            const targetId = $(this).data('opensModal');
            const batchDate = $(this).data('batchDate');
            const batchId = $(this).data('batchId');
            const subject = $(this).data('batchLabel');
            const promptType = $(this).data('promptType');
            const $modal = $(targetId);
            if (!$modal.length) return;

            $modal.removeClass('hidden');
            $('html').css('overflow', 'hidden');

            $(document).trigger('comm:open-batch', {
                date: batchDate,
                batchId: batchId,
                subject: subject,
                promptType: promptType,
            });
        });

        // Setup show-more button
        setupShowMore();
    }

    /**
     * Setup and manage show-more button behavior
     */
    function setupShowMore() {
        let visibleCount = 5;
        let currentOffset = 0;
        let groupId = window.bysGroupData?.groupId;
        let isLoadingMore = false;

        // Remove existing show-more button
        $block.find('.gcl__show-more').off('click').remove();

        const totalItems = $block.find('.gcl__item').length;

        // Show-more button (only if > 5 results)
        if (totalItems > 5) {
            const $card = $block.find('.gcl__card');
            $card.append('<button class="gcl__show-more btn-unstyled">Show more</button>');

            $block.find('.gcl__show-more').on('click', async function () {
                // Reveal next 5 hidden items
                const $hiddenItems = $block.find('.gcl__item--hidden').slice(0, 5);

                if ($hiddenItems.length > 0) {
                    $hiddenItems.removeClass('gcl__item--hidden');
                    visibleCount += 5;

                    // Hide button if all items are now visible
                    if (visibleCount >= totalItems) {
                        $(this).hide();
                    }
                } else if (!isLoadingMore) {
                    // No more hidden items; fetch next batch from API
                    isLoadingMore = true;
                    $(this).text('Loading...').prop('disabled', true);

                    try {
                        currentOffset += 25;
                        const data = await api.get(
                            endpoints.groupCommunicationLog(groupId, 25, currentOffset),
                            true // force refresh to bypass cache
                        );

                        if (data.messages && data.messages.length > 0) {
                            renderLog(data.messages, true); // Append mode
                            visibleCount = $block.find('.gcl__item').length;
                            totalItems = visibleCount; // Update total count

                            // Reset button text and reattach handler
                            $(this).text('Show more').prop('disabled', false);
                            setupShowMore(); // Reinitialize button behavior
                        } else {
                            // No more messages
                            $(this).hide();
                        }
                    } catch (err) {
                        console.error('[group-communication-log] Error loading more:', err);
                        $(this).text('Show more').prop('disabled', false);
                    }

                    isLoadingMore = false;
                }
            });
        }
    }

    // Listen for group selection event from group-select block
    $(document).on('bys:groupSelected', (_, { groupId }) => {
        if (!groupId) return;
        loadLog(groupId);
    });
});
