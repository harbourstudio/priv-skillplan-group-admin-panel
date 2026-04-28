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

$prompts = [
    [
        'type'        => 'password-reset',
        'title'       => __('Password reset', 'bys'),
        'description' => __('Lorem ipsum dolor sit amet consectetur. Maecenas etiam at dignissim urna risus quis.', 'bys' ),
    ],
    [
        'type'        => 'course-progress',
        'title'       => __('Course progress nudge', 'bys'),
        'description' => __("Sent to inactive learners who haven't logged in within 14 days. Links to last active course.", 'bys' ),
    ],
    [
        'type'        => 'assessment-deadline',
        'title'       => __('Assessment deadline warning', 'bys'),
        'description' => __("7-day warning for learners who haven't completed a required assessment before the access close date.", 'bys'),
    ],
    [
        'type'        => 'welcome-reminder',
        'title'       => __('Welcome/login reminder', 'bys'),
        'description' => __('Lorem ipsum dolor sit amet consectetur. Maecenas etiam at dignissim urna risus quis.', 'bys'),
    ],
    [
        'type'        => 'custom',
        'title'       => __('Custom message', 'bys'),
        'description' => __('Lorem ipsum dolor sit amet consectetur. Maecenas etiam at dignissim urna risus quis.', 'bys'),
    ],
];
?>

<div <?= $wrapper_attributes; ?>>
    <div class="gcp__header">
        <h5>
            <?php esc_html_e( 'Learner prompts', 'bys' ); ?>
        </h5>
        <p class="gcp__subtitle">
            <?php esc_html_e( 'Pre-configured nudges defined by SkillPlan. Select a template, choose recipients, and send.', 'bys' ); ?>
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
                >
                    <?php esc_html_e( 'Proceed', 'bys' ); ?>
                </button>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>
