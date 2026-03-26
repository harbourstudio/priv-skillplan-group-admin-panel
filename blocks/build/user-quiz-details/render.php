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

    <div id="filters-box" class="filters__box overflow-hidden">
        <form class="filters__form" method="get">
            <div class="filters__fields">

                <div class="filters__field">
                    <label for="filter-keyword"><?php esc_html_e('Search', 'bys'); ?></label>
                    <input type="text" id="filter-keyword" name="keyword" placeholder="<?php esc_attr_e('Search courses or quizzes...', 'bys'); ?>" />
                </div>

                <div class="filters__field">
                    <label for="filter-date_range"><?php esc_html_e('Date Range', 'bys'); ?></label>
                    <input type="date" id="filter-date_range" name="date_range" />
                </div>

                <div class="filters__field">
                    <label for="filter-status"><?php esc_html_e('Status', 'bys'); ?></label>
                    <select id="filter-status" name="status">
                        <option value=""><?php esc_html_e('All Statuses', 'bys'); ?></option>
                        <option value="active"><?php esc_html_e('Active', 'bys'); ?></option>
                        <option value="completed"><?php esc_html_e('Completed', 'bys'); ?></option>
                        <option value="inactive"><?php esc_html_e('Inactive', 'bys'); ?></option>
                        <option value="in_progress"><?php esc_html_e('In Progress', 'bys'); ?></option>
                    </select>
                </div>

            </div>

            <div class="filters__actions">
                <div class="filters__actions__buttons">
                    <button class="filters__submit" type="submit"><?php esc_html_e('Filter', 'bys'); ?></button>
                    <button class="filters__reset" type="reset"><?php esc_html_e('Reset', 'bys'); ?></button>
                </div>
                <div class="filters__actions__toggles">
                    <?php esc_html_e('Group by Course', 'bys'); ?>
                </div>
            </div>
        </form>
    </div>

    <div class="table__actions">
        <label>
            <input type="radio" name="score_sort" id="highest" value="highest" checked>
            <?php esc_html_e('Highest Score', 'bys'); ?>

        </label>
        <label>
            <input type="radio" name="score_sort" id="latest" value="latest">
            <?php esc_html_e('Latest Score', 'bys'); ?>
        </label>
    </div>

    <table class="reporting-table">
        <thead>
            <tr>
                <th class="col_quiz_title"><?php esc_html_e('Quiz', 'bys'); ?></th>
                <th class="col_last_activity"><?php esc_html_e('Last Activity', 'bys'); ?></th>
                <th class="col_parent_course"><?php esc_html_e('Course', 'bys'); ?></th>
                <th class="col_total_attempts"><?php esc_html_e('Attempts', 'bys'); ?></th>
                <th class="col_score_highest"><?php esc_html_e('Highest Score', 'bys'); ?></th>
                <th class="col_score_latest"><?php esc_html_e('Latest Score', 'bys'); ?></th>
                <th class="col_result_highest"><?php esc_html_e('Result', 'bys'); ?></th>
                <th class="col_result_latest"><?php esc_html_e('Result', 'bys'); ?></th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            <!-- Dynamically render rows using table row template --> <tr>
        </tbody>
    </table>

    <!-- Template: Table Row -->
    <template id="user-quiz-details_template-row">
        <tr class="quiz-item" data-quiz-id="">
            <td class="cell_quiz_title"></td>
            <td class="cell_last_activity"></td>
            <td class="cell_parent_course"></td>
            <td class="cell_total_attempts">
                <span class="attemps-count">

                </span>
                <button
                    type="button"
                    class="modal-quiz-attempts__trigger btn-unstyled"
                    data-hs-overlay="#modal-quiz-attempts"
                >
                    <i class="fa-solid fa-ellipsis"></i>
                </button>
            </td>
            <td class="cell_score_highest"></td>
            <td class="cell_score_latest"></td>
            <td class="cell_result_highest">
                <span class="status-badge"></span>
            </td>
            <td class="cell_result_latest">
                <span class="status-badge"></span>
            </td>
        </tr>
    </template>
</div>