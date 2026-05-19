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

        /** Shared REST namespace across all routers */
        const REST_NAMESPACE = 'bys-groups/v1';

        public function __construct() {
            $this->includes();
            $this->init();
        }

        private function includes() {
            // Utilities (load first — referenced by routers and feature classes)
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/utils/class-permissions.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/utils/class-response.php';

            // REST routers
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-webhooks-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-me-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-users-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-organizations-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-communications-router.php';

            // Core classes
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-activator.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-auth.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-rest-api.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-blocks.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-admin-settings.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-activity-logger.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-required-courses.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-invites.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-quiz-access.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-scheduled-emails.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-conditional-emails.php';
        }

        public function init() {
            // Run plugin dependency check
            if (!$this->is_learndash_active()) {
                add_action( 'admin_notices', array( $this, 'missing_ld_notice' ) );
                return;
            }

            // Run Activator class with the create_tables() method. Safety net that ensures the cusotm tables exist on every load
            BYS_Groups_Activator::activate();

            // Initialize classes
            new BYS_Groups_Admin_Settings();
            new BYS_Groups_Rest_API();
            new BYS_Groups_Blocks();
            new BYS_Groups_Activity_Logger();
            new BYS_Required_Courses();
            new BYS_Groups_Invites();
            new BYS_Groups_Quiz_Access();
            new BYS_Groups_Scheduled_Emails();

            // REST routers (incremental migration from BYS_Groups_Rest_API)
            new BYS_Groups_Webhooks_Router();
            new BYS_Groups_Me_Router();
            new BYS_Groups_Users_Router();
            new BYS_Groups_Organizations_Router();
            new BYS_Groups_Communications_Router();

            // Enqueue certificate tracking script on certificate pages
            add_action('wp_enqueue_scripts', array($this, 'enqueue_certificate_tracker'));
        }

        public function enqueue_certificate_tracker() {
            // Enqueue link tracker on all pages (to intercept certificate link clicks)
            wp_enqueue_script(
                'bys-view-certificate',
                BYS_GROUPS_PLUGIN_URL . 'assets/js/view-certificate.js',
                array('jquery'),
                BYS_GROUPS_VERSION,
                true
            );

            // Localize user ID, auth header, and REST nonce for JS access.
            // The nonce enables cookie-based REST auth so get_current_user_id() resolves
            // correctly in GET requests (the Basic auth header is a service-account credential,
            // not a WP Application Password, so it cannot resolve a user on its own).
            wp_localize_script('bys-view-certificate', 'bysGroupsAuth', array(
                'userId' => get_current_user_id(),
                'header' => BYS_Groups_Auth::get_auth_header(),
                'nonce'  => wp_create_nonce('wp_rest'),
            ));
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