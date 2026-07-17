<?php
/**
 * Public Communication Preferences Router - self service opt-out endpoint reached via footer link on   plugin-generated emails 
 *
 * Two-step confirmation flow:
 *   GET  /unsubscribe?token=… — verifies token, renders a confirmation
 *                               page with a POST form.
 *   POST /unsubscribe         — verifies token + nonce, flips the
 *                               bys_groups_enable_comms user meta to
 *                               '0', renders a success page.
 *
 * Endpoints return HTML. The callback echoes the
 * template and exits before REST serialization runs.
 *
 * @package BYS_Groups
 * @since 1.2.0
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Comms_Preferences_Router')) {
    class BYS_Groups_Comms_Preferences_Router {

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
        }

        public function register_routes() {
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/unsubscribe', [
                [
                    'methods'             => \WP_REST_Server::READABLE,
                    'callback'            => [$this, 'handle_get'],
                    'permission_callback' => '__return_true',
                ],
                [
                    'methods'             => \WP_REST_Server::CREATABLE,
                    'callback'            => [$this, 'handle_post'],
                    'permission_callback' => '__return_true',
                ],
            ]);
        }

        /**
         * GET — verify token, render confirmation form (or error page).
         */
        public function handle_get($request) {
            $token   = (string) $request->get_param('token');
            $decoded = BYS_Groups_Signed_URL::verify($token);

            if (is_wp_error($decoded)) {
                $this->render('error', [
                    'error_message' => $decoded->get_error_message(),
                ]);
            }

            $this->render('confirm', [
                'token'     => $token,
                'post_url'  => rest_url(BYS_Groups_Core::REST_NAMESPACE . '/unsubscribe'),
            ]);
        }

        /**
         * POST — verify token + nonce, apply opt-out, render success page.
         */
        public function handle_post($request) {
            $token = (string) $request->get_param('token');
            // NOTE: field is `bys_nonce`, not `_wpnonce` — WP's REST cookie
            // check auto-validates any `_wpnonce` POST field against the
            // wp_rest action for logged-in users and 403s if it doesn't
            // match.
            $nonce = (string) $request->get_param('bys_nonce');

            if (!wp_verify_nonce($nonce, 'bys_groups_unsubscribe')) {
                $this->render('error', [
                    'error_message' => 'Security check failed. Please open the link from your email again.',
                ]);
            }

            $decoded = BYS_Groups_Signed_URL::verify($token);
            if (is_wp_error($decoded)) {
                $this->render('error', [
                    'error_message' => $decoded->get_error_message(),
                ]);
            }

            bys_groups_set_user_comms_enabled((int) $decoded['user_id'], false);
            $this->render('success');
        }

        /**
         * Render the unsubscribe template with $variant + any per-variant
         * vars, send HTML headers, and exit.
         */
        private function render(string $variant, array $extra = []) {
            $site_name       = get_bloginfo('name');
            $site_url        = home_url();
            $token           = $extra['token']           ?? '';
            $post_url        = $extra['post_url']        ?? '';
            $error_message   = $extra['error_message']   ?? '';
            $preferences_url = apply_filters('bys_groups_comms_preferences_url', '');
            $recipient       = '';

            if (!headers_sent()) {
                nocache_headers();
                header('Content-Type: text/html; charset=' . get_bloginfo('charset'));
            }

            include BYS_GROUPS_PLUGIN_DIR . 'templates/unsubscribe-page.php';
            exit;
        }
    }
}
