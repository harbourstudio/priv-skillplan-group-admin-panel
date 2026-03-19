<?php
/**
 * render.php — BYS Group Reporting block.
 *
 * Architecture: single-row <thead>. Every course gets one <th> for its title/toggle
 * plus THREE adjacent <th class="course-sub-col"> siblings (Progress, Quizzing,
 * Enrolment Date, Completion Date) that are pre-rendered and hidden.
 * Expand/collapse is purely CSS class toggling — no DOM injection.
 * Body rows mirror this exactly: one collapsed <td> + three hidden <td> siblings per course.
 */

$attrs = [ 'blockId' ];
foreach ( $attrs as $a ) {
    $$a = isset( $attributes[ $a ] ) ? $attributes[ $a ] : '';
}

$wrapper_attributes = get_block_wrapper_attributes();
$detail_url = home_url( '/administrator-dashboard/user-progress-detail/' );

// ── Static sample data ─────────────────────────────────────────────────────
$courses = [
    [ 'id' => 1, 'title' => 'MF EL*' ],
    [ 'id' => 2, 'title' => 'MF EL*' ],
    [ 'id' => 3, 'title' => 'MF EL*' ],
    [ 'id' => 4, 'title' => 'MF EL*' ],
    [ 'id' => 5, 'title' => 'MF EL*' ],
    [ 'id' => 6, 'title' => 'MF EL'  ],
    [ 'id' => 7, 'title' => 'MF EL'  ],
    [ 'id' => 8, 'title' => 'MF EL'  ],
    [ 'id' => 9, 'title' => 'MF EL'  ],
    [ 'id' => 10, 'title' => 'MF EL' ],
];

$users = [
    [
        'id' => 1, 'display_name' => 'Jane Smith', 'email' => 'jane.smith@email.com', 'online' => 'online',
        'courses' => [
            1  => [ 'progress' => 100, 'enrolment_date' => 'Oct 1, 2026',  'completion_date' => 'Nov 2, 2026',  'quizzes' => [ [ 'title' => 'Rounding Decimals', 'points' => 40, 'total' => 50, 'score' => 80 ], [ 'title' => 'Basic Algebra', 'points' => 45, 'total' => 50, 'score' => 90 ] ] ],
            2  => [ 'progress' => 100, 'enrolment_date' => 'Oct 2, 2026',  'completion_date' => 'Oct 16, 2026', 'quizzes' => [ [ 'title' => 'Quiz 2A', 'points' => 42, 'total' => 50, 'score' => 84 ] ] ],
            3  => [ 'progress' => 50,  'enrolment_date' => 'Oct 3, 2026',  'completion_date' => '',             'quizzes' => [ [ 'title' => 'Quiz 3A', 'points' => 25, 'total' => 50, 'score' => 50 ] ] ],
            4  => [ 'progress' => 50,  'enrolment_date' => 'Oct 4, 2026',  'completion_date' => '',             'quizzes' => [] ],
            5  => [ 'progress' => 0,   'enrolment_date' => 'Oct 5, 2026',  'completion_date' => '',             'quizzes' => [] ],
            6  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            7  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            8  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            9  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            10 => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
        ],
    ],
    [
        'id' => 2, 'display_name' => 'Mark Johnson', 'email' => 'mark.j@email.com', 'online' => 'offline',
        'courses' => [
            1  => [ 'progress' => 100, 'enrolment_date' => 'Oct 2, 2026',  'completion_date' => 'Oct 20, 2026', 'quizzes' => [ [ 'title' => 'Rounding Decimals', 'points' => 45, 'total' => 50, 'score' => 90 ] ] ],
            2  => [ 'progress' => 50,  'enrolment_date' => 'Oct 2, 2026',  'completion_date' => '',             'quizzes' => [ [ 'title' => 'Quiz 2A', 'points' => 20, 'total' => 50, 'score' => 40 ] ] ],
            3  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            4  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            5  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            6  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            7  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            8  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            9  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            10 => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
        ],
    ],
    [
        'id' => 3, 'display_name' => 'Sarah Lee', 'email' => 'sarah.lee@email.com', 'online' => 'never',
        'courses' => array_fill_keys( range(1,10), [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ] ),
    ],
    [
        'id' => 4, 'display_name' => 'Tom Harris', 'email' => 'tom.harris@email.com', 'online' => 'online',
        'courses' => [
            1  => [ 'progress' => 100, 'enrolment_date' => 'Oct 1, 2026',  'completion_date' => 'Nov 4, 2026',  'quizzes' => [ [ 'title' => 'Rounding Decimals', 'points' => 45, 'total' => 50, 'score' => 90 ] ] ],
            2  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            3  => [ 'progress' => 50,  'enrolment_date' => 'Oct 5, 2026',  'completion_date' => '',             'quizzes' => [] ],
            4  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            5  => [ 'progress' => 100, 'enrolment_date' => 'Oct 1, 2026',  'completion_date' => 'Nov 10, 2026', 'quizzes' => [] ],
            6  => [ 'progress' => 100, 'enrolment_date' => 'Oct 1, 2026',  'completion_date' => 'Nov 15, 2026', 'quizzes' => [] ],
            7  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            8  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            9  => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
            10 => [ 'progress' => 0,   'enrolment_date' => '',             'completion_date' => '',             'quizzes' => [] ],
        ],
    ],
    [
        'id' => 5, 'display_name' => 'Graham Taylor', 'email' => 'graham.t@email.com', 'online' => 'offline',
        'courses' => [
            1  => [ 'progress' => 70, 'enrolment_date' => 'Oct 13, 2026', 'completion_date' => '', 'quizzes' => [ [ 'title' => 'Quiz 1A', 'points' => 35, 'total' => 50, 'score' => 70 ] ] ],
            2  => [ 'progress' => 50, 'enrolment_date' => 'Oct 13, 2026', 'completion_date' => '', 'quizzes' => [ [ 'title' => 'Quiz 2A', 'points' => 20, 'total' => 50, 'score' => 40 ] ] ],
            3  => [ 'progress' => 0,  'enrolment_date' => '',             'completion_date' => '', 'quizzes' => [] ],
            4  => [ 'progress' => 0,  'enrolment_date' => '',             'completion_date' => '', 'quizzes' => [] ],
            5  => [ 'progress' => 0,  'enrolment_date' => '',             'completion_date' => '', 'quizzes' => [] ],
            6  => [ 'progress' => 0,  'enrolment_date' => '',             'completion_date' => '', 'quizzes' => [] ],
            7  => [ 'progress' => 0,  'enrolment_date' => '',             'completion_date' => '', 'quizzes' => [] ],
            8  => [ 'progress' => 0,  'enrolment_date' => '',             'completion_date' => '', 'quizzes' => [] ],
            9  => [ 'progress' => 0,  'enrolment_date' => '',             'completion_date' => '', 'quizzes' => [] ],
            10 => [ 'progress' => 0,  'enrolment_date' => '',             'completion_date' => '', 'quizzes' => [] ],
        ],
    ],
];

// ── Helpers ────────────────────────────────────────────────────────────────
function bys_completion_badge( $progress ) {
    if ( $progress >= 100 ) return '<span class="completion-badge completion-badge--completed"><i class="fa-solid fa-circle"></i></span>';
    if ( $progress > 0 )   return '<span class="completion-badge completion-badge--partial"><i class="fa-solid fa-circle-half-stroke"></i></span>';
    return '<span class="completion-badge completion-badge--none"><i class="fa-regular fa-circle"></i></span>';
}

function bys_progress_bar( $progress ) {
    $color = $progress >= 100 ? 'var(--wp--preset--color--green-500)'
           : ( $progress > 0 ? 'var(--wp--preset--color--orange-500)'
                              : 'var(--wp--preset--color--gray-300)' );
    return sprintf(
        '<div class="bys-progress-wrap"><div class="bys-progress-bar" style="width:%d%%;background:%s;"></div></div><span class="bys-pct" style="color:%s;">%d%%</span>',
        $progress, $color, $color, $progress
    );
}

function bys_quiz_icons( $quizzes ) {
    if ( empty( $quizzes ) ) return '<span class="bys-quiz-empty">—</span>';
    $out = '<div class="bys-quiz-icons">';
    foreach ( $quizzes as $q ) {
        $s     = $q['score'] ?? 0;
        $color = $s >= 80 ? 'var(--wp--preset--color--green-500)'
               : ( $s >= 50 ? 'var(--wp--preset--color--orange-500)'
                             : 'var(--wp--preset--color--red-500)' );
        $tip   = esc_attr( $q['title'] . ': ' . $q['points'] . '/' . $q['total'] . ' (' . $s . '%)' );
        $out  .= '<span class="bys-quiz-icon" data-tip="' . $tip . '" style="color:' . $color . ';"><i class="fa-solid fa-circle" style="font-size:12px;"></i></span>';
    }
    return $out . '</div>';
}
?>

<div <?php echo $wrapper_attributes; ?>>

    <div class="section__title">
        <h3>Group Reporting</h3>
        <button class="filters__toggle btn-unstyled" type="button" aria-expanded="false" aria-controls="filters-box">
            <i class="fa-solid fa-sliders"></i> Filter Participants
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
            <a href="#"><i class="fa-solid fa-download"></i> Export Table</a>
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

                        <?php foreach ( $courses as $idx => $course ) : ?>

                            <!--
                                Course title + toggle. When expanded this th stays in place;
                                the three siblings below unhide to fill the sub-columns.
                                data-course-idx is the shared key for header + body sync.
                            -->
                            <th class="course-col-header course-col-header--collapsed"
                                data-course-idx="<?php echo $idx; ?>">

                                <div class="course-col-header__inner">
                                    <button class="bys-course-toggle btn-unstyled"
                                            type="button"
                                            aria-expanded="false"
                                            data-course-idx="<?php echo $idx; ?>">
                                        <?php echo esc_html( $course['title'] ); ?>
                                    </button>
                                    <a class="bys-dl-link" href="#"
                                       title="Download <?php echo esc_attr( $course['title'] ); ?>">
                                        <i class="fa-solid fa-download"></i>
                                    </a>
                                </div>

                            </th>

                            <!-- Sub-column headers — hidden until course is expanded -->
                            <th class="course-sub-col course-sub-col--progress  course-sub-col--hidden" data-course-idx="<?php echo $idx; ?>">Completion Progress</th>
                            <th class="course-sub-col course-sub-col--quizzing  course-sub-col--hidden" data-course-idx="<?php echo $idx; ?>">Quizzing</th>
                            <th class="course-sub-col course-sub-col--enrolment course-sub-col--hidden" data-course-idx="<?php echo $idx; ?>">Enrolment Date</th>
                            <th class="course-sub-col course-sub-col--completion course-sub-col--hidden" data-course-idx="<?php echo $idx; ?>">Completion Date</th>

                        <?php endforeach; ?>

                    </tr>
                </thead>

                <tbody>
                    <?php foreach ( $users as $user ) : ?>
                        <tr class="reporting-table__row"
                            data-user-id="<?php echo esc_attr( $user['id'] ); ?>">

                            <td class="col-status">
                                <span class="status-badge status-badge--<?php echo esc_attr( $user['online'] ); ?>">
                                    <i class="fa-solid fa-circle"></i>
                                </span>
                            </td>

                            <td class="col-name">
                                <a href="<?php echo esc_url( add_query_arg( 'user_id', $user['id'], $detail_url ) ); ?>"
                                   class="reporting-table__name-link"
                                   onclick="event.stopPropagation();">
                                    <?php echo esc_html( $user['display_name'] ); ?>
                                </a>
                            </td>

                            <td class="col-email"><?php echo esc_html( $user['email'] ); ?></td>

                            <?php foreach ( $courses as $idx => $course ) :
                                $e        = $user['courses'][ $course['id'] ] ?? [];
                                $progress = $e['progress'] ?? 0;
                                $enrol    = $e['enrolment_date'] ?? '';
                                $comp     = $e['completion_date'] ?? '';
                                $quizzes  = $e['quizzes'] ?? [];
                            ?>

                                <!-- Collapsed cell: shows badge only -->
                                <td class="course-cell course-cell--badge"
                                    data-course-idx="<?php echo $idx; ?>">
                                    <?php echo bys_completion_badge( $progress ); ?>
                                </td>

                                <!-- Sub-cells: hidden until expanded -->
                                <td class="course-cell course-sub-cell course-sub-cell--progress course-sub-col--hidden"
                                    data-course-idx="<?php echo $idx; ?>">
                                    <?php echo bys_progress_bar( $progress ); ?>
                                </td>

                                <td class="course-cell course-sub-cell course-sub-cell--quizzing course-sub-col--hidden"
                                    data-course-idx="<?php echo $idx; ?>">
                                    <?php echo bys_quiz_icons( $quizzes ); ?>
                                </td>

                                <td class="course-cell course-sub-cell course-sub-cell--enrolment course-sub-col--hidden"
                                    data-course-idx="<?php echo $idx; ?>">
                                    <?php echo $enrol ? esc_html( $enrol ) : '<span class="bys-date-empty">Not Started</span>'; ?>
                                </td>

                                <td class="course-cell course-sub-cell course-sub-cell--completion course-sub-col--hidden"
                                    data-course-idx="<?php echo $idx; ?>">
                                    <?php echo $comp ? esc_html( $comp ) : '<span class="bys-date-empty">Not Completed</span>'; ?>
                                </td>

                            <?php endforeach; ?>

                        </tr>
                    <?php endforeach; ?>
                </tbody>

            </table>
        </div>

        <button class="bys-show-more btn-unstyled" type="button">Show More Results</button>
    </div>

</div>

<div class="bys-tooltip" role="tooltip" aria-hidden="true"></div>