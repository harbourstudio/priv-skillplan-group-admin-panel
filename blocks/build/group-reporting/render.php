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

// Placeholder courses displayed at all times (until we have actual course data)
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

// Fetch initial users data for display (will be replaced when group changes)
$users = array();

// Get the first group ID from the current user's groups if available
require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest-api.php';
$rest_api = new BYS_Groups_Rest_API();
$user_id = get_current_user_id();

if ( $user_id ) {
    $response = $rest_api->get_current_user_groups( null );

    if ( ! is_wp_error( $response ) ) {
        $data = $response->get_data();
        $user_groups = isset( $data['groups'] ) ? $data['groups'] : array();

        // If user has groups, fetch users for the first group
        if ( ! empty( $user_groups ) ) {
            $first_group_id = intval( $user_groups[0]['id'] );

            // Get group members
            $group_users_key = 'learndash_group_users_' . $first_group_id;
            $member_ids = get_post_meta( $first_group_id, $group_users_key, true );
            $member_ids = is_array( $member_ids ) ? $member_ids : array();

            // Fetch user data
            foreach ( $member_ids as $member_id ) {
                $member_id = intval( $member_id );
                $user = get_user_by( 'ID', $member_id );

                if ( $user ) {
                    $last_login = get_user_meta( $member_id, 'last_login', true );
                    $has_logged_in = ! empty( $last_login );

                    $users[] = array(
                        'id'             => $user->ID,
                        'display_name'   => $user->display_name,
                        'email'          => $user->user_email,
                        'has_logged_in'  => $has_logged_in,
                    );
                }
            }
        }
    }
}

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