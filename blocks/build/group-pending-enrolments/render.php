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
    <h5 class="gpe__title"><?php esc_html_e( 'Pending Enrolments', 'bys' ); ?></h5>
    <div class="gpe__card">
        <div class="gpe__skeleton">
            <?php foreach ( [ 180, 220, 160 ] as $w ) : ?>
            <div class="gpe__skeleton-row">
                <span class="skeleton" style="width:<?php echo $w; ?>px"></span>
                <div class="gpe__skeleton-meta">
                    <span class="skeleton" style="width:64px;"></span>
                    <span class="skeleton" style="width:48px;"></span>
                    <span class="skeleton-circular" style="width:16px; height: 16px;"></span>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="gpe__list" style="display:none;"></div>
        <p class="gpe__empty" style="display:none;">
            <?php esc_html_e( 'No pending enrolments.', 'bys' ); ?>
        </p>
        <button class="gpe__show-more btn-unstyled" style="display:none;" type="button">
            <?php esc_html_e( 'Show More', 'bys' ); ?>
        </button>
    </div>
</div>
