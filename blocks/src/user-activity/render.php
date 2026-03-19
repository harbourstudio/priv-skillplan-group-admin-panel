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
                    <label for="filter-type">Type of Activity</label>
                    <input type="text" id="filter-type" name="type" placeholder="Type of Activity" />
                </div>

                <div class="filters__field">
                    <label for="filter-date_range">Date Range</label>
                    <input type="date" id="filter-date_range" name="date_range" />
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

    <div class="table__results">
        <table class="reporting-table">
            <thead>
                <tr class="reporting-table__head-primary">
                    <th>Event</th>
                    <th>Timestamp</th>
                    <th>Resource</th>
                    <th>Resource Type</th>
                    <th>Initiated By</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Earned Certificate</td>
                    <td>Sep 3, 2025<br />
                        <span class="reporting-table__time">3:28:38 PM</span>
                    </td>
                    <td>Math for Electrical</td>
                    <td>
                        <div class="reporting-table__resource-type">
                            <div class="reporting-table__resource-type__dot"></div> Course
                        </div>
                    </td>
                    <td>System</span></td>
                    <td>
                        <button
                            type="button"
                            class="activity-details__trigger btn-unstyled"
                            data-hs-overlay=""
                        >
                            <i class="fa-solid fa-ellipsis"></i>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

</div>