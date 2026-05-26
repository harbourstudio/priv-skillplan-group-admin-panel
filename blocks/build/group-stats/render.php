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
	<h3><?php esc_html_e('Quick Stats', 'bys'); ?></h3>
	
	<div class="group-stats__grid">
		<?php foreach ($stats as $stat) : ?>
			<div class="group-stats__box">
				<div class="group-stats__icon">
					<img src="<?php echo esc_url( BYS_GROUPS_PLUGIN_URL . 'assets/img/' . $stat['icon'] ); ?>" alt="<?php echo esc_attr( $stat['alt'] ); ?>" />
				</div>
				<div class="group-stats__content">
					<span class="group-stats__number-wrapper">
						<span class="skeleton" role="status" aria-busy="true" aria-live="polite" aria-label="Loading"></span>
						<span class="group-stats__number <?php echo esc_attr( $stat['stat'] ); ?>"></span>
					</span>
					<span class="group-stats__label"><?php echo esc_html( $stat['label'] ); ?></span>
				</div>
			</div>
		<?php endforeach; ?>
	</div>
</div>