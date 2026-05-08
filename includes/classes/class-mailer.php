<?php
/**
 * Mailer plugin class
 *
 * @package BYS_Groups
 * @since 1.0.0
 */
if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('BYS_Groups_Mailer')) {
    class BYS_Groups_Mailer {

        public function __construct() {
            // error_log('[BYS_Groups_Mailer] Class instantiated');
        }


        /**
         * Send group communication emails via Postmark API.
         *
         * @param int $group_id Group post ID
         * @param string $prompt_type Prompt type (password-reset, course-progress, assessment-deadline, welcome-reminder, custom)
         * @param string $recipient_type Recipient filter (group, individual, condition)
         * @param array $recipient_ids User IDs for 'individual' type, empty for others
         * @param string $custom_subject Custom subject for 'custom' prompt type
         * @param string $custom_message Custom message body for 'custom' prompt type
         * @return array Array with 'success', 'sent_count', 'errors' keys
         */
        public function send_group_communication(
            $group_id,
            $prompt_type,
            $recipient_type,
            $recipient_ids = array(),
            $custom_subject = '',
            $custom_message = '',
            $scheduled_at = ''
        ) {
            // Validate recipient type
            $valid_types = array('group', 'individual', 'condition');
            if (!in_array($recipient_type, $valid_types, true)) {
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('Invalid recipient type'),
                );
            }

            // Validate group leader
            $user_id = get_current_user_id();
            if (!$user_id || !$this->is_user_group_leader($user_id, $group_id)) {
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('User is not a group leader for this group'),
                );
            }

            // Get sender info
            $sender = get_user_by('ID', $user_id);
            $sender_email = $sender ? $sender->user_email : get_bloginfo('admin_email');

            // Get group info
            $group = get_post($group_id);
            if (!$group) {
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('Invalid group'),
                );
            }
            $group_name = $group->post_title;

            // Resolve recipients with user data
            $recipients_data = $this->get_recipients_with_names($group_id, $recipient_type, $recipient_ids);
            if (empty($recipients_data)) {
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('No recipients found'),
                );
            }

            // Get Postmark token
            $postmark_token = get_option('bys_postmark_token', '');
            if (empty($postmark_token)) {
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('Postmark token not configured'),
                );
            }

            // Load email template functions
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/emails/group-comms.php';

            // Generate batch ID for this send
            $batch_id = wp_generate_uuid4();
            error_log("[Mailer::send_group_communication] Generated batch_id: $batch_id");

            // Build Postmark batch payload
            $messages = array();
            foreach ($recipients_data as $recipient) {
                $recipient_email = $recipient['email'];
                $recipient_name = $recipient['name'];

                // Get email content based on prompt type
                if ($prompt_type === 'custom') {
                    $email = bys_get_custom_email($custom_subject, $custom_message);
                } else {
                    $email = bys_get_comm_email($prompt_type, array(
                        'group_name' => $group_name,
                        'recipient_name' => $recipient_name,
                        'site_name' => get_bloginfo('name'),
                        'site_url' => home_url(),
                        'sender_email' => $sender_email,
                    ));
                }

                // Validate email template
                if (empty($email['subject']) || empty($email['html'])) {
                    continue;
                }

                // Add to batch
                $messages[] = array(
                    'From' => get_bloginfo('admin_email'),
                    'To' => $recipient_email,
                    'Subject' => $email['subject'],
                    'HtmlBody' => $email['html'],
                    'TextBody' => $email['plain'],
                    'Tag' => $prompt_type,
                    'Metadata' => array(
                        'group_id' => (string)$group_id,
                        'sender_user_id' => (string)$user_id,
                        'prompt_type' => $prompt_type,
                        'batch_id' => $batch_id,
                    ),
                );
            }

            if (empty($messages)) {
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('Failed to build email payloads'),
                );
            }

            // If scheduled for later, queue the emails instead of sending immediately
            if (!empty($scheduled_at)) {
                return $this->queue_scheduled_emails(
                    $messages,
                    $group_id,
                    $prompt_type,
                    $user_id,
                    $batch_id,
                    $scheduled_at
                );
            }

            // Build the JSON payload - /email/batch expects an array of messages, not wrapped in an object
            $json_body = wp_json_encode($messages);

            if (false === $json_body) {
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('Failed to encode payload as JSON'),
                );
            }

            // Send via Postmark API
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
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('Postmark API error: ' . $response->get_error_message()),
                );
            }

            $status_code = wp_remote_retrieve_response_code($response);
            $response_body_raw = wp_remote_retrieve_body($response);
            $response_body = json_decode($response_body_raw, true);

            if ($status_code !== 200) {
                $error_msg = isset($response_body['Message']) ? $response_body['Message'] : 'Unknown Postmark error';
                // Log the actual response for debugging
                error_log('[BYS_Groups_Mailer] Postmark API error: Status ' . $status_code . ', Message: ' . $error_msg . ', Full response: ' . wp_json_encode($response_body));
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array($error_msg),
                );
            }

            // Log successful sends to bys_group_communication_log
            global $wpdb;
            $sent_count = 0;

            // Postmark /email/batch returns an array directly, not wrapped in 'Messages'
            $results = is_array($response_body) ? $response_body : ($response_body['Messages'] ?? array());

            foreach ((array)$results as $index => $result) {
                // Check if send was successful (ErrorCode 0 means success)
                if (!isset($result['ErrorCode']) || (int)$result['ErrorCode'] === 0) {
                    $message_id = $result['MessageID'] ?? '';
                    if (!empty($message_id)) {
                        $wpdb->insert(
                            $wpdb->prefix . BYS_GROUPS_COMMS_TABLE,
                            array(
                                'message_id' => $message_id,
                                'recipient_email' => $messages[$index]['To'],
                                'group_id' => $group_id,
                                'sender_user_id' => $user_id,
                                'prompt_type' => $prompt_type,
                                'batch_id' => $batch_id,
                                'delivery_status' => 'pending',
                                'created_at' => current_time('mysql'),
                            ),
                            array('%s', '%s', '%d', '%d', '%s', '%s', '%s', '%s')
                        );
                        if (!$wpdb->last_error) {
                            $sent_count++;
                        }
                    }
                }
            }

            return array(
                'success' => $sent_count > 0,
                'sent_count' => $sent_count,
                'errors' => array(),
            );
        }

        /**
         * Resolve recipients with email and display name for personalization.
         *
         * @param int $group_id Group post ID
         * @param string $recipient_type Recipient filter (group, individual, condition)
         * @param array $recipient_ids User IDs for 'individual' type
         * @return array Array of arrays with 'email' and 'name' keys
         */
        private function get_recipients_with_names($group_id, $recipient_type, $recipient_ids = array()) {
            $recipients = array();

            if ($recipient_type === 'individual' && !empty($recipient_ids)) {
                // Specific user IDs
                foreach ($recipient_ids as $user_id) {
                    $user = get_user_by('ID', $user_id);
                    if ($user && !empty($user->user_email)) {
                        $recipients[] = array(
                            'email' => $user->user_email,
                            'name' => !empty($user->display_name) ? $user->display_name : $user->user_login,
                        );
                    }
                }
            } else {
                // All group members (for 'group' or 'condition' types)
                $recipients = $this->get_group_users_with_names($group_id);
            }

            // Remove duplicates by email
            $seen = array();
            $unique = array();
            foreach ($recipients as $recipient) {
                if (!isset($seen[$recipient['email']])) {
                    $seen[$recipient['email']] = true;
                    $unique[] = $recipient;
                }
            }

            return $unique;
        }

        /**
         * Get group members with email and display names via LearnDash API.
         *
         * @param int $group_id Group post ID
         * @return array Array of arrays with 'email' and 'name' keys
         */
        private function get_group_users_with_names($group_id) {
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-auth.php';
            $auth_header = BYS_Groups_Auth::get_auth_header();

            if (!$auth_header) {
                return array();
            }

            $group_users = array();
            $page = 1;
            $per_page = 100;

            do {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/users?_fields=id&per_page={$per_page}&page={$page}";

                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array('Authorization' => $auth_header),
                    'sslverify' => false,
                ));

                if (is_wp_error($response)) {
                    return array();
                }

                $status = wp_remote_retrieve_response_code($response);
                if ($status !== 200) {
                    return array();
                }

                $page_users = json_decode(wp_remote_retrieve_body($response), true);
                if (!is_array($page_users)) {
                    return array();
                }

                if (empty($page_users)) {
                    break;
                }

                $group_users = array_merge($group_users, $page_users);
                $page++;
            } while (count($page_users) === $per_page);

            // Extract user IDs and fetch with names
            $user_ids = array_column($group_users, 'id');
            $recipients = array();

            foreach ($user_ids as $user_id) {
                $user = get_user_by('ID', $user_id);
                if ($user && !empty($user->user_email)) {
                    $recipients[] = array(
                        'email' => $user->user_email,
                        'name' => !empty($user->display_name) ? $user->display_name : $user->user_login,
                    );
                }
            }

            return $recipients;
        }

        /**
         * Resolve recipient emails based on recipient type and filters.
         *
         * @param int $group_id Group post ID
         * @param string $recipient_type Recipient filter (group, individual, condition)
         * @param array $recipient_ids User IDs for 'individual' type
         * @return array Array of unique email addresses
         */
        private function get_recipients_emails($group_id, $recipient_type, $recipient_ids = array()) {
            $emails = array();

            if ($recipient_type === 'individual' && !empty($recipient_ids)) {
                // Specific user IDs
                foreach ($recipient_ids as $user_id) {
                    $user = get_user_by('ID', $user_id);
                    if ($user && !empty($user->user_email)) {
                        $emails[] = $user->user_email;
                    }
                }
            } else {
                // All group members (for 'group' or 'condition' types)
                $emails = $this->get_group_users_emails($group_id);
            }

            $unique_emails = array_unique($emails);
            return $unique_emails;
        }

        /**
         * Check if user is a group leader of a specific group.
         *
         * @param int $user_id User ID
         * @param int $group_id Group post ID
         * @return bool True if user is group leader, false otherwise
         */
        private function is_user_group_leader($user_id, $group_id) {
            $is_leader = get_user_meta($user_id, 'learndash_group_leaders_' . $group_id, true);
            return !empty($is_leader);
        }

        /**
         * Get email addresses of group members via LearnDash API with pagination.
         *
         * @param int $group_id Group post ID
         * @return array Array of unique email addresses, empty array on error
         */
        private function get_group_users_emails($group_id) {
            // Get auth header
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-auth.php';
            $auth_header = BYS_Groups_Auth::get_auth_header();

            if (!$auth_header) {
                // error_log("[BYS_Mailer::get_group_users_emails] API credentials not configured");
                return array();
            }

            // Fetch group users from LearnDash API
            $group_users = array();
            $page = 1;
            $per_page = 100;

            do {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/users?_fields=id&per_page={$per_page}&page={$page}";

                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array(
                        'Authorization' => $auth_header,
                    ),
                    'sslverify' => false,
                ));

                if (is_wp_error($response)) {
                    // error_log("[BYS_Mailer::get_group_users_emails] LD API error: " . $response->get_error_message());
                    return array();
                }

                $status = wp_remote_retrieve_response_code($response);
                $body = wp_remote_retrieve_body($response);

                if ($status !== 200) {
                    // error_log("[BYS_Mailer::get_group_users_emails] LD API HTTP {$status}");
                    return array();
                }

                $page_users = json_decode($body, true);
                if (!is_array($page_users)) {
                    // error_log("[BYS_Mailer::get_group_users_emails] Failed to decode JSON from API");
                    return array();
                }

                if (empty($page_users)) {
                    break;
                }

                $group_users = array_merge($group_users, $page_users);
                $page++;
            } while (count($page_users) === $per_page);

            if (empty($group_users)) {
                // error_log("[BYS_Mailer::get_group_users_emails] No group members found");
                return array();
            }

            // Extract user IDs and fetch email addresses
            $user_ids = array_column($group_users, 'id');
            $emails = array();

            foreach ($user_ids as $user_id) {
                $user = get_user_by('ID', $user_id);
                if ($user && !empty($user->user_email)) {
                    $emails[] = $user->user_email;
                }
            }

            // Remove duplicates and log count
            $unique_emails = array_unique($emails);
            // error_log("[BYS_Mailer::get_group_users_emails] Found " . count($unique_emails) . " unique group members");

            return $unique_emails;
        }

        /**
         * Queue emails to be sent at a scheduled time
         *
         * @param array $messages Postmark messages to send
         * @param int $group_id Group ID
         * @param string $prompt_type Prompt type
         * @param int $user_id Sender user ID
         * @param string $batch_id Batch ID
         * @param string $scheduled_at UTC ISO 8601 datetime when to send
         * @return array Response array with success, sent_count, errors
         */
        private function queue_scheduled_emails($messages, $group_id, $prompt_type, $user_id, $batch_id, $scheduled_at) {
            global $wpdb;

            // Validate scheduled_at is a valid future datetime and convert to MySQL format
            $scheduled_timestamp = strtotime($scheduled_at);
            if (!$scheduled_timestamp || $scheduled_timestamp <= current_time('timestamp')) {
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('Scheduled time must be in the future'),
                );
            }

            // Convert ISO 8601 string to MySQL UTC format (use gmdate, not wp_date, to stay in UTC)
            $scheduled_mysql = gmdate('Y-m-d H:i:s', $scheduled_timestamp);

            // Store emails in database with scheduled_at
            // Note: message_id will be populated when the email is actually sent
            $inserted_count = 0;
            foreach ($messages as $message) {
                $recipient_email = $message['To'];
                $subject = $message['Subject'] ?? '';
                $body_html = $message['HtmlBody'] ?? null;
                $body_text = $message['TextBody'] ?? null;

                $inserted = $wpdb->insert(
                    $wpdb->prefix . BYS_GROUPS_COMMS_TABLE,
                    array(
                        'message_id' => null,
                        'recipient_email' => $recipient_email,
                        'group_id' => $group_id,
                        'sender_user_id' => $user_id,
                        'prompt_type' => $prompt_type,
                        'batch_id' => $batch_id,
                        'subject' => $subject,
                        'body_html' => $body_html,
                        'body_text' => $body_text,
                        'delivery_status' => 'scheduled',
                        'scheduled_at' => $scheduled_mysql,
                        'created_at' => current_time('mysql'),
                    ),
                    array('%s', '%s', '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s')
                );

                if ($inserted) {
                    $inserted_count++;
                }
            }

            // Schedule via Action Scheduler if available, otherwise fallback to WordPress cron
            if (function_exists('as_schedule_single_action')) {
                // Use Action Scheduler
                as_schedule_single_action(
                    $scheduled_timestamp,
                    'bys_groups_send_scheduled_emails',
                    array($batch_id)
                );
                error_log("[Mailer::queue_scheduled_emails] Scheduled batch $batch_id via Action Scheduler for timestamp: $scheduled_timestamp");
            } else {
                // Fallback to WordPress cron
                $hook_name = 'bys_groups_send_scheduled_emails';
                if (!wp_next_scheduled($hook_name, array($batch_id))) {
                    wp_schedule_single_event($scheduled_timestamp, $hook_name, array($batch_id));
                    error_log("[Mailer::queue_scheduled_emails] Scheduled batch $batch_id via WordPress cron for timestamp: $scheduled_timestamp");
                }
            }

            return array(
                'success' => true,
                'sent_count' => $inserted_count,
                'errors' => array(),
                'message' => 'Emails scheduled for ' . wp_date('j M Y, H:i', $scheduled_timestamp) . ' (UTC)',
            );
        }
    }
}