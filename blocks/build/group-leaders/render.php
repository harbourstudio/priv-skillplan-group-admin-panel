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
    <div class="gl__card">
        <div class="gl__header">
            <h5><?php esc_html_e( 'Group Leaders', 'bys' ); ?></h5>
            <p class="gl__description"><?php esc_html_e( 'Group leaders can view reports and progress for all members in this cohort.', 'bys' ); ?></p>
            <p class="gl__note-permission" style="display:none;">
                <?php esc_html_e( 'Only organization admins can add or remove group leaders.', 'bys' ); ?>
            </p>
        </div>
        <div class="gl__skeleton">
            <?php foreach ( [ 90, 120, 75 ] as $tw ) : ?>
            <div class="skeleton-pill">
                <span class="skeleton-circular" style="width: 1.5rem; height: 1.5rem;"></span>
                <span class="skeleton" style="width: <?php echo $tw; ?>px"></span>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="gl__list"></div>
        <p class="gl__message" style="display:none;"></p>

        <!-- Template lives outside .gl__list so $list.empty() can't wipe it. -->
        <template id="gl__template-leader">
            <div class="gl__item" data-user-id="">
                <div class="gl__avatar"></div>
                <span class="gl__name"></span>
                <button class="gl__remove btn-unstyled" type="button" aria-label=""></button>
            </div>
        </template>
    </div>
</div>
