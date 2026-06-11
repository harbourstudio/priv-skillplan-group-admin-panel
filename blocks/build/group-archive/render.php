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
    <div class="group-archive__card">
        <h5 class="group-archive__title"><?php esc_html_e( 'Archive Group', 'bys' ); ?></h5>
        <p class="group-archive__description"><?php esc_html_e( 'Lock group in current state. New members and new activity will not be populated into administrator dashboard for archived groups.', 'bys' ); ?></p>
        <button class="group-archive__button" type="button" disabled>
            <?php esc_html_e( 'Archive Group', 'bys' ); ?>
        </button>
        <p class="group-archive__notice" style="display:none;">
            <?php esc_html_e( 'Only organization admins can archive a group.', 'bys' ); ?>
        </p>
    </div>
</div>
