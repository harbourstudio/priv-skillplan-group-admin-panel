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
?>

<div <?= $wrapper_attributes; ?>>

    <div
        id="quiz-attempts-modal"
        class="quiz-attempts-modal hs-overlay hidden"
        role="dialog"
        tabindex="-1"
        aria-labelledby="quiz-attempts-modal-label"
        data-hs-overlay-backdrop-container="#quiz-attempts-modal-backdrop"
    >
        <!-- Backdrop container (Preline will render backdrop here) -->
        <div id="quiz-attempts-modal-backdrop" class="modal-backdrop-container" data-hs-overlay="#quiz-attempts-modal"></div>

        <div class="modal__inner">
            <div class="modal__header">
                <div class="modal__header-titles">
                    <h4 class="quiz-title"></h4>
                    <span class="course-title"></span>
                </div>
                <button class="modal__close btn-unstyled" aria-label="<?php esc_attr_e('Close', 'bys'); ?>">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="modal__filter-bar">
                <label for="quiz-attempts-user-filter"><?php esc_html_e('User', 'bys'); ?></label>
                <select id="quiz-attempts-user-filter" class="quiz-attempts-user-filter">
                    <option value=""><?php esc_html_e('All Users', 'bys'); ?></option>
                </select>

                <div class="filter-bar__group">
                    <label for="quiz-attempts-mode-filter"><?php esc_html_e('Show', 'bys'); ?></label>
                    <select id="quiz-attempts-mode-filter" class="quiz-attempts-mode-filter">
                        <option value="highest"><?php esc_html_e('Highest Attempt', 'bys'); ?></option>
                        <option value="recent"><?php esc_html_e('Most Recent Attempt', 'bys'); ?></option>
                    </select>
                </div>
            </div>

            <div class="modal__body">
                <table class="attempts-table">
                    <thead>
                        <tr>
                            <th class="col_attempt_index">#</th>
                            <th class="col_attempt_user"><?php esc_html_e('User', 'bys'); ?></th>
                            <th class="col_attempt_date"><?php esc_html_e('Submitted', 'bys'); ?></th>
                            <th class="col_attempt_score"><?php esc_html_e('Score', 'bys'); ?></th>
                            <th class="col_attempt_status"><?php esc_html_e('Status', 'bys'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Dynamically render rows using table row template -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Template for table row -->
    <template id="user-quiz-attempts-modal__template-row">
        <tr>
            <td class="cell_attempt_index"></td>
            <td class="cell_attempt_user"></td>
            <td class="cell_attempt_date"></td>
            <td class="cell_attempt_score"></td>
            <td><span class="status-badge"></span></td>
        </tr>
    </template>

</div>
