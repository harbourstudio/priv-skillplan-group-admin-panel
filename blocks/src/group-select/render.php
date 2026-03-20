<?php
/**
 * render.php — BYS Group Select block.
 */
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

if ( $user_id ) {
	// Fetch user's groups via direct REST API class call
	require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest-api.php';
	$rest_api = new BYS_Groups_Rest_API();
	$response = $rest_api->get_current_user_groups( null );

	if ( ! is_wp_error( $response ) ) {
		$data = $response->get_data();
		$groups = isset( $data['groups'] ) ? $data['groups'] : array();
	}
}

$wrapper_attributes = get_block_wrapper_attributes();

// Get the Authorization header for API requests
require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/auth.php';
$auth_header = BYS_Groups_Auth::get_auth_header();
?>

<div <?php echo wp_kses_post( $wrapper_attributes ); ?>>
	<?php if ( $auth_header ) : ?>
		<script>
			window.bysGroupsAuth = {
				header: '<?php echo esc_js( $auth_header ); ?>'
			};
		</script>
	<?php endif; ?>

	<script type="application/json" data-bys-block="group-select">
		<?php echo wp_json_encode( $groups ); ?>
	</script>

	<div class="group-selector">
		<select id="group-select" class="group-selector__select" name="group">
			<option value="">Select a Group</option>
		</select>
		<button class="group-selector__button" type="button">Show Group</button>
	</div>
</div>
