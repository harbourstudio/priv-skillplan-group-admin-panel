<?php
/**
 * Core plugin class.
 *
 * Notes: LearnDash may be abbreviated as LD in code comments across plugin classes
 *
 * @package BYS_Groups
 * @since 1.0.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Core')) {
    class BYS_Groups_Core {

        public function __construct() {
            $this->includes();
            $this->init();
        }

        private function includes() {
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest-api.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/blocks.php';
        }

        public function init() {
            // Run plugin dependency check
            if (!$this->is_learndash_active()) {
                add_action( 'admin_notices', array( $this, 'missing_ld_notice' ) );
                return;
            } 

            // Initialize classes
            new BYS_Groups_Rest_API();
            new BYS_Groups_Blocks();
        }


        // Check for LD plugin
        private function is_learndash_active() {
            return class_exists('SFWD_LMS');
        }

        public function missing_ld_notice() {
            if (!current_user_can('activate_plugins')) {
                return;
            }
            printf(
                '<div class="notice notice-error"><p>%s</p></div>',
                esc_html__( 'BYS Groups requires LearnDash to be installed and active.', 'bys' )
            );
        }
    }
}