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
            // Post types and field groups
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-organization.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-lander.php';

            // Utilities (load first — referenced by routers and feature classes)
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/utils/class-permissions.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/utils/class-postmark.php';

            // REST routers
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-webhooks-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-me-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-users-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-organizations-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-communications-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-courses-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-groups-router.php';

            // Core classes
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-activator.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-auth.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-blocks.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-admin-settings.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-activity-logger.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-required-courses.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-prerequisites.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-course-order.php';
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

            // Post types and field groups
            new BYS_Groups_Organization();
            new BYS_Groups_Lander();

            // Initialize classes
            new BYS_Groups_Admin_Settings();
            new BYS_Groups_Blocks();
            new BYS_Groups_Activity_Logger();
            new BYS_Required_Courses();
            new BYS_Groups_Prerequisites();
            new BYS_Course_Order();
            new BYS_Groups_Invites();
            new BYS_Groups_Quiz_Access();
            new BYS_Groups_Scheduled_Emails();

            // REST routers
            new BYS_Groups_Webhooks_Router();
            new BYS_Groups_Me_Router();
            new BYS_Groups_Users_Router();
            new BYS_Groups_Organizations_Router();
            new BYS_Groups_Communications_Router();
            new BYS_Groups_Courses_Router();
            new BYS_Groups_Groups_Router();

            // Flush rewrite rules once after activation so new CPTs are reachable.
            if (get_option('bys_flush_rewrite_rules')) {
                flush_rewrite_rules();
                delete_option('bys_flush_rewrite_rules');
            }

            // Enqueue certificate tracking script on certificate pages
            add_action('wp_enqueue_scripts', array($this, 'enqueue_certificate_tracker'));
        }

        public function enqueue_certificate_tracker() {

            if (!is_user_logged_in()) {
                return;
            }

            wp_enqueue_script(
                'bys-view-certificate',
                BYS_GROUPS_PLUGIN_URL . 'assets/js/view-certificate.js',
                array('jquery'),
                BYS_GROUPS_VERSION,
                true
            );

            wp_localize_script('bys-view-certificate', 'bysGroupsAuth', array(
                'userId' => get_current_user_id(),
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