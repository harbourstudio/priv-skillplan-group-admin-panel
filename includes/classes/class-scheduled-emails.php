<?php
/**
 * Scheduled Emails Handler
 *
 * Processes and sends emails that were queued for future delivery
 *
 * @package BYS_Groups
 * @since 1.0.0
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Scheduled_Emails')) {
    class BYS_Groups_Scheduled_Emails {

        public function __construct() {
            add_action('bys_groups_send_scheduled_emails', array($this, 'send_scheduled_batch'));
        }

        /**
         * Send a batch of scheduled emails
         *
         * @param string $batch_id The batch ID of emails to send
         */
        public function send_scheduled_batch($batch_id) {
            global $wpdb;

            // Fetch all scheduled emails for this batch
            // Use gmdate('Y-m-d H:i:s') for UTC time since scheduled_at is stored in UTC
            $utc_now = gmdate('Y-m-d H:i:s');
            error_log("[BYS_Groups_Scheduled_Emails] Checking batch $batch_id at UTC: $utc_now");

            $emails = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . "
                     WHERE batch_id = %s
                     AND delivery_status = 'scheduled'
                     AND scheduled_at <= %s",
                    $batch_id,
                    $utc_now
                ),
                ARRAY_A
            );

            if (empty($emails)) {
                error_log("[BYS_Groups_Scheduled_Emails] No scheduled emails found for batch: $batch_id");
                return;
            }

            error_log("[BYS_Groups_Scheduled_Emails] Found " . count($emails) . " emails to send for batch: $batch_id");

            // Get Postmark token
            $postmark_token = get_option('bys_postmark_token', '');
            if (empty($postmark_token)) {
                error_log("[BYS_Groups_Scheduled_Emails] Postmark token not configured");
                return;
            }

            // Get first email to fetch sender and group info
            $first_email = reset($emails);
            $sender_user_id = $first_email['sender_user_id'];
            $group_id = $first_email['group_id'];
            $prompt_type = $first_email['prompt_type'];

            // Get sender and group info
            $sender = get_user_by('ID', $sender_user_id);
            $sender_email = $sender ? $sender->user_email : get_bloginfo('admin_email');
            $group = get_post($group_id);
            $group_name = $group ? $group->post_title : '';

            // Load email template functions
            if (!function_exists('bys_get_comm_email')) {
                require_once BYS_GROUPS_PLUGIN_DIR . 'includes/emails/general.php';
            }

            if (!function_exists('bys_get_comm_email')) {
                error_log("[BYS_Groups_Scheduled_Emails] Function bys_get_comm_email not found");
                return;
            }

            // Build Postmark batch payload
            $messages = array();
            $email_ids_map = array(); // Map message to db row for updating message_id later

            foreach ($emails as $email_row) {
                $recipient_email = $email_row['recipient_email'];

                // Opt-out check runs at SEND time (not queue time) so a user
                // who opts out between scheduled time and SEND time is honoured.
                // Convert 'scheduled' to 'comms_disabled' in place
                $recipient_user = get_user_by('email', $recipient_email);
                if ($recipient_user && !bys_groups_user_can_receive_comms((int) $recipient_user->ID)) {
                    $wpdb->update(
                        $wpdb->prefix . BYS_GROUPS_COMMS_TABLE,
                        ['delivery_status' => 'comms_disabled'],
                        ['id' => (int) $email_row['id']],
                        ['%s'],
                        ['%d']
                    );
                    continue;
                }

                // Get recipient name from email (basic extraction, can be improved)
                $recipient_name = explode('@', $recipient_email)[0];

                // Get email content based on prompt type
                if ($prompt_type === 'custom') {
                    // Custom emails: subject and body were stored in DB at queue time
                    $email_content = array(
                        'subject' => $email_row['subject'] ?? '',
                        'html'    => $email_row['body_html'] ?? '',
                        'plain'   => $email_row['body_text'] ?? '',
                    );
                } else {
                    try {
                        $email_content = bys_get_comm_email($prompt_type, array(
                            'group_name' => $group_name,
                            'recipient_name' => $recipient_name,
                            'site_name' => get_bloginfo('name'),
                            'site_url' => home_url(),
                            'sender_email' => $sender_email,
                        ));
                    } catch (Exception $e) {
                        error_log("[BYS_Groups_Scheduled_Emails] Error getting email content: " . $e->getMessage());
                        continue;
                    }
                }

                if (empty($email_content) || empty($email_content['subject']) || empty($email_content['html'])) {
                    error_log("[BYS_Groups_Scheduled_Emails] Empty email content for recipient: $recipient_email");
                    continue;
                }

                // Add to batch
                $message = array(
                    'From' => BYS_Groups_Postmark::get_from_email(),
                    'To' => $recipient_email,
                    'Subject' => $email_content['subject'],
                    'HtmlBody' => $email_content['html'],
                    'TextBody' => $email_content['plain'],
                    'Tag' => $prompt_type,
                    'Metadata' => array(
                        'group_id' => (string)$group_id,
                        'sender_user_id' => (string)$sender_user_id,
                        'prompt_type' => $prompt_type,
                        'batch_id' => $batch_id,
                    ),
                );

                $messages[] = $message;
                // Map the message index to the DB row ID for updating message_id later
                $email_ids_map[count($messages) - 1] = $email_row['id'];
                error_log("[BYS_Groups_Scheduled_Emails] Added message for $recipient_email with subject: " . $email_content['subject']);
            }

            if (empty($messages)) {
                error_log("[BYS_Groups_Scheduled_Emails] No valid messages to send for batch: $batch_id");
                return;
            }

            // Send via Postmark API
            $json_body = wp_json_encode($messages);

            $response = wp_remote_post(
                'https://api.postmarkapp.com/email/batch',
                array(
                    'headers' => array(
                        'X-Postmark-Server-Token' => $postmark_token,
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                    ),
                    'body' => $json_body,
                    'timeout' => 30,
                    'sslverify' => true,
                )
            );

            // Handle API errors
            if (is_wp_error($response)) {
                error_log("[BYS_Groups_Scheduled_Emails] Postmark API error: " . $response->get_error_message());
                return;
            }

            $status_code = wp_remote_retrieve_response_code($response);
            $response_body_raw = wp_remote_retrieve_body($response);
            $response_body = json_decode($response_body_raw, true);

            if ($status_code !== 200) {
                $error_msg = isset($response_body['Message']) ? $response_body['Message'] : 'Unknown error';
                error_log("[BYS_Groups_Scheduled_Emails] Postmark error: Status $status_code, Message: $error_msg");
                return;
            }

            // Update DB with Postmark message IDs and delivery status
            $results = is_array($response_body) ? $response_body : ($response_body['Messages'] ?? array());

            foreach ((array)$results as $index => $result) {
                if (!isset($email_ids_map[$index])) {
                    continue;
                }

                $db_row_id = $email_ids_map[$index];
                $message_id = $result['MessageID'] ?? null;
                $error_code = $result['ErrorCode'] ?? 0;

                if ($error_code === 0 && $message_id) {
                    // Success - update with real message ID and change status to pending (waiting for delivery)
                    $wpdb->update(
                        $wpdb->prefix . BYS_GROUPS_COMMS_TABLE,
                        array(
                            'message_id' => $message_id,
                            'delivery_status' => 'pending',
                        ),
                        array('id' => $db_row_id),
                        array('%s', '%s'),
                        array('%d')
                    );
                    error_log("[BYS_Groups_Scheduled_Emails] Sent scheduled email, message_id: $message_id");
                } else {
                    // Failure - log the error
                    $error_msg = $result['Message'] ?? 'Unknown error';
                    error_log("[BYS_Groups_Scheduled_Emails] Failed to send to index $index: $error_msg");
                }
            }

            error_log("[BYS_Groups_Scheduled_Emails] Batch $batch_id processed successfully");
        }
    }
}
