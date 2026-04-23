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
    <div class="guqc__card">
        <div class="guqc__header">
            <h5><?php esc_html_e( 'Per-user quiz override', 'bys' ); ?></h5>
            <p class="guqc__subtitle"><?php esc_html_e( 'Reset or resend attempts for a specific learner', 'bys' ); ?></p>
        </div>

        <!-- Validation alert -->
        <div class="guqc__alert guqc__alert--error" style="display:none;">
            <div class="guqc__alert__title"><?php esc_html_e( 'Missing or invalid information', 'bys' ); ?></div>
            <ul class="guqc__alert__list"></ul>
        </div>

        <div class="guqc__fields">

            <div class="guqc__field">
                <label class="guqc__label" for="guqc__learner-search">
                    <?php esc_html_e( 'Find learner', 'bys' ); ?>
                </label>
                <div class="guqc__combobox-wrap">
                    <input
                        id="guqc__learner-search"
                        type="text"
                        class="guqc__input"
                        placeholder="<?php esc_attr_e( 'Search by name or email…', 'bys' ); ?>"
                        autocomplete="off"
                        aria-autocomplete="list"
                        aria-expanded="false"
                    />
                    <ul class="guqc__suggestions guqc__suggestions--learner hidden" role="listbox"></ul>
                </div>
            </div>

            <div class="guqc__field">
                <label class="guqc__label" for="guqc__quiz-search">
                    <?php esc_html_e( 'Select quiz', 'bys' ); ?>
                </label>
                <div class="guqc__combobox-wrap">
                    <input
                        id="guqc__quiz-search"
                        type="text"
                        class="guqc__input"
                        placeholder="<?php esc_attr_e( 'Search quizzes…', 'bys' ); ?>"
                        autocomplete="off"
                        aria-autocomplete="list"
                        aria-expanded="false"
                    />
                    <ul class="guqc__suggestions guqc__suggestions--quiz hidden" role="listbox"></ul>
                </div>
            </div>

        </div>

        <div class="guqc__date-row">
            <div class="guqc__date-field">
                <i class="fa-solid fa-play guqc__date-icon" aria-hidden="true"></i>
                <input
                    type="datetime-local"
                    class="guqc__datetime"
                    aria-label="<?php esc_attr_e( 'Start date', 'bys' ); ?>"
                    data-field-type="start"
                />
            </div>
            <div class="guqc__date-field">
                <i class="fa-solid fa-flag guqc__date-icon" aria-hidden="true"></i>
                <input
                    type="datetime-local"
                    class="guqc__datetime"
                    aria-label="<?php esc_attr_e( 'End date', 'bys' ); ?>"
                    data-field-type="end"
                />
            </div>
        </div>

        <div class="guqc__actions">
            <button class="guqc__save guqc__btn-primary btn-unstyled" type="button">
                <?php esc_html_e( 'Save Changes', 'bys' ); ?>
            </button>
            <button class="guqc__notify guqc__btn-outline btn-unstyled" type="button" disabled>
                <?php esc_html_e( 'Notify Learner', 'bys' ); ?>
            </button>
        </div>
    </div>

    <!-- Templates for suggestion items -->
    <template id="guqc__learner-item-template">
        <li class="guqc__suggestion" role="option" data-user-id="" data-display-name="">
            <span class="guqc__suggestion-name"></span>
            <span class="guqc__suggestion-meta"></span>
        </li>
    </template>

    <template id="guqc__quiz-item-template">
        <li class="guqc__suggestion" role="option" data-step-id="" data-step-title="">
            <span class="guqc__suggestion-name"></span>
            <span class="guqc__suggestion-meta"></span>
        </li>
    </template>

    <template id="guqc__empty-suggestion-template">
        <li class="guqc__suggestion guqc__suggestion--empty" role="option"></li>
    </template>
</div>
