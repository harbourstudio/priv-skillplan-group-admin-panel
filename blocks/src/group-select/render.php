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
    'data-wp-interactive' => 'bys-groups'
]);

?>
<div <?= $wrapper_attributes; ?>>
    <div class="group-selector" data-wp-init="actions.initGroups">
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
                data-wp-bind--value="state.selectedGroup"
                data-wp-on--change="actions.selectGroup"
            >
                <option value="">Select a Group</option>
                <template data-wp-each--group="state.groups">
                    <option
                        data-wp-bind--value="group.id"
                        data-wp-bind--selected="state.selectedGroup === group.id"
                    >
                        <span data-wp-text="group.title"></span>
                    </option>
                </template>
            </select>
            <button class="group-selector__button" type="button">
                Show Group
            </button>
        </div>
    </div>
</div>
