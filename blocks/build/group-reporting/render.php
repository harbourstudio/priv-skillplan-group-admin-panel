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

<div <?php echo $wrapper_attributes; ?>>

    <div class="section__title">
        <h3>Group Reporting</h3>
        <button class="filters__toggle btn-unstyled" type="button" aria-expanded="false" aria-controls="filters-box">
            <i class="fa-regular fa-sliders"></i> Filter Participants
        </button>
    </div>

    <div id="filters-box" class="filters__box hidden" aria-hidden="true">
        <form class="filters__form" method="get">
            <div class="filters__fields">
                <div class="filters__field"><label for="filter-course">Course</label><input type="text" id="filter-course" name="course" placeholder="Search course…" /></div>
                <div class="filters__field"><label for="filter-enrolment-date">Enrolment Date</label><input type="date" id="filter-enrolment-date" name="enrolment_date" /></div>
                <div class="filters__field"><label for="filter-completion-date">Completion Date</label><input type="date" id="filter-completion-date" name="completion_date" /></div>
                <div class="filters__field"><label for="filter-users">Users</label><input type="text" id="filter-users" name="users" placeholder="Search user…" /></div>
                <div class="filters__field">
                    <label for="filter-status">Status</label>
                    <select id="filter-status" name="status">
                        <option value="">All Statuses</option><option value="active">Active</option>
                        <option value="completed">Completed</option><option value="inactive">Inactive</option>
                        <option value="in_progress">In Progress</option>
                    </select>
                </div>
                <div class="filters__field">
                    <label for="filter-per-page">Items per Page</label>
                    <select id="filter-per-page" name="per_page">
                        <option value="10">10</option><option value="20">20</option>
                        <option value="50">50</option><option value="100">100</option>
                    </select>
                </div>
            </div>
            <div class="filters__actions">
                <button class="filters__submit btn" type="submit">Filter</button>
                <button class="filters__reset btn btn--secondary" type="reset">Reset</button>
            </div>
        </form>
    </div>

    <div class="table__actions">
        <div class="table__actions__sort">
            <label for="sort-select">Sort by</label>
            <select class="table__actions__sort__select" name="sort" id="sort-select">
                <option value="date_desc">Date Enrolled (Descending)</option>
                <option value="date_asc">Date Enrolled (Ascending)</option>
                <option value="name_asc">Name (A–Z)</option>
                <option value="name_desc">Name (Z–A)</option>
            </select>
        </div>
        <div class="table__actions__export">
            <a href="#"><i class="fa-regular fa-download"></i> Export Table</a>
        </div>
    </div>

    <div class="table__results">
        <div class="table__scroll">
            <table class="reporting-table" data-detail-url="<?php echo esc_url( $detail_url ); ?>">

                <thead>
                    <tr class="reporting-table__head">
                        <!-- Fixed columns -->
                        <th class="col-status"></th>
                        <th class="col-name">Name</th>
                        <th class="col-email">Email</th>

                        <!-- Course headers will be populated dynamically via template cloning -->
                    </tr>
                </thead>

                <tbody>
                    <!-- Table body populated dynamically via rows and cells cloning -->
                </tbody>

            </table>

            <!-- Skeleton row template for cloning -->
            <template id="skeleton-row-template">
                <tr class="reporting-table__row reporting-table__row--loading">
                    <td class="col-status">
                        <span class="status-badge">
                            <i class="fa-solid fa-circle"></i>
                        </span>
                    </td>
                    <td class="col-name"><span style="width: 120px;"></span></td>
                    <td class="col-email"><span style="width: 180px;"></span></td>
                </tr>
            </template>

            <!-- Course header template for cloning -->
            <template id="course-header-template">
                <th class="course-col-header course-col-header--collapsed" data-course-idx="">
                    <div class="course-col-header__inner">
                        <button class="bys-course-toggle btn-unstyled" type="button" aria-expanded="false" data-course-idx="">
                            <!-- course title inserted here -->
                        </button>
                        <a class="bys-dl-link" href="#" title="">
                            <i class="fa-regular fa-download"></i>
                        </a>
                    </div>
                </th>
                <th class="course-sub-col course-sub-col--progress course-sub-col--hidden" data-course-idx="">Completion Progress</th>
                <th class="course-sub-col course-sub-col--quizzing course-sub-col--hidden" data-course-idx="">Quizzing</th>
                <th class="course-sub-col course-sub-col--enrolment course-sub-col--hidden" data-course-idx="">Enrolment Date</th>
                <th class="course-sub-col course-sub-col--completion course-sub-col--hidden" data-course-idx="">Completion Date</th>
            </template>

            <!-- Course cell template for cloning -->
            <template id="course-cell-template">
                <td class="course-cell course-cell--badge">
                    <span></span>
                </td>
                <td class="course-cell course-sub-cell course-sub-cell--progress course-sub-col--hidden">
                    <span></span>
                </td>
                <td class="course-cell course-sub-cell course-sub-cell--quizzing course-sub-col--hidden">
                    <span></span>
                </td>
                <td class="course-cell course-sub-cell course-sub-cell--enrolment course-sub-col--hidden">
                    <span style="width: 100px;"></span>
                </td>
                <td class="course-cell course-sub-cell course-sub-cell--completion course-sub-col--hidden">
                    <span style="width: 100px;"></span>
                </td>
            </template>
        </div>

        <button class="bys-show-more btn-unstyled" type="button">Show More Results</button>
    </div>

</div>

<div class="bys-tooltip" role="tooltip"></div>