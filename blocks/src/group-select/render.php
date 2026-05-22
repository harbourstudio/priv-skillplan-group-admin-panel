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
		<select id="group-select" class="group-select__select" name="group">
			<option value="" selected></option>
			<?php if ($groups > 0) : ?>
				<?php foreach ($groups as $group): ?>
					<option
						class="group-option"
						value="<?php echo $group['id']; ?>"
						data-is-org-admin="<?php echo !empty($group['is_org_admin']) ? '1' : '0'; ?>"
					>
						<?php echo $group['title']; ?>
					</option>
				<?php endforeach; ?>
			<?php else: ?>
				<option><?php echo esc_html__('No Groups available', 'bys'); ?></option>
			<?php endif; ?>
		</select>

		<!-- Loading spinner overlay -->
		<div class="group-select__spinner-wrapper" style="display: none;">
			<span class="group-select__spinner"></span>
		</div>
	</div>
	<button class="group-select__button" type="button"><?php esc_html_e('Show Group', 'bys'); ?></button>
</div>
