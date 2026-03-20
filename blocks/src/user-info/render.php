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

// Get the Authorization header for API requests
require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/auth.php';
$auth_header = BYS_Groups_Auth::get_auth_header();
?>

<?php if ( $auth_header ) : ?>
	<script>
		window.bysGroupsAuth = {
			header: '<?php echo esc_js( $auth_header ); ?>'
		};
	</script>
<?php endif; ?>

<div <?= $wrapper_attributes; ?>>
    <!-- User info populated by view.js from REST API -->
</div>