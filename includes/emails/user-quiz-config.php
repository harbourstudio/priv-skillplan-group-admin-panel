<?php
/**
 * User Quiz Config Email Templates
 *
 * Used by the group-user-quiz-config block when a group leader clicks
 * "Notify Learner" to inform a single learner about the start/end access
 * window set for them on a specific quiz.
 *
 * Returns the standard array shape used across this plugin's email helpers:
 *   'subject' => the email subject line
 *   'html'    => the full HTML email body
 *   'plain'   => plain-text fallback
 */

if (!defined('ABSPATH')) {
    exit;
}

// Reuse the shared template builder so visual styling matches other
// transactional emails sent by this plugin.
require_once BYS_GROUPS_PLUGIN_DIR . 'includes/emails/group-comms.php';

/**
 * Build the per-user quiz-access notification email.
 *
 * @param array $vars {
 *     @type string $recipient_name Learner's display name.
 *     @type string $site_name      Site name (header brand).
 *     @type string $site_url       Site URL.
 *     @type string $quiz_title     The quiz the access window applies to.
 *     @type string $quiz_url       Permalink to the quiz (used as CTA).
 *     @type string $start          UTC ISO-8601 datetime when access opens, or ''.
 *     @type string $end            UTC ISO-8601 datetime when access closes, or ''.
 *     @type string $sender_email   Group leader's email (for the footer reply hint).
 * }
 * @return array { subject, html, plain }
 */
function bys_get_quiz_access_notification_email(array $vars): array {
    $recipient_name = $vars['recipient_name'] ?? 'Learner';
    $site_name      = $vars['site_name']      ?? get_bloginfo('name');
    $site_url       = $vars['site_url']       ?? home_url();
    $quiz_title     = $vars['quiz_title']     ?? 'your quiz';
    $quiz_url       = $vars['quiz_url']       ?? $site_url;
    $start          = $vars['start']          ?? '';
    $end            = $vars['end']            ?? '';
    $sender_email   = $vars['sender_email']   ?? get_bloginfo('admin_email');

    $subject = sprintf('Quiz access window: %s', $quiz_title);
    $heading = sprintf('Access details for %s', $quiz_title);

    // Render the access window as a uniform "Opens / Closes" pair. Empty
    // bounds are surfaced as plain-language fallbacks rather than being
    // hidden, so the learner always sees both rows.
    $start_display = $start ? bys_format_local_datetime($start) : 'Accessible now';
    $end_display   = $end   ? bys_format_local_datetime($end)   : 'Accessible indefinitely';

    $window_html  = '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;">';
    $window_html .= sprintf(
        '<tr><td style="padding:4px 16px 4px 0;color:#6b7280;font-size:13px;">Opens: </td><td style="padding:4px 0;color:#111827;font-weight:600;font-size:14px;">%s</td></tr>',
        esc_html($start_display)
    );
    $window_html .= sprintf(
        '<tr><td style="padding:4px 16px 4px 0;color:#6b7280;font-size:13px;">Closes: </td><td style="padding:4px 0;color:#111827;font-weight:600;font-size:14px;">%s</td></tr>',
        esc_html($end_display)
    );
    $window_html .= '</table>';

    $intro = sprintf(
        '<p style="margin:0 0 16px;color:#374151;font-size:15px;">Your group leader has set the access window for <strong>%s</strong>.</p>',
        esc_html($quiz_title)
    );

    $content = $intro . $window_html;

    $footer_text = '';
    if (!empty($sender_email)) {
        $footer_text = sprintf(
            'Questions? Contact your group leader at <a href="mailto:%1$s">%1$s</a>.',
            esc_attr($sender_email)
        );
    }

    return bys_build_email_template(
        $subject,
        $heading,
        $content,
        $site_name,
        $site_url,
        $recipient_name,
        $quiz_url,
        sprintf('Open %s', $quiz_title),
        $footer_text
    );
}

/**
 * Format a UTC datetime string in the site's timezone for human-readable
 * email display. Falls back to the raw input if parsing fails.
 */
function bys_format_local_datetime(string $utc_iso): string {
    $ts = strtotime($utc_iso);
    if (!$ts) {
        return $utc_iso;
    }
    return wp_date('j M Y, H:i', $ts);
}
