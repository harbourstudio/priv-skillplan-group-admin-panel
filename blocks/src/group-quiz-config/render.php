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

<script type="application/json" id="bys-gqc-tz-data">
<?php echo wp_json_encode([
    'timezone' => $tz->getName(),
    'utc_offset_hours' => $tz_offset_hours,
]); ?>
</script>

<div <?= $wrapper_attributes; ?>>
    <div class="gqc__header">
        <h5><?php esc_html_e( 'Quiz Configuration', 'bys' ); ?></h5>
        <p class="gqc__subtitle"><?php esc_html_e( 'Set attempt limits and access windows per quiz for this cohort.', 'bys' ); ?></p>
    </div>

    <!-- Validation alert -->
    <div class="gqc__alert gqc__alert--error" style="display:none;">
        <div class="gqc__alert__title"><?php esc_html_e( 'Invalid Access Dates', 'bys' ); ?></div>
        <ul class="gqc__alert__list"></ul>
    </div>

    <div class="gqc__card">
        <div class="gqc__skeleton">
            <?php foreach ([200, 240] as $width ) : ?>
            <div class="skeleton-quiz-row">
                <div class="skeleton-quiz-row__header">
                    <span class="skeleton-text" style="width:<?php echo $width; ?>px"></span>
                    <span class="skeleton-text" style="width:80px"></span>
                </div>
                <div class="gqc__date-field">
                    <span class="skeleton-icon"></span>
                    <span class="skeleton-text" style="width:180px"></span>
                </div>
                <div class="gqc__date-field">
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
        <div class="gqc__list"></div>

        <!-- Template for quiz row -->
        <template id="gqc__row-template">
            <div class="gqc__item" data-quiz-id="">
                <div class="gqc__course-header">
                    <span class="gqc__quiz-name"></span>
                    <span class="gqc__course-name"></span>
                </div>

                <div class="gqc__date-row">
                    <div class="gqc__date-field">
                        <i class="fa-solid fa-play gqc__date-icon" aria-hidden="true"></i>
                        <input type="datetime-local" class="gqc__datetime gqc__datetime--start" aria-label="<?php esc_attr_e('Start date', 'bys'); ?>" data-field-type="start" />
                    </div>
                    <div class="gqc__date-field">
                        <i class="fa-solid fa-flag gqc__date-icon" aria-hidden="true"></i>
                        <input type="datetime-local" class="gqc__datetime gqc__datetime--end" aria-label="<?php esc_attr_e('End date', 'bys'); ?>" data-field-type="end" />
                    </div>
                </div>

                <div class="gqc__badges">
                    <button
                        class="gqc__badge gqc__badge--completed btn-unstyled"
                        type="button"
                        data-opens-modal="#quiz-attempts-modal"
                        data-quiz-id=""
                        data-quiz-name="">
                        <span class="gqc__badge-count"></span> <?php esc_html_e('Completed', 'bys'); ?>
                    </button>
                    <button
                        class="gqc__badge gqc__badge--pending btn-unstyled"
                        type="button"
                        data-opens-modal="#quiz-attempts-modal"
                        data-quiz-id=""
                        data-quiz-name="">
                        <span class="gqc__badge-count"></span> <?php esc_html_e('Outstanding', 'bys'); ?>
                    </button>
                </div>
            </div>
        </template>

        <p class="gqc__empty" style="display:none;"></p>

        <button class="gqc__show-more btn-unstyled" style="display:none;" type="button">
            <?php esc_html_e( 'Show More', 'bys' ); ?>
        </button>

        <div class="gqc__actions">
            <button class="gqc__save btn-unstyled" type="button">
                <?php esc_html_e('Save Changes', 'bys'); ?>
            </button>
        </div>
    </div>
</div>
