<?php
/**
 * Authentication helper for LearnDash API requests
 *
 * Manages Application Password credentials for authenticating to LearnDash REST API
 *
 * @package BYS_Groups
 * @since 1.0.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Auth')) {
    class BYS_Groups_Auth {

        const OPTION_KEY = 'bys_groups_api_credentials';

        /**
         * Get stored API credentials
         *
         * @return array|false Credentials array with 'username' and 'password', or false if not set
         */
        public static function get_credentials() {
            $encrypted = get_option(self::OPTION_KEY, false);

            if (!$encrypted) {
                return false;
            }

            // In a production environment, you'd decrypt here
            // For now, we'll store plaintext (WordPress options are already protected by the database)
            return json_decode($encrypted, true);
        }

        /**
         * Set API credentials
         *
         * @param string $username The API username
         * @param string $password The application password
         * @return bool Success/failure
         */
        public static function set_credentials($username, $password) {
            $credentials = array(
                'username' => $username,
                'password' => $password,
            );

            return update_option(self::OPTION_KEY, json_encode($credentials));
        }

        /**
         * Get Authorization header value for basic auth
         *
         * @return string|false Base64-encoded basic auth or false if credentials not set
         */
        public static function get_auth_header() {
            $credentials = self::get_credentials();

            if (!$credentials || empty($credentials['username']) || empty($credentials['password'])) {
                return false;
            }

            $auth_string = $credentials['username'] . ':' . $credentials['password'];
            return 'Basic ' . base64_encode($auth_string);
        }

        /**
         * Clear stored credentials
         *
         * @return bool
         */
        public static function clear_credentials() {
            return delete_option(self::OPTION_KEY);
        }

        /**
         * Check if credentials are configured
         *
         * @return bool
         */
        public static function is_configured() {
            $credentials = self::get_credentials();
            return $credentials && !empty($credentials['username']) && !empty($credentials['password']);
        }
    }
}
