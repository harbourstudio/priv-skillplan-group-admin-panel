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
        "value" => "profile_update",
        "label" => "Updated Profile"
    ],
    [
        "value" => "account_settings_update",
        "label" => "Updated Account Settings"
    ],
    [
        "value" => "certificate_earned",
        "label" => "Earned Certificate"
    ],
    [
        "value" => "certificate_viewed",
        "label" => "Viewed Certificate"
    ],
    [
        "value" => "lesson_completed",
        "label" => "Completed Lesson"
    ],
    [
        "value" => "topic_completed",
        "label" => "Completed Topic"
    ],
    [
        "value" => "quiz_submitted",
        "label" => "Submitted Quiz"
    ],
    [
        "value" => "quiz_completed",
        "label" => "Completed Quiz"
    ],
    [
        "value" => "course_enrolled",
        "label" => "Enrolled in Course"
    ],
    [
        "value" => "course_unenrolled",
        "label" => "Unenrolled from Course"
    ],
    [
        "value" => "lesson_visited",
        "label" => "Visited Lesson"
    ],
    [
        "value" => "topic_visited",
        "label" => "Visited Topic"
    ],
    [
        "value" => "achievement_earned",
        "label" => "Earned an Achievement"
    ],

]
?>

<?php
// Map activities to their display properties (label and icon)
$activity_icon_map = [
    'user_login'              => 'fa-user',
    'user_logout'             => 'fa-user',
    'profile_update'         => 'fa-user',
    'account_settings_update' => 'fa-user',
    'certificate_earned'      => 'fa-certificate',
    'certificate_viewed'      => 'fa-eye',
    'lesson_completed'        => 'fa-check-circle',
    'topic_completed'         => 'fa-check-circle',
    'quiz_submitted'          => 'fa-check-circle',
    'quiz_completed'          => 'fa-check-circle',
    'course_enrolled'         => 'fa-graduation-cap',
    'course_unenrolled'       => 'fa-graduation-cap',
    'lesson_visited'          => 'fa-eye',
    'topic_visited'           => 'fa-eye',
    'achievement_earned'      => 'fa-star',
];

// Build activity config from filter options + icons
$activity_map = [];
foreach ($filter_options as $option) {
    if (!empty($option['value'])) {
        $activity_map[$option['value']] = [
            'label' => $option['label'],
            'icon'  => $activity_icon_map[$option['value']] ?? 'fa-circle',
        ];
    }
}
?>

<div <?= $wrapper_attributes; ?>>

<script type="application/json" id="bys-activity-config">
<?php echo wp_json_encode($activity_map); ?>
</script>

    <div id="filters-box" class="filters__box">
        <form class="filters__form" method="get">
            <div class="filters__fields">

                <!-- Activity Type Multiselect -->
                <div class="filters__field filters__field--multiselect">
                    <label><?php esc_html_e('Type of Activity', 'bys'); ?></label>
                    <div class="bys-multiselect" id="bys-multiselect-activity" aria-haspopup="listbox" aria-expanded="false">
                        <div class="bys-multiselect__control">
                            <div class="bys-multiselect__pills" id="bys-multiselect-activity-pills">
                                <span class="bys-multiselect__placeholder"><?php esc_html_e('All activities', 'bys'); ?></span>
                            </div>
                            <button class="bys-multiselect__toggle btn-unstyled" type="button" aria-label="Toggle activity selector">
                                <i class="fa-regular fa-chevron-down"></i>
                            </button>
                        </div>
                        <div class="bys-multiselect__dropdown hidden" role="listbox" aria-multiselectable="true" id="bys-multiselect-activity-dropdown">
                            <ul class="bys-multiselect__list" role="group">
                                <?php foreach ($filter_options as $option) : ?>
                                    <?php if (!empty($option['value'])) : ?>
                                        <li class="bys-multiselect__option" role="option">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    name="activity[]"
                                                    value="<?php echo esc_attr($option['value']); ?>"
                                                    class="bys-multiselect__checkbox"
                                                />
                                                <span><?php echo esc_html($option['label']); ?></span>
                                            </label>
                                        </li>
                                    <?php endif; ?>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Items Per Page -->
                <div class="filters__field">
                    <label for="filter-per-page"><?php esc_html_e('Items per page', 'bys'); ?></label>
                    <select id="filter-per-page" name="per_page">
                        <option value="10">10</option>
                        <option value="20" selected>20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>

                <!-- Date Range Picker -->
                <div class="filters__field filters__field--date-range">
                    <label><?php esc_html_e('Date Range', 'bys'); ?></label>
                    <button id="date-range-trigger" type="button" class="date-range__trigger">
                        <span id="date-range-text"><?php esc_html_e('Select a date range', 'bys'); ?></span>
                        <i class="fa-regular fa-calendar"></i>
                    </button>

                    <div class="filters__date-range hidden" id="date-range-dropdown" role="menu">
                        <div>
                            <label for="filter-date-from"><?php esc_html_e('From', 'bys'); ?></label>
                            <input type="date" id="filter-date-from" name="date_from" />
                        </div>
                        <div>
                            <label for="filter-date-to"><?php esc_html_e('To', 'bys'); ?></label>
                            <input type="date" id="filter-date-to" name="date_to" />
                        </div>
                    </div>
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
        <tr data-activity="">
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