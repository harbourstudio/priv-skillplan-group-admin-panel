<?php
$attrs = ['blockId'];
foreach ($attrs as $a) {
    if (isset($attributes[$a])) {
        if (is_bool($attributes[$a])) {
            ${$a} = $attributes[$a];
        } elseif (is_string($attributes[$a])) {
            ${$a} = $attributes[$a] !== '' ? $attributes[$a] : '';
        } else {
            ${$a} = $attributes[$a] !== null ? $attributes[$a] : '';
        }
    } else {
        ${$a} = '';
    }
}

$wrapper_attributes = get_block_wrapper_attributes();
?>

<div <?= $wrapper_attributes; ?>>
    <div
        id="communication-history-modal"
        class="comm-history-modal hs-overlay hidden"
        role="dialog"
        tabindex="-1"
        aria-labelledby="communication-history-modal-title"
        aria-modal="true"
    >
        <div class="modal-backdrop"></div>

        <div class="modal__inner">

            <div class="modal__header">
                <div class="modal__header-left">
                    <button class="modal__back btn-unstyled" aria-label="<?php esc_attr_e( 'Back', 'bys' ); ?>" style="display:none;">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div class="modal__header-titles">
                        <h4 id="communication-history-modal-title"><?php esc_html_e( 'Prompt History', 'bys' ); ?></h4>
                        <div class="modal__meta">
                            <p class="modal__prompt-name"></p>
                            <p class="modal__sender-name" style="display:none;"></p>
                        </div>
                    </div>
                </div>
                <button class="modal__close btn-unstyled" aria-label="<?php esc_attr_e( 'Close', 'bys' ); ?>">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="modal__body">

                <?php // Screen 1: Batch list for a specific prompt type ?>
                <div class="comm-screen comm-screen--1" style="display:none;">                    
                    <table class="comm-history-table">
                        <thead>
                            <tr>
                                <th><?php esc_html_e( 'Date Sent', 'bys' ); ?></th>
                                <th><?php esc_html_e( 'Sent by', 'bys' ); ?></th>
                                <th><?php esc_html_e( 'Recipients', 'bys' ); ?></th>
                                <th><?php esc_html_e( 'Status', 'bys' ); ?></th>
                            </tr>
                        </thead>
                        <tbody class="comm-batch-list">
                            <tr class="skeleton-wrapper">
                                <td><span class="skeleton" aria-label="Loading"></span></td>
                                <td><span class="skeleton" aria-label="Loading"></span></td>
                                <td><span class="skeleton" aria-label="Loading"></span></td>
                                <td><span class="skeleton" aria-label="Loading"></span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <?php // Screen 2: User list within a batch ?>
                <div class="comm-screen comm-screen--2" style="display:none;">
                    <table class="comm-history-table">
                        <thead>
                            <tr>
                                <th><?php esc_html_e( 'Recipient', 'bys' ); ?></th>
                                <th><?php esc_html_e( 'Email', 'bys' ); ?></th>
                                <th><?php esc_html_e( 'Status', 'bys' ); ?></th>
                            </tr>
                        </thead>
                        <tbody class="comm-user-list">
                            <tr class="skeleton-wrapper">
                                <td><span class="skeleton" aria-label="Loading"></span></td>
                                <td><span class="skeleton" aria-label="Loading"></span></td>
                                <td><span class="skeleton" aria-label="Loading"></span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <?php // Screen 3: Individual message detail ?>
                <div class="comm-screen comm-screen--3" style="display:none;">
                    <div class="comm-message-detail">
                        <div class="comm-message-meta">
                            <div class="comm-message-meta-row">
                                <span class="comm-meta-label"><?php esc_html_e( 'Subject', 'bys' ); ?></span>
                                <span class="comm-meta-value comm-message-subject">
                                    <span class="skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e( 'Loading subject', 'bys' ); ?>"></span>
                                </span>
                            </div>
                            <div class="comm-message-meta-row">
                                <span class="comm-meta-label"><?php esc_html_e( 'To', 'bys' ); ?></span>
                                <span class="comm-meta-value comm-message-recipient">
                                    <span class="skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e( 'Loading recipient', 'bys' ); ?>"></span>
                                </span>
                            </div>
                            <div class="comm-message-meta-row">
                                <span class="comm-meta-label"><?php esc_html_e( 'Status', 'bys' ); ?></span>
                                <span class="comm-meta-value comm-status-wrapper">
                                    <span class="comm-status-badge">
                                        <span class="skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e( 'Loading status', 'bys' ); ?>"></span>
                                    </span>
                                </span>
                            </div>
                        </div>

                        <div class="comm-message-body-skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e( 'Loading message body', 'bys' ); ?>" style="display:none;">
                            <div class="skeleton"></div>
                            <div class="skeleton"></div>
                            <div class="skeleton"></div>
                            <div class="skeleton"></div>
                        </div>
                        <div class="comm-message-body"></div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>
