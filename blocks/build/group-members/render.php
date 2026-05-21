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
    <div class="gm__header">
        <h5><?php esc_html_e( 'Group Members', 'bys' ); ?></h5>
        <p class="gm__count">
            <div class="skeleton" role="status" aria-busy="true" aria-live="polite" style="width: 18.75rem;"></div>
        </p>
    </div>
    <div class="gm__card">
        <div class="gm__skeleton">
            <?php foreach ( [ [140, 180], [110, 200], [160, 170] ] as [$nw, $ew] ) : ?>
            <div class="gm__item" role="status" aria-busy="true" aria-live="polite">
                <span class="skeleton-circular"></span>
                <div class="skeletons">
                    <span class="skeleton" style="width: <?php echo $nw; ?>px"></span>
                    <span class="skeleton" style="width: <?php echo $ew; ?>px"></span>
                </div>
                <span class="skeleton-btn"></span>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="gm__list"></div>
        <button class="gm__show-more btn-unstyled" type="button" style="display:none;"></button>
    </div>
</div>
