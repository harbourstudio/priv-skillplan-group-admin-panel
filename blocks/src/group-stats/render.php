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
		'alt'  => 'participants',
		'stat' => 'total_members',
		'label' => 'Total Participants',
	],
	[
		'icon' => 'check-seal.svg',
		'alt'  => 'completed',
		'stat' => 'completed_courses',
		'label' => 'Completed Courses',
	],
	[
		'icon' => 'fire.svg',
		'alt'  => 'incomplete',
		'stat' => 'incomplete_courses',
		'label' => 'Incomplete Courses',
	],
	[
		'icon' => 'fire.svg',
		'alt'  => 'inactive',
		'stat' => 'total_inactive_members',
		'label' => 'Inactive Participants',
	],
];

$wrapper_attributes = get_block_wrapper_attributes();
?>

<div <?php echo $wrapper_attributes; ?>>
	<h3><?php echo esc_html('Quick Stats', 'bys'); ?></h3>
	<div class="stats__grid">
		<?php foreach ( $stats as $stat ) : ?>
			<div class="stat__box">
				<div class="stat__icon">
					<img src="<?php echo esc_url( BYS_GROUPS_PLUGIN_URL . 'assets/img/' . $stat['icon'] ); ?>" alt="<?php echo esc_attr( $stat['alt'] ); ?>" />
				</div>
				<div class="stat__text">
					<span class="stat__number stat__number--loading" data-bys-stat="<?php echo esc_attr( $stat['stat'] ); ?>"></span>
					<span class="stat__label"><?php echo esc_html( $stat['label'] ); ?></span>
				</div>
			</div>
		<?php endforeach; ?>
	</div>
</div>