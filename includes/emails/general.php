<?php
/**
 * General Email Templates
 *
 * Hosts the shared HTML template builder and every transactional email
 * helper in this plugin EXCEPT the invitation email (see invite.php).
 *
 * bys_build_email_template()              — shared HTML template builder
 * bys_get_comm_email()                    — dispatcher for group-communication prompt emails
 * bys_get_quiz_access_notification_email() — per-user quiz-access notification
 * bys_format_local_datetime()             — UTC → local datetime helper
 *
 * All template functions return an array:
 *   'subject' => the email subject line
 *   'html'    => the full HTML email body (used when wp_mail sends HTML)
 *   'plain'   => plain-text fallback
 * ──────────────────────────────────────────────────────────────────────────────
 */

if (!defined('ABSPATH')) {
  exit;
}

/**
 * Build an email template with consistent styling matching invite.php.
 *
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_build_email_template(
	string $subject,
	string $heading,
	string $content,
	string $site_name,
	string $site_url,
	string $recipient_name = 'Learner',
	string $cta_url = '',
	string $cta_text = '',
	string $footer_text = ''
): array {

	ob_start();
	?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title><?php echo esc_html($subject); ?></title>
	</head>
	<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 16px;">
			<tr>
				<td align="center">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
						<tr>
							<td align="center" style="padding-bottom:24px;">
								<a href="<?php echo esc_url($site_url); ?>" style="text-decoration:none;">
									<span style="font-size:22px;font-weight:700;color:#1e40af;"><?php echo esc_html($site_name); ?></span>
								</a>
							</td>
						</tr>
						<tr>
							<td style="background:#ffffff;border-radius:12px;padding:40px 40px 32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
								<h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;">
									<?php echo esc_html($heading); ?>
								</h1>
								<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
									Hi <?php echo esc_html($recipient_name); ?>,
								</p>
								<div style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.6;">
									<?php echo wp_kses_post($content); ?>
								</div>
								<?php if (!empty($cta_url) && !empty($cta_text)) : ?>
									<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
										<tr>
											<td style="background:#1d4ed8;border-radius:9999px;">
												<a href="<?php echo esc_url($cta_url); ?>"
													style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
													<?php echo esc_html($cta_text); ?>
												</a>
											</td>
										</tr>
									</table>
									<p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
										Or copy this link into your browser:<br />
										<a href="<?php echo esc_url($cta_url); ?>"
											style="color:#1d4ed8;word-break:break-all;">
											<?php echo esc_url($cta_url); ?>
										</a>
									</p>
								<?php endif; ?>
							</td>
						</tr>
						<!-- Footer -->
						<tr>
							<td style="padding-top:24px;text-align:center;">
								<p style="margin:0;font-size:12px;color:#9ca3af;">
									&copy; <?php echo date('Y'); ?> <?php echo esc_html($site_name); ?>.
									<?php if (!empty($footer_text)) : ?>
										<?php echo wp_kses_post($footer_text); ?>
									<?php endif; ?>
								</p>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>
	<?php
	$html = ob_get_clean();

	// ── Plain-text fallback ───────────────────────────────────────────────────
	$plain = $heading . "\n\n" . wp_strip_all_tags($content);
	if (!empty($cta_url)) {
		$plain .= "\n\n" . $cta_url;
	}
	if (!empty($footer_text)) {
		$plain .= "\n\n" . wp_strip_all_tags($footer_text);
	}

	return compact('subject', 'html', 'plain');
}

/**
 * Get group communication email template by prompt type
 *
 * @param string $prompt_type Prompt type (password-reset, course-progress, assessment-deadline, welcome-reminder, custom)
 * @param array $vars Template variables (group_name, recipient_name, site_name, site_url, custom_message)
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_comm_email(string $prompt_type, array $vars): array {
	$group_name = $vars['group_name'] ?? 'SkillPlan';
	$recipient_name = $vars['recipient_name'] ?? 'Learner';
	$site_name = $vars['site_name'] ?? 'SkillPlan';
	$site_url = $vars['site_url'] ?? home_url();
	// Optional CTA deep-link override. Mailer sets this to a course
	// permalink when the chosen condition has a course_id; templates with
	// a navigational CTA use it instead of the dashboard URL. Empty string
	// means "no override" — keep the template's default.
	$cta_url_override = $vars['cta_url_override'] ?? '';

	switch ($prompt_type) {
		case 'password-reset':
			// CTA is the password-reset link, never a course — override ignored.
			return bys_get_password_reset_email($group_name, $recipient_name, $site_name, $site_url);
		case 'course-progress':
			return bys_get_course_nudge_email($group_name, $recipient_name, $site_name, $site_url, $cta_url_override);
		case 'assessment-deadline':
			return bys_get_assessment_deadline_email($group_name, $recipient_name, $site_name, $site_url, $cta_url_override);
		case 'welcome-reminder':
			return bys_get_welcome_reminder_email($group_name, $recipient_name, $site_name, $site_url, $cta_url_override);
		case 'custom':
			// Leader-authored body; no CTA button — override doesn't apply.
			$custom_message = $vars['custom_message'] ?? '';
			return bys_get_custom_email($group_name, $custom_message);
		default:
			return array('subject' => '', 'html' => '', 'plain' => '');
	}
}

/**
 * Password reset email template
 *
 * @param string $group_name Name of the group
 * @param string $recipient_name Name of the recipient
 * @param string $site_name Site name
 * @param string $site_url Site URL
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_password_reset_email(string $group_name, string $recipient_name, string $site_name, string $site_url): array {
	$subject = "Password reset for {$site_name}";
	$reset_url = wp_login_url() . '?action=lostpassword';
	$heading = "Password Reset";
	$content = "<p>You have been added to the group <strong>" . esc_html( $group_name ) . "</strong>. Please reset your password to complete your account setup.</p>";
	$footer_text = 'Questions? Contact <a href="mailto:learn@skillplan.ca">learn@skillplan.ca</a>';

	return bys_build_email_template(
		$subject,
		$heading,
		$content,
		$site_name,
		$site_url,
		$recipient_name,
		$reset_url,
		'Reset my password',
		$footer_text
	);
}


/**
 * Course progress nudge email template
 *
 * @param string $group_name Name of the group
 * @param string $recipient_name Name of the recipient
 * @param string $site_name Site name
 * @param string $site_url Site URL
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_course_nudge_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $cta_url_override = ''): array {
	$subject = "Course progress update";
	$dashboard_url = !empty($cta_url_override) ? $cta_url_override : $site_url . '/dashboard/';
	$heading = "Course Progress Update";
	$content = "<p>Your learning resources are ready and available for you. Click the link below to get started or continue your progress.</p>";
	$footer_text = 'Questions? Contact <a href="mailto:learn@skillplan.ca">learn@skillplan.ca</a>';


	return bys_build_email_template(
		$subject,
		$heading,
		$content,
		$site_name,
		$site_url,
		$recipient_name,
		$dashboard_url,
		'Continue progress',
		$footer_text
	);
}

/**
 * Assessment deadline warning email template
 *
 * @param string $group_name Name of the group
 * @param string $recipient_name Name of the recipient
 * @param string $site_name Site name
 * @param string $site_url Site URL
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_assessment_deadline_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $cta_url_override = ''): array {
	$subject = "Assessment deadline reminder";
	$dashboard_url = !empty($cta_url_override) ? $cta_url_override : $site_url . '/dashboard/';
	$heading = "Assessment Deadline Reminder";
	$content = "<p>This is a reminder that you have a required assessment coming up in <strong>" . esc_html($group_name) . "</strong>. Please complete it before the deadline to stay on track with your learning.</p>";
	$footer_text = 'Questions? Contact <a href="mailto:learn@skillplan.ca">learn@skillplan.ca</a>';

	return bys_build_email_template(
		$subject,
		$heading,
		$content,
		$site_name,
		$site_url,
		$recipient_name,
		$dashboard_url,
		'Continue progress',
		$footer_text
	);
}

/**
 * Welcome/login reminder email template
 *
 * @param string $group_name Name of the group
 * @param string $recipient_name Name of the recipient
 * @param string $site_name Site name
 * @param string $site_url Site URL
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_welcome_reminder_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $cta_url_override = ''): array {
	$subject = "Welcome to {$group_name}";
	$dashboard_url = !empty($cta_url_override) ? $cta_url_override : $site_url . '/dashboard/';
	$heading = "Welcome to " . esc_html($group_name) . "!";
	$content = "<p>You’ve been invited to the <strong>". esc_html($group_name) ."</strong> training group. Log in today to get started!</p>";
	$footer_text = 'Questions? Contact <a href="mailto:learn@skillplan.ca">learn@skillplan.ca</a>';

	return bys_build_email_template(
		$subject,
		$heading,
		$content,
		$site_name,
		$site_url,
		$recipient_name,
		$dashboard_url,
		'Get started',
		$footer_text
	);
}


/**
 * Custom email template
 *
 * @param string $custom_message The custom message body (HTML or plain text)
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_custom_email(string $group_name, string $custom_message): array {
	$subject = "Build Your Skills | You have received a message from your group leader";
	$site_name = get_bloginfo('name');
	$site_url = home_url();

	// Build email with custom content, no CTA button
	ob_start();
	?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title><?php echo esc_html($subject); ?></title>
	</head>
	<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 16px;">
			<tr>
				<td align="center">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
						<tr>
							<td align="center" style="padding-bottom:24px;">
								<a href="<?php echo esc_url($site_url); ?>" style="text-decoration:none;">
									<span style="font-size:22px;font-weight:700;color:#1e40af;"><?php echo esc_html($site_name); ?></span>
								</a>
							</td>
						</tr>
						<tr>
							<td style="background:#ffffff;border-radius:12px;padding:40px 40px 32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
								<h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;">
									<?php echo esc_html($group_name); ?> has sent you the following message:
								</h1>
								<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
									<?php echo wp_kses_post($custom_message); ?>
								</p>
							</td>
						</tr>
						<tr>
							<td style="padding-top:24px;text-align:center;">
								<p style="margin:0;font-size:12px;color:#9ca3af;">
									&copy; <?php echo date('Y'); ?> <?php echo esc_html($site_name); ?>. Questions? Contact <a href="mailto:learn@skillplan.ca">learn@skillplan.ca</a>
								</p>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>
	<?php
	$html = ob_get_clean();

	// Plain text version
	$plain = wp_strip_all_tags($custom_message);

	return compact('subject', 'html', 'plain');
}

/**
 * Build the per-user quiz-access notification email.
 *
 * Sent by the group-user-quiz-config block when a group leader clicks
 * "Notify Learner" to inform a single learner about the start/end access
 * window set for them on a specific quiz.
 *
 * @param array $vars {
 *     @type string $recipient_name Learner's display name.
 *     @type string $site_name      Site name (header brand).
 *     @type string $site_url       Site URL.
 *     @type string $quiz_title     The quiz the access window applies to.
 *     @type string $quiz_url       Permalink to the quiz (used as CTA).
 *     @type string $start          UTC ISO-8601 datetime when access opens, or ''.
 *     @type string $end            UTC ISO-8601 datetime when access closes, or ''.
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

    $subject = sprintf('Quiz access: %s', $quiz_title);
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
        '<p style="margin:0 0 16px;color:#374151;font-size:15px;">Your group leader has set the access for <strong>%s</strong>.</p>',
        esc_html($quiz_title)
    );

    $content = $intro . $window_html;

    $footer_text = 'Questions? Contact <a href="mailto:learn@skillplan.ca">learn@skillplan.ca</a>';

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
