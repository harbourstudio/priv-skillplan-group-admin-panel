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

$user_id = get_current_user_id();
$groups  = array();
if ($user_id) {
	$router  = new BYS_Groups_Me_Router();
	$payload = $router->get_current_user_groups(null);
	$groups  = $payload['groups'] ?? array();
}
$wrapper_attributes = get_block_wrapper_attributes();

// Get the Authorization header for API requests
require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-auth.php';
?>

<div <?= $wrapper_attributes ?>>
	<div class="group-select__wrapper">
		<input
			type="text"
			class="group-select__input"
			role="combobox"
			aria-expanded="false"
			aria-controls="group-select-list"
			autocomplete="off"
			placeholder="<?php esc_attr_e( 'Search groups', 'bys' ); ?>"
		>
		<input type="hidden" class="group-select__value" name="group" value="">

		<ul id="group-select-list" class="group-select__list" role="listbox" hidden>
				<?php foreach ($groups as $group) : ?>
					<li 
						class="group-select__option"
						data-group-id="<?php echo esc_attr( $group['id'] ); ?>"
						data-is-org-admin="<?php echo !empty($group['is_org_admin']) ? '1' : '0'; ?>"
						data-can-manage-members="<?php echo !empty($group['can_manage_members']) ? '1' : '0'; ?>"
						data-can-manage-group="<?php echo !empty($group['can_manage_group']) ? '1' : '0'; ?>"
						role="option"
					>
						<?= esc_html( $group['title'] ); ?>
					</li>
				<?php endforeach ?>
			<li class="group-select__empty" hidden>
				<?php esc_html_e( 'No groups found', 'bys' ); ?>
			</li>
		</ul>

		<!-- Loading spinner overlay -->
		<div class="group-select__spinner-wrapper" style="display: none;">
			<span class="group-select__spinner"></span>
		</div>
	</div>
	<button class="group-select__button" type="button"><?php esc_html_e('Show Group', 'bys'); ?></button>
</div>
