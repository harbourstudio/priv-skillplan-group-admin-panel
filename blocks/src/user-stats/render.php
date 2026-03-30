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

$wrapper_attributes = get_block_wrapper_attributes([
    // 'data-priority' => esc_attr($priority),
]);
?>

<div <?= $wrapper_attributes; ?>>
    <h3><?php esc_html_e('Quick Stats', 'bys'); ?></h3>
    <div class="stats__grid">
        <?php foreach ($stats as $stat) : ?>
			<div class="stat__box">
				<div class="stat__icon">
					<img src="<?php echo esc_url( BYS_GROUPS_PLUGIN_URL . 'assets/img/' . $stat['icon'] ); ?>" alt="<?php echo esc_attr( $stat['alt'] ); ?>" />
				</div>
				<div class="stat__content">
					<span class="stat__number stat__number--loading" data-bys-stat="<?php echo esc_attr( $stat['stat'] ); ?>"></span>
					<span class="stat__label"><?php esc_html_e( $stat['label'] ); ?></span>
				</div>
			</div>
		<?php endforeach; ?>
	</div>
</div>