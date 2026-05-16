<?php
/**
 * Response utility.
 *
 * Standardizes the response envelope across all REST endpoints.
 * Success: { "status": 200, "data": <payload> }
 * Error:   { "status": 4xx|5xx, "error": { "code": "...", "message": "..." } }
 *
 * @package BYS_Groups
 * @since 1.1.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Response')) {
    class BYS_Groups_Response {

        /**
         * Build a 2xx success response.
         *
         * @param mixed $data    Payload to send (array, object, scalar).
         * @param int   $status  HTTP status code. Defaults to 200.
         * @return \WP_REST_Response
         */
        public static function success($data = null, $status = 200) {
            return new \WP_REST_Response(array(
                'status' => (int) $status,
                'data'   => $data,
            ), (int) $status);
        }

        /**
         * Build an error response with a stable string code.
         *
         * @param string $code     Short machine-readable code (e.g. "forbidden", "not_found").
         * @param string $message  Human-readable message.
         * @param int    $status   HTTP status code. Defaults to 400.
         * @return \WP_REST_Response
         */
        public static function error($code, $message, $status = 400) {
            return new \WP_REST_Response(array(
                'status' => (int) $status,
                'error'  => array(
                    'code'    => (string) $code,
                    'message' => (string) $message,
                ),
            ), (int) $status);
        }

        /**
         * Build a paginated success response. The payload is wrapped in
         * `items` with `total`, `page`, and `per_page` siblings.
         *
         * @param array $items
         * @param int   $total
         * @param int   $page
         * @param int   $per_page
         * @return \WP_REST_Response
         */
        public static function paginated(array $items, $total, $page, $per_page) {
            return self::success(array(
                'items'    => array_values($items),
                'total'    => (int) $total,
                'page'     => (int) $page,
                'per_page' => (int) $per_page,
            ));
        }

        /**
         * Convenience shortcuts for common error shapes.
         */
        public static function forbidden($message = 'Forbidden.') {
            return self::error('forbidden', $message, 403);
        }

        public static function not_found($message = 'Not found.') {
            return self::error('not_found', $message, 404);
        }

        public static function bad_request($message = 'Bad request.') {
            return self::error('bad_request', $message, 400);
        }

        public static function server_error($message = 'Server error.') {
            return self::error('server_error', $message, 500);
        }
    }
}
