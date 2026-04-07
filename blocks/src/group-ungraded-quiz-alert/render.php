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

    <div class="ungraded-alert hidden" id="ungraded-quiz-alert" role="alert">
        <i class="fa-solid fa-circle-exclamation ungraded-alert__icon" aria-hidden="true"></i>
        <span class="ungraded-alert__text">
            <span class="ungraded-alert__count"></span>
            <?php esc_html_e( 'quiz submissions still require manual grading', 'bys' ); ?>
        </span>
        <button type="button" class="ungraded-alert__btn btn-unstyled">
            <?php esc_html_e( 'See all', 'bys' ); ?>
        </button>
    </div>

</div>
