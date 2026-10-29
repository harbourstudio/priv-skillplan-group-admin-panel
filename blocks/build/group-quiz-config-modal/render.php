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
        id="quiz-attempts-modal"
        class="quiz-attempts-modal hs-overlay hidden"
        role="dialog"
        tabindex="-1"
        aria-labelledby="quiz-attempts-modal-title"
        aria-modal="true"
    >
        <div class="modal-backdrop"></div>

        <div class="modal__inner">
            <div class="modal__header">
                <div class="modal__header-titles">
                    <h4 class="quiz-title" id="quiz-attempts-modal-title"><?php esc_html_e( '&nbsp;', 'bys' ); ?></h4>
                    <p class="quiz-meta">&nbsp;</p>
                </div>
                <button class="modal__close btn-unstyled" aria-label="<?php esc_attr_e( 'Close', 'bys' ); ?>">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="modal__body"></div>
        </div>
    </div>
</div>
