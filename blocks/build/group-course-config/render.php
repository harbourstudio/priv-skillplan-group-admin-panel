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
    <div class="course-config__header">
        <h5 class="course-config__title"><?php esc_html_e( 'Course configurations', 'bys' ); ?></h5>
        <p class="course-config__subtitle"><?php esc_html_e( 'Set required and optional courses for this cohort.', 'bys' ); ?></p>
    </div>
    <div class="course-config__add">
        <div class="course-config__search-wrap">
            <input
                type="text"
                class="course-config__search"
                placeholder="<?php esc_attr_e( 'Search courses to add...', 'bys' ); ?>"
                autocomplete="off"
                aria-label="<?php esc_attr_e( 'Search courses', 'bys' ); ?>"
            />
            <ul class="course-config__suggestions hidden" role="listbox"></ul>
        </div>
        <button class="course-config__add-btn btn-unstyled" type="button" disabled>
            <?php esc_html_e( 'Add', 'bys' ); ?>
        </button>
    </div>

    <div class="course-config__card">
        <div class="course-config__skeleton">
            <?php foreach ( [ 200, 150, 230 ] as $w ) : ?>
            <div class="skeleton-course-row">
                <span class="skeleton-text" style="width: <?php echo $w; ?>px"></span>
                <div class="skeleton-course-row__right">
                    <span class="skeleton-text" style="width: 55px"></span>
                    <span class="skeleton-toggle-pill"></span>
                </div>
                <span class="skeleton-btn"></span>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="course-config__list"></div>
        <p class="course-config__empty" style="display:none;"></p>
    </div>
</div>
