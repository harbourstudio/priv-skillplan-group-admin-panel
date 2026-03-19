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

// ─── Quiz Details Data ───
// TODO: Replace with REST API call to get user quiz results
$quizzes = [
    [
        'name'          => 'Recognizing Fractions',
        'last_activity' => 'Sep 3, 2025',
        'course'        => 'MF EL',
        'attempts'      => 3,
        'highest_score' => '9/10 (90%)',
        'result'        => 'pass',
    ],
    [
        'name'          => 'Recognizing Fractions',
        'last_activity' => 'Sep 3, 2025',
        'course'        => 'MF EL',
        'attempts'      => 3,
        'highest_score' => '9/10 (90%)',
        'result'        => 'fail',
    ],
    [
        'name'          => 'Recognizing Fractions',
        'last_activity' => 'Sep 3, 2025',
        'course'        => 'MF EL',
        'attempts'      => 3,
        'highest_score' => '9/10 (90%)',
        'result'        => 'ungraded',
    ],
];

$result_labels = [
    'pass'     => 'Passed',
    'fail'     => 'Failed',
    'ungraded' => 'Ungraded',
];
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
                <?php foreach ($quizzes as $quiz) :
                    $result = $quiz['result'];
                ?>
                <tr>
                    <td><?= esc_html($quiz['name']); ?></td>
                    <td><?= esc_html($quiz['last_activity']); ?></td>
                    <td><?= esc_html($quiz['course']); ?></td>
                    <td><?= (int) $quiz['attempts']; ?></td>
                    <td><?= esc_html($quiz['highest_score']); ?></td>
                    <td><span class="status-badge status-badge--<?= esc_attr($result); ?>"><?= esc_html($result_labels[$result]); ?></span></td>
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
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

</div>