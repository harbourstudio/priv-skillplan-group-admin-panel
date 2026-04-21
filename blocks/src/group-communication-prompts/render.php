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
        'title'       => __( 'Password reset', 'bys' ),
        'description' => __( 'Lorem ipsum dolor sit amet consectetur. Maecenas etiam at dignissim urna risus quis.', 'bys' ),
    ],
    [
        'title'       => __( 'Course progress nudge', 'bys' ),
        'description' => __( "Sent to inactive learners who haven't logged in within 14 days. Links to last active course.", 'bys' ),
    ],
    [
        'title'       => __( 'Assessment deadline warning', 'bys' ),
        'description' => __( "7-day warning for learners who haven't completed a required assessment before the access close date.", 'bys' ),
    ],
    [
        'title'       => __( 'Welcome/login reminder', 'bys' ),
        'description' => __( 'Lorem ipsum dolor sit amet consectetur. Maecenas etiam at dignissim urna risus quis.', 'bys' ),
    ],
    [
        'title'       => __( 'Custom message', 'bys' ),
        'description' => __( 'Lorem ipsum dolor sit amet consectetur. Maecenas etiam at dignissim urna risus quis.', 'bys' ),
    ],
];
?>

<div <?= $wrapper_attributes; ?>>
    <div class="comm-prompts__header">
        <h5 class="comm-prompts__title"><?php esc_html_e( 'Learner prompts', 'bys' ); ?></h5>
        <p class="comm-prompts__subtitle"><?php esc_html_e( 'Pre-configured nudges defined by SkillPlan. Select a template, choose recipients, and send.', 'bys' ); ?></p>
    </div>

    <div class="comm-prompts__card">
        <?php foreach ( $prompts as $prompt ) : ?>
        <div class="comm-prompts__item">
            <div class="comm-prompts__icon" aria-hidden="true">
                <i class="fa-regular fa-envelope"></i>
            </div>

            <div class="comm-prompts__info">
                <span class="comm-prompts__name"><?php echo esc_html( $prompt['title'] ); ?></span>
                <span class="comm-prompts__desc"><?php echo esc_html( $prompt['description'] ); ?></span>
            </div>

            <div class="comm-prompts__actions">
                <button
                    class="comm-prompts__history-btn btn-unstyled"
                    type="button"
                    data-opens-modal="#communication-history-modal"
                    data-prompt-title="<?php echo esc_attr( $prompt['title'] ); ?>"
                >
                    <?php esc_html_e( 'Prompt History', 'bys' ); ?>
                </button>
                <button
                    class="comm-prompts__proceed-btn btn-unstyled"
                    type="button"
                    data-opens-modal="#communication-send-modal"
                    data-prompt-title="<?php echo esc_attr( $prompt['title'] ); ?>"
                >
                    <?php esc_html_e( 'Proceed', 'bys' ); ?>
                </button>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>
