<?php
/**
 * Admin settings page for BYS Groups plugin
 *
 * @package BYS_Groups
 * @since 1.0.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Admin_Settings')) {
    class BYS_Groups_Admin_Settings {

        public function __construct() {
            add_action('admin_menu', array($this, 'add_settings_page'));
            add_action('admin_init', array($this, 'handle_settings_form'));
        }

        /**
         * Add settings page to admin menu
         */
        public function add_settings_page() {
            add_menu_page(
                'BYS Groups Settings',
                'BYS Groups',
                'manage_options',
                'bys-groups-settings',
                array($this, 'render_settings_page'),
                'dashicons-admin-generic',
                100
            );
        }

        /**
         * Handle settings form submission
         */
        public function handle_settings_form() {
            if (!isset($_POST['bys_groups_settings_nonce'])) {
                return;
            }

            if (!wp_verify_nonce($_POST['bys_groups_settings_nonce'], 'bys_groups_settings')) {
                wp_die('Security check failed');
            }

            if (!current_user_can('manage_options')) {
                wp_die('Unauthorized');
            }

            if (isset($_POST['action']) && $_POST['action'] === 'save_credentials') {
                $username = sanitize_text_field($_POST['api_username'] ?? '');
                $password = sanitize_text_field($_POST['api_password'] ?? '');

                if (!empty($username) && !empty($password)) {
                    BYS_Groups_Auth::set_credentials($username, $password);
                    add_action('admin_notices', function() {
                        echo '<div class="notice notice-success is-dismissible"><p>API credentials saved successfully!</p></div>';
                    });
                } else {
                    add_action('admin_notices', function() {
                        echo '<div class="notice notice-error is-dismissible"><p>Please fill in both username and password.</p></div>';
                    });
                }
            }

            if (isset($_POST['action']) && $_POST['action'] === 'clear_credentials') {
                BYS_Groups_Auth::clear_credentials();
                add_action('admin_notices', function() {
                    echo '<div class="notice notice-success is-dismissible"><p>API credentials cleared.</p></div>';
                });
            }

            if (isset($_POST['action']) && $_POST['action'] === 'save_postmark_token') {
                $token = sanitize_text_field($_POST['postmark_token'] ?? '');
                if (!empty($token)) {
                    update_option('bys_postmark_token', $token);
                    add_action('admin_notices', function() {
                        echo '<div class="notice notice-success is-dismissible"><p>Postmark token saved successfully!</p></div>';
                    });
                }
            }

            if (isset($_POST['action']) && $_POST['action'] === 'save_postmark_from_email') {
                $from_email = sanitize_email($_POST['postmark_from_email'] ?? '');
                if (!empty($from_email) && is_email($from_email)) {
                    update_option('bys_postmark_from_email', $from_email);
                    add_action('admin_notices', function() {
                        echo '<div class="notice notice-success is-dismissible"><p>Postmark sender email saved successfully!</p></div>';
                    });
                } else {
                    add_action('admin_notices', function() {
                        echo '<div class="notice notice-error is-dismissible"><p>Please enter a valid email address.</p></div>';
                    });
                }
            }

            if (isset($_POST['action']) && $_POST['action'] === 'save_onboarding_form') {
                $form_id = intval($_POST['onboarding_form_id'] ?? 0);
                update_option('bys_onboarding_form_id', $form_id);
                add_action('admin_notices', function() {
                    echo '<div class="notice notice-success is-dismissible"><p>Onboarding form saved.</p></div>';
                });
            }

            if (isset($_POST['action']) && $_POST['action'] === 'save_time_tracking') {
                $errors = [];

                // Positive integers only. Invalid values leave current stored value untouched.
                $update_interval = intval($_POST['bys_time_tracking_update_interval'] ?? 0);
                if ($update_interval > 0) {
                    update_option('bys_groups_time_tracking_update_interval', $update_interval);
                } else {
                    $errors[] = 'Update interval must be a positive integer.';
                }

                $idle_threshold = intval($_POST['bys_time_tracking_idle_threshold'] ?? 0);
                if ($idle_threshold > 0) {
                    update_option('bys_groups_time_tracking_idle_threshold', $idle_threshold);
                } else {
                    $errors[] = 'Idle threshold must be a positive integer.';
                }

                // Empty input clears the option (falls back to home_url).
                $redirect_raw = trim($_POST['bys_time_tracking_idle_redirect_url'] ?? '');
                if ($redirect_raw === '') {
                    delete_option('bys_groups_time_tracking_idle_redirect_url');
                } else {
                    $redirect_url = esc_url_raw($redirect_raw);
                    if ($redirect_url !== '' && filter_var($redirect_url, FILTER_VALIDATE_URL) !== false) {
                        update_option('bys_groups_time_tracking_idle_redirect_url', $redirect_url);
                    } else {
                        $errors[] = 'Idle redirect URL is invalid.';
                    }
                }

                if (empty($errors)) {
                    add_action('admin_notices', function() {
                        echo '<div class="notice notice-success is-dismissible"><p>Time tracking settings saved.</p></div>';
                    });
                } else {
                    $error_items = implode('</li><li>', array_map('esc_html', $errors));
                    add_action('admin_notices', function() use ($error_items) {
                        echo '<div class="notice notice-warning is-dismissible"><p>Some settings were not saved:</p><ul><li>' . $error_items . '</li></ul></div>';
                    });
                }
            }
        }

        /**
         * Render settings page
         */
        public function render_settings_page() {
            $is_configured = BYS_Groups_Auth::is_configured();
            $credentials = BYS_Groups_Auth::get_credentials();
            $username = $credentials['username'] ?? '';
            ?>
            <div>
                <h1>BYS Groups Settings</h1>
                <p>Configure your LearnDash API credentials using an Application Password.</p>

                <form method="POST" style="max-width: 768px; display:flex; flex-direction: column; gap: 1rem;">
                    <?php wp_nonce_field('bys_groups_settings', 'bys_groups_settings_nonce'); ?>
                    <input type="hidden" name="action" value="save_credentials">
                    <label for="api_username">
                        API Username
                        <input
                            type="text"
                            id="api_username"
                            name="api_username"
                            value="<?php echo esc_attr($username); ?>"
                            class="regular-text"
                            placeholder="WordPress username"
                        />
                    </label>
                    <label for="api_password">
                        Application Password
                        <input
                            type="password"
                            id="api_password"
                            name="api_password"
                            class="regular-text"
                            placeholder="Generated application password"
                        />
                    </label>
                    <p class="description">
                        The password field is intentionally blank for security. Enter password to update it.
                    </p>

                    <?php submit_button('Save Credentials'); ?>
                </form>

                <?php if ($is_configured) : ?>
                    <h2>Credentials Status</h2>
                    <p>API credentials are configured and ready to use.</p>
                    <form method="POST">
                        <?php wp_nonce_field('bys_groups_settings', 'bys_groups_settings_nonce'); ?>
                        <input type="hidden" name="action" value="clear_credentials">
                        <?php submit_button('Clear Credentials', 'delete'); ?>
                    </form>
                <?php endif; ?>

                <hr>

                <h2>Postmark API Token</h2>
                <p>Enter your Postmark Server API Token to enable the communication log.</p>

                <form method="POST" style="max-width: 768px; display:flex; flex-direction: column; gap: 1rem;">
                    <?php wp_nonce_field('bys_groups_settings', 'bys_groups_settings_nonce'); ?>
                    <input type="hidden" name="action" value="save_postmark_token">
                    <label for="postmark_token">
                        Server API Token
                        <input type="password" id="postmark_token" name="postmark_token" class="regular-text" placeholder="Enter token to update"
                        />
                    </label>
                    <p class="description">
                        <?php if (get_option('bys_postmark_token')) : ?>
                            Token is configured.
                        <?php else : ?>
                            No token saved yet.
                        <?php endif; ?>
                    </p>
                    <?php submit_button('Save Postmark Token'); ?>
                </form>

                <h2>Postmark Sender Email</h2>
                <p style="max-width:768px;">The From address used on every email this plugin sends. Must be a verified Sender Signature (or come from a verified domain) in your Postmark server, otherwise Postmark will reject the send.</p>

                <form method="POST" style="max-width: 768px; display:flex; flex-direction: column; gap: 1rem;">
                    <?php wp_nonce_field('bys_groups_settings', 'bys_groups_settings_nonce'); ?>
                    <input type="hidden" name="action" value="save_postmark_from_email">
                    <label for="postmark_from_email">
                        From Email
                        <input type="email" id="postmark_from_email" name="postmark_from_email" class="regular-text"
                            value="<?php echo esc_attr(get_option('bys_postmark_from_email', '')); ?>"
                            placeholder="e.g. learn@skillplan.ca"
                        />
                    </label>
                    <p class="description">
                        <?php if (get_option('bys_postmark_from_email')) : ?>
                            Currently sending as <code><?php echo esc_html(get_option('bys_postmark_from_email')); ?></code>.
                        <?php else : ?>
                            No sender configured — falls back to the site admin email (<code><?php echo esc_html(get_bloginfo('admin_email')); ?></code>).
                        <?php endif; ?>
                    </p>
                    <?php submit_button('Save Sender Email'); ?>
                </form>

                <hr>

                <h2>Onboarding Form</h2>
                <p>The Gravity Forms form shown in the onboarding modal.</p>

                <form method="POST" style="max-width: 768px; display:flex; flex-direction: column; gap: 1rem;">
                    <?php wp_nonce_field('bys_groups_settings', 'bys_groups_settings_nonce'); ?>
                    <input type="hidden" name="action" value="save_onboarding_form">
                    <label for="onboarding_form_id">
                        Form
                        <select id="onboarding_form_id" name="onboarding_form_id" class="regular-text">
                            <option value="0">— None —</option>
                            <?php
                            if (class_exists('GFAPI')) {
                                $gf_forms = GFAPI::get_forms();
                                usort($gf_forms, fn($a, $b) => strcmp($a['title'], $b['title']));
                                $saved = (int) get_option('bys_onboarding_form_id', 0);
                                foreach ($gf_forms as $gf_form) {
                                    printf(
                                        '<option value="%d"%s>%s</option>',
                                        $gf_form['id'],
                                        selected($saved, $gf_form['id'], false),
                                        esc_html($gf_form['title'])
                                    );
                                }
                            }
                            ?>
                        </select>
                    </label>
                    <?php submit_button('Save Onboarding Form'); ?>
                </form>

                <hr>

                <h2>Time Tracking</h2>
                <p style="max-width: 768px;">Controls the custom active-time tracker that runs on LearnDash content pages (courses, lessons, topics, quizzes). Changes take effect on each learner's next page load.</p>

                <form method="POST" style="max-width: 768px; display:flex; flex-direction: column; gap: 1rem;">
                    <?php wp_nonce_field('bys_groups_settings', 'bys_groups_settings_nonce'); ?>
                    <input type="hidden" name="action" value="save_time_tracking">

                    <label for="bys_time_tracking_update_interval">
                        Update Interval (seconds)
                        <input type="number"
                            id="bys_time_tracking_update_interval"
                            name="bys_time_tracking_update_interval"
                            class="regular-text"
                            value="<?php echo esc_attr(get_option('bys_groups_time_tracking_update_interval', BYS_GROUPS_TIME_TRACKING_UPDATE_INTERVAL_DEFAULT)); ?>"
                            min="1"
                            step="1"
                        />
                    </label>
                    <p class="description">
                        How often the browser reports accumulated active time to the server.  Default: <?php echo esc_html(BYS_GROUPS_TIME_TRACKING_UPDATE_INTERVAL_DEFAULT); ?>s.
                    </p>

                    <label for="bys_time_tracking_idle_threshold">
                        Idle Threshold (seconds)
                        <input type="number"
                            id="bys_time_tracking_idle_threshold"
                            name="bys_time_tracking_idle_threshold"
                            class="regular-text"
                            value="<?php echo esc_attr(get_option('bys_groups_time_tracking_idle_threshold', BYS_GROUPS_TIME_TRACKING_IDLE_THRESHOLD_DEFAULT)); ?>"
                            min="1"
                            step="1"
                        />
                    </label>
                    <p class="description">
                        Time without any interaction (mouse, keyboard, touch, scroll) before the tracker pauses and the "Are you still there?" modal appears. Default: <?php echo esc_html(BYS_GROUPS_TIME_TRACKING_IDLE_THRESHOLD_DEFAULT); ?>s.
                    </p>

                    <label for="bys_time_tracking_idle_redirect_url">
                        Idle Redirect URL
                        <input type="url"
                            id="bys_time_tracking_idle_redirect_url"
                            name="bys_time_tracking_idle_redirect_url"
                            class="regular-text"
                            value="<?php echo esc_attr(get_option('bys_groups_time_tracking_idle_redirect_url', '')); ?>"
                            placeholder="<?php echo esc_url(home_url()); ?>"
                        />
                    </label>
                    <p class="description">
                        Where learners are redirected if they click "I'm done" on the idle modal. Leave blank to default to the site home (<code><?php echo esc_html(home_url()); ?></code>).
                    </p>

                    <?php submit_button('Save Time Tracking Settings'); ?>
                </form>
            </div>
            <?php
        }
    }
}
