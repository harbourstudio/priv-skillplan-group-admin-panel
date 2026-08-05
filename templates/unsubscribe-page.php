<?php
/**
 * Public unsubscribe page — rendered by BYS_Groups_Comms_Preferences_Router.
 *
 * Called with the following in-scope:
 *   $variant       string  'confirm' | 'success' | 'error'
 *   $recipient     string  Learner's display name / email (may be empty)
 *   $site_name     string
 *   $site_url      string
 *   $token         string  Only populated in 'confirm' variant (form field)
 *   $post_url      string  Only populated in 'confirm' variant (form action)
 *   $error_message string  Only populated in 'error' variant
 */

if (!defined('ABSPATH')) exit;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><?php echo esc_html($site_name); ?> — <?php esc_html_e('Unsubscribe', 'bys'); ?></title>
    <style>
        body {
            min-height: 100vh;
            margin: 0;
            padding: 0;
            background: #f4f5f7;
            font-family: Arial, Helvetica, sans-serif;
            color: #4F5C6F;
        }
        .wrap {
            height: 100%;
            max-width: 560px;
            margin: 0 auto;
            padding: clamp(3rem, 0.1374rem + 9.1603vw, 6rem) 2rem;
        }
        .brand {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 32px;
        }
        .brand a {
            display: inline-block;
            line-height: 0;
        }
        .brand svg {
            display: block;
            width: 200px;
            height: auto;
        }
        .card {
            background: #fff;
            border-radius: 16px;
            padding: 2rem;
            border: 1px solid #E8EBEF;
        }
        form {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 2rem;
        }
        h1 {
            margin: 0 0 24px;
            font-size: clamp(1.4rem, 1.4rem + ((1vw - 0.2rem) * 0.321), 1.625rem);
            font-weight: 700;
            color: #111827;
        }
        a {
            color: #2465FF;
        }
        p {
            margin: 0 0 16px;
            font-size: clamp(1.0625rem, 1.063rem + ((1vw - 0.2rem) * 0.179), 1.1875rem);
        }
        .muted {
            color: #9ca3af;
            font-size: 0.875rem;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 9999px;
            font-size: clamp(1rem, 1rem + ((1vw - 0.2rem) * 1), 1rem);
            font-weight: 600;
            text-decoration: none;
            border: none;
            cursor: pointer;
        }
        .btn:hover {
            opacity: 0.5;
        }
        .btn-primary {
            background: #FFDBD9;
            border: 1px solid #FE4D43;
            color: #C00B01;
        }
        .btn-secondary {
            color: #4F5C6F;
        }
        .footer {
            text-align: center;
            margin-top: 24px;

            > * {
                font-size: clamp(0.875rem, 0.875rem + ((1vw - 0.2rem) * 1), 0.875rem);
            }
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="brand">
            <a href="<?php echo esc_url($site_url); ?>">
                <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 699 153">
                    <defs>
                        <style>
                        .st0 {
                            mask: url(#mask);
                        }

                        .st1 {
                            fill: #ffffff;
                        }

                        .st2 {
                            fill: #FE4C42;
                        }

                        .st3 {
                            fill: #011733;
                        }

                        .st4 {
                            fill: #FC9445;
                        }
                        </style>
                        <mask id="mask" x="0" y="0" width="219" height="90" maskUnits="userSpaceOnUse">
                        <g id="mask0_40_387">
                            <rect class="st1" width="219" height="90"></rect>
                        </g>
                        </mask>
                    </defs>
                    <g id="symbol">
                        <g class="st0">
                        <path class="st2" d="M218.7,45.5C160.5-12.8,66-12.8,7.7,45.5l41.9,41.9c34.9-34.9,92.3-34.9,127.2,0l41.9-41.9Z"></path>
                        </g>
                        <path class="st4" d="M144.7,89.6h-62.4v62.4h62.4v-62.4Z"></path>
                    </g>
                    <g id="wordmark">
                        <path class="st3" d="M666.8,136c.2,2.1,1.2,3.8,3,5.1,1.8,1.3,4.2,1.9,7.1,1.9s4.9-.4,6.5-1.3c1.6-.9,2.4-2.2,2.4-3.9s-.4-2.2-1.1-2.8c-.7-.6-1.8-1-3.1-1.3-1.4-.3-3.6-.6-6.6-1-4.2-.6-7.6-1.3-10.4-2.1-2.8-.9-5-2.2-6.6-4.1-1.7-1.8-2.5-4.3-2.5-7.4s.8-5.8,2.5-8.1c1.7-2.4,4.1-4.2,7.2-5.5,3.1-1.3,6.6-1.9,10.6-1.9,6.5,0,11.6,1.4,15.6,4.1,4,2.7,6.1,6.4,6.5,11.2h-12.3c-.2-1.8-1.1-3.2-2.9-4.3-1.7-1.2-3.8-1.8-6.5-1.8s-4.5.5-6,1.4c-1.5.9-2.2,2.2-2.2,3.7s.4,1.9,1.2,2.5c.8.6,1.8,1,3.1,1.2,1.3.2,3.4.5,6.5.8,6.4.7,11.3,2.1,14.7,4.1,3.4,2,5.2,5.4,5.2,10.2s-.9,5.8-2.8,8.1c-1.8,2.3-4.3,4.1-7.6,5.4-3.2,1.2-6.9,1.8-11.2,1.8-6.6,0-11.9-1.4-16-4.3-4.1-2.9-6.3-6.9-6.5-12h12.3Z"></path>
                        <path class="st3" d="M634.1,87.2h13v64.5h-13v-64.5Z"></path>
                        <path class="st3" d="M612.1,87.2h13v64.5h-13v-64.5Z"></path>
                        <path class="st3" d="M596.6,84.7c2.2,0,3.9.7,5.3,2.1,1.4,1.4,2.1,3.1,2.1,5.2s-.7,3.8-2.1,5.3c-1.4,1.4-3.2,2.1-5.3,2.1s-4-.7-5.4-2.1c-1.4-1.4-2.1-3.2-2.1-5.3s.7-3.8,2.1-5.2c1.5-1.4,3.3-2.1,5.4-2.1ZM590,104.4h13v47.4h-13v-47.4Z"></path>
                        <path class="st3" d="M538.3,87.2h13v37.3l18.6-20.2h14.6l-16.9,18.5,17.8,28.8h-15l-12-19.2-7.1,7.6v11.5h-13v-64.5Z"></path>
                        <path class="st3" d="M492.7,130.7c.2,3.2,1.5,5.8,3.9,7.7,2.4,1.9,5.6,2.9,9.5,2.9s5.9-.7,7.9-2c2.1-1.4,3.1-3.3,3.1-5.8s-.6-3.1-1.8-4.1c-1.1-1-2.7-1.8-4.8-2.4-2-.6-5.2-1.4-9.5-2.2-4.2-.8-7.8-1.8-10.7-3-2.9-1.3-5.3-3.2-7.1-5.6-1.8-2.5-2.7-5.8-2.7-10s1-7.1,3-10c2.1-2.9,4.9-5.3,8.6-6.9,3.7-1.7,7.8-2.6,12.4-2.6s9,.9,12.7,2.7c3.8,1.7,6.8,4.1,8.9,7.2,2.2,3.1,3.3,6.5,3.4,10.4h-13.5c-.3-2.8-1.5-5-3.5-6.6-2-1.7-4.7-2.6-8-2.6s-5.5.6-7.4,1.9c-1.8,1.3-2.8,3.1-2.8,5.5s.6,3.1,1.7,4.1c1.1.9,2.7,1.7,4.7,2.3,2,.6,5.2,1.2,9.4,2,4.3.8,7.9,1.8,10.9,3,2.9,1.2,5.3,3,7.1,5.4,1.8,2.4,2.8,5.6,2.8,9.7s-1.1,7.5-3.2,10.6c-2.1,3.1-5.2,5.5-9,7.3-3.8,1.8-8.1,2.7-12.9,2.7s-9.8-.9-13.8-2.8c-4-1.9-7.1-4.5-9.4-7.8-2.3-3.3-3.4-7-3.5-11.1l13.5.2Z"></path>
                        <path class="st3" d="M452.1,104.4v11.8h-5.2c-3.7,0-6.4,1.1-8.1,3.3-1.7,2.2-2.6,5.2-2.6,9v23.2h-13v-47.4h11.8l1.2,7.1c1.4-2.3,3.2-4.1,5.3-5.3,2.1-1.2,4.9-1.8,8.4-1.8h2.2Z"></path>
                        <path class="st3" d="M414.2,104.4v47.4h-11.5l-1.2-5.7c-1.7,2-3.6,3.5-5.8,4.6-2.2,1.1-4.9,1.7-8.1,1.7-5.5,0-10-1.7-13.5-5.1-3.5-3.4-5.3-9.2-5.3-17.1v-25.7h13v24.1c0,4.3.7,7.6,2.2,9.8,1.5,2.2,3.9,3.2,7,3.2s5.8-1.2,7.6-3.6c1.8-2.5,2.7-5.9,2.7-10.2v-23.3h13Z"></path>
                        <path class="st3" d="M337.5,152.3c-5,0-9.4-1-13.2-2.9-3.7-2-6.7-4.9-8.8-8.6-2-3.7-3-7.9-3-12.7s1-9,3-12.7c2.1-3.7,5-6.5,8.8-8.5,3.8-2,8.2-3,13.2-3s9.3,1,13.1,3c3.8,2,6.7,4.8,8.8,8.5,2.1,3.7,3.1,7.9,3.1,12.7s-1,9.1-3.1,12.8c-2,3.6-4.9,6.5-8.8,8.5-3.7,2-8.1,2.9-13.1,2.9ZM337.5,141.7c3.6,0,6.5-1.3,8.6-3.8,2.1-2.5,3.2-5.8,3.2-9.9s-1.1-7.3-3.2-9.9c-2.1-2.5-4.9-3.8-8.6-3.8s-6.4,1.3-8.6,3.8c-2.1,2.5-3.1,5.8-3.1,9.9s1,7.3,3.1,9.9c2.2,2.5,5,3.8,8.6,3.8Z"></path>
                        <path class="st3" d="M256,87.2h16.1l14.5,26.4,15.2-26.4h15.4l-23.7,40.5v24h-13.8v-24l-23.7-40.5Z"></path>
                        <path class="st3" d="M465.2,4.2v64.5h-11.3l-1.3-6.5c-3.6,4.7-8.5,7.1-14.7,7.1s-7.9-1-11.2-2.9c-3.3-2-5.9-4.9-7.8-8.6-1.8-3.7-2.8-8-2.8-12.8s.9-9,2.8-12.6c1.9-3.7,4.5-6.5,7.8-8.5,3.4-2,7.2-3,11.3-3,6.1,0,10.9,2.2,14.3,6.5V4.2h13ZM440.8,58.7c3.5,0,6.3-1.2,8.4-3.7,2.1-2.5,3.1-5.8,3.1-9.9s-1-7.4-3.1-10c-2.1-2.5-4.9-3.8-8.4-3.8s-6.3,1.3-8.5,3.8c-2.1,2.5-3.1,5.8-3.1,9.9s1,7.3,3.1,9.9c2.1,2.5,5,3.8,8.5,3.8Z"></path>
                        <path class="st3" d="M395.8,4.2h13v64.5h-13V4.2Z"></path>
                        <path class="st3" d="M380.3,1.7c2.1,0,3.9.7,5.3,2.1,1.4,1.4,2.1,3.1,2.1,5.2s-.7,3.8-2.1,5.3c-1.4,1.4-3.2,2.1-5.3,2.1s-4-.7-5.4-2.1c-1.4-1.4-2.1-3.2-2.1-5.3s.7-3.8,2.1-5.2c1.5-1.4,3.3-2.1,5.4-2.1ZM373.7,21.4h13v47.4h-13V21.4Z"></path>
                        <path class="st3" d="M364.7,21.4v47.4h-11.5l-1.2-5.7c-1.7,2-3.6,3.5-5.8,4.6-2.2,1.1-4.9,1.7-8.1,1.7-5.5,0-10-1.7-13.5-5.1-3.5-3.4-5.3-9.2-5.3-17.1v-25.7h13v24.1c0,4.3.7,7.6,2.2,9.8,1.5,2.2,3.9,3.2,7,3.2s5.8-1.2,7.6-3.6c1.8-2.5,2.7-5.9,2.7-10.2v-23.3h13Z"></path>
                        <path class="st3" d="M286,4.2c7.5,0,13.3,1.5,17.4,4.4,4.1,2.9,6.2,7.1,6.2,12.5s-1.1,7.2-3.3,9.7c-2.2,2.5-5.3,4.1-9.4,4.8,4.8.6,8.5,2.2,11.1,4.6,2.6,2.5,4,5.9,4,10.3s-2.2,10.1-6.5,13.4c-4.3,3.2-10.4,4.8-18.2,4.8h-25.7V4.2h24.5ZM275.4,30.8h11.1c2.9,0,5.3-.7,6.9-2.1,1.7-1.4,2.5-3.3,2.5-5.7s-.8-4.3-2.5-5.7c-1.7-1.4-4-2.1-6.9-2.1h-11.1v15.7ZM275.4,57.8h12c3.3,0,5.9-.7,7.6-2.1,1.8-1.4,2.8-3.4,2.8-5.9s-.9-4.7-2.8-6.1c-1.8-1.5-4.4-2.2-7.6-2.2h-12v16.3Z"></path>
                    </g>
                    </svg>
            </a>
        </div>
        <div class="card">

            <?php if ($variant === 'confirm') : ?>
                <h1><?php esc_html_e('Unsubscribe from group communications?', 'bys'); ?></h1>
                <p>
                    <?php echo wp_kses(
                        sprintf(
                            /* translators: %s: site name (bolded). */
                            __('Click the button below to stop receiving group communications from %s. You will still receive account emails like password resets.', 'bys'),
                            '<strong>' . esc_html($site_name) . '</strong>'
                        ),
                        ['strong' => []]
                    ); ?>
                </p>
                <p class="muted">
                    <?php esc_html_e('You can re-enable group communications any time by updating your preferences.', 'bys'); ?>
                </p>
                <form method="POST" action="<?php echo esc_url($post_url); ?>">
                    <input type="hidden" name="token" value="<?php echo esc_attr($token); ?>" />
                    <input type="hidden" name="bys_nonce" value="<?php echo esc_attr(wp_create_nonce('bys_groups_unsubscribe')); ?>" />
                    <button type="submit" class="btn btn-primary"><?php esc_html_e('Unsubscribe', 'bys'); ?></button>
                    <a href="<?php echo esc_url($site_url); ?>" class="btn btn-secondary"><?php esc_html_e('Cancel', 'bys'); ?></a>
                </form>

            <?php elseif ($variant === 'success') : ?>
                <h1><?php esc_html_e("You're unsubscribed", 'bys'); ?></h1>
                <p>
                    <?php echo wp_kses(
                        sprintf(
                            /* translators: %s: site name (bolded). */
                            __('You will no longer receive group communications from %s. Account emails such as password resets will continue to be delivered.', 'bys'),
                            '<strong>' . esc_html($site_name) . '</strong>'
                        ),
                        ['strong' => []]
                    ); ?>
                </p>
                <p class="muted">
                    <?php esc_html_e('You can re-enable group communications any time by updating your preferences.', 'bys'); ?>
                </p>

            <?php else : /* error */ ?>
                <h1><?php esc_html_e('Unsuccessful', 'bys'); ?></h1>
                <p class="muted"><?php echo esc_html($error_message ?: __('The unsubscribe link is invalid or has expired.', 'bys')); ?></p>
            <?php endif; ?>

        </div>
        <div class="footer">
            <p class="muted">
                <?php echo wp_kses(
                    sprintf(
                        /* translators: 1: current year, 2: site name, 3: contact email link */
                        __('&copy; %1$s %2$s. Questions? Contact %3$s', 'bys'),
                        esc_html(date('Y')),
                        esc_html($site_name),
                        '<a href="mailto:learn@skillplan.ca" target="_blank">learn@skillplan.ca</a>'
                    ),
                    ['a' => ['href' => [], 'target' => []]]
                ); ?>
            </p>
        </div>
    </div>
</body>
</html>
