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

$wrapper_attributes = get_block_wrapper_attributes([
    // 'data-priority' => esc_attr($priority),
]);
?>

<div <?= $wrapper_attributes; ?>>
    <div class="section__row">
        <div class="section__col section__col__details">
            <h6>Course Progress Details</h6>
            <div class="section__col__card details__accordion">
                Accordion here
            </div>
        </div>
        <div class="section__col section__col__details">
            <h6>Acheivements</h6>
            <div class="section__col__card details__achievements">
                List here
            </div>
        </div>
    </div>
</div>