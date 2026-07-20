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

$user_id = isset( $_GET['user_id'] ) ? intval( $_GET['user_id'] ) : 0;

?>

<div <?= $wrapper_attributes; ?>>

    <div class="user-progress__courses">
        <h6 class="user-progress__section-title">Course Progress Details</h6>

        <!-- Mount target: JS will populate with courses -->
        <div class="hs-accordion-group" id="user-progress-courses-list"></div>

        <!-- Skeleton accordion item template -->
        <template id="user-progress-skeleton-template">
            <div class="hs-accordion hs-accordion--skeleton">
                <div class="hs-accordion-toggle hs-accordion-toggle--skeleton" aria-hidden="true">
                    <div class="accordion-toggle__left-wrapper">
                        <span class="accordion-toggle__icon--skeleton"></span>
                        <span class="accordion-toggle__name--skeleton"></span>
                    </div>
                    <div class="accordion-toggle__right-wrapper">
                        <!-- <span class="accordion-toggle__date--skeleton"></span> -->
                        <span class="accordion-toggle__badge--skeleton"></span>
                        <span class="accordion-toggle__progress--skeleton"></span>
                    </div>
                </div>
            </div>
        </template>

        <!-- Template: Course accordion item -->
        <template id="user-progress-course-template">
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
                        <!-- <span class="accordion-toggle__date"></span> -->
                        <span class="accordion-toggle__completion">
                            <span class="completion-badge"></span>
                        </span>
                        <span class="accordion-toggle__progress">
                            <span class="course-steps-completed">0</span>/<span class="course-steps-total">0</span>
                            <?php esc_html_e('Steps', 'bys'); ?>
                        </span>
                    </div>
                </button>
                <div class="hs-accordion-content hidden w-full overflow-hidden transition-[height] duration-300" role="region">
                    <div class="accordion-content__inner"></div>
                </div>
            </div>
        </template>

        <!-- Template: sfwd-lesson (module) section with nested sfwd-topics -->
        <template id="user-progress-lesson-template">
            <div class="lesson">
                <div class="lesson__header">
                    <span class="lesson__name"></span>
                    <span class="lesson__completion">
                        <span class="completion-badge"></span>
                    </span>
                </div>
                <div class="lesson__content">
                    <table>
                        <thead>
                            <tr>
                                <th><?php esc_html_e('Lesson', 'bys'); ?></th>
                                <th><?php esc_html_e('Status', 'bys'); ?></th>
                                <th><?php esc_html_e('Visits', 'bys'); ?></th>
                                <th><?php esc_html_e('Time Spent', 'bys'); ?></th>
                                <th><?php esc_html_e('Last Accessed', 'bys'); ?></th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </template>

        <!-- Template: sfwd-topic row -->
        <template id="user-progress-topic-template">
            <tr>
                <td class="topic-name"></td>
                <td class="topic-completion">
                    <span class="completion-badge"></span>
                </td>
                <td class="topic-visits"></td>
                <td class="topic-timespent"></td>
                <td class="topic-last-accessed"></td>
            </tr>
        </template>
    </div>
</div>