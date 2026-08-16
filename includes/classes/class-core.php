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
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/utils/class-org-map.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/utils/class-permissions.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/utils/class-postmark.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/utils/class-quiz-grading.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/utils/class-signed-url.php';

            // REST routers
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-webhooks-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-me-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-users-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-organizations-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-communications-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-courses-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-groups-router.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/rest/class-comms-preferences-router.php';

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
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-lander-block-helpers.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-lander-access.php';
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-user-comms-preferences.php';
        }

        public function init() {
            // Run plugin dependency check
            if (!$this->is_learndash_active()) {
                add_action( 'admin_notices', array( $this, 'missing_ld_notice' ) );
                return;
            }

            // Reconcile DB schema when BYS_GROUPS_DB_VERSION is bumped.
            // Runs only in admin, once per page load — never on the frontend.
            add_action('admin_init', array('BYS_Groups_Activator', 'maybe_upgrade'));

            // Keep the cached org relationship map in sync with org edits.
            BYS_Groups_Org_Map::register_invalidation_hooks();

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
            new BYS_Groups_User_Comms_Preferences();
            new BYS_Groups_Lander_Access();

            // REST routers
            new BYS_Groups_Webhooks_Router();
            new BYS_Groups_Me_Router();
            new BYS_Groups_Users_Router();
            new BYS_Groups_Organizations_Router();
            new BYS_Groups_Communications_Router();
            new BYS_Groups_Courses_Router();
            new BYS_Groups_Groups_Router();
            new BYS_Groups_Comms_Preferences_Router();

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

            // window.bysGroupsAuth is the shared auth payload for ALL plugin
            // frontend JS — the block api-client reads .nonce for the
            // X-WP-Nonce header on every REST call (and the theme's
            // quiz-grading sidebar reads it too). It must exist on every
            // logged-in page, so it ships as a ~100-byte inline script on an
            // empty handle rather than riding along with any one script file.
            wp_register_script('bys-groups-auth', false, array(), BYS_GROUPS_VERSION, true);
            wp_enqueue_script('bys-groups-auth');
            wp_add_inline_script(
                'bys-groups-auth',
                'window.bysGroupsAuth = ' . wp_json_encode(array(
                    'userId' => get_current_user_id(),
                    'nonce'  => wp_create_nonce('wp_rest'),
                )) . ';',
                'before'
            );

            // The certificate tracker script itself is only useful where
            // certificate links render: single course pages and /account.
            if (!$this->is_certificate_tracker_page()) {
                return;
            }

            wp_enqueue_script(
                'bys-view-certificate',
                BYS_GROUPS_PLUGIN_URL . 'assets/js/view-certificate.js',
                array('jquery', 'bys-groups-auth'),
                BYS_GROUPS_VERSION,
                true
            );
        }


        /**
         * True on single sfwd-courses pages and on the /account page or any
         * of its descendants — the only places certificate links render.
         */
        private function is_certificate_tracker_page() {
            if (is_singular('sfwd-courses')) {
                return true;
            }

            if (!is_page()) {
                return false;
            }

            $page = get_queried_object();
            if (!$page instanceof WP_Post) {
                return false;
            }

            if ('account' === $page->post_name) {
                return true;
            }

            foreach (get_post_ancestors($page->ID) as $ancestor_id) {
                $ancestor = get_post($ancestor_id);
                if ($ancestor instanceof WP_Post && 'account' === $ancestor->post_name) {
                    return true;
                }
            }

            return false;
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