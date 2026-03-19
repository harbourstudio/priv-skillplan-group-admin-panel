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

// ─── User Data ───
// TODO: Replace with REST API call to get user data
$user = [
    'name'         => 'John Smith',
    'email'        => 'john.smith@email.com',
    'avatar'       => 'https://i.pravatar.cc/80?u=janesmith',
    'enrolled'     => 'Oct 1, 2026',
    'last_active'  => 'Mar 18, 2026',
    'status'       => 'active', // active | inactive
];
?>

<div <?= $wrapper_attributes; ?>>

    <div class="user-progress__header">
        <div class="user-progress__avatar">
            <img src="<?= esc_url($user['avatar']); ?>" alt="<?= esc_attr($user['name']); ?>" />
        </div>
        <div class="user-progress__user-info">
            <h1 class="user-progress__name"><?= esc_html($user['name']); ?></h1>
            <div class="user-progress__meta">
                <span class="user-progress__email"><?= esc_html($user['email']); ?></span>
                <span class="user-progress__meta-item">
                    <i class="fa-solid fa-calendar"></i> Enrolled: <?= esc_html($user['enrolled']); ?>
                </span>
                <span class="user-progress__meta-item">
                    <i class="fa-solid fa-clock"></i> Last Active: <?= esc_html($user['last_active']); ?>
                </span>
                <span class="user-progress__meta-item user-progress__meta-item--<?= esc_attr($user['status']); ?>">
                    <i class="fa-solid fa-circle"></i> <?= esc_html(ucfirst($user['status'])); ?>
                </span>
            </div>
        </div>
    </div>

</div>