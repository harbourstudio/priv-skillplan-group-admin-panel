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
 * Return the hosted-PNG SkillPlan wordmark used in the email brand header.
 *
 * Uses <img> with a plugin-hosted PNG so Outlook desktop, Yahoo, and every
 * other client render the logo reliably.
 */
if (!function_exists('bys_email_logo_svg')) {
	function bys_email_logo_svg(): string {
		$site_name = get_bloginfo('name');
		$default   = defined('BYS_GROUPS_PLUGIN_URL')
			? BYS_GROUPS_PLUGIN_URL . 'assets/img/buildyourskills.png'
			: '';

		// Filter: override the logo URL. Useful for local dev where
		// plugin_dir_url() resolves to an unreachable `.local` host — hook this
		// from a mu-plugin and return a publicly reachable URL (e.g. a staging
		// copy) so Gmail's image proxy can fetch it during testing.
		$src = apply_filters('bys_email_logo_url', $default);

		return sprintf(
			'<img src="%s" alt="%s" width="200" height="44" style="display:block;border:0;outline:none;width:200px;max-width:200px;height:auto;" />',
			esc_url($src),
			esc_attr($site_name)
		);
	}
}

/**
 * Shared progressive-enhancement <style> block for transactional emails.
 *
 * Clients that honor <style> in head apply these (most modern clients do;
 * Outlook desktop ignores). Every critical style is still inlined per-element.
 */
if (!function_exists('bys_email_head_styles')) {
	function bys_email_head_styles(): string {
		return '<style>'
			. 'a:hover,.bys-btn:hover{opacity:0.85;}'
			. '@media (max-width:480px){'
			. '.bys-card{padding:1.5rem !important;}'
			. '.bys-logo img{width:160px !important;max-width:160px !important;}'
			. '.bys-h1{font-size:20px !important;}'
			. '.bys-body{font-size:16px !important;}'
			. '}'
			. '</style>';
	}
}

/**
 * Build an email template with consistent branding.
 *
 * Uses table structure + inline styles for cross-client compatibility, plus
 * a <style> block in head for hover and mobile tweaks (progressive
 * enhancement — safe to fall through in Outlook desktop).
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
	string $footer_text = '',
	string $unsubscribe_url = ''
): array {

	$logo   = bys_email_logo_svg();
	$styles = bys_email_head_styles();

	ob_start();
	?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title><?php echo esc_html($subject); ?></title>
		<?php echo $styles; ?>
	</head>
	<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#4F5C6F;">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:48px 16px;">
			<tr>
				<td align="center">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
						<tr>
							<td align="center" style="padding-bottom:32px;">
								<a href="<?php echo esc_url($site_url); ?>" class="bys-logo" style="text-decoration:none;line-height:0;display:inline-block;" aria-label="<?php echo esc_attr($site_name); ?>">
									<?php echo $logo; ?>
								</a>
							</td>
						</tr>
						<tr>
							<td class="bys-card" style="background:#ffffff;border-radius:16px;padding:2rem;border:1px solid #E8EBEF;">
								<h1 class="bys-h1" style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
									<?php echo esc_html($heading); ?>
								</h1>
								<p class="bys-body" style="margin:0 0 16px;font-size:17px;color:#4F5C6F;line-height:1.6;">
									Hi <?php echo esc_html($recipient_name); ?>,
								</p>
								<div class="bys-body" style="margin:0 0 32px;font-size:17px;color:#4F5C6F;line-height:1.6;">
									<?php echo wp_kses_post($content); ?>
								</div>
								<?php if (!empty($cta_url) && !empty($cta_text)) : ?>
									<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
										<tr>
											<td style="background:#2465FF;border-radius:9999px;">
												<a href="<?php echo esc_url($cta_url); ?>" class="bys-btn"
													style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">
													<?php echo esc_html($cta_text); ?>
												</a>
											</td>
										</tr>
									</table>
									<p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;">
										Or copy this link into your browser:<br />
										<a href="<?php echo esc_url($cta_url); ?>"
											style="color:#2465FF;word-break:break-all;">
											<?php echo esc_url($cta_url); ?>
										</a>
									</p>
								<?php endif; ?>
							</td>
						</tr>
						<tr>
							<td style="padding-top:24px;text-align:center;">
								<p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.5;">
									&copy; <?php echo date('Y'); ?> <?php echo esc_html($site_name); ?>.
									<?php if (!empty($footer_text)) : ?>
										<?php echo wp_kses_post($footer_text); ?>
									<?php endif; ?>
								</p>
								<?php if (!empty($unsubscribe_url)) : ?>
									<p style="margin:8px 0 0;font-size:14px;color:#9ca3af;">
										<a href="<?php echo esc_url($unsubscribe_url); ?>" style="color:#9ca3af;text-decoration:none;">
											Unsubscribe from group communications
										</a>
									</p>
								<?php endif; ?>
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
	if (!empty($unsubscribe_url)) {
		$plain .= "\n\nUnsubscribe from group communications: " . $unsubscribe_url;
	}

	return compact('subject', 'html', 'plain');
}

/**
 * Get group communication email template by prompt type
 *
 * @param string $prompt_type Prompt type (password-reset, course-progress, assessment-reminder, welcome-reminder, custom)
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
	$unsubscribe_url  = $vars['unsubscribe_url'] ?? '';

	switch ($prompt_type) {
		case 'password-reset':
			// CTA is the password-reset link, never a course — override ignored.
			return bys_get_password_reset_email($group_name, $recipient_name, $site_name, $site_url, $unsubscribe_url);
		case 'course-progress':
			return bys_get_course_nudge_email($group_name, $recipient_name, $site_name, $site_url, $cta_url_override, $unsubscribe_url);
		case 'assessment-reminder':
			return bys_get_assessment_deadline_email($group_name, $recipient_name, $site_name, $site_url, $cta_url_override, $unsubscribe_url);
		case 'welcome-reminder':
			return bys_get_welcome_reminder_email($group_name, $recipient_name, $site_name, $site_url, $cta_url_override, $unsubscribe_url);
		case 'custom':
			// Leader-authored body; no CTA button — override doesn't apply.
			$custom_message = $vars['custom_message'] ?? '';
			return bys_get_custom_email($group_name, $custom_message, $unsubscribe_url);
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
function bys_get_password_reset_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $unsubscribe_url = ''): array {
	$subject = "Password reset for {$site_name}";
	$reset_url = wp_login_url() . '?action=lostpassword';
	$heading = "Password Reset";
	$content = "<p>You have been added to the group <strong>" . esc_html( $group_name ) . "</strong>. Please reset your password to complete your account setup.</p>";
	$footer_text = 'Questions? Contact <a href="mailto:learn@skillplan.ca" style="color:#2465FF;">learn@skillplan.ca</a>';

	return bys_build_email_template(
		$subject,
		$heading,
		$content,
		$site_name,
		$site_url,
		$recipient_name,
		$reset_url,
		'Reset my password',
		$footer_text,
		$unsubscribe_url
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
function bys_get_course_nudge_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $cta_url_override = '', string $unsubscribe_url = ''): array {
	$subject = "Course progress update";
	$dashboard_url = !empty($cta_url_override) ? $cta_url_override : $site_url . '/dashboard/';
	$heading = "Course Progress Update";
	$content = "<p>Your learning resources are ready. Click the link below to get started or continue your learning.</p>";
	$footer_text = 'Questions? Contact <a href="mailto:learn@skillplan.ca" style="color:#2465FF;">learn@skillplan.ca</a>';


	return bys_build_email_template(
		$subject,
		$heading,
		$content,
		$site_name,
		$site_url,
		$recipient_name,
		$dashboard_url,
		'Continue progress',
		$footer_text,
		$unsubscribe_url
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
function bys_get_assessment_deadline_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $cta_url_override = '', string $unsubscribe_url = ''): array {
	$subject = "Assessment deadline reminder";
	$dashboard_url = !empty($cta_url_override) ? $cta_url_override : $site_url . '/dashboard/';
	$heading = "Assessment Deadline Reminder";
	$content = "<p>This is a reminder that you have a required assessment coming up in <strong>" . esc_html($group_name) . "</strong>. Please complete it before the deadline to stay on track with your learning.</p>";
	$footer_text = 'Questions? Contact <a href="mailto:learn@skillplan.ca" style="color:#2465FF;">learn@skillplan.ca</a>';

	return bys_build_email_template(
		$subject,
		$heading,
		$content,
		$site_name,
		$site_url,
		$recipient_name,
		$dashboard_url,
		'Continue progress',
		$footer_text,
		$unsubscribe_url
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
function bys_get_welcome_reminder_email(string $group_name, string $recipient_name, string $site_name, string $site_url, string $cta_url_override = '', string $unsubscribe_url = ''): array {
	$subject = "Welcome to {$group_name}";
	$dashboard_url = !empty($cta_url_override) ? $cta_url_override : $site_url . '/dashboard/';
	$heading = "Welcome to " . esc_html($group_name) . "!";
	$content = "<p>You’ve been invited to the <strong>". esc_html($group_name) ."</strong> training group. Log in today to get started!</p>";
	$footer_text = 'Questions? Contact <a href="mailto:learn@skillplan.ca" style="color:#2465FF;">learn@skillplan.ca</a>';

	return bys_build_email_template(
		$subject,
		$heading,
		$content,
		$site_name,
		$site_url,
		$recipient_name,
		$dashboard_url,
		'Get started',
		$footer_text,
		$unsubscribe_url
	);
}


/**
 * Custom email template
 *
 * @param string $custom_message The custom message body (HTML or plain text)
 * @return array Array with 'subject', 'html', 'plain' keys
 */
function bys_get_custom_email(string $group_name, string $custom_message, string $unsubscribe_url = ''): array {
	$subject   = "Build Your Skills | You have received a message from your group leader";
	$site_name = get_bloginfo('name');
	$site_url  = home_url();
	$logo      = bys_email_logo_svg();
	$styles    = bys_email_head_styles();

	ob_start();
	?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title><?php echo esc_html($subject); ?></title>
		<?php echo $styles; ?>
	</head>
	<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#4F5C6F;">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:48px 16px;">
			<tr>
				<td align="center">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
						<tr>
							<td align="center" style="padding-bottom:32px;">
								<a href="<?php echo esc_url($site_url); ?>" class="bys-logo" style="text-decoration:none;line-height:0;display:inline-block;" aria-label="<?php echo esc_attr($site_name); ?>">
									<?php echo $logo; ?>
								</a>
							</td>
						</tr>
						<tr>
							<td class="bys-card" style="background:#ffffff;border-radius:16px;padding:2rem;border:1px solid #E8EBEF;">
								<h1 class="bys-h1" style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
									<?php echo esc_html($group_name); ?> has sent you the following message:
								</h1>
								<div class="bys-body" style="margin:0;font-size:17px;color:#4F5C6F;line-height:1.6;">
									<?php echo wp_kses_post($custom_message); ?>
								</div>
							</td>
						</tr>
						<tr>
							<td style="padding-top:24px;text-align:center;">
								<p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.5;">
									&copy; <?php echo date('Y'); ?> <?php echo esc_html($site_name); ?>. Questions? Contact <a href="mailto:learn@skillplan.ca" style="color:#2465FF;">learn@skillplan.ca</a>
								</p>
								<?php if (!empty($unsubscribe_url)) : ?>
									<p style="margin:8px 0 0;font-size:14px;color:#9ca3af;">
										<a href="<?php echo esc_url($unsubscribe_url); ?>" style="color:#9ca3af;text-decoration:none;">
											Unsubscribe from group communications
										</a>
									</p>
								<?php endif; ?>
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
	if (!empty($unsubscribe_url)) {
		$plain .= "\n\nUnsubscribe from group communications: " . $unsubscribe_url;
	}

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
    $recipient_name    = $vars['recipient_name']    ?? 'Learner';
    $site_name         = $vars['site_name']         ?? get_bloginfo('name');
    $site_url          = $vars['site_url']          ?? home_url();
    $quiz_title        = $vars['quiz_title']        ?? 'your quiz';
    $quiz_url          = $vars['quiz_url']          ?? $site_url;
    $start             = $vars['start']             ?? '';
    $end               = $vars['end']               ?? '';
    $unsubscribe_url   = $vars['unsubscribe_url']   ?? '';
    $attempts_granted  = isset($vars['attempts_granted'])  ? (int) $vars['attempts_granted']  : null;
    $attempts_previous = isset($vars['attempts_previous']) ? (int) $vars['attempts_previous'] : null;
    $attempts_changed  = $attempts_granted !== null
        && $attempts_previous !== null
        && $attempts_granted !== $attempts_previous;

    $subject = $attempts_changed
        ? sprintf('Quiz access update: %s', $quiz_title)
        : sprintf('Quiz access: %s', $quiz_title);
    $heading = $attempts_changed
        ? sprintf('Access update for %s', $quiz_title)
        : sprintf('Access details for %s', $quiz_title);

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

    $attempts_html = '';
    if ($attempts_changed) {
        if ($attempts_granted > $attempts_previous) {
            $delta = $attempts_granted - $attempts_previous;
            $attempts_line = sprintf(
                'You have been granted <strong>%d additional attempt%s</strong> on this quiz (total additional attempts: %d).',
                $delta,
                $delta === 1 ? '' : 's',
                $attempts_granted
            );
        } elseif ($attempts_granted === 0) {
            $attempts_line = 'Your previously granted additional attempts on this quiz have been removed.';
        } else {
            $attempts_line = sprintf(
                'Your additional attempts on this quiz have been updated (previously %d, now <strong>%d</strong>).',
                $attempts_previous,
                $attempts_granted
            );
        }

        $attempts_html = sprintf(
            '<p style="margin:0 0 16px;color:#374151;font-size:15px;">%s</p>',
            $attempts_line
        );
    }

    $content = $intro . $attempts_html . $window_html;

    $footer_text = 'Questions? Contact <a href="mailto:learn@skillplan.ca" style="color:#2465FF;">learn@skillplan.ca</a>';

    return bys_build_email_template(
        $subject,
        $heading,
        $content,
        $site_name,
        $site_url,
        $recipient_name,
        $quiz_url,
        sprintf('Open %s', $quiz_title),
        $footer_text,
        $unsubscribe_url
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
