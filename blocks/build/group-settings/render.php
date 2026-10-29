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
    <div class="group-settings__card">
        <h5 class="group-settings__title"><?php esc_html_e( 'Rename Group', 'bys' ); ?></h5>
        <p class="group-settings__description"><?php esc_html_e( 'Change the display name of the currently selected group.', 'bys' ); ?></p>
        <div class="group-settings__field">
            <input
                class="group-settings__input"
                type="text"
                placeholder="<?php esc_attr_e( 'Group name…', 'bys' ); ?>"
                maxlength="200"
                disabled
            />
            <button class="group-settings__submit btn-unstyled" type="button" disabled>
                <?php esc_html_e( 'Save', 'bys' ); ?>
            </button>
        </div>
        <p class="group-settings__message" style="display:none;"></p>
        <p class="group-settings__notice" style="display:none;">
            <?php esc_html_e( 'Only organization admins can rename a group.', 'bys' ); ?>
        </p>
    </div>
</div>
