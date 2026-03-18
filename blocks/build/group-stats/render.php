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
    <h3>Quick Stats</h3>
    <div class="stats__grid">
        <div class="stat__box">
            <div class="stat__icon">
                <img src="<?= esc_url(BYS_GROUPS_PLUGIN_URL . 'assets/img/fire.svg'); ?>" alt="fire" />
            </div>
            <div class="stat__text">
                <span class="stat__number">
                    16
                </span>
                <span class="stat__label">
                    Total Participants
                </span>
            </div>
        </div>
        <div class="stat__box">
            <div class="stat__icon">
                <img src="<?= esc_url(BYS_GROUPS_PLUGIN_URL . 'assets/img/check-seal.svg'); ?>" alt="fire" />
            </div>
            <div class="stat__text">
                <span class="stat__number">
                    16
                </span>
                <span class="stat__label">
                    Completed Courses
                </span>
            </div>
        </div>
        <div class="stat__box">
            <div class="stat__icon">
                <img src="<?= esc_url(BYS_GROUPS_PLUGIN_URL . 'assets/img/fire.svg'); ?>" alt="fire" />
            </div>
            <div class="stat__text">
                <span class="stat__number">
                    16
                </span>
                <span class="stat__label">
                    Incomplete Courses
                </span>
            </div>
        </div>
        <div class="stat__box">
            <div class="stat__icon">
                <img src="<?= esc_url(BYS_GROUPS_PLUGIN_URL . 'assets/img/fire.svg'); ?>" alt="fire" />
            </div>
            <div class="stat__text">
                <span class="stat__number">
                    16
                </span>
                <span class="stat__label">
                    Inactive Participants
                </span>
            </div>
        </div>
    </div>
</div>