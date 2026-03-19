<?php
$attrs = ['blockId', 'selectedGroup'];
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
    'data-wp-interactive' => 'bys-groups',
    'data-wp-init' => 'actions.initGroups'
]);

?>
<div <?= $wrapper_attributes; ?>>
    <div class="group-selector">
        <div data-wp-show="state.loading">
            <p>Loading groups...</p>
        </div>

        <div data-wp-show="state.error">
            <p data-wp-text="state.error"></p>
        </div>

        <div data-wp-show="!state.loading && !state.error">
            <select
                id="group-select"
                class="group-selector__select"
                name="group"
                data-wp-on--change="actions.selectGroup"
            >
                <option value="">Select a Group</option>
            </select>
            <button class="group-selector__button" type="button">
                Show Group
            </button>
        </div>
    </div>
</div>
