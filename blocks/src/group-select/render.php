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
$groups = array();

if ($user_id) {
	// Fetch current user's group via a method of the BYS_Groups_Rest_API class
	require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-rest-api.php';
	$rest_api = new BYS_Groups_Rest_API();
	$response = $rest_api->get_current_user_groups(null);

	if(!is_wp_error($response)) {
		$data = $response->get_data();
		$groups = isset($data['groups']) ? $data['groups'] : [];
	}
}
$wrapper_attributes = get_block_wrapper_attributes();

// Get the Authorization header for API requests
require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-auth.php';
$auth_header = BYS_Groups_Auth::get_auth_header();
?>

<div <?php echo wp_kses_post( $wrapper_attributes ); ?>>
	<?php if ($auth_header): ?>
		<script>
			window.bysGroupsAuth = {
				header: '<?php echo esc_js($auth_header); ?>'
			};
		</script>
	<?php endif; ?>

	<div class="group-selector">
		<div class="group-selector__wrapper">
			<select id="group-select" class="group-selector__select" name="group">
				<option value="" selected></option>
				<?php if ($groups > 0) : ?>
					<?php foreach ($groups as $group): ?>
						<option
							class="group-option"
							value="<?php echo $group['id']; ?>"
						>
							<?php echo $group['title']; ?>
						</option>
					<?php endforeach; ?>
				<?php else: ?>
					<option><?php echo esc_html__('No Groups available', 'bys'); ?></option>
				<?php endif; ?>
			</select>

			<!-- Loading spinner overlay -->
			<div class="group-selector__spinner-wrapper" style="display: none;">
				<span class="group-selector__spinner"></span>
			</div>
		</div>
		<button class="group-selector__button" type="button">Show Group</button>
	</div>
</div>
