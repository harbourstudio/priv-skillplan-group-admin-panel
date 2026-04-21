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
    <div
        id="add-member-modal"
        class="add-member-modal hs-overlay hidden"
        role="dialog"
        tabindex="-1"
        aria-labelledby="add-member-modal-label"
        aria-modal="true"
    >
        <div class="modal-backdrop"></div>
        <div class="modal__inner">
            <div class="modal__header">
                <h4 class="modal__title" id="add-member-modal-label"><?php esc_html_e( 'Bulk Upload Members', 'bys' ); ?></h4>
                <button class="modal__close btn-unstyled" type="button" aria-label="<?php esc_attr_e( 'Close', 'bys' ); ?>">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="modal__body">
                <p class="upload__intro">
                    <?php esc_html_e( 'First, ', 'bys' ); ?><a href="#" class="upload__template-link"><?php esc_html_e( 'download the CSV template', 'bys' ); ?></a><?php esc_html_e( ' to populate.', 'bys' ); ?>
                </p>
                <div class="upload__dropzone">
                    <button class="upload__csv-btn btn-unstyled" type="button">
                        <?php esc_html_e( 'Upload CSV', 'bys' ); ?>
                    </button>
                    <input type="file" accept=".csv" class="upload__input" style="display:none;" />
                </div>
                <button class="upload__review-btn btn-unstyled" type="button" disabled>
                    <?php esc_html_e( 'Review Results', 'bys' ); ?>
                </button>
            </div>
        </div>
    </div>
</div>
