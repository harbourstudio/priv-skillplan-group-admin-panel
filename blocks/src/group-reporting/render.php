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
$detail_url = home_url( '/administrator-dashboard/user-progress-detail/' );

?>

<div <?= $wrapper_attributes; ?>>

    <div class="group-reporting__header">
        <h3><?php esc_html_e('Group Reporting', 'bys'); ?></h3>
        <button class="group-reporting__filters-toggle btn-unstyled" type="button" aria-expanded="false" aria-controls="filters-box">
            <i class="fa-regular fa-sliders"></i> <?php esc_html_e('Filter Participants', 'bys'); ?>
        </button>
    </div>

    <div class="group-reporting__filters-box hidden" aria-hidden="true">
        <form class="filters__form" method="get">
            <div class="group-reporting__fields">
                <div class="group-reporting__field group-reporting__field--multiselect" id="group-reporting__field--course">
                    <label><?php esc_html_e('Courses', 'bys'); ?></label>
                    <div class="bys-multiselect" id="bys-multiselect-course" aria-haspopup="listbox" aria-expanded="false">
                        <div class="bys-multiselect__control">
                            <div class="bys-multiselect__pills" id="bys-multiselect-course-pills">
                                <span class="bys-multiselect__placeholder"><?php esc_html_e('All courses', 'bys'); ?></span>
                            </div>
                            <button class="bys-multiselect__toggle btn-unstyled" type="button" aria-label="<?php esc_attr_e('Toggle course selector', 'bys'); ?>">
                                <i class="fa-regular fa-chevron-down"></i>
                            </button>
                        </div>
                        <div class="bys-multiselect__dropdown hidden" role="listbox" aria-multiselectable="true" id="bys-multiselect-course-dropdown">
                            <div class="bys-multiselect__search-wrap">
                                <input class="bys-multiselect__search" type="text" placeholder="<?php esc_attr_e('Search courses…', 'bys'); ?>" aria-label="<?php esc_attr_e('Search courses', 'bys'); ?>" autocomplete="off" />
                            </div>
                            <ul class="bys-multiselect__list" role="group"></ul>
                            <div class="bys-multiselect__empty hidden"><?php esc_html_e('No courses found', 'bys'); ?></div>
                        </div>
                    </div>
                </div>
                <div class="group-reporting__field group-reporting__field--course-dep group-reporting__field--date-range" id="group-reporting__field--enrolment-date">
                    <label><?php esc_html_e('Enrolment Date', 'bys'); ?></label>
                    <button id="enrolment-date-range-trigger" type="button" class="date-range__trigger" disabled>
                        <span id="enrolment-date-range-text"><?php esc_html_e('Select a date range', 'bys'); ?></span>
                        <i class="fa-regular fa-calendar"></i>
                    </button>
                    <div class="filters__date-range hidden" id="enrolment-date-range-dropdown">
                        <div class="group-reporting__date-field">
                            <label><?php esc_html_e('From', 'bys'); ?></label>
                            <div class="group-reporting__date-field__input">
                                <input type="text" id="filter-enrolment-date-from" name="enrolment_date_from" class="group-reporting__datetime" placeholder="<?php esc_attr_e('Pick a date', 'bys'); ?>" readonly />
                                <button type="button" class="group-reporting__date-clear btn-unstyled" data-target="filter-enrolment-date-from" aria-label="<?php esc_attr_e('Clear From date', 'bys'); ?>" hidden>
                                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="group-reporting__date-field">
                            <label><?php esc_html_e('To', 'bys'); ?></label>
                            <div class="group-reporting__date-field__input">
                                <input type="text" id="filter-enrolment-date-to" name="enrolment_date_to" class="group-reporting__datetime" placeholder="<?php esc_attr_e('Pick a date', 'bys'); ?>" readonly />
                                <button type="button" class="group-reporting__date-clear btn-unstyled" data-target="filter-enrolment-date-to" aria-label="<?php esc_attr_e('Clear To date', 'bys'); ?>" hidden>
                                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <span class="group-reporting__field__hint"><?php esc_html_e('Select one course to enable', 'bys'); ?></span>
                </div>
                <div class="group-reporting__field group-reporting__field--course-dep group-reporting__field--date-range" id="group-reporting__field--completion-date">
                    <label><?php esc_html_e('Completion Date', 'bys'); ?></label>
                    <button id="completion-date-range-trigger" type="button" class="date-range__trigger" disabled>
                        <span id="completion-date-range-text"><?php esc_html_e('Select a date range', 'bys'); ?></span>
                        <i class="fa-regular fa-calendar"></i>
                    </button>
                    <div class="filters__date-range hidden" id="completion-date-range-dropdown">
                        <div class="group-reporting__date-field">
                            <label><?php esc_html_e('From', 'bys'); ?></label>
                            <div class="group-reporting__date-field__input">
                                <input type="text" id="filter-completion-date-from" name="completion_date_from" class="group-reporting__datetime" placeholder="<?php esc_attr_e('Pick a date', 'bys'); ?>" readonly />
                                <button type="button" class="group-reporting__date-clear btn-unstyled" data-target="filter-completion-date-from" aria-label="<?php esc_attr_e('Clear From date', 'bys'); ?>" hidden>
                                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="group-reporting__date-field">
                            <label><?php esc_html_e('To', 'bys'); ?></label>
                            <div class="group-reporting__date-field__input">
                                <input type="text" id="filter-completion-date-to" name="completion_date_to" class="group-reporting__datetime" placeholder="<?php esc_attr_e('Pick a date', 'bys'); ?>" readonly />
                                <button type="button" class="group-reporting__date-clear btn-unstyled" data-target="filter-completion-date-to" aria-label="<?php esc_attr_e('Clear To date', 'bys'); ?>" hidden>
                                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <span class="group-reporting__field__hint"><?php esc_html_e('Select one course to enable', 'bys'); ?></span>
                </div>
                <div class="group-reporting__field group-reporting__field--multiselect" id="group-reporting__field--users">
                    <label><?php esc_html_e('Users', 'bys'); ?></label>
                    <div class="bys-multiselect" id="bys-multiselect-users" aria-haspopup="listbox" aria-expanded="false">
                        <div class="bys-multiselect__control">
                            <div class="bys-multiselect__pills" id="bys-multiselect-users-pills">
                                <span class="bys-multiselect__placeholder"><?php esc_html_e('All users', 'bys'); ?></span>
                            </div>
                            <button class="bys-multiselect__toggle btn-unstyled" type="button" aria-label="<?php esc_attr_e('Toggle user selector', 'bys'); ?>">
                                <i class="fa-regular fa-chevron-down"></i>
                            </button>
                        </div>
                        <div class="bys-multiselect__dropdown hidden" role="listbox" aria-multiselectable="true" id="bys-multiselect-users-dropdown">
                            <div class="bys-multiselect__search-wrap">
                                <input class="bys-multiselect__search" type="text" placeholder="<?php esc_attr_e('Search users…', 'bys'); ?>" aria-label="<?php esc_attr_e('Search users', 'bys'); ?>" autocomplete="off" />
                            </div>
                            <ul class="bys-multiselect__list" role="group"></ul>
                            <div class="bys-multiselect__empty hidden"><?php esc_html_e('No users found', 'bys'); ?></div>
                            <div class="bys-multiselect__loading hidden"><?php esc_html_e('Loading users…', 'bys'); ?></div>
                        </div>
                    </div>
                </div>
                <div class="group-reporting__field group-reporting__field--course-dep" id="group-reporting__field--status">
                    <label for="filter-status"><?php esc_html_e('Course Status', 'bys'); ?></label>
                    <select id="filter-status" name="status" disabled>
                        <option value=""><?php esc_html_e('All Statuses', 'bys'); ?></option>
                        <option value="completed"><?php esc_html_e('Completed', 'bys'); ?></option>
                        <option value="in_progress"><?php esc_html_e('In Progress', 'bys'); ?></option>
                        <option value="inactive"><?php esc_html_e('Not Started', 'bys'); ?></option>
                    </select>
                    <span class="group-reporting__field__hint"><?php esc_html_e('Select one course to enable', 'bys'); ?></span>
                </div>
                <div class="group-reporting__field" id="group-reporting__field--user-status">
                    <label for="filter-user-status"><?php esc_html_e('User Status', 'bys'); ?></label>
                    <select id="filter-user-status" name="user_status" class="is-placeholder">
                        <option value=""><?php esc_html_e('All Statuses', 'bys'); ?></option>
                        <option value="online"><?php esc_html_e('Online', 'bys'); ?></option>
                        <option value="offline"><?php esc_html_e('Offline', 'bys'); ?></option>
                        <option value="never"><?php esc_html_e('Never Logged In', 'bys'); ?></option>
                    </select>
                </div>
            </div>
            <div class="group-reporting__actions">
                <button class="group-reporting__submit btn" type="submit"><?php esc_html_e('Filter', 'bys'); ?></button>
                <button class="group-reporting__reset btn btn--secondary" type="reset"><?php esc_html_e('Reset', 'bys'); ?></button>
            </div>
        </form>
    </div>

    <div class="group-reporting__actions">
        <div class="group-reporting__sort">
            <label for="sort-select"><?php esc_html_e('Sort by', 'bys'); ?></label>
            <select class="group-reporting__sort-select" name="sort" id="sort-select">
                <option value="first_name_asc"><?php esc_html_e('First Name (A–Z)', 'bys'); ?></option>
                <option value="first_name_desc"><?php esc_html_e('First Name (Z–A)', 'bys'); ?></option>
                <option value="last_name_asc"><?php esc_html_e('Last Name (A–Z)', 'bys'); ?></option>
                <option value="last_name_desc"><?php esc_html_e('Last Name (Z–A)', 'bys'); ?></option>
                <option value="date_desc"><?php esc_html_e('Date Enrolled (Descending)', 'bys'); ?></option>
                <option value="date_asc"><?php esc_html_e('Date Enrolled (Ascending)', 'bys'); ?></option>
                <option value="completion_date_desc" class="group-reporting__sort-option--completion hidden">
                    <?php esc_html_e('Completion Date (Descending)', 'bys'); ?>
                </option>
                <option value="completion_date_asc" class="group-reporting__sort-option--completion hidden">
                    <?php esc_html_e('Completion Date (Ascending)', 'bys'); ?>
                </option>
            </select>
        </div>
        <div class="group-reporting__export">
            <a href="#"><i class="fa-regular fa-download"></i> <?php esc_html_e('Export Table', 'bys'); ?></a>
        </div>
    </div>

    <div class="group-reporting__results">
        <div class="group-reporting__table-scroll">
            <table class="reporting-table group-reporting__table" data-detail-url="<?php echo esc_url( $detail_url ); ?>">

                <thead>
                    <tr class="group-reporting__table-head">
                        <!-- Fixed columns -->
                        <th class="group-reporting__col group-reporting__col--status" aria-label="<?php esc_attr_e('System Status', 'bys'); ?>"></th>
                        <th class="group-reporting__col group-reporting__col--name"><?php esc_html_e('Name', 'bys'); ?></th>
                        <th class="group-reporting__col group-reporting__col--email"><?php esc_html_e('Email', 'bys'); ?></th>

                        <!-- Course headers will be populated dynamically via template cloning -->
                    </tr>
                </thead>

                <tbody>
                    <!-- Table body populated dynamically via rows and cells cloning -->
                </tbody>

            </table>

            <!-- Real-user row template (cloned by renderUserRowsFromCache).
                 Course cells get appended per-course from #group-reporting__cell-template. -->
            <template id="group-reporting__row-template">
                <tr class="group-reporting__row" data-user-id="">
                    <td class="group-reporting__col group-reporting__col--status">
                        <span class="status-badge">
                            <i class="fa-solid fa-circle"></i>
                        </span>
                    </td>
                    <td class="group-reporting__col group-reporting__col--name">
                        <a class="group-reporting__name-link" href="" onclick="event.stopPropagation();"></a>
                    </td>
                    <td class="group-reporting__col group-reporting__col--email"></td>
                </tr>
            </template>

            <!-- Skeleton row template for cloning -->
            <template id="skeleton-row-template">
                <tr class="group-reporting__row group-reporting__row--loading">
                    <td class="group-reporting__col group-reporting__col--status">
                        <span class="status-badge">
                            <i class="fa-solid fa-circle"></i>
                        </span>
                    </td>
                    <td class="group-reporting__col group-reporting__col--name"><span style="width: 120px;"></span></td>
                    <td class="group-reporting__col group-reporting__col--email"><span style="width: 180px;"></span></td>
                    <!-- Skeleton course cells injected by JS -->
                </tr>
            </template>

            <!-- Skeleton course header template for cloning -->
            <template id="skeleton-course-header-template">
                <th class="group-reporting__course-header group-reporting__course-header--collapsed group-reporting__course-header--skeleton">
                    <div class="group-reporting__course-header-inner">
                        <span class="group-reporting__course-toggle--skeleton"></span>
                        <div class="group-reporting__course-header-meta">
                            <span class="group-reporting__dl-link--skeleton"></span>
                        </div>
                    </div>
                </th>
            </template>

            <!-- Course header template for cloning -->
            <template id="course-header-template">
                <th class="group-reporting__course-header group-reporting__course-header--collapsed" data-course-idx="">
                    <div class="group-reporting__course-header-inner">
                        <button class="group-reporting__course-toggle btn-unstyled" type="button" aria-expanded="false" data-course-idx="">
                            <!-- course title inserted here -->
                        </button>
                        <div class="group-reporting__course-header-meta">
                            <span class="group-reporting__required-badge hidden" aria-label="<?php esc_attr_e('Required', 'bys'); ?>" title="<?php esc_attr_e('Required', 'bys'); ?>"><i class="fa-regular fa-circle-exclamation"></i></span>
                            <a class="group-reporting__dl-link" href="#" title="">
                                <i class="fa-regular fa-download"></i>
                            </a>
                        </div>
                    </div>
                </th>
                <th class="group-reporting__sub-col group-reporting__sub-col--progress group-reporting__sub-col--hidden" data-course-idx=""><?php esc_html_e('Completion Progress', 'bys'); ?></th>
                <th class="group-reporting__sub-col group-reporting__sub-col--quizzing group-reporting__sub-col--hidden" data-course-idx=""><?php esc_html_e('Quizzing', 'bys'); ?></th>
                <th class="group-reporting__sub-col group-reporting__sub-col--enrolment group-reporting__sub-col--hidden" data-course-idx=""><?php esc_html_e('Enrolment Date', 'bys'); ?></th>
                <th class="group-reporting__sub-col group-reporting__sub-col--completion group-reporting__sub-col--hidden" data-course-idx=""><?php esc_html_e('Completion Date', 'bys'); ?></th>
            </template>

            <!-- Course cell template for cloning -->
            <template id="group-reporting__cell-template">
                <td class="group-reporting__cell group-reporting__cell--badge">
                    <span class="skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e('Loading', 'bys'); ?>"></span>
                </td>
                <td class="group-reporting__cell group-reporting__sub-cell group-reporting__sub-cell--progress group-reporting__sub-col--hidden">
                    <span class="skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e('Loading', 'bys'); ?>"></span>
                </td>
                <td class="group-reporting__cell group-reporting__sub-cell group-reporting__sub-cell--quizzing group-reporting__sub-col--hidden">
                    <span class="skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e('Loading', 'bys'); ?>"></span>
                </td>
                <td class="group-reporting__cell group-reporting__sub-cell group-reporting__sub-cell--enrolment group-reporting__sub-col--hidden">
                    <span class="skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e('Loading', 'bys'); ?>"></span>
                </td>
                <td class="group-reporting__cell group-reporting__sub-cell group-reporting__sub-cell--completion group-reporting__sub-col--hidden">
                    <span class="skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e('Loading', 'bys'); ?>"></span>
                </td>
            </template>
        </div>

        <button class="group-reporting__show-more btn-unstyled hidden" type="button">
            <?php esc_html_e('Show More Results', 'bys'); ?>
        </button>
    </div>
</div>

<div class="bys-tooltip" role="tooltip"></div>
