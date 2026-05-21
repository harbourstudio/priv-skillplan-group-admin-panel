<?php
/**
 * Communications Router
 *
 * Endpoints for reading sent-communication records (cross-group views).
 * Group-scoped communications endpoints (/groups/{id}/send-communication,
 * /groups/{id}/communication-log, etc.) live in Groups_Router.
 *
 *   GET /communications/batch/{batch_id}/recipients — all recipients in a batch
 *   GET /communications/{message_id}/detail         — full subject + body for one message (Postmark MessageID OR DB row id as fallback)
 *
 * @package BYS_Groups
 * @since 1.1.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Communications_Router')) {
    class BYS_Groups_Communications_Router {

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
        }

        public function register_routes() {
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/communications/batch/(?P<batch_id>[a-zA-Z0-9\-]+)/recipients', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_communication_recipients'],
                'permission_callback' => 'is_user_logged_in',
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/communications/(?P<message_id>[a-zA-Z0-9\-]+)/detail', [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_communication_detail'],
                'permission_callback' => 'is_user_logged_in',
            ]);
        }

        // ─── REST callbacks ─────────────────────────────────────────────────

        /**
         * GET /communications/batch/{batch_id}/recipients
         * Returns all recipients in a batch send with live Postmark delivery status.
         * Self-heals: writes back any status drift to the DB so subsequent queries
         * don't re-hit Postmark and stay in sync independent of the webhook.
         */
        public function get_communication_recipients($request) {
            $batch_id = sanitize_text_field($request['batch_id']);
            if (empty($batch_id)) return new WP_Error('bad_request', 'Missing batch_id', ['status' => 400]);

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_COMMS_TABLE;

            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT id, message_id, recipient_email, delivery_status, bounce_type, group_id
                     FROM {$table}
                     WHERE batch_id = %s",
                    $batch_id
                ),
                ARRAY_A
            );

            if (empty($rows)) return new WP_Error('not_found', 'Batch not found', ['status' => 404]);

            // Authorization: current user must have access to the batch's group.
            $group_id = (int) ($rows[0]['group_id'] ?? 0);
            if (!BYS_Groups_Permissions::can_access_group($group_id)) {
                return new WP_Error('forbidden', 'Forbidden.', ['status' => 403]);
            }

            $postmark_token = get_option('bys_postmark_token', '');

            $recipients = [];
            foreach ($rows as $row) {
                $user         = get_user_by('email', $row['recipient_email']);
                $display_name = $user ? ($user->display_name ?: $user->user_login) : $row['recipient_email'];

                $delivery_status = $row['delivery_status'] ?? 'pending';
                $bounce_type     = $row['bounce_type'];

                // Fetch live status from Postmark — skip for rows that never reached it
                // (failed/scheduled rows have message_id = NULL; their DB status is authoritative)
                if (!empty($postmark_token) && !empty($row['message_id'])) {
                    $pm_detail = BYS_Groups_Postmark::fetch_message_detail($row['message_id'], $postmark_token);
                    if ($pm_detail && !empty($pm_detail['MessageEvents'])) {
                        $status_info     = BYS_Groups_Postmark::extract_delivery_status_from_events($pm_detail['MessageEvents']);
                        $delivery_status = $status_info['status'];
                        $bounce_type     = $status_info['bounce_type'];

                        // write-back in the DB in sync with live Postmark status
                        $stored_status = $row['delivery_status'] ?? 'pending';
                        if ($delivery_status !== $stored_status || ($bounce_type && $bounce_type !== $row['bounce_type'])) {
                            $update_data   = ['delivery_status' => $delivery_status];
                            $update_format = ['%s'];
                            if ($bounce_type) {
                                $update_data['bounce_type'] = $bounce_type;
                                $update_format[] = '%s';
                            }
                            if ($delivery_status === 'delivered') {
                                $update_data['delivered_at'] = current_time('mysql');
                                $update_format[] = '%s';
                            }
                            $wpdb->update(
                                $table,
                                $update_data,
                                ['id' => (int) $row['id']],
                                $update_format,
                                ['%d']
                            );
                        }
                    }
                }

                $recipients[] = [
                    'id'              => (int) $row['id'],
                    'message_id'      => $row['message_id'],
                    'recipient_name'  => $display_name,
                    'recipient_email' => $row['recipient_email'],
                    'delivery_status' => $delivery_status,
                    'bounce_type'     => $bounce_type,
                ];
            }

            return $recipients;
        }

        /**
         * GET /communications/{message_id}/detail
         * Returns subject + body for a single message. The route param is normally
         * a Postmark MessageID, but for rows that never reached Postmark (failed
         * sends, scheduled sends) the frontend may pass the DB row id as a fallback.
         */
        public function get_communication_detail($request) {
            $identifier = sanitize_text_field($request['message_id']);
            if (empty($identifier)) return new WP_Error('bad_request', 'Missing identifier', ['status' => 400]);

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_COMMS_TABLE;

            $msg_row = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT id, message_id, recipient_email, delivery_status, bounce_type, sender_user_id, subject, body_html, body_text, group_id
                     FROM {$table}
                     WHERE message_id = %s OR id = %d",
                    $identifier,
                    is_numeric($identifier) ? (int) $identifier : 0
                ),
                ARRAY_A
            );

            if (!$msg_row) return new WP_Error('not_found', 'Message not found', ['status' => 404]);

            // Authorization: actor must have access to the message's group
            $group_id = (int) ($msg_row['group_id'] ?? 0);
            if (!BYS_Groups_Permissions::can_access_group($group_id)) {
                return new WP_Error('forbidden', 'Forbidden.', ['status' => 403]);
            }

            $message_id      = $msg_row['message_id'];
            $delivery_status = $msg_row['delivery_status'] ?? 'pending';
            $bounce_type     = $msg_row['bounce_type'];
            $delivered_at    = null;

            $postmark_body  = null;
            $postmark_token = get_option('bys_postmark_token', '');

            // Try Postmark for rows that actually reached it. Failed rows are rendered
            // entirely from the DB snapshot stored at send time.
            if (!empty($message_id) && !empty($postmark_token)) {
                $postmark_body = BYS_Groups_Postmark::fetch_message_detail($message_id, $postmark_token);

                if ($postmark_body && !empty($postmark_body['MessageEvents']) && is_array($postmark_body['MessageEvents'])) {
                    $status_info     = BYS_Groups_Postmark::extract_delivery_status_from_events($postmark_body['MessageEvents']);
                    $delivery_status = $status_info['status'];
                    $bounce_type     = $status_info['bounce_type'];

                    // Pick the most relevant delivered_at from the events
                    $events_by_type = [];
                    foreach ($postmark_body['MessageEvents'] as $event) {
                        $type        = $event['Type'] ?? '';
                        $received_at = $event['ReceivedAt'] ?? '';
                        if (!empty($type)) {
                            if (!isset($events_by_type[$type]) || $received_at > $events_by_type[$type]['ReceivedAt']) {
                                $events_by_type[$type] = $event;
                            }
                        }
                    }

                    if (isset($events_by_type['Delivered'])) {
                        $delivered_at = $events_by_type['Delivered']['ReceivedAt'] ?? null;
                    } elseif (isset($events_by_type['Opened'])) {
                        $delivered_at = $events_by_type['Opened']['ReceivedAt'] ?? null;
                    } elseif (isset($events_by_type['Bounced'])) {
                        $delivered_at = $events_by_type['Bounced']['ReceivedAt'] ?? null;
                    }

                    // Self-healing write-back: store live Postmark status so subsequent
                    // queries reflect it without re-hitting Postmark
                    $stored_status = $msg_row['delivery_status'] ?? 'pending';
                    if ($delivery_status !== $stored_status || ($bounce_type && $bounce_type !== $msg_row['bounce_type'])) {
                        $update_data   = ['delivery_status' => $delivery_status];
                        $update_format = ['%s'];
                        if ($bounce_type) {
                            $update_data['bounce_type'] = $bounce_type;
                            $update_format[] = '%s';
                        }
                        if ($delivery_status === 'delivered' && $delivered_at) {
                            // Use Postmark's ReceivedAt so the DB reflects actual delivery time,
                            // not the moment the leader happened to open the modal
                            $delivered_ts = strtotime($delivered_at);
                            $update_data['delivered_at'] = $delivered_ts
                                ? gmdate('Y-m-d H:i:s', $delivered_ts)
                                : current_time('mysql');
                            $update_format[] = '%s';
                        }
                        $wpdb->update(
                            $table,
                            $update_data,
                            ['id' => (int) $msg_row['id']],
                            $update_format,
                            ['%d']
                        );
                    }
                }
            }

            $user         = get_user_by('email', $msg_row['recipient_email']);
            $display_name = $user ? ($user->display_name ?: $user->user_login) : $msg_row['recipient_email'];

            // Subject: prefer Postmark, fall back to DB snapshot
            $subject = $postmark_body['Subject'] ?? $msg_row['subject'] ?? '(No subject)';
            if (empty($subject)) $subject = '(No subject)';

            // Body HTML: prefer Postmark, fall back to DB snapshot; strip meta/style tags
            $html_body = $postmark_body['HtmlBody'] ?? $msg_row['body_html'] ?? '';
            if (!empty($html_body)) {
                $html_body = preg_replace('/<meta[^>]*>/i', '', $html_body);
                $html_body = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $html_body);
                $html_body = preg_replace('/\s{2,}/s', ' ', $html_body);
                $html_body = trim($html_body);
            }

            // Plain-text body: same fallback chain
            $text_body = $postmark_body['TextBody'] ?? $msg_row['body_text'] ?? '';

            return [
                'message_id'      => $message_id,
                'subject'         => $subject,
                'recipient_name'  => $display_name,
                'recipient_email' => $msg_row['recipient_email'],
                'delivery_status' => $delivery_status,
                'bounce_type'     => $bounce_type,
                'delivered_at'    => $delivered_at,
                'body_html'       => $html_body,
                'body_text'       => $text_body,
            ];
        }

    }
}
