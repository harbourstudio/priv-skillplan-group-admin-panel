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
    <h5 class="pending-enrolments__title"><?php esc_html_e( 'Pending enrolments', 'bys' ); ?></h5>
    <div class="pending-enrolments__card">
        <div class="pending-enrolments__skeleton">
            <?php foreach ( [ 180, 220, 160 ] as $w ) : ?>
            <div class="pending-enrolments__skeleton-row">
                <span class="skeleton-text" style="width:<?php echo $w; ?>px"></span>
                <span class="skeleton-btn" style="width:60px"></span>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="pending-enrolments__list" style="display:none;"></div>
        <p class="pending-enrolments__empty" style="display:none;">
            <?php esc_html_e( 'No pending enrolments.', 'bys' ); ?>
        </p>
        <button class="pending-enrolments__show-more btn-unstyled" style="display:none;" type="button">
            <?php esc_html_e( 'Show More', 'bys' ); ?>
        </button>
    </div>
</div>
