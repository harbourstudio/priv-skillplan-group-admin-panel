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

    <div class="section__title">
        <h3>Group Reporting</h3>
        <button
            class="filters__toggle btn-unstyled"
            type="button"
            data-hs-collapse="#filters-box"
            aria-expanded="false"
            aria-controls="filters-box"
        >
            <i class="fa-solid fa-sliders"></i>
            Filter Participants
        </button>
    </div>

    <div id="filters-box" class="filters__box hidden overflow-hidden transition-[height] duration-300" aria-labelledby="filters-toggle">
        <form class="filters__form" method="get">
            <div class="filters__fields">

                <div class="filters__field">
                    <label for="filter-course">Course</label>
                    <input type="text" id="filter-course" name="course" placeholder="Search course..." />
                </div>

                <div class="filters__field">
                    <label for="filter-enrolment-date">Enrolment Date</label>
                    <input type="date" id="filter-enrolment-date" name="enrolment_date" />
                </div>

                <div class="filters__field">
                    <label for="filter-completion-date">Completion Date</label>
                    <input type="date" id="filter-completion-date" name="completion_date" />
                </div>

                <div class="filters__field">
                    <label for="filter-users">Users</label>
                    <input type="text" id="filter-users" name="users" placeholder="Search user..." />
                </div>

                <div class="filters__field">
                    <label for="filter-status">Status</label>
                    <select id="filter-status" name="status">
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="inactive">Inactive</option>
                        <option value="in_progress">In Progress</option>
                    </select>
                </div>

                <div class="filters__field">
                    <label for="filter-per-page">Items per Page</label>
                    <select id="filter-per-page" name="per_page">
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>

            </div>

            <div class="filters__actions">
                <button class="filters__submit" type="submit">Filter</button>
                <button class="filters__reset" type="reset">Reset</button>
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
            <a href="#"><i class="fa-solid fa-download"></i> Export Table</a>
        </div>
    </div>

    <div class="table__results">
        <table class="reporting-table">
            <thead>
                <tr class="reporting-table__head-primary">
                    <th class="reporting-table__status-col"></th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Course 1</th>
                    <th>Course 2</th>
                    <th>Course 3</th>
                </tr>
                <tr class="reporting-table__head-secondary">
                    <td></td>
                    <td></td>
                    <td></td>
                    <td><a href="#" title="Download Course 1"><i class="fa-solid fa-download"></i></a></td>
                    <td><a href="#" title="Download Course 2"><i class="fa-solid fa-download"></i></a></td>
                    <td><a href="#" title="Download Course 3"><i class="fa-solid fa-download"></i></a></td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><span class="status-badge status-badge--online"><i class="fa-solid fa-circle"></i></span></td>
                    <td>Jane Smith</td>
                    <td>jane.smith@email.com</td>
                    <td><span class="completion-badge completion-badge--completed"><i class="fa-solid fa-circle"></i></span></td>
                    <td><span class="completion-badge completion-badge--partial"><i class="fa-solid fa-circle-half-stroke"></i></span></td>
                    <td><span class="completion-badge completion-badge--none"><i class="fa-regular fa-circle"></i></span></td>
                </tr>
                <tr>
                    <td><span class="status-badge status-badge--offline"><i class="fa-solid fa-circle"></i></span></td>
                    <td>Mark Johnson</td>
                    <td>mark.j@email.com</td>
                    <td><span class="completion-badge completion-badge--completed"><i class="fa-solid fa-circle"></i></span></td>
                    <td><span class="completion-badge completion-badge--partial"><i class="fa-solid fa-circle-half-stroke"></i></span></td>
                    <td><span class="completion-badge completion-badge--none"><i class="fa-regular fa-circle"></i></span></td>
                </tr>
                <tr>
                    <td><span class="status-badge status-badge--never"><i class="fa-solid fa-circle"></i></span></td>
                    <td>Sarah Lee</td>
                    <td>sarah.lee@email.com</td>
                    <td><span class="completion-badge completion-badge--completed"><i class="fa-solid fa-circle"></i></span></td>
                    <td><span class="completion-badge completion-badge--partial"><i class="fa-solid fa-circle-half-stroke"></i></span></td>
                    <td><span class="completion-badge completion-badge--none"><i class="fa-regular fa-circle"></i></span></td>
                </tr>
                <tr>
                    <td><span class="status-badge status-badge--online"><i class="fa-solid fa-circle"></i></span></td>
                    <td>Tom Harris</td>
                    <td>tom.harris@email.com</td>
                    <td><span class="completion-badge completion-badge--completed"><i class="fa-solid fa-circle"></i></span></td>
                    <td><span class="completion-badge completion-badge--partial"><i class="fa-solid fa-circle-half-stroke"></i></span></td>
                    <td><span class="completion-badge completion-badge--none"><i class="fa-regular fa-circle"></i></span></td>
                </tr>
            </tbody>
        </table>
    </div>

</div>