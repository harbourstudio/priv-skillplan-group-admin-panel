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
            <span class="gm__count-val"></span><?php esc_html_e(' members - sorted by date added','bys'); ?> 
        </p>
    </div>

    <div class="gm__card">
        <div class="gm__skeleton">
            <?php foreach ( [ [140, 180], [110, 200], [160, 170], [140,180], [160, 170] ] as [$nw, $ew] ) : ?>
            <div class="gm__item" role="status" aria-busy="true" aria-live="polite">
                <span class="skeleton-circular"></span>
                <div class="skeletons">
                    <span class="skeleton" style="width: <?php echo $nw; ?>px"></span>
                    <span class="skeleton" style="width: <?php echo $ew; ?>px"></span>
                </div>
                <span class="skeleton-circular" style="width:24px;height:24px;"></span>
            </div>
            <?php endforeach; ?>
        </div>

        <div class="gm__list"></div>

        <p class="gm__message" style="display:none;"></p>

        <button class="gm__show-more btn-unstyled" type="button" style="display:none;">
            <?php esc_html_e( 'Show More', 'bys' ); ?>
        </button>

        <!-- Template for group member rows -->
        <template id="gm__template-member">
            <div class="gm__item" data-user-id="">
                <div class="gm__avatar"></div>
                <div class="gm__info">
                    <span class="gm__name"></span>
                    <span class="gm__email"></span>
                    <span class="gm__enable-comms"><?php esc_html_e('Group communications: Off', 'bys'); ?></span>
                </div>
                <button class="gm__remove btn-unstyled" type="button" aria-label=""></button>
            </div>
        </template>
    </div>
</div>
