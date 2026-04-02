
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
                    <input type="date" id="filter-date_range" name="date_range"/>
                </div>

                <div class="filters__field">
                    <label for="filter-status"><?php esc_html_e('Status', 'bys'); ?></label>
                    <select id="filter-status" name="status">
                        <option value=""><?php esc_html_e('Any', 'bys'); ?></option>
                        <option value="pass"><?php esc_html_e('Passed', 'bys'); ?></option>
                        <option value="fail"><?php esc_html_e('Failed', 'bys'); ?></option>
                        <option value="ungraded"><?php esc_html_e('Ungraded', 'bys'); ?></option>
                    </select>
                </div>

            </div>

            <div class="filters__actions">
                <div class="filters__actions__buttons">
                    <button class="filters__submit" type="submit"><?php esc_html_e('Filter', 'bys'); ?></button>
                    <button class="filters__reset" type="reset"><?php esc_html_e('Reset', 'bys'); ?></button>
                </div>
                <div class="filters__actions__toggles">
                    <label class="toggle-switch">
                        <input type="checkbox" class="group-by-course-toggle" />
                        <span class="toggle-slider"></span>
                        <span class="toggle-label"><?php esc_html_e('Group by Course', 'bys'); ?></span>
                    </label>
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

    <div id="quizzes-container" class="quizzes-container">
        <!-- Flat view: single table with all quizzes -->
        <table id="quizzes-table-flat" class="reporting-table">
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
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>

        <!-- Grouped view: container for course tables (hidden by default) -->
        <div id="quizzes-grouped" class="quizzes-grouped" style="display: none;">
        </div>
    </div>

    <!-- Template: Quiz Table Row -->
    <template id="user-quiz-details_template-row">
        <tr class="quiz-item" data-quiz-id="">
            <td class="cell_quiz_title"></td>
            <td class="cell_last_activity"></td>
            <td class="cell_parent_course"></td>
            <td class="cell_total_attempts" role="button" tabindex="0">
                <span class="attemps-count"></span>
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

    <!-- Template: Course Group Table (for grouped view) -->
    <template id="user-quiz-details_template-course-table">
        <div class="course-group">
            <h3 class="course-group__title"></h3>
            <table class="reporting-table course-group__table">
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
                    </tr>
                </thead>
                <tbody class="course-group__tbody">
                </tbody>
            </table>
        </div>
    </template>
</div>