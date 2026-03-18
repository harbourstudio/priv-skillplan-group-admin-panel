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

    <nav class="tab-nav" role="tablist" aria-label="User Detail Navigation">
        <button
            class="tab-nav__item tab-nav__item--active btn-unstyled"
            role="tab"
            aria-selected="true"
            aria-controls="panel-user-progress"
            id="tab-user-progress"
            type="button"
        >
            User Progress
        </button>
        <button
            class="tab-nav__item btn-unstyled"
            role="tab"
            aria-selected="false"
            aria-controls="panel-quiz-details"
            id="tab-quiz-details"
            type="button"
            tabindex="-1"
        >
            Quiz Details
        </button>
        <button
            class="tab-nav__item btn-unstyled"
            role="tab"
            aria-selected="false"
            aria-controls="panel-user-activity"
            id="tab-user-activity"
            type="button"
            tabindex="-1"
        >
            User Activity
        </button>
    </nav>

    <div class="tab-panels">
        <div
            class="tab-panel"
            role="tabpanel"
            id="panel-user-progress"
            aria-labelledby="tab-user-progress"
        >
            User Progress content
        </div>
        <div
            class="tab-panel tab-panel--hidden"
            role="tabpanel"
            id="panel-quiz-details"
            aria-labelledby="tab-quiz-details"
            hidden
        >
            Quiz Details content
        </div>
        <div
            class="tab-panel tab-panel--hidden"
            role="tabpanel"
            id="panel-user-activity"
            aria-labelledby="tab-user-activity"
            hidden
        >
            User Activity content
        </div>
    </div>

</div>