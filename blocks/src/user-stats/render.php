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

// Extract URL parameters
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
$group_id = isset($_GET['group_id']) ? intval($_GET['group_id']) : 0;

// Server-side stats calculation
$server_stats = [];

if ($user_id) {
    // total_logins - from user meta
    $server_stats['total_logins'] = intval(get_user_meta($user_id, 'my_user_count', true) ?: 0);

    // total_time — Uncanny Owl shortcode
    $time_string = trim(do_shortcode("[uo_time_total user-id=\"{$user_id}\"]"));
    $server_stats['total_time'] = '0h 0m';
    if (preg_match('/^(\d+):(\d{2}):\d{2}$/', $time_string, $m)) {
        $server_stats['total_time'] = "{$m[1]}h {$m[2]}m";
    }

    // total_courses - total enrolled courses (published only)
    if (function_exists('learndash_user_get_enrolled_courses')) {
        $enrolled_courses = learndash_user_get_enrolled_courses($user_id, [], false);
        if (is_array($enrolled_courses)) {
            $published_count = array_reduce($enrolled_courses, function($count, $course_id) {
                return get_post_status($course_id) === 'publish' ? $count + 1 : $count;
            }, 0);
            $server_stats['total_courses'] = $published_count;
        }
    }

    // required_courses - total count of required courses assigned to the group
    if ($group_id && class_exists('BYS_Required_Courses')) {
        $required_ids = (array) get_post_meta($group_id, \BYS_Required_Courses::META_KEY, true);
        $server_stats['required_courses'] = count($required_ids);
    }
}

$stats = [
    [
        'icon' => 'fire.svg',
        'alt'  => 'required courses',
        'stat' => 'required_courses',
        'label' => 'Required Courses',
    ],
    [
        'icon' => 'check-seal.svg',
        'alt'  => 'total courses',
        'stat' => 'total_courses',
        'label' => 'Total Courses',
    ],
    [
        'icon' => 'fire.svg',
        'alt'  => 'logins',
        'stat' => 'total_logins',
        'label' => 'Logins',
    ],
    [
        'icon' => 'fire.svg',
        'alt'  => 'total time',
        'stat' => 'total_time',
        'label' => 'Total Time',
    ],
    [
        'icon' => 'fire.svg',
        'alt'  => 'total topics completed',
        'stat' => 'total_topics_completed',
        'label' => 'Lessons Completed',
    ],
    [
        'icon' => 'fire.svg',
        'alt'  => 'total quizzes completed',
        'stat' => 'total_quizzes_completed',
        'label' => 'Quizzes Completed',
    ],
];

$wrapper_attributes = get_block_wrapper_attributes();
?>

<script type="application/json" data-bys-block="user-stats">
<?php echo json_encode($server_stats); ?>
</script>

<div <?php echo wp_kses_post($wrapper_attributes); ?>>
    <h3><?php esc_html_e('Quick Stats', 'bys'); ?></h3>
    <div class="stats__grid">
        <?php foreach ($stats as $stat) : ?>
            <div class="stat__box">
                <div class="stat__icon">
                    <img src="<?php echo esc_url(BYS_GROUPS_PLUGIN_URL . 'assets/img/' . $stat['icon']); ?>" alt="<?php echo esc_attr($stat['alt']); ?>" />
                </div>
                <div class="stat__content">
                    <span class="stat__number stat__number--loading" data-bys-stat="<?php echo esc_attr($stat['stat']); ?>"></span>
                    <span class="stat__label"><?php echo esc_html($stat['label']); ?></span>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>