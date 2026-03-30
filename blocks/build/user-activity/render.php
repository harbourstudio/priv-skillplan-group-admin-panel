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

$filter_options = [
    [
        "value" => "",
        "label" => "All Activities"
    ],
    [
        "value" => "user_login",
        "label" => "Logged In"
    ],
    [
        "value" => "user_logout",
        "label" => "Logged Out"
    ],
    [
        "value" => "profile_updated",
        "label" => "Updated Profile"
    ],
    [
        "value" => "account_settings_update",
        "label" => "Updated Account Settings"
    ],
    [
        "value" => "certificate_earned",
        "label" => "Earned a Certificate"
    ],
    [
        "value" => "certificate_viewed",
        "label" => "Viewed a Certificate"
    ],
    [
        "value" => "lesson_completed",
        "label" => "Completed a Lesson"
    ],
    [
        "value" => "topic_completed",
        "label" => "Completed a Topic"
    ],
    [
        "value" => "quiz_submitted",
        "label" => "Submitted a Quiz"
    ],
    [
        "value" => "quiz_completed",
        "label" => "Completed a Quiz"
    ],
    [
        "value" => "course_enrolled",
        "label" => "Enrolled in a Course"
    ],
    [
        "value" => "course_unenrolled",
        "label" => "Unenrolled from a Course"
    ],
    [
        "value" => "lesson_visited",
        "label" => "Visited a Lesson"
    ],
    [
        "value" => "topic_visited",
        "label" => "Visited a Topic"
    ],
    [
        "value" => "achievement_earned",
        "label" => "Earned an Achievement"
    ],

]
?>

<div <?= $wrapper_attributes; ?>>

    <div id="filters-box" class="filters__box overflow-hidden">
        <form class="filters__form" method="get">
            <div class="filters__fields">

                <div class="filters__field">
                    <label for="filter-activity"><?php esc_html_e('Activity Type', 'bys'); ?></label>
                    <select id="filter-activity" name="activity">
                        <?php foreach ($filter_options as $option) : ?>
                            <option
                                value="<?php echo esc_attr($option['value']); ?>"
                            >
                                <?php echo esc_html_e($option['label']); ?>
                            </option>
                        <?php endforeach; ?>
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
                <tr>
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
    <template id="user-activity-template-row">
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
                <button type="button" class="cell-initiated-by__trigger btn-unstyled">
                    <i class="fa-solid fa-ellipsis"></i>
                </button>
            </td>
        </tr>
    </template>

</div>