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
                    <span class="skeleton" style="width:<?php echo $width; ?>px"></span>
                    <span class="skeleton" style="width:80px"></span>
                </div>
                <div class="gqc__date-field">
                    <span class="skeleton" style="width:180px"></span>
                </div>
                <div class="gqc__date-field">
                    <span class="skeleton" style="width:160px"></span>
                </div>
                <div class="gqc__actions">
                    <div class="gqc__badges">
                        <span class="skeleton" style="width: 48px;"></span>
                        <span class="skeleton" style="width: 48px;"></span>
                    </div>
                    <div class="gqc__action-buttons">
                        <span class="skeleton" style="width: 48px;"></span>
                        <span class="skeleton" style="width: 48px;"></span>
                    </div>

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
                    <div class="gqc__date-field" data-tooltip="<?php esc_attr_e('Opening date: quiz becomes available from this date', 'bys'); ?>">
                        <i class="fa-solid fa-play gqc__date-icon" aria-hidden="true"></i>
                        <input type="text" class="gqc__datetime gqc__datetime--start" aria-label="<?php esc_attr_e('Start date', 'bys'); ?>" data-field-type="start" readonly />
                        <i class="fa-regular fa-calendar gqc__calendar-icon" aria-hidden="true"></i>
                        <button
                            type="button"
                            class="gqc__date-clear btn-unstyled"
                            aria-label="<?php esc_attr_e('Clear start date', 'bys'); ?>"
                            data-field-type="start"
                            hidden>
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="gqc__date-field" data-tooltip="<?php esc_attr_e('Closing date: quiz is no longer accessible after this date', 'bys'); ?>">
                        <i class="fa-solid fa-flag gqc__date-icon" aria-hidden="true"></i>
                        <input type="text" class="gqc__datetime gqc__datetime--end" aria-label="<?php esc_attr_e('End date', 'bys'); ?>" data-field-type="end" readonly />
                        <i class="fa-regular fa-calendar gqc__calendar-icon" aria-hidden="true"></i>
                        <button
                            type="button"
                            class="gqc__date-clear btn-unstyled"
                            aria-label="<?php esc_attr_e('Clear end date', 'bys'); ?>"
                            data-field-type="end"
                            hidden>
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>
                    <!-- <div class="gqc__date-field gqc__date-field--attempts" data-tooltip="<?php esc_attr_e('Attempts: max times a learner can take this quiz (blank = unlimited)', 'bys'); ?>">
                        <i class="fa-solid fa-hashtag gqc__date-icon" aria-hidden="true"></i>
                        <input type="number" class="gqc__attempts" aria-label="<?php esc_attr_e('Number of attempts', 'bys'); ?>" data-field-type="attempts" min="0" placeholder="<?php esc_attr_e('Unlimited', 'bys'); ?>" />
                    </div> -->
                </div>

                <div class="gqc__actions">
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
                    <div class="gqc__action-buttons">
                        <button class="gqc__notify btn-unstyled" type="button">
                            <?php esc_html_e( 'Notify', 'bys' ); ?>
                        </button>
                        <button class="gqc__save-row btn-unstyled" type="button" disabled>
                            <?php esc_html_e( 'Save', 'bys' ); ?>
                        </button>
                    </div>
                </div>
            </div>
        </template>
        <p class="gqc__empty" style="display:none;"></p>
    </div>
    <button class="gqc__show-more btn-unstyled" style="display:none;" type="button">
        <?php esc_html_e( 'Show More', 'bys' ); ?>
    </button>
</div>
