<?php
/**
 * Main plugin file
 * 
 * @wordpress-plugin
 * Plugin Name: SkillPlan BYS Group Administrator Plugin
 * Description: Custom plugin for Skillplan BYS for group management on the frontend
 * Author: The West Harbour
 * Version: 2.0.1
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: bys
 * Domain path: /languages
 */

if (!defined('ABSPATH')) {
    exit;
}

// Define constants
define( 'BYS_GROUPS_VERSION', '2.0.1' );
define( 'BYS_GROUPS_DB_VERSION', '1.1.0' );
define( 'BYS_GROUPS_PLUGIN_FILE', __FILE__);
define( 'BYS_GROUPS_PLUGIN_DIR', plugin_dir_path( __FILE__ ));
define( 'BYS_GROUPS_PLUGIN_URL', plugin_dir_url( __FILE__ ));
define( 'BYS_GROUPS_PLUGIN_BASENAME', plugin_basename( __FILE__ ));
define( 'BYS_GROUPS_USER_ACTIVITY_TABLE', 'bys_groups_user_activity' );
define( 'BYS_GROUPS_INVITES_TABLE', 'bys_group_invites' );
define( 'BYS_GROUPS_COMMS_TABLE', 'bys_group_communication_log' );

// File includes
require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-core.php';
require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-activator.php';

// Run on plugin activation
register_activation_hook(BYS_GROUPS_PLUGIN_FILE, ['BYS_Groups_Activator', 'activate']);

// // Run on plugin deactivation
// register_deactivation_hook( BYS_GROUPS_PLUGIN_FILE, [ 'BYS_Groups_Activator', 'deactivate']);

// Plugin initialization
function run_bys_groups() {
    $plugin = new BYS_Groups_Core();
}
add_action('plugins_loaded', 'run_bys_groups');