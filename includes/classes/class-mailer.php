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
         * Send email via wp_mail()
         *
         * @param string|array $to Email recipient(s)
         * @param string $subject Email subject
         * @param string $message Email body (HTML)
         * @param array $args Optional additional arguments (from, from_name, headers, attachments)
         * @return bool True if email was processed, false otherwise
         */
        public function send($to, $subject, $message, $args = array()) {
            $defaults = array(
                'from'          => get_bloginfo('admin_email'),
                'from_name'     => get_bloginfo('name'),
                'headers'       => array(),
                'attachments'   => array(),
            );

            $args = wp_parse_args($args, $defaults);

            // Set content type to HTML
            add_filter('wp_mail_content_type', array($this, 'set_html_content_type'));

            // Build headers
            $headers = $args['headers'];
            if (!is_array($headers)) {
                $headers = array($headers);
            }
            $headers[] = 'From: ' . $args['from_name'] . ' <' . $args['from'] . '>';

            // $to_str = is_array($to) ? implode(',', $to) : $to;
            // error_log("[BYS_Mailer::send] Calling wp_mail() with to={$to_str}");

            try {
                $result = wp_mail(
                    $to,
                    $subject,
                    $message,
                    $headers,
                    $args['attachments']
                );

                // error_log("[BYS_Mailer::send] wp_mail result: " . ($result ? 'true' : 'false'));
            } catch (Exception $e) {
                $result = false;
            }

            // Remove filter
            remove_filter('wp_mail_content_type', array($this, 'set_html_content_type'));

            return $result;
        }

        /**
         * Set wp_mail content type to HTML
         *
         * @return string
         */
        public function set_html_content_type() {
            return 'text/html; charset=UTF-8';
        }

        /**
         * Send group communication emails based on prompt type and recipients.
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
            $custom_message = ''
        ) {
            // error_log( "[BYS_Mailer::send_group_communication] group_id={$group_id}, prompt_type={$prompt_type}, recipient_type={$recipient_type}" );

            // Validate recipient type
            $valid_types = array( 'group', 'individual', 'condition' );
            if ( ! in_array( $recipient_type, $valid_types, true ) ) {
                error_log( "[BYS_Mailer::send_group_communication] Invalid recipient_type: {$recipient_type}" );
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array( 'Invalid recipient type' ),
                );
            }

            // Validate group leader
            $user_id = get_current_user_id();

            if ( ! $user_id || ! $this->is_user_group_leader( $user_id, $group_id ) ) {
                error_log( "[BYS_Mailer::send_group_communication] User is not a group leader for this group" );

                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array( 'User is not a group leader for this group' ),
                );
            }

            // Get sender info
            $sender = get_user_by('ID', $user_id);
            $sender_email = $sender ? $sender->user_email : get_bloginfo('admin_email');

            // Get group info
            $group = get_post($group_id);

            if (!$group) {
                // error_log("[BYS_Mailer::send_group_communication] Invalid group");
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('Invalid group'),
                );
            }
            $group_name = $group->post_title;

            // Resolve recipients
            $recipient_emails = $this->get_recipients_emails($group_id, $recipient_type, $recipient_ids);
            if (empty($recipient_emails)) {
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('No recipients found'),
                );
            }

            // Get email template
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/emails/group-comms.php';

            if ($prompt_type === 'custom') {
                $email = bys_get_custom_email($custom_subject, $custom_message);
            } else {
                $email = bys_get_comm_email($prompt_type, array(
                    'group_name' => $group_name,
                    'recipient_name' => 'Learner',
                    'site_name' => get_bloginfo('name'),
                    'site_url' => home_url(),
                    'sender_email' => $sender_email,
                ));
            }

            // Validate email template
            if (empty($email['subject']) || empty($email['html'])) {
                // error_log("[BYS_Mailer::send_group_communication] ERROR: Empty subject or html from template");
                return array(
                    'success' => false,
                    'sent_count' => 0,
                    'errors' => array('Email template is empty'),
                );
            }

            $subject = $email['subject'];
            $html_body = $email['html'];

            // error_log("[BYS_Mailer::send_group_communication] Sending to " . count($recipient_emails) . " recipients");

            // Send to all recipients
            $result = $this->send(
                $recipient_emails,
                $subject,
                $html_body,
                array(
                    'from' => get_bloginfo('admin_email'),
                    'from_name' => get_bloginfo('name'),
                )
            );

            // Count recipients as sent (wp_mail either sends to all or none)
            $sent_count = $result ? count($recipient_emails) : 0;
            $errors = $result ? array() : array('Failed to send emails');

            return array(
                'success' => $sent_count > 0,
                'sent_count' => $sent_count,
                'errors' => $errors,
            );
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
    }
}