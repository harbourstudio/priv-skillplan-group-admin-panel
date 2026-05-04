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

$sample_batches = [
    [
        'id'         => 'batch-1',
        'date'       => 'Jun 12, 2025 · 9:04am',
        'sent_by'    => 'Wade Ouellet',
        'recipients' => 16,
        'status'     => 'Delivered',
    ],
    [
        'id'         => 'batch-2',
        'date'       => 'May 28, 2025 · 2:17pm',
        'sent_by'    => 'Sarah Mitchell',
        'recipients' => 12,
        'status'     => 'Delivered',
    ],
    [
        'id'         => 'batch-3',
        'date'       => 'Apr 3, 2025 · 11:30am',
        'sent_by'    => 'Wade Ouellet',
        'recipients' => 20,
        'status'     => 'Delivered',
    ],
    [
        'id'         => 'batch-4',
        'date'       => 'Feb 14, 2025 · 8:45am',
        'sent_by'    => 'Wade Ouellet',
        'recipients' => 18,
        'status'     => 'Delivered',
    ],
];

$sample_users = [
    [ 'name' => 'Wade Ouellet',   'email' => 'wade@example.com',   'status' => 'delivered' ],
    [ 'name' => 'Sarah Mitchell', 'email' => 'sarah@example.com',  'status' => 'delivered' ],
    [ 'name' => 'James Chen',     'email' => 'james@example.com',  'status' => 'delivered' ],
    [ 'name' => 'Emily Russo',    'email' => 'emily@example.com',  'status' => 'failed'    ],
    [ 'name' => 'Marcus Webb',    'email' => 'marcus@example.com', 'status' => 'delivered' ],
    [ 'name' => 'Priya Sharma',   'email' => 'priya@example.com',  'status' => 'delivered' ],
    [ 'name' => 'Tom Becker',     'email' => 'tom@example.com',    'status' => 'failed'    ],
    [ 'name' => 'Leila Haddad',   'email' => 'leila@example.com',  'status' => 'delivered' ],
];

$sample_message = [
    'subject' => 'Password reset reminder',
    'body'    => "Hi {{first_name}},\n\nThis is a reminder that your password reset link is still active and waiting for you. Please log in and update your password at your earliest convenience.\n\nIf you have already done so, you can ignore this message.\n\nThanks,\nThe SkillPlan Team",
];
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
                        <p class="modal__prompt-name"><?php esc_html_e( 'Password reset', 'bys' ); ?></p>
                    </div>
                </div>
                <button class="modal__close btn-unstyled" aria-label="<?php esc_attr_e( 'Close', 'bys' ); ?>">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="modal__body">

                <?php // Screen 1: Batch list ?>
                <div class="comm-screen comm-screen--1">
                    <table class="comm-history-table">
                        <thead>
                            <tr>
                                <th><?php esc_html_e( 'Date Sent', 'bys' ); ?></th>
                                <th><?php esc_html_e( 'Sent By', 'bys' ); ?></th>
                                <th><?php esc_html_e( 'Recipients', 'bys' ); ?></th>
                                <th><?php esc_html_e( 'Status', 'bys' ); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ( $sample_batches as $batch ) : ?>
                            <tr
                                class="comm-batch-row"
                                data-batch-id="<?php echo esc_attr( $batch['id'] ); ?>"
                                data-batch-date="<?php echo esc_attr( $batch['date'] ); ?>"
                            >
                                <td class="comm-batch-date"><?php echo esc_html( $batch['date'] ); ?></td>
                                <td><?php echo esc_html( $batch['sent_by'] ); ?></td>
                                <td><?php echo esc_html( $batch['recipients'] ); ?></td>
                                <td><span class="comm-status-badge comm-status-badge--delivered"><?php echo esc_html( $batch['status'] ); ?></span></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                    <button class="show-more btn-unstyled">Show more</button>
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
                        <tbody>
                            <?php foreach ( $sample_users as $user ) : ?>
                            <tr
                                class="comm-user-row"
                                data-user-name="<?php echo esc_attr( $user['name'] ); ?>"
                            >
                                <td><?php echo esc_html( $user['name'] ); ?></td>
                                <td class="comm-email"><?php echo esc_html( $user['email'] ); ?></td>
                                <td>
                                    <span class="comm-status-badge comm-status-badge--<?php echo esc_attr( $user['status'] ); ?>">
                                        <?php echo esc_html( ucfirst( $user['status'] ) ); ?>
                                    </span>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <?php // Screen 3: Individual message detail ?>
                <div class="comm-screen comm-screen--3" style="display:none;">
                    <div class="comm-message-detail">
                        <div class="comm-message-meta">
                            <div class="comm-message-meta-row">
                                <span class="comm-meta-label"><?php esc_html_e( 'Subject', 'bys' ); ?></span>
                                <span class="comm-meta-value comm-message-subject"><?php echo esc_html( $sample_message['subject'] ); ?></span>
                            </div>
                            <div class="comm-message-meta-row">
                                <span class="comm-meta-label"><?php esc_html_e( 'To', 'bys' ); ?></span>
                                <span class="comm-meta-value comm-message-recipient"></span>
                            </div>
                            <div class="comm-message-meta-row">
                                <span class="comm-meta-label"><?php esc_html_e( 'Status', 'bys' ); ?></span>
                                <span class="comm-meta-value"><span class="comm-status-badge comm-status-badge--delivered"><?php esc_html_e( 'Delivered', 'bys' ); ?></span></span>
                            </div>
                        </div>
                        <div class="comm-message-body">
                            <?php echo nl2br( esc_html( $sample_message['body'] ) ); ?>
                        </div>
                    </div>
                    
                </div>

            </div>
        </div>
    </div>
</div>
