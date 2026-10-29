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
    <div class="archived-groups__header">
        <h5 class="archived-groups__title"><?php esc_html_e( 'Archived Groups', 'bys' ); ?></h5>
        <p class="archived-groups__description"><?php esc_html_e( 'These groups are locked in their archived state. Unarchive to restore full access and activity tracking.', 'bys' ); ?></p>
    </div>
    <div class="archived-groups__list" aria-live="polite">
        <div class="archived-groups__loading">
            <span><?php esc_html_e( 'Loading archived groups…', 'bys' ); ?></span>
        </div>
    </div>
</div>
