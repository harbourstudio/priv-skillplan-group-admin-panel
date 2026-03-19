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
                    <label for="filter-keyword">Search</label>
                    <input type="text" id="filter-keyword" name="keyword" placeholder="Search courses or quizzes..." />
                </div>

                <div class="filters__field">
                    <label for="filter-date_range">Date Range</label>
                    <input type="date" id="filter-date_range" name="date_range" />
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

            </div>

            <div class="filters__actions">
                <div class="filters__actions__buttons">
                    <button class="filters__submit" type="submit">Filter</button>
                    <button class="filters__reset" type="reset">Reset</button>
                </div>
                <div class="filters__actions__toggles">
                    Group by Course
                </div>
            </div>
        </form>
    </div>

    <div class="table__actions">
        <div class="radio-group">
            <div class="radio-option">
                <input type="radio" name="score_sort" id="highest" value="highest" checked>
                <label for="highest">Highest score</label>
            </div>
            <div class="radio-option">
                <input type="radio" name="score_sort" id="latest" value="latest">
                <label for="latest">Latest score</label>
            </div>
        </div>
    </div>

    <div class="table__results">
        <table class="reporting-table">
            <thead>
                <tr class="reporting-table__head-primary">
                    <th>Quiz</th>
                    <th>Last Activity</th>
                    <th>Course</th>
                    <th>Attempts</th>
                    <th>Highest Score</th>
                    <th>Result</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Recognizing Fractions</td>
                    <td>Sep 3, 2025</td>
                    <td>MF EL</td>
                    <td>3</td>
                    <td>9/10 (90%)</span></td>
                    <td><span class="status-badge status-badge--pass">Passed</span></td>
                    <td>
                        <button
                            type="button"
                            class="quiz-attempts__trigger btn-unstyled"
                            data-hs-overlay="#quiz-attempts-modal"
                        >
                            <i class="fa-solid fa-ellipsis"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td>Recognizing Fractions</td>
                    <td>Sep 3, 2025</td>
                    <td>MF EL</td>
                    <td>3</td>
                    <td>9/10 (90%)</span></td>
                    <td><span class="status-badge status-badge--fail">Failed</span></td>
                    <td>
                        <button
                            type="button"
                            class="quiz-attempts__trigger btn-unstyled"
                            data-hs-overlay="#quiz-attempts-modal"
                        >
                            <i class="fa-solid fa-ellipsis"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td>Recognizing Fractions</td>
                    <td>Sep 3, 2025</td>
                    <td>MF EL</td>
                    <td>3</td>
                    <td>9/10 (90%)</span></td>
                    <td><span class="status-badge status-badge--ungraded">Ungraded</span></td>
                    <td>
                        <button
                            type="button"
                            class="quiz-attempts__trigger btn-unstyled"
                            data-hs-overlay="#quiz-attempts-modal"
                        >
                            <i class="fa-solid fa-ellipsis"></i>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

</div>