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
    <div class="user-info__header">
        <div class="user-info__avatar">
            <img class="user-avatar" src="" alt="" />
        </div>
        <div class="user-info__user-info">
            <h1 class="user-info__name user-name"></h1>
            <ul class="user-info__meta">
                <li class="user-info__meta-item user-email"></li>
                <li class="user-info__meta-item">
                    <i class="fa-solid fa-calendar"></i> Enrolled: <span class="user-enrolled-date"></span>
                </li>
                <li class="user-info__meta-item">
                    <i class="fa-solid fa-clock"></i> Last Active: <span class="user-last-login-date"></span>
                </li>
                <li class="user-info__meta-item user-info__meta-status">
                    <i class="fa-solid fa-circle"></i> <span class="user-status-text"></span>
                </li>
            </ul>
        </div>
    </div>
</div>