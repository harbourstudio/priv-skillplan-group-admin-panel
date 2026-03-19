<?php
/**
 * render.php
 * BYS - Group Reporting block.
 * Static sample data. view.js handles expand/collapse and row click behaviour.
 */

$attrs = [ 'blockId' ];
foreach ( $attrs as $a ) {
	$$a = isset( $attributes[ $a ] ) ? $attributes[ $a ] : '';
}

$wrapper_attributes = get_block_wrapper_attributes();

// ── Static sample data ─────────────────────────────────────────────────────
$detail_url = home_url( '/administrator-dashboard/detailed-user-progress/' );

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
		'id'           => 1,
		'display_name' => 'Jane Smith',
		'email'        => 'jane.smith@email.com',
		'online'       => 'online',
		'courses'      => [
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
		'id'           => 2,
		'display_name' => 'Mark Johnson',
		'email'        => 'mark.j@email.com',
		'online'       => 'offline',
		'courses'      => [
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
		'id'           => 3,
		'display_name' => 'Sarah Lee',
		'email'        => 'sarah.lee@email.com',
		'online'       => 'never',
		'courses'      => [
			1  => [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ],
			2  => [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ],
			3  => [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ],
			4  => [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ],
			5  => [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ],
			6  => [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ],
			7  => [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ],
			8  => [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ],
			9  => [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ],
			10 => [ 'progress' => 0, 'enrolment_date' => '', 'completion_date' => '', 'quizzes' => [] ],
		],
	],
	[
		'id'           => 4,
		'display_name' => 'Tom Harris',
		'email'        => 'tom.harris@email.com',
		'online'       => 'online',
		'courses'      => [
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
		'id'           => 5,
		'display_name' => 'Graham Taylor',
		'email'        => 'graham.t@email.com',
		'online'       => 'offline',
		'courses'      => [
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

// ── Helper: completion badge ───────────────────────────────────────────────
function bys_completion_badge( $progress ) {
	if ( $progress >= 100 ) {
		return '<span class="completion-badge completion-badge--completed"><i class="fa-solid fa-circle"></i></span>';
	} elseif ( $progress > 0 ) {
		return '<span class="completion-badge completion-badge--partial"><i class="fa-solid fa-circle-half-stroke"></i></span>';
	} else {
		return '<span class="completion-badge completion-badge--none"><i class="fa-regular fa-circle"></i></span>';
	}
}

// ── Helper: progress bar cell ──────────────────────────────────────────────
function bys_progress_cell( $enrollment ) {
	$pct   = $enrollment['progress'] ?? 0;
	$color = $pct >= 100 ? 'var(--wp--preset--color--green-500)' : ( $pct > 0 ? 'var(--wp--preset--color--orange-500)' : 'var(--wp--preset--color--gray-300)' );
	return sprintf(
		'<div class="bys-progress-wrap"><div class="bys-progress-bar" style="width:%d%%;background:%s;"></div></div><span class="bys-pct" style="color:%s;">%d%%</span>',
		$pct, $color, $color, $pct
	);
}

// ── Helper: quiz icons cell ────────────────────────────────────────────────
function bys_quizzing_cell( $enrollment ) {
	if ( empty( $enrollment['quizzes'] ) ) return '<span class="bys-quiz-empty">—</span>';
	$out = '<div class="bys-quiz-icons">';
	foreach ( $enrollment['quizzes'] as $quiz ) {
		$score = $quiz['score'] ?? 0;
		$color = $score >= 80 ? 'var(--wp--preset--color--green-500)' : ( $score >= 50 ? 'var(--wp--preset--color--orange-500)' : 'var(--wp--preset--color--red-500)' );
		$tip   = esc_attr( $quiz['title'] . ': ' . $quiz['points'] . '/' . $quiz['total'] . ' (' . $score . '%)' );
		$out  .= sprintf(
			'<span class="bys-quiz-icon" data-tip="%s" style="color:%s;"><i class="fa-solid fa-circle" style="font-size:12px;"></i></span>',
			$tip, $color
		);
	}
	$out .= '</div>';
	return $out;
}
?>

<div <?php echo $wrapper_attributes; ?>>

	<div class="section__title">
		<h3>Group Reporting</h3>
		<button
			class="filters__toggle btn-unstyled"
			type="button"
			aria-expanded="false"
			aria-controls="filters-box"
		>
			<i class="fa-solid fa-sliders"></i>
			Filter Participants
		</button>
	</div>

	<div id="filters-box" class="filters__box hidden" aria-hidden="true">
		<form class="filters__form" method="get">
			<div class="filters__fields">
				<div class="filters__field">
					<label for="filter-course">Course</label>
					<input type="text" id="filter-course" name="course" placeholder="Search course…" />
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
					<input type="text" id="filter-users" name="users" placeholder="Search user…" />
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
					<!-- Primary header row: fixed cols + one th per course (collapsed by default) -->
					<tr class="reporting-table__head-primary">
						<th class="reporting-table__status-col"></th>
						<th>Name</th>
						<th>Email</th>
						<?php foreach ( $courses as $idx => $course ) : ?>
							<th
								class="course-col-header course-col-header--collapsed"
								data-course-idx="<?php echo $idx; ?>"
								colspan="1"
							>
								<button
									class="bys-course-toggle btn-unstyled"
									type="button"
									aria-expanded="false"
									data-course-idx="<?php echo $idx; ?>"
								>
									<?php echo esc_html( $course['title'] ); ?>
								</button>
							</th>
						<?php endforeach; ?>
					</tr>

					<!-- Secondary header row: download icons, hidden sub-column labels injected by JS -->
					<tr class="reporting-table__head-secondary">
						<td></td>
						<td></td>
						<td></td>
						<?php foreach ( $courses as $idx => $course ) : ?>
							<td
								class="course-col-dl course-col-dl--collapsed"
								data-course-idx="<?php echo $idx; ?>"
							>
								<a href="#" title="Download <?php echo esc_attr( $course['title'] ); ?>">
									<i class="fa-solid fa-download"></i>
								</a>
							</td>
						<?php endforeach; ?>
					</tr>
				</thead>

				<tbody>
					<?php foreach ( $users as $user ) : ?>
						<tr
							class="reporting-table__row"
							data-user-id="<?php echo esc_attr( $user['id'] ); ?>"
							style="cursor:pointer;"
						>
							<!-- Online status dot -->
							<td>
								<span class="status-badge status-badge--<?php echo esc_attr( $user['online'] ); ?>">
									<i class="fa-solid fa-circle"></i>
								</span>
							</td>

							<!-- Name -->
							<td>
								<a
									href="<?php echo esc_url( add_query_arg( 'user_id', $user['id'], $detail_url ) ); ?>"
									class="reporting-table__name-link"
									onclick="event.stopPropagation();"
								>
									<?php echo esc_html( $user['display_name'] ); ?>
								</a>
							</td>

							<!-- Email -->
							<td><?php echo esc_html( $user['email'] ); ?></td>

							<!-- Course cells — one collapsed td per course by default -->
							<?php foreach ( $courses as $idx => $course ) :
								$enrollment = $user['courses'][ $course['id'] ] ?? null;
								$progress   = $enrollment['progress'] ?? 0;
							?>
								<!-- Collapsed: single status icon -->
								<td
									class="course-cell course-cell--collapsed"
									data-course-idx="<?php echo $idx; ?>"
									data-progress="<?php echo (int) $progress; ?>"
									data-enrolment="<?php echo esc_attr( $enrollment['enrolment_date'] ?? '' ); ?>"
									data-completion="<?php echo esc_attr( $enrollment['completion_date'] ?? '' ); ?>"
									data-quizzes="<?php echo esc_attr( wp_json_encode( $enrollment['quizzes'] ?? [] ) ); ?>"
								>
									<?php echo bys_completion_badge( $progress ); ?>
								</td>
							<?php endforeach; ?>
						</tr>
					<?php endforeach; ?>
				</tbody>

			</table>
		</div>

		<button class="bys-show-more" type="button">Show More Results</button>
	</div>

</div>

<!-- Tooltip template -->
<div class="bys-tooltip" role="tooltip" aria-hidden="true"></div>