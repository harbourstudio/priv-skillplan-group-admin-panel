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

// Get validated auth header for client-side API requests
require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/auth.php';
$auth_header = BYS_Groups_Auth::get_auth_header();

?>

<script>
	window.bysGroupsAuth = {
		header: '<?php echo esc_js( $auth_header ); ?>'
	};
</script>

<div <?= $wrapper_attributes; ?>>

    <div class="user-progress__courses">
        <h6 class="user-progress__section-title">Course Progress Details</h6>

        <!-- Mount target: JS will populate with courses -->
        <div class="hs-accordion-group" id="user-progress-courses-list"></div>

        <!-- Template: Course accordion item -->
        <template id="user-progress-course-template">
            <div class="hs-accordion">
                <button class="hs-accordion-toggle btn-unstyled" aria-expanded="false">
                    <span class="accordion-toggle__icon">
                        <i class="fa-solid fa-plus hs-accordion-active:hidden block"></i>
                        <i class="fa-solid fa-minus hs-accordion-active:block hidden"></i>
                    </span>
                    <span class="accordion-toggle__course-name"></span>
                </button>
                <div class="hs-accordion-content hidden w-full overflow-hidden transition-[height] duration-300" role="region">
                    <div class="accordion-content__inner"></div>
                </div>
            </div>
        </template>

        <!-- Template: Lesson (module) section -->
        <template id="user-progress-lesson-template">
            <div class="module">
                <div class="module__header">
                    <span class="module__name"></span>
                </div>
                <div class="module__lessons">
                    <table class="lessons-table">
                        <thead>
                            <tr>
                                <th>Lesson</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </template>

        <!-- Template: Topic row -->
        <template id="user-progress-topic-template">
            <tr>
                <td class="topic-name"></td>
            </tr>
        </template>

    </div>

    <div class="user-progress__achievements">
        <h6 class="user-progress__section-title">Achievements</h6>
        <div class="achievements__list"></div>
    </div>
</div>