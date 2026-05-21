<?php
/**
 * Webhooks router.
 *
 * Handles inbound webhook callbacks from external services.
 *
 * @package BYS_Groups
 * @since 1.1.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Webhooks_Router')) {
    class BYS_Groups_Webhooks_Router {

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
        }

        public function register_routes() {
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/webhooks/postmark', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'handle_postmark_webhook'],
                'permission_callback' => [BYS_Groups_Permissions::class, 'verify_postmark_token'],
            ]);
        }

        /**
         * POST /webhooks/postmark
         *
         * Handles Delivery, Bounce, and SpamComplaint events from Postmark
         * Token verification runs in permission_callback
         *
         */
        public function handle_postmark_webhook($request) {
            $body = $request->get_json_params();
            if (empty($body)) {
                return new \WP_REST_Response(['ok' => true], 200);
            }

            $record_type = $body['RecordType'] ?? '';
            $message_id  = $body['MessageID'] ?? '';

            if (empty($record_type) || empty($message_id)) {
                return new \WP_REST_Response(['ok' => true], 200);
            }

            $update_data   = [];
            $update_format = [];

            // Map Postmark events to delivery status
            switch ($record_type) {
                case 'Delivery':
                    $update_data['delivery_status'] = 'delivered';
                    $update_data['delivered_at']    = current_time('mysql');
                    $update_format = ['%s', '%s'];
                    break;

                case 'Bounce':
                    $update_data['delivery_status'] = 'bounced';
                    $update_data['bounce_type']     = $body['Details']['BounceType'] ?? 'unknown';
                    $update_data['delivered_at']    = current_time('mysql');
                    $update_format = ['%s', '%s', '%s'];
                    break;

                case 'SpamComplaint':
                    $update_data['delivery_status'] = 'spam';
                    $update_data['delivered_at']    = current_time('mysql');
                    $update_format = ['%s', '%s'];
                    break;

                default:
                    // Unknown record type — acknowledge but don't process
                    return new \WP_REST_Response(['ok' => true], 200);
            }

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_COMMS_TABLE;

            // Read current status to prevent downgrades
            $current_row = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT delivery_status FROM {$table} WHERE message_id = %s",
                    $message_id
                ),
                ARRAY_A
            );

            $current_status = $current_row['delivery_status'] ?? 'pending';
            $new_status     = $update_data['delivery_status'];

            // Status hierarchy: pending < delivered < bounced/spam
            $status_order = ['pending' => 0, 'delivered' => 1, 'bounced' => 2, 'spam' => 2];
            $current_rank = $status_order[$current_status] ?? 0;
            $new_rank     = $status_order[$new_status] ?? 0;

            if ($new_rank >= $current_rank) {
                $wpdb->update(
                    $table,
                    $update_data,
                    ['message_id' => $message_id],
                    $update_format,
                    ['%s']
                );
            }

            return new \WP_REST_Response(['ok' => true], 200);
        }
    }
}
