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
                <h4 class="quiz-title"></h4>
                <span class="course-title"></span>
            </div>

            <div class="modal__body">
                <table class="attempts-table">
                    <thead>
                        <tr>
                            <th class="col_attempt_index">#</th>
                            <th class="col_attempt_date"><?php esc_html_e('Submitted', 'bys'); ?></th>
                            <th class="col_attempt_score"><?php esc_html_e('Score', 'bys'); ?></th>
                            <th class="col_attempt_status"><?php esc_html_e('Status', 'bys'); ?></th>
                            <th class="col_attempt_details"></th>
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
            <td class="cell_attempt_date"></td>
            <td class="cell_attempt_score"></td>
            <td><span class="status-badge"></span></td>
            <td class="cell_attempt_details">
                <a
                    class="cell_attempt_details"
                >
                    <i class="fa-solid fa-ellipsis"></i>
                </a>
            </td>
        </tr>
    </template>

</div>