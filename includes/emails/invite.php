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

// Depends on bys_email_logo_svg() and bys_email_head_styles() defined in
// general.php. class-invites.php only requires this file, not general.php,
// so pull it in here to stay self-sufficient. Both helpers are guarded with
// function_exists() so double-loading is safe.
require_once __DIR__ . '/general.php';

function bys_get_invite_email( string $group_name, string $register_url, string $invited_by_name, string $site_name, string $site_url ): array {

    $subject = sprintf( "You've been invited to join %s on %s", $group_name, $site_name );
    $logo    = bys_email_logo_svg();
    $styles  = bys_email_head_styles();

    ob_start();
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title><?php echo esc_html( $subject ); ?></title>
<?php echo $styles; ?>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#4F5C6F;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="<?php echo esc_url( $site_url ); ?>" class="bys-logo" style="text-decoration:none;line-height:0;display:inline-block;" aria-label="<?php echo esc_attr( $site_name ); ?>">
                <?php echo $logo; ?>
              </a>
            </td>
          </tr>

          <tr>
            <td class="bys-card" style="background:#ffffff;border-radius:16px;padding:2rem;border:1px solid #E8EBEF;">

              <h1 class="bys-h1" style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
                You've been invited!
              </h1>
              <p class="bys-body" style="margin:0 0 24px;font-size:17px;color:#4F5C6F;line-height:1.6;">
                <?php echo esc_html( $invited_by_name ); ?> has invited you to join
                <strong style="color:#111827;"><?php echo esc_html( $group_name ); ?></strong>.
              </p>

              <p class="bys-body" style="margin:0 0 32px;font-size:17px;color:#4F5C6F;line-height:1.6;">
                To get started, create your free account using the button below.
                Once registered, you'll be automatically enrolled in the group.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:#2465FF;border-radius:9999px;">
                    <a href="<?php echo esc_url( $register_url ); ?>" class="bys-btn"
                       style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Create my account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 24px;font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;">
                Or copy this link into your browser:<br />
                <a href="<?php echo esc_url( $register_url ); ?>"
                   style="color:#2465FF;word-break:break-all;">
                  <?php echo esc_url( $register_url ); ?>
                </a>
              </p>

              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;">
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.5;">
                &copy; <?php echo date('Y'); ?> <?php echo esc_html( $site_name ); ?>. Questions? Contact <a href="mailto:learn@skillplan.ca" style="color:#2465FF;">learn@skillplan.ca</a>
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
