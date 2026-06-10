<?php
/**
 * Group Invitation Email Template
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * EDIT THIS FILE to customise the invitation email sent to new learners.
 *
 * Available variables passed into bys_get_invite_email():
 *   $group_name      — display name of the LearnDash group  (string)
 *   $register_url    — full URL the recipient should visit to register (string)
 *   $invited_by_name — display name of the admin who sent the invite (string)
 *   $site_name       — get_bloginfo('name') (string)
 *   $site_url        — home_url() (string)
 *
 * The function returns an array:
 *   'subject' => the email subject line
 *   'html'    => the full HTML email body (used when wp_mail sends HTML)
 *   'plain'   => plain-text fallback
 * ──────────────────────────────────────────────────────────────────────────────
 */

if ( ! defined( 'ABSPATH' ) ) exit;

function bys_get_invite_email( string $group_name, string $register_url, string $invited_by_name, string $site_name, string $site_url ): array {

    // ── Subject ───────────────────────────────────────────────────────────────
    $subject = sprintf( "You've been invited to join %s on %s", $group_name, $site_name );

    // ── HTML body ─────────────────────────────────────────────────────────────
    ob_start();
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title><?php echo esc_html( $subject ); ?></title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo / brand header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="<?php echo esc_url( $site_url ); ?>" style="text-decoration:none;">
                <span style="font-size:22px;font-weight:700;color:#1e40af;"><?php echo esc_html( $site_name ); ?></span>
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;padding:40px 40px 32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
                You've been invited!
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
                <?php echo esc_html( $invited_by_name ); ?> has invited you to join
                <strong style="color:#111827;"><?php echo esc_html( $group_name ); ?></strong>.
              </p>

              <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.6;">
                To get started, create your free account using the button below.
                Once registered, you'll be automatically enrolled in the group.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#1d4ed8;border-radius:9999px;">
                    <a href="<?php echo esc_url( $register_url ); ?>"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Create my account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:13px;color:#9ca3af;text-align:center;">
                Or copy this link into your browser:<br />
                <a href="<?php echo esc_url( $register_url ); ?>"
                   style="color:#1d4ed8;word-break:break-all;">
                  <?php echo esc_url( $register_url ); ?>
                </a>
              </p>

              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; <?php echo date('Y'); ?> <?php echo esc_html( $site_name ); ?>. Questions? Contact <a href="mailto:learn@skillplan.ca">learn@skillplan.ca</a>
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
    $plain = sprintf(
        "You've been invited to join %s on %s\n\n" .
        "%s has invited you to join the group \"%s\".\n\n" .
        "Create your account here to get started:\n%s\n\n" .
        "Once registered you'll be automatically enrolled in the group.\n\n" .
        "If you weren't expecting this invitation you can safely ignore this email.\n",
        $group_name,
        $site_name,
        $invited_by_name,
        $group_name,
        $register_url
    );

    return compact( 'subject', 'html', 'plain' );
}
