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
$is_site_editor = in_array( 'editor', (array) wp_get_current_user()->roles, true );

$prompts = [
    [
        'type'        => 'password-reset',
        'title'       => __('Password reset', 'bys'),
        'description' => __('Send a secure password reset link to learners who are unable to access their account.', 'bys' ),
    ],
    [
        'type'        => 'course-progress',
        'title'       => __('Course progress reminder', 'bys'),
        'description' => __("Remind inactive learners to return to their courses and continue their progress.", 'bys' ),
    ],
    [
        'type'        => 'assessment-reminder',
        'title'       => __('Assessment reminder', 'bys'),
        'description' => __("Send a reminder to learners about an upcoming assessment.", 'bys'),
    ],
    [
        'type'        => 'welcome-reminder',
        'title'       => __('Welcome and login information', 'bys'),
        'description' => __('Send new group members a welcome message with instructions for accessing their account.', 'bys'),
    ],
    [
        'type'        => 'custom',
        'title'       => __('Custom message', 'bys'),
        'description' => __('Create and send a personalized message to selected learners.', 'bys'),
    ],
];
?>

<div <?= $wrapper_attributes; ?>>
    <div class="gcp__header">
        <h5>
            <?php esc_html_e( 'Learner prompts', 'bys' ); ?>
        </h5>
        <p class="gcp__subtitle">
            <?php esc_html_e( 'Ready-to-send messages to engage learners. Choose a template, select recipients and send.', 'bys' ); ?>
        </p>
    </div>

    <div class="gcp__card">
        <?php foreach ($prompts as $prompt) : ?>
        <div class="gcp__item">
            <div class="gcp__icon" aria-hidden="true">
                <i class="fa-regular fa-envelope"></i>
            </div>

            <div class="gcp__info">
                <span class="gcp__name"><?php echo esc_html( $prompt['title'] ); ?></span>
                <span class="gcp__desc"><?php echo esc_html( $prompt['description'] ); ?></span>
            </div>

            <div class="gcp__actions">
                <button
                    class="gcp__history btn-unstyled"
                    type="button"
                    data-opens-modal="#communication-history-modal"
                    data-prompt-type="<?php echo esc_attr( $prompt['type'] ); ?>"
                    data-prompt-title="<?php echo esc_attr( $prompt['title'] ); ?>"
                >
                    <?php esc_html_e( 'Prompt History', 'bys' ); ?>
                </button>
                <button
                    class="gcp__proceed btn-unstyled"
                    type="button"
                    data-opens-modal="#communication-send-modal"
                    data-prompt-type="<?php echo esc_attr( $prompt['type'] ); ?>"
                    data-prompt-title="<?php echo esc_attr( $prompt['title'] ); ?>"
                    <?php if ( $is_site_editor ) : ?>disabled<?php endif; ?>
                >
                    <?php esc_html_e( 'Proceed', 'bys' ); ?>
                </button>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>
