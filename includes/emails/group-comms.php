<?php
/**
 * Group Communication Email Templates
 *
 * bys_build_email_template() — builds general email template
 * bys_get_comm_email() — dispatcher for communication prompt email templates

* All functions return an array:
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
 * @param array $vars Template variables (group_name, recipient_name, site_name, site_url, sender_email, custom_subject, custom_message)
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_comm_email(string $prompt_type, array $vars): array {
	$group_name = $vars['group_name'] ?? 'SkillPlan';
	$recipient_name = $vars['recipient_name'] ?? 'Learner';
	$site_name = $vars['site_name'] ?? 'SkillPlan';
	$site_url = $vars['site_url'] ?? home_url();
	$sender_email = $vars['sender_email'] ?? get_bloginfo('admin_email');

	switch ($prompt_type) {
		case 'password-reset':
			return bys_get_password_reset_email($group_name, $recipient_name, $site_name, $site_url, $sender_email);
		case 'course-progress':
			return bys_get_course_nudge_email($group_name, $recipient_name, $site_name, $site_url, $sender_email);
		case 'assessment-deadline':
			return bys_get_assessment_deadline_email($group_name, $recipient_name, $site_name, $site_url, $sender_email);
		case 'welcome-reminder':
			return bys_get_welcome_reminder_email($group_name, $recipient_name, $site_name, $site_url, $sender_email);
		case 'custom':
			$custom_subject = $vars['custom_subject'] ?? '';
			$custom_message = $vars['custom_message'] ?? '';
			return bys_get_custom_email($custom_subject, $custom_message);
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
 * @param string $sender_email Email address of the sender
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_password_reset_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $sender_email): array {
	$subject = "Password reset for {$site_name}";
	$reset_url = wp_login_url() . '?action=lostpassword';
	$heading = "Password Reset";
	$content = "<p>You have been added to the group <strong>" . esc_html( $group_name ) . "</strong>. Please reset your password to complete your account setup.</p>";
	$footer_text = '';
	if (!empty($sender_email)) {
		$footer_text = "If you have any questions, please contact <a href=\"mailto:" . esc_attr($sender_email) . "\">" . esc_html($sender_email) . "</a>.";
	}

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
 * @param string $sender_email Email address of the sender
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_course_nudge_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $sender_email): array {
	$subject = "Course progress update";
	$dashboard_url = $site_url . '/dashboard/';
	$heading = "Course Progress Update";
	$content = "<p>We noticed you haven't been active in your courses recently. Click the link below to continue with your progress.</p>";
	$footer_text = '';
	if (!empty($sender_email)) {
		$footer_text = "If you have any questions, please contact <a href=\"mailto:" . esc_attr($sender_email) . "\">" . esc_html($sender_email) . "</a>.";
	}

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
 * @param string $sender_email Email address of the sender
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_assessment_deadline_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $sender_email): array {
	$subject = "Assessment deadline reminder";
	$dashboard_url = $site_url . '/dashboard/';
	$heading = "Assessment Deadline Reminder";
	$content = "<p>This is a reminder that you have a required assessment coming up in <strong>" . esc_html($group_name) . "</strong>. Please complete it before the deadline to stay on track with your learning.</p>";
	$footer_text = '';
	if (!empty($sender_email)) {
		$footer_text = "If you have any questions, please contact <a href=\"mailto:" . esc_attr($sender_email) . "\">" . esc_html($sender_email) . "</a>.";
	}

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
function bys_get_welcome_reminder_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $sender_email): array {
	$subject = "Welcome to {$group_name}";
	$dashboard_url = $site_url . '/dashboard/';
	$heading = "Welcome to " . esc_html($group_name) . "!";
	$content = "<p>Welcome to <strong>" . esc_html($group_name) . "</strong>! We're excited to have you join our learning community. Log in to get started with your courses and begin your learning journey today.</p>";
	$footer_text = '';
	if (!empty($sender_email)) {
		$footer_text = "If you have any questions, please contact <a href=\"mailto:" . esc_attr($sender_email) . "\">" . esc_html($sender_email) . "</a>.";
	}

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
 * @param string $custom_subject The email subject
 * @param string $custom_message The custom message body (HTML or plain text)
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_custom_email(string $custom_subject, string $custom_message): array {
	$subject = $custom_subject;
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
								<div style="font-size:15px;color:#374151;line-height:1.6;">
									<?php echo wp_kses_post($custom_message); ?>
								</div>
							</td>
						</tr>
						<tr>
							<td style="padding-top:24px;text-align:center;">
								<p style="margin:0;font-size:12px;color:#9ca3af;">
									&copy; <?php echo date('Y'); ?> <?php echo esc_html($site_name); ?>.
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
