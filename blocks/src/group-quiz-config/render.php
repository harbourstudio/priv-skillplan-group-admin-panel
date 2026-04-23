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

// Localize WordPress timezone info for the frontend datetime handling
$tz = wp_timezone();
$now = new DateTime('now', $tz);
$tz_offset_seconds = $tz->getOffset($now);
$tz_offset_hours = $tz_offset_seconds / 3600;
?>

<script type="application/json" id="bys-quiz-config-tz-data">
<?php echo wp_json_encode([
    'timezone' => $tz->getName(),
    'utc_offset_hours' => $tz_offset_hours,
]); ?>
</script>

<div <?= $wrapper_attributes; ?>>
    <div class="quiz-config__header">
        <h5 class="quiz-config__title"><?php esc_html_e( 'Quiz Configuration', 'bys' ); ?></h5>
        <p class="quiz-config__subtitle"><?php esc_html_e( 'Set attempt limits and access windows per quiz for this cohort.', 'bys' ); ?></p>
    </div>

    <div class="quiz-config__card">
        <div class="quiz-config__skeleton">
            <?php foreach ( [ 200, 240 ] as $w ) : ?>
            <div class="skeleton-quiz-row">
                <div class="skeleton-quiz-row__header">
                    <span class="skeleton-text" style="width:<?php echo $w; ?>px"></span>
                    <span class="skeleton-text" style="width:80px"></span>
                </div>
                <div class="quiz-config-date-field">
                    <span class="skeleton-icon"></span>
                    <span class="skeleton-text" style="width:180px"></span>
                </div>
                <div class="quiz-config-date-field">
                    <span class="skeleton-icon"></span>
                    <span class="skeleton-text" style="width:160px"></span>
                </div>
                <div class="skeleton-quiz-row__badges">
                    <span class="skeleton-btn"></span>
                    <span class="skeleton-btn"></span>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="quiz-config__list"></div>

        <p class="quiz-config__empty" style="display:none;"></p>
        
        <button class="quiz-config__show-more btn-unstyled" style="display:none;" type="button">
            <?php esc_html_e( 'Show More', 'bys' ); ?>
        </button>

        <div class="quiz-config__actions">
            <button class="btn-primary btn-unstyled" type="button" disabled="">
                <?php esc_html_e('Save Changes', 'bys'); ?>
            </button>
        </div>
    </div>
</div>
