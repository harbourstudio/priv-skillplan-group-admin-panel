<?php
/**
 * Signed URL utility for self-service links (currently the unsubscribe
 * flow). Tokens are HMAC-signed with per-user salting so a captured
 * token cannot be replayed against a different user. Tokens do NOT
 * expire — unsubscribe is a consumer right that should keep working
 * indefinitely (matches Mailchimp / SendGrid / Postmark behaviour).
 * Rotating wp_salt('auth') invalidates all outstanding tokens if a
 * mass revocation ever becomes necessary.
 *
 * Token format:  base64url(payload) . '.' . base64url(signature)
 * Payload:       user_id | action   (pipe-delimited)
 * Signature:     hash_hmac('sha256', payload, wp_salt('auth') . '|' . user_id)
 *
 * @package BYS_Groups
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Signed_URL')) {
    class BYS_Groups_Signed_URL {

        /**
         * Build a signed token for ($user_id, $action).
         *
         * @param int    $user_id
         * @param string $action Namespaced action name, e.g. 'unsubscribe'.
         * @return string        Opaque token — safe to embed in a URL.
         */
        public static function generate(int $user_id, string $action = 'unsubscribe'): string {
            $payload = $user_id . '|' . $action;
            $sig     = hash_hmac('sha256', $payload, self::secret($user_id));
            return self::b64url_encode($payload) . '.' . self::b64url_encode(hex2bin($sig));
        }

        /**
         * Verify a token. Returns the decoded payload on success or a
         * WP_Error on failure.
         *
         * @param string $token
         * @return array|WP_Error { user_id: int, action: string }
         */
        public static function verify(string $token) {
            if (!is_string($token) || strpos($token, '.') === false) {
                return new \WP_Error('invalid_token', 'Malformed token.', ['status' => 400]);
            }

            [$payload_b64, $sig_b64] = explode('.', $token, 2);
            $payload = self::b64url_decode($payload_b64);
            $sig     = self::b64url_decode($sig_b64);
            if ($payload === false || $sig === false) {
                return new \WP_Error('invalid_token', 'Malformed token.', ['status' => 400]);
            }

            $parts = explode('|', $payload);
            if (count($parts) !== 2) {
                return new \WP_Error('invalid_token', 'Malformed payload.', ['status' => 400]);
            }
            [$user_id, $action] = $parts;
            $user_id = (int) $user_id;
            if (!$user_id) {
                return new \WP_Error('invalid_token', 'Invalid user reference.', ['status' => 400]);
            }

            $expected = hex2bin(hash_hmac('sha256', $payload, self::secret($user_id)));
            if (!hash_equals($expected, $sig)) {
                return new \WP_Error('invalid_signature', 'Signature mismatch.', ['status' => 400]);
            }

            return [
                'user_id' => $user_id,
                'action'  => $action,
            ];
        }

        /**
         * Build the public unsubscribe URL that goes into every plugin
         * email footer. Callers pass the recipient's user id; the token
         * embedded in the URL identifies them on click.
         */
        public static function build_unsubscribe_url(int $user_id): string {
            if (!$user_id) return '';
            $token = self::generate($user_id, 'unsubscribe');
            return add_query_arg('token', $token, rest_url('bys-groups/v1/unsubscribe'));
        }

        /**
         * Per-user signing secret. Binds tokens to a user id so payload
         * tampering (swapping user_id) invalidates the signature.
         */
        private static function secret(int $user_id): string {
            return wp_salt('auth') . '|' . $user_id;
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
