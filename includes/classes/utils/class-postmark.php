<?php
/**
 * Postmark API utility.
 *
 * Stateless helpers for the Postmark Messages API.
 * Consumed by BYS_Groups_Communications_Router and BYS_Groups_Groups_Router
 * wherever delivery status needs to be resolved from MessageEvents.
 *
 * @package BYS_Groups
 * @since 1.1.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Postmark')) {
    class BYS_Groups_Postmark {

        /**
         * Fetch message details from the Postmark Messages API.
         * Returns the decoded response or null on any error.
         */
        public static function fetch_message_detail($message_id, $postmark_token) {
            $url = "https://api.postmarkapp.com/messages/outbound/{$message_id}/details";

            $response = wp_remote_get($url, [
                'headers' => [
                    'X-Postmark-Server-Token' => $postmark_token,
                    'Accept'                  => 'application/json',
                ],
                'timeout'   => 10,
                'sslverify' => true,
            ]);

            if (is_wp_error($response)) {
                error_log("[BYS_Groups_Postmark::fetch_message_detail] WP Error for message_id $message_id: " . $response->get_error_message());
                return null;
            }

            $status = wp_remote_retrieve_response_code($response);
            if ($status !== 200) {
                $body = wp_remote_retrieve_body($response);
                error_log("[BYS_Groups_Postmark::fetch_message_detail] Status $status for message_id $message_id: $body");
                return null;
            }

            $decoded = json_decode(wp_remote_retrieve_body($response), true);
            if (!$decoded) {
                error_log("[BYS_Groups_Postmark::fetch_message_detail] Failed to decode JSON for message_id $message_id");
                return null;
            }

            return $decoded;
        }

        /**
         * Reduce a Postmark MessageEvents array to a delivery status + bounce type.
         * Picks the latest event of each type, then applies priority order:
         *   Bounced > SubscriptionChanged > Delivered > Opened/LinkClicked > Transient.
         */
        public static function extract_delivery_status_from_events($events) {
            $status      = 'pending';
            $bounce_type = null;

            if (empty($events) || !is_array($events)) {
                return ['status' => $status, 'bounce_type' => $bounce_type];
            }

            // Index events by type, keeping the latest per type
            $events_by_type = [];
            foreach ($events as $event) {
                $type        = $event['Type'] ?? '';
                $received_at = $event['ReceivedAt'] ?? '';
                if (!empty($type)) {
                    if (!isset($events_by_type[$type]) || $received_at > $events_by_type[$type]['ReceivedAt']) {
                        $events_by_type[$type] = $event;
                    }
                }
            }

            // Priority order
            if (isset($events_by_type['Bounced'])) {
                $status      = 'bounced';
                $bounce_type = $events_by_type['Bounced']['Details']['Summary'] ?? 'unknown';
            } elseif (isset($events_by_type['SubscriptionChanged'])) {
                $status = 'spam';
            } elseif (isset($events_by_type['Delivered'])) {
                $status = 'delivered';
            } elseif (isset($events_by_type['Opened']) || isset($events_by_type['LinkClicked'])) {
                $status = 'delivered'; // opened/clicked implies delivered
            } elseif (isset($events_by_type['Transient'])) {
                $status = 'pending'; // temporary failure
            }

            return ['status' => $status, 'bounce_type' => $bounce_type];
        }
    }
}
