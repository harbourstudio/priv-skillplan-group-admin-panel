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

// Get validated auth header for client-side API requests
require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-auth.php';
$auth_header = BYS_Groups_Auth::get_auth_header();

?>

<script>
	window.bysGroupsAuth = {
		header: '<?php echo esc_js( $auth_header ); ?>'
	};
</script>

<div <?= $wrapper_attributes; ?>>

    <div class="group-quizzing__courses">
        <!-- <h3 class="group-quizzing__section-title">Quizzing</h3> -->

        <!-- Skeleton: shown until JS populates real data -->
        <div class="group-quizzing__skeleton" id="group-quizzing-skeleton">
            <?php foreach ( [ 200, 160, 220 ] as $skeleton_width ) : ?>
            <div class="skeleton-item">
                <div class="skeleton-toggle">
                    <div class="skeleton-toggle__left">
                        <span class="skeleton" style="width: 32px; height: 32px;"></span>
                        <span class="skeleton" style="width: <?php echo $skeleton_width; ?>px"></span>
                    </div>
                    <div class="skeleton-toggle__right">
                        <span class="skeleton" style="width: 110px"></span>
                        <span class="skeleton" style="width: 130px;"></span>
                        <span class="skeleton" style="width: 55px;"></span>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- Mount target: JS will populate with courses -->
        <div class="hs-accordion-group" id="group-quizzing-courses-list"></div>

        <!-- Template: Course accordion item -->
        <template id="group-quizzing-course-template">
            <div class="hs-accordion" data-course-id="">
                <button class="hs-accordion-toggle btn-unstyled" aria-expanded="false">
                    <div class="accordion-toggle__left-wrapper">
                        <span class="accordion-toggle__icon">
                            <i class="fa-solid fa-plus hs-accordion-active:hidden block"></i>
                            <i class="fa-solid fa-minus hs-accordion-active:block hidden"></i>
                        </span>
                        <span class="accordion-toggle__course-name"></span>
                    </div>
                    <div class="accordion-toggle__right-wrapper">
                        <span class="accordion-toggle__date">
                            <span class="date-label"><?php esc_html_e( 'Latest Submission:', 'bys' ); ?></span>
                            <span class="date-value"></span>
                        </span>
                        <span class="accordion-toggle__ungraded-badge"></span>
                        <span class="accordion-toggle__quiz-count">
                            <span class="quiz-count-value">0</span>&nbsp;<?php esc_html_e( 'Quizzes', 'bys' ); ?>
                        </span>
                    </div>
                </button>
                <div class="hs-accordion-content hidden w-full overflow-hidden transition-[height] duration-300" role="region">
                    <div class="accordion-content__inner"></div>
                </div>
            </div>
        </template>

        <!-- Template: Quiz row -->
        <template id="group-quizzing-quiz-template">
            <div class="quiz-row">
                <div class="quiz-row__left">
                    <span class="quiz-row__status-icon"></span>
                    <span class="quiz-row__name"></span>
                </div>
                <div class="quiz-row__meta">
                    <span class="quiz-row__submissions"></span>
                    <span class="quiz-row__ungraded"></span>
                </div>
                <span class="quiz-row__last-submission">
                    <span class="date-label"><?php esc_html_e( 'Last Submission:', 'bys' ); ?></span>
                    <span class="date-value"></span>
                </span>
            </div>
        </template>

    </div>
</div>
