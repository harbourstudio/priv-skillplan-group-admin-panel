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

$can_grade = current_user_can('manage_options') || in_array('grader', (array) wp_get_current_user()->roles, true);
$wrapper_attributes = get_block_wrapper_attributes(array('data-can-grade' => $can_grade ? '1' : '0'));
?>

<script>
window.bysGradingNonce = window.bysGradingNonce || '<?php echo esc_js( wp_create_nonce( 'wp_rest' ) ); ?>';
</script>

<div <?= $wrapper_attributes; ?>>

    <div class="attempt-detail__filters hidden">
        <div class="attempt-detail__filters-scroll">
        <?php
        $filters = [
            'all'       => __( 'All',       'bys' ),
            'correct'   => __( 'Correct',   'bys' ),
            'incorrect' => __( 'Incorrect', 'bys' ),
            'partial'   => __( 'Partial',   'bys' ),
            'ungraded'  => __( 'Ungraded',  'bys' ),
        ];
        foreach ( $filters as $key => $label ) :
            $is_active = $key === 'all' ? 'filter-btn--active' : '';
        ?>
        <button type="button"
                class="filter-btn <?php echo $is_active; ?>"
                data-filter="<?php echo esc_attr( $key ); ?>"
        >
            <?php echo esc_html( $label ); ?>
            <span class="filter-btn__count"></span>
        </button>
        <?php endforeach; ?>
        </div>
        <!-- .attempt-detail__edit-btn appended here by JS -->
    </div>

    <div class="attempt-detail__loading" aria-hidden="true">
        <?php for ($i = 0; $i < 4; $i++) : ?>
        <div class="skel-card">
            <!-- Card header: Q# · badge · points -->
            <div class="skel-card__header">
                <div class="skel skel--qnum"></div>
                <div class="skel skel--badge"></div>
                <div class="skel skel--points"></div>
            </div>
            <!-- Question text lines -->
            <div class="skel skel--line"></div>
            <div class="skel skel--line skel--line-short"></div>
            <!-- Answer choices -->
            <div class="skel-card__answers">
                <div class="skel skel--answer"></div>
                <div class="skel skel--answer"></div>
                <div class="skel skel--answer"></div>
            </div>
        </div>
        <?php endfor; ?>
    </div>

    <div class="attempt-detail__list hidden"></div>

    <div class="attempt-detail__empty hidden">
        <?php esc_html_e('No question data available for this attempt.', 'bys'); ?>
    </div>

    <div class="attempt-detail__error hidden">
        <?php esc_html_e('Failed to load question data.', 'bys'); ?>
    </div>

    <!-- Template for a single question row -->
    <template id="attempt-detail__template-question">
        <div class="question-card">
            <div class="question-card__header">
                <span class="question-card__number"></span>
                <span class="question-card__result-badge"></span>
                <span class="question-card__manual-badge hidden"></span>
                <span class="question-card__points"></span>
            </div>
            <div class="question-card__text"></div>
            <!-- Answer choices (single / multiple choice) -->
            <div class="question-card__answers hidden"></div>
            <!-- Free-text user answer (free_answer / essay) -->
            <div class="question-card__user-text hidden"></div>
            <!-- Expected correct answer -->
            <div class="question-card__correct-answer hidden"></div>
        </div>
    </template>

</div>
