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

<script type="application/json" id="bys-user-quiz-config-tz-data">
<?php echo wp_json_encode([
    'timezone' => $tz->getName(),
    'utc_offset_hours' => $tz_offset_hours,
]); ?>
</script>

<div <?= $wrapper_attributes; ?>>
    <div class="uqc-card">
        <div class="uqc-card__header">
            <h5 class="uqc-card__title"><?php esc_html_e( 'Per-user quiz override', 'bys' ); ?></h5>
            <p class="uqc-card__subtitle"><?php esc_html_e( 'Reset or resend attempts for a specific learner', 'bys' ); ?></p>
        </div>

        <div class="uqc-fields">

            <div class="uqc-field">
                <label class="uqc-label" for="uqc-learner-search">
                    <?php esc_html_e( 'Find learner', 'bys' ); ?>
                </label>
                <div class="uqc-combobox-wrap">
                    <input
                        id="uqc-learner-search"
                        type="text"
                        class="uqc-input"
                        placeholder="<?php esc_attr_e( 'Search by name or email…', 'bys' ); ?>"
                        autocomplete="off"
                        aria-autocomplete="list"
                        aria-expanded="false"
                    />
                    <ul class="uqc-suggestions uqc-suggestions--learner hidden" role="listbox"></ul>
                </div>
            </div>

            <div class="uqc-field">
                <label class="uqc-label" for="uqc-quiz-search">
                    <?php esc_html_e( 'Select quiz', 'bys' ); ?>
                </label>
                <div class="uqc-combobox-wrap">
                    <input
                        id="uqc-quiz-search"
                        type="text"
                        class="uqc-input"
                        placeholder="<?php esc_attr_e( 'Search quizzes…', 'bys' ); ?>"
                        autocomplete="off"
                        aria-autocomplete="list"
                        aria-expanded="false"
                    />
                    <ul class="uqc-suggestions uqc-suggestions--quiz hidden" role="listbox"></ul>
                </div>
            </div>

        </div>

        <div class="uqc-date-row">
            <div class="uqc-date-field">
                <i class="fa-solid fa-play uqc-date-icon" aria-hidden="true"></i>
                <input
                    type="datetime-local"
                    class="uqc-datetime"
                    aria-label="<?php esc_attr_e( 'Start date', 'bys' ); ?>"
                />
            </div>
            <div class="uqc-date-field">
                <i class="fa-solid fa-flag uqc-date-icon" aria-hidden="true"></i>
                <input
                    type="datetime-local"
                    class="uqc-datetime"
                    aria-label="<?php esc_attr_e( 'End date', 'bys' ); ?>"
                />
            </div>
        </div>

        <div class="uqc-actions">
            <button class="uqc-btn-primary btn-unstyled" type="button" disabled>
                <?php esc_html_e( 'Save Changes', 'bys' ); ?>
            </button>
            <button class="uqc-btn-outline btn-unstyled" type="button" disabled>
                <?php esc_html_e( 'Notify Learner', 'bys' ); ?>
            </button>
        </div>
    </div>
</div>
