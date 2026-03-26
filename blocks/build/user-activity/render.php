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

    <div id="filters-box" class="filters__box overflow-hidden">
        <form class="filters__form" method="get">
            <div class="filters__fields">

                <div class="filters__field">
                    <label for="filter-activity"><?php esc_html_e('Activity Type', 'bys'); ?></label>
                    <select id="filter-activity" name="activity">
                        <option value=""><?php esc_html_e('All Activities', 'bys'); ?></option>
                        <option value="user_login"><?php esc_html_e('Logged In', 'bys'); ?></option>
                        <option value="user_logout"><?php esc_html_e('Logged Out', 'bys'); ?></option>
                        <option value="profile_update"><?php esc_html_e('Updated Profile', 'bys'); ?></option>
                        <option value="account_settings_update"><?php esc_html_e('Updated Account Settings', 'bys'); ?></option>
                        <option value="certificate_earned"><?php esc_html_e('Earned a Certificate', 'bys'); ?></option>
                        <option value="certificate_viewed"><?php esc_html_e('Viewed a Certificate', 'bys'); ?></option>
                        <option value="lesson_completed"><?php esc_html_e('Completed a Lesson', 'bys'); ?></option>
                        <option value="topic_completed"><?php esc_html_e('Completed a Topic', 'bys'); ?></option>
                        <option value="quiz_submitted"><?php esc_html_e('Submitted a Quiz', 'bys'); ?></option>
                        <option value="course_enrolled"><?php esc_html_e('Enrolled in a Course', 'bys'); ?></option>
                        <option value="course_unenrolled"><?php esc_html_e('Unenrolled from a Course', 'bys'); ?></option>
                        <option value="achievement_earned"><?php esc_html_e('Earned an Achievement', 'bys'); ?></option>
                    </select>
                </div>

                <div class="filters__field">
                    <label for="filter-date_from"><?php esc_html_e('From', 'bys'); ?></label>
                    <input type="date" id="filter-date_from" name="date_from" />
                </div>

                <div class="filters__field">
                    <label for="filter-date_to"><?php esc_html_e('To', 'bys'); ?></label>
                    <input type="date" id="filter-date_to" name="date_to" />
                </div>

                <div class="filters__field">
                    <label for="filter-per-page"><?php esc_html_e('Items per Page', 'bys'); ?></label>
                    <select id="filter-per-page" name="per_page">
                        <option value="10">10</option>
                        <option value="20" selected>20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>

            </div>

            <div class="filters__actions">
                <button class="filters__submit" type="submit"><?php esc_html_e('Filter', 'bys'); ?></button>
                <button class="filters__reset" type="reset"><?php esc_html_e('Reset', 'bys'); ?></button>
            </div>
        </form>
    </div>

    <div class="table-wrapper">
        <table>
            <thead>
                <tr class="reporting-table__head-primary">
                    <th><?php esc_html_e('Activity', 'bys'); ?></th>
                    <th><?php esc_html_e('Timestamp', 'bys'); ?></th>
                    <th><?php esc_html_e('Resource', 'bys'); ?></th>
                    <th><?php esc_html_e('Resource Type', 'bys'); ?></th>
                    <th><?php esc_html_e('Initiated By', 'bys'); ?></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <!-- Rows rendered by view.js from REST API -->
            </tbody>
        </table>
    </div>

    <!-- Template for cloning activity rows -->
    <template id="user-activity__template-row">
        <tr>
            <td class="cell-activity">
                <i class="cell-activity__icon fa-regular"></i>
                <span class="cell-activity__label"></span>
            </td>

            <td class="cell-created-at">
                <span class="cell-created-at__date"></span>
                <span class="cell-created-at__time"></span>
            </td>
            
            <td class="cell-object-title"></td>
            <td class="cell-object-type">
                <span class="cell-object-type__dot"></span>
                <span class="cell-object-type__label"></span>
            </td>
            <td class="cell-initiated-by"></td>
            <td>
                <button type="button" class="activity-details__trigger btn-unstyled">
                    <i class="fa-solid fa-ellipsis"></i>
                </button>
            </td>
        </tr>
    </template>

</div>