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

// ─── Status helpers ───
$status_icons = [
    'completed'   => '<i class="fa-solid fa-circle-check"></i>',
    'in-progress' => '<i class="fa-solid fa-circle-half-stroke"></i>',
    'not-started' => '<i class="fa-regular fa-circle"></i>',
];

$status_labels = [
    'completed'   => 'Completed',
    'in-progress' => 'In Progress',
    'not-started' => 'Not Started',
];

// ─── Courses Data ───
// TODO: Replace with REST API call to get user course progress
$courses = [
    [
        'name'           => 'Math for Electrical',
        'status'         => 'completed',
        'last_accessed'  => 'Mar 15, 2026',
        'lessons_done'   => 12,
        'lessons_total'  => 12,
        'modules'        => [
            [
                'name'   => 'Module 1: Basic Arithmetic',
                'status' => 'completed',
                'lessons' => [
                    ['name' => 'Introduction to Numbers',   'status' => 'completed', 'visits' => 5, 'time' => '32 min',  'last_accessed' => 'Jan 12, 2026'],
                    ['name' => 'Addition & Subtraction',    'status' => 'completed', 'visits' => 3, 'time' => '28 min',  'last_accessed' => 'Jan 14, 2026'],
                    ['name' => 'Multiplication & Division', 'status' => 'completed', 'visits' => 4, 'time' => '45 min',  'last_accessed' => 'Jan 18, 2026'],
                    ['name' => 'Order of Operations',       'status' => 'completed', 'visits' => 2, 'time' => '20 min',  'last_accessed' => 'Jan 20, 2026'],
                ],
            ],
            [
                'name'   => 'Module 2: Fractions & Decimals',
                'status' => 'completed',
                'lessons' => [
                    ['name' => 'Understanding Fractions', 'status' => 'completed', 'visits' => 6, 'time' => '38 min', 'last_accessed' => 'Feb 2, 2026'],
                    ['name' => 'Converting Decimals',     'status' => 'completed', 'visits' => 4, 'time' => '25 min', 'last_accessed' => 'Feb 5, 2026'],
                    ['name' => 'Fraction Operations',     'status' => 'completed', 'visits' => 7, 'time' => '52 min', 'last_accessed' => 'Feb 10, 2026'],
                    ['name' => 'Mixed Numbers',           'status' => 'completed', 'visits' => 3, 'time' => '30 min', 'last_accessed' => 'Feb 14, 2026'],
                ],
            ],
            [
                'name'   => 'Module 3: Applied Electrical Math',
                'status' => 'completed',
                'lessons' => [
                    ['name' => 'Ohm\'s Law Calculations', 'status' => 'completed', 'visits' => 8, 'time' => '55 min', 'last_accessed' => 'Mar 1, 2026'],
                    ['name' => 'Circuit Math',            'status' => 'completed', 'visits' => 5, 'time' => '40 min', 'last_accessed' => 'Mar 8, 2026'],
                    ['name' => 'Power Calculations',      'status' => 'completed', 'visits' => 4, 'time' => '35 min', 'last_accessed' => 'Mar 12, 2026'],
                    ['name' => 'Final Review',            'status' => 'completed', 'visits' => 2, 'time' => '22 min', 'last_accessed' => 'Mar 15, 2026'],
                ],
            ],
        ],
    ],
    [
        'name'           => 'Safety Fundamentals',
        'status'         => 'in-progress',
        'last_accessed'  => 'Mar 18, 2026',
        'lessons_done'   => 5,
        'lessons_total'  => 8,
        'modules'        => [
            [
                'name'   => 'Module 1: Workplace Hazards',
                'status' => 'completed',
                'lessons' => [
                    ['name' => 'Identifying Hazards', 'status' => 'completed', 'visits' => 3, 'time' => '22 min', 'last_accessed' => 'Feb 20, 2026'],
                    ['name' => 'Risk Assessment',     'status' => 'completed', 'visits' => 2, 'time' => '18 min', 'last_accessed' => 'Feb 22, 2026'],
                    ['name' => 'Safety Equipment',    'status' => 'completed', 'visits' => 4, 'time' => '30 min', 'last_accessed' => 'Feb 25, 2026'],
                ],
            ],
            [
                'name'   => 'Module 2: Emergency Procedures',
                'status' => 'in-progress',
                'lessons' => [
                    ['name' => 'Fire Safety Protocols',    'status' => 'completed',   'visits' => 2, 'time' => '15 min', 'last_accessed' => 'Mar 5, 2026'],
                    ['name' => 'First Aid Basics',         'status' => 'completed',   'visits' => 3, 'time' => '28 min', 'last_accessed' => 'Mar 10, 2026'],
                    ['name' => 'Evacuation Planning',      'status' => 'in-progress', 'visits' => 1, 'time' => '8 min',  'last_accessed' => 'Mar 18, 2026'],
                    ['name' => 'Incident Reporting',       'status' => 'not-started', 'visits' => 0, 'time' => '—',      'last_accessed' => '—'],
                    ['name' => 'Emergency Communication',  'status' => 'not-started', 'visits' => 0, 'time' => '—',      'last_accessed' => '—'],
                ],
            ],
        ],
    ],
    [
        'name'           => 'Code & Standards',
        'status'         => 'not-started',
        'last_accessed'  => '—',
        'lessons_done'   => 0,
        'lessons_total'  => 6,
        'modules'        => [
            [
                'name'   => 'Module 1: National Electrical Code',
                'status' => 'not-started',
                'lessons' => [
                    ['name' => 'NEC Overview',              'status' => 'not-started', 'visits' => 0, 'time' => '—', 'last_accessed' => '—'],
                    ['name' => 'Article 210: Branch Circuits', 'status' => 'not-started', 'visits' => 0, 'time' => '—', 'last_accessed' => '—'],
                    ['name' => 'Article 250: Grounding',    'status' => 'not-started', 'visits' => 0, 'time' => '—', 'last_accessed' => '—'],
                ],
            ],
            [
                'name'   => 'Module 2: Provincial Standards',
                'status' => 'not-started',
                'lessons' => [
                    ['name' => 'BC Safety Standards',    'status' => 'not-started', 'visits' => 0, 'time' => '—', 'last_accessed' => '—'],
                    ['name' => 'Permit Requirements',    'status' => 'not-started', 'visits' => 0, 'time' => '—', 'last_accessed' => '—'],
                    ['name' => 'Inspection Procedures',  'status' => 'not-started', 'visits' => 0, 'time' => '—', 'last_accessed' => '—'],
                ],
            ],
        ],
    ],
];

// ─── Achievements Data ───
// TODO: Replace with REST API call to get user achievements
$achievements = [
    ['name' => 'Fast Learner',       'progress' => 100, 'label' => '100%', 'description' => 'Completed a course within 30 days of enrollment.',            'locked' => false],
    ['name' => 'Quiz Master',        'progress' => 80,  'label' => '80%',  'description' => 'Score 90% or higher on 8 out of 10 quizzes.',                 'locked' => false],
    ['name' => 'Consistent Learner', 'progress' => 60,  'label' => '60%',  'description' => 'Log in and complete at least one lesson for 30 consecutive days.', 'locked' => false],
    ['name' => 'Course Collector',   'progress' => 33,  'label' => '1/3',  'description' => 'Complete 3 courses in your learning path.',                    'locked' => false],
    ['name' => 'Perfect Score',      'progress' => 0,   'label' => '0%',   'description' => 'Get 100% on every quiz in a course.',                          'locked' => true],
];

$achievement_icon_url = esc_url(BYS_GROUPS_PLUGIN_URL . 'assets/img/fire.svg');
?>

<div <?= $wrapper_attributes; ?>>

    <!-- Main 2-column layout -->
    <div class="user-progress__layout">

        <!-- LEFT: Course Accordion -->
        <div class="user-progress__courses">
            <h6 class="user-progress__section-title">Course Progress Details</h6>

            <div class="hs-accordion-group">

                <?php foreach ($courses as $i => $course) :
                    $course_num = $i + 1;
                    $course_status = $course['status'];
                ?>
                <div class="hs-accordion" id="hs-course-heading-<?= $course_num; ?>">
                    <button class="hs-accordion-toggle btn-unstyled" aria-expanded="false" aria-controls="hs-course-collapse-<?= $course_num; ?>">
                        <span class="accordion-toggle__icon">
                            <i class="fa-solid fa-plus hs-accordion-active:hidden block"></i>
                            <i class="fa-solid fa-minus hs-accordion-active:block hidden"></i>
                        </span>
                        <span class="accordion-toggle__course-name"><?= esc_html($course['name']); ?></span>
                        <span class="accordion-toggle__details">
                            <span class="accordion-toggle__last-accessed"><?= esc_html($course['last_accessed']); ?></span>
                            <span class="accordion-toggle__status accordion-toggle__status--<?= esc_attr($course_status); ?>">
                                <?= $status_icons[$course_status]; ?> <?= esc_html($status_labels[$course_status]); ?>
                            </span>
                            <span class="accordion-toggle__lessons-count"><?= (int) $course['lessons_done']; ?>/<?= (int) $course['lessons_total']; ?> Lessons</span>
                        </span>
                    </button>
                    <div id="hs-course-collapse-<?= $course_num; ?>" class="hs-accordion-content hidden w-full overflow-hidden transition-[height] duration-300" role="region" aria-labelledby="hs-course-heading-<?= $course_num; ?>">
                        <div class="accordion-content__inner">

                            <?php foreach ($course['modules'] as $module) :
                                $mod_status = $module['status'];
                            ?>
                            <div class="module">
                                <div class="module__header">
                                    <span class="module__name"><?= esc_html($module['name']); ?></span>
                                    <span class="module__status module__status--<?= esc_attr($mod_status); ?>">
                                        <?= $status_icons[$mod_status]; ?>
                                    </span>
                                </div>
                                <div class="module__lessons">
                                    <table class="lessons-table">
                                        <thead>
                                            <tr>
                                                <th>Lesson</th>
                                                <th>Status</th>
                                                <th>Visits</th>
                                                <th>Time Spent</th>
                                                <th>Last Accessed</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($module['lessons'] as $lesson) :
                                                $lesson_status = $lesson['status'];
                                            ?>
                                            <tr>
                                                <td><?= esc_html($lesson['name']); ?></td>
                                                <td><span class="lesson-status lesson-status--<?= esc_attr($lesson_status); ?>"><?= $status_icons[$lesson_status]; ?></span></td>
                                                <td><?= (int) $lesson['visits']; ?></td>
                                                <td><?= esc_html($lesson['time']); ?></td>
                                                <td><?= esc_html($lesson['last_accessed']); ?></td>
                                            </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <?php endforeach; ?>

                        </div>
                    </div>
                </div>
                <?php endforeach; ?>

            </div>
        </div>

        <!-- RIGHT: Achievements -->
        <div class="user-progress__achievements">
            <h6 class="user-progress__section-title">Achievements</h6>

            <div class="achievements__list">

                <?php foreach ($achievements as $achievement) :
                    $is_locked = $achievement['locked'];
                ?>
                <div class="achievement">
                    <div class="achievement__icon<?= $is_locked ? ' achievement__icon--locked' : ''; ?>">
                        <img src="<?= $achievement_icon_url; ?>" alt="fire" />
                    </div>
                    <div class="achievement__content">
                        <h4 class="achievement__name<?= $is_locked ? ' achievement__name--locked' : ''; ?>"><?= esc_html($achievement['name']); ?></h4>
                        <div class="achievement__progress">
                            <div class="achievement__progress-bar">
                                <div class="achievement__progress-fill" style="width: <?= (int) $achievement['progress']; ?>%;"></div>
                            </div>
                            <span class="achievement__progress-label"><?= esc_html($achievement['label']); ?></span>
                        </div>
                        <p class="achievement__description"><?= esc_html($achievement['description']); ?></p>
                    </div>
                </div>
                <?php endforeach; ?>

            </div>
        </div>

    </div>

</div>