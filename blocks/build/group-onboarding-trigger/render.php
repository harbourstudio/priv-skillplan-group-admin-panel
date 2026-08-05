<?php
if ( ! is_user_logged_in() ) return;

$wrapper_attributes = get_block_wrapper_attributes();
?>
<div <?= $wrapper_attributes; ?>>
    <button class="gom__preview-trigger btn-unstyled" type="button" title="<?php esc_attr_e( 'View tutorial', 'bys' ); ?>">
        <i class="fa-solid fa-circle-info"></i>
        <?php esc_html_e( 'Tutorial', 'bys' ); ?>
    </button>
</div>
