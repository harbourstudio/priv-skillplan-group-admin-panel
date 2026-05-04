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
    <h5 class="gcl__title"><?php esc_html_e('Sent message log', 'bys'); ?></h5>

    <div class="gcl__card">
        <div class="gcl__list">
            <?php for ($i = 0; $i < 3; $i++ ) : ?>
            <div class="gcl__item">
                <span class="gcl__date skeleton"></span>
                <span class="gcl__label skeleton"></span>
                <span class="gcl__badge skeleton"></span>
            </div>
            <?php endfor; ?>
        </div>
    </div>

    <!-- Template for button instance -->
    <template id="gcl-item-template">
        <button class="gcl__item btn-unstyled" data-opens-modal="#communication-history-modal">
            <span class="gcl__date"></span>
            <span class="gcl__label"></span>
            <span class="gcl__badge"></span>
        </button>
    </template>
</div>
