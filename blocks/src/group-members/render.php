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
    <div class="group-members__header">
        <h5 class="group-members__title"><?php esc_html_e( 'Group Members', 'bys' ); ?></h5>
        <p class="group-members__count">
            <span class="skeleton-text" style="width: 140px;" aria-hidden="true"></span>
        </p>
    </div>
    <div class="group-members__card">
        <div class="group-members__skeleton">
            <?php foreach ( [ [140, 180], [110, 200], [160, 170], [120, 190], [150, 160] ] as [$nw, $ew] ) : ?>
            <div class="skeleton-member-row">
                <span class="skeleton-avatar"></span>
                <div class="skeleton-info">
                    <span class="skeleton-text" style="width: <?php echo $nw; ?>px"></span>
                    <span class="skeleton-text" style="width: <?php echo $ew; ?>px"></span>
                </div>
                <span class="skeleton-btn"></span>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="group-members__list"></div>
        <button class="group-members__show-more btn-unstyled" type="button" style="display:none;"></button>
    </div>
</div>
