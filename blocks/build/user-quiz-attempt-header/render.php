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

    <div class="attempt-header__loading" aria-hidden="true">
        <!-- Row 1 skeleton: title + badges -->
        <div class="attempt-header__row attempt-header__row--primary">
            <div class="skel skel--title"></div>
            <div class="attempt-header__badges">
                <div class="skel skel--badge"></div>
                <div class="skel skel--badge skel--badge-wide"></div>
            </div>
        </div>
        <!-- Row 2 skeleton: meta items -->
        <div class="attempt-header__row attempt-header__row--meta">
            <div class="skel skel--meta"></div>
            <div class="skel skel--meta skel--meta-short"></div>
            <div class="skel skel--meta"></div>
            <div class="skel skel--meta skel--meta-short"></div>
            <div class="skel skel--meta skel--meta-short"></div>
            <div class="skel skel--meta skel--meta-short"></div>
        </div>
    </div>

    <div class="attempt-header__content hidden">

        <!-- Row 1: Quiz title · status badge · score -->
        <div class="attempt-header__row attempt-header__row--primary">
            <h1 class="attempt-header__quiz-title"></h1>
            <div class="attempt-header__badges">
                <span class="status-badge attempt-header__badge"></span>
                <span class="attempt-header__score"></span>
            </div>
        </div>

        <!-- Row 2: Meta details -->
        <div class="attempt-header__row attempt-header__row--meta">
            <span class="attempt-header__meta-item">
                <i class="fa-solid fa-user" aria-hidden="true"></i>
                <span class="attempt-header__user-name"></span>
            </span>
            <span class="attempt-header__meta-item">
                <i class="fa-solid fa-list-ol" aria-hidden="true"></i>
                <span class="attempt-header__attempt-number"></span>
            </span>
            <span class="attempt-header__meta-item">
                <i class="fa-solid fa-calendar-check" aria-hidden="true"></i>
                <span class="attempt-header__submitted"></span>
            </span>
            <span class="attempt-header__meta-item">
                <i class="fa-solid fa-play" aria-hidden="true"></i>
                <span class="attempt-header__start-time"></span>
            </span>
            <span class="attempt-header__meta-item">
                <i class="fa-solid fa-flag-checkered" aria-hidden="true"></i>
                <span class="attempt-header__end-time"></span>
            </span>
            <span class="attempt-header__meta-item">
                <i class="fa-solid fa-stopwatch" aria-hidden="true"></i>
                <span class="attempt-header__timespent"></span>
            </span>
        </div>

    </div>

    <div class="attempt-header__error hidden">
        <?php esc_html_e('Failed to load attempt data.', 'bys'); ?>
    </div>

</div>
