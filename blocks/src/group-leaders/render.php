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
    <div class="group-leaders__card">
        <div class="group-leaders__header">
            <h5 class="group-leaders__title"><?php esc_html_e( 'Group leaders', 'bys' ); ?></h5>
            <p class="group-leaders__description"><?php esc_html_e( 'Group leaders can view reports and progress for all members in this cohort. Members only see their own learning.', 'bys' ); ?></p>
        </div>
        <div class="group-leaders__skeleton">
            <?php foreach ( [ 90, 120, 75, 110, 85 ] as $tw ) : ?>
            <div class="skeleton-leader-pill">
                <span class="skeleton-avatar-sm"></span>
                <span class="skeleton-text" style="width: <?php echo $tw; ?>px"></span>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="group-leaders__list"></div>
        <p class="group-leaders__empty" style="display:none;"></p>
    </div>
</div>
