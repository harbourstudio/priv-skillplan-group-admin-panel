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
    <div class="gcc__header">
        <h5><?php esc_html_e( 'Course configurations', 'bys' ); ?></h5>
        <p class="gcc__subtitle"><?php esc_html_e( 'Set required and optional courses for this cohort.', 'bys' ); ?></p>
    </div>

    <div class="gcc__add">
        <div class="gcc__search-wrap">
            <input
                type="text"
                class="gcc__search"
                placeholder="<?php esc_attr_e( 'Search courses to add...', 'bys' ); ?>"
                autocomplete="off"
                aria-label="<?php esc_attr_e( 'Search courses', 'bys' ); ?>"
            />
            <ul class="gcc__suggestions hidden" role="listbox"></ul>
        </div>
        <button class="gcc__add-btn btn-unstyled" type="button" disabled>
            <?php esc_html_e( 'Add', 'bys' ); ?>
        </button>
    </div>

    <div class="gcc__card">
        <div class="gcc__skeleton">
            <?php foreach ( [ 200, 150, 230 ] as $w ) : ?>
            <div class="skeleton-row">
                <span class="skeleton" style="width: <?php echo $w; ?>px"></span>
                <div class="skeleton-row-right">
                    <span class="skeleton" style="width: 3.4375rem"></span>
                    <span class="skeleton skeleton--pill"></span>
                    <span class="skeleton skeleton--btn" style="width:1rem;height:1rem;"></span>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <div class="gcc__list"></div>

        <p class="gcc__message" style="display:none;"></p>

        <!-- Template for course rows -->
        <template id="gcc__template-item">
            <div class="gcc__item" data-course-id="">
                <span class="gcc__name"></span>
                <div class="gcc__toggle-wrap">
                    <span class="gcc__toggle-label"></span>
                    <label class="gcc__toggle">
                        <input type="checkbox" />
                        <span class="gcc__slider"></span>
                    </label>
                </div>
                <button class="gcc__remove btn-unstyled" type="button" aria-label="Remove course">&#x2715;</button>
            </div>
        </template>

        <!-- Template for autocomplete suggestion rows -->
        <template id="gcc__template-suggestion">
            <li class="gcc__suggestion" role="option" data-course-id="" data-course-title=""></li>
        </template>
    </div>
</div>
