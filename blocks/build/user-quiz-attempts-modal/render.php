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

$grading_page_url   = esc_url(home_url('/administrator-dashboard/quiz-attempt-detail/'));
$wrapper_attributes = get_block_wrapper_attributes(['data-grading-url' => $grading_page_url]);
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
                <div class="modal__header-actions">
                    <button class="modal__export btn-unstyled" title="<?php esc_attr_e('Export to CSV', 'bys'); ?>" aria-label="<?php esc_attr_e('Export to CSV', 'bys'); ?>">
                        <i class="fa-regular fa-download"></i>
                    </button>
                    <button class="modal__close btn-unstyled" aria-label="<?php esc_attr_e('Close', 'bys'); ?>">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>

            <div class="modal__filter-bar">
                <div class="filter-bar__user-search">
                    <label for="quiz-attempts-user-search"><?php esc_html_e('User', 'bys'); ?></label>
                    <div class="user-search-wrap">
                        <input
                            type="text"
                            id="quiz-attempts-user-search"
                            class="quiz-attempts-user-search"
                            placeholder="<?php esc_attr_e('Search by name or email…', 'bys'); ?>"
                            autocomplete="off"
                            role="combobox"
                            aria-expanded="false"
                            aria-autocomplete="list"
                            aria-controls="user-search-suggestions"
                        />
                        <button class="user-search-clear btn-unstyled hidden" type="button" aria-label="<?php esc_attr_e('Show all users', 'bys'); ?>">
                            <i class="fa-solid fa-xmark"></i> <?php esc_html_e('All Users', 'bys'); ?>
                        </button>
                        <ul class="user-search-suggestions hidden" id="user-search-suggestions" role="listbox" aria-label="<?php esc_attr_e('User suggestions', 'bys'); ?>"></ul>
                    </div>
                </div>

                <div class="filter-bar__group">
                    <label for="quiz-attempts-mode-filter"><?php esc_html_e('Show', 'bys'); ?></label>
                    <select id="quiz-attempts-mode-filter" class="quiz-attempts-mode-filter">
                        <option value="highest"><?php esc_html_e('Highest Attempt', 'bys'); ?></option>
                        <option value="recent"><?php esc_html_e('Most Recent Attempt', 'bys'); ?></option>
                        <option value="ungraded"><?php esc_html_e('Ungraded Attempts', 'bys'); ?></option>
                    </select>
                </div>
            </div>

            <div class="modal__body">
                <table class="attempts-table">
                    <thead>
                        <tr>
                            <th class="col_attempt_index">#</th>
                            <th class="col_attempt_user sortable" data-sort-col="user"><?php esc_html_e('User', 'bys'); ?> <i class="fa-solid fa-sort sort-icon"></i></th>
                            <th class="col_attempt_date sortable" data-sort-col="submitted"><?php esc_html_e('Submitted', 'bys'); ?> <i class="fa-solid fa-sort sort-icon"></i></th>
                            <th class="col_attempt_score sortable" data-sort-col="score"><?php esc_html_e('Score', 'bys'); ?> <i class="fa-solid fa-sort sort-icon"></i></th>
                            <th class="col_attempt_status sortable" data-sort-col="status"><?php esc_html_e('Status', 'bys'); ?> <i class="fa-solid fa-sort sort-icon"></i></th>
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
        <tr data-user-id="" data-activity-id="">
            <td class="cell_attempt_index"></td>
            <td class="cell_attempt_user"></td>
            <td class="cell_attempt_date"></td>
            <td class="cell_attempt_score"></td>
            <td><span class="status-badge"></span></td>
        </tr>
    </template>

</div>
