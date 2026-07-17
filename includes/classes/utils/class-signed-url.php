<?php
/**
 * Signed URL utility for self-service links
 *
 * Tokens use AES-256-GCM authenticated encryption: the payload
 * (user_id | action) is encrypted with a site-wide key so the user_id
 * never appears in cleartext in the URL, and the GCM auth tag prevents
 * tampering.
 * 
 * Rotating wp_salt('secure_auth') invalidates every outstanding token
 * — the escape hatch if mass revocation ever becomes necessary.
 *
 * Token format:  base64url(iv || ciphertext || auth_tag)
 * Cipher:        aes-256-gcm
 * Key:           sha256(wp_salt('secure_auth'))
 *
 * @package BYS_Groups
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Signed_URL')) {
    class BYS_Groups_Signed_URL {

        const CIPHER  = 'aes-256-gcm';
        const IV_LEN  = 12;
        const TAG_LEN = 16;

        /**
         * Build a signed token for ($user_id, $action).
         *
         * @param int    $user_id
         * @param string $action Namespaced action name, e.g. 'unsubscribe'.
         * @return string        Opaque token — safe to embed in a URL.
         */
        public static function generate(int $user_id, string $action = 'unsubscribe'): string {
            $payload = $user_id . '|' . $action;
            $iv      = random_bytes(self::IV_LEN);
            $tag     = '';
            $ct      = openssl_encrypt(
                $payload,
                self::CIPHER,
                self::key(),
                OPENSSL_RAW_DATA,
                $iv,
                $tag,
                '',
                self::TAG_LEN
            );
            if ($ct === false) return '';
            return self::b64url_encode($iv . $tag . $ct);
        }

        /**
         * Verify a token. Returns the decoded payload on success or a
         * WP_Error on failure.
         *
         * Also rejects tokens that reference deleted users; prevent
         * writing meta rows write if user_id is missing
         * @param string $token
         * @return array|WP_Error { user_id: int, action: string }
         */
        public static function verify(string $token) {
            if (!is_string($token) || $token === '') {
                return new \WP_Error('invalid_token', 'Malformed token.', ['status' => 400]);
            }

            $data = self::b64url_decode($token);
            if ($data === false || strlen($data) < (self::IV_LEN + self::TAG_LEN + 1)) {
                return new \WP_Error('invalid_token', 'Malformed token.', ['status' => 400]);
            }

            $iv  = substr($data, 0, self::IV_LEN);
            $tag = substr($data, self::IV_LEN, self::TAG_LEN);
            $ct  = substr($data, self::IV_LEN + self::TAG_LEN);

            $payload = openssl_decrypt($ct, self::CIPHER, self::key(), OPENSSL_RAW_DATA, $iv, $tag);
            if ($payload === false) {
                return new \WP_Error('invalid_signature', 'Signature mismatch.', ['status' => 400]);
            }

            $parts = explode('|', $payload, 2);
            if (count($parts) !== 2) {
                return new \WP_Error('invalid_token', 'Malformed payload.', ['status' => 400]);
            }
            [$user_id, $action] = $parts;
            $user_id = (int) $user_id;
            if (!$user_id || !get_userdata($user_id)) {
                return new \WP_Error('invalid_token', 'Invalid user reference.', ['status' => 400]);
            }

            return [
                'user_id' => $user_id,
                'action'  => $action,
            ];
        }

        /**
         * Build the public unsubscribe URL that goes into
         * plugin-generated email's footer
         * Callers pass the recipient's user id; the token
         * embedded in the URL identifies them on click.
         */
        public static function build_unsubscribe_url(int $user_id): string {
            if (!$user_id) return '';
            $token = self::generate($user_id, 'unsubscribe');
            if ($token === '') return '';
            return add_query_arg('token', $token, rest_url('bys-groups/v1/unsubscribe'));
        }

        /**
         * 256-bit key derived from wp_salt('secure_auth'). Rotating the
         * salt invalidates all outstanding tokens
         */
        private static function key(): string {
            return hash('sha256', wp_salt('secure_auth'), true);
        }

        private static function b64url_encode(string $bin): string {
            return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
        }

        private static function b64url_decode(string $s) {
            $pad = strlen($s) % 4;
            if ($pad) $s .= str_repeat('=', 4 - $pad);
            return base64_decode(strtr($s, '-_', '+/'), true);
        }
    }
}
