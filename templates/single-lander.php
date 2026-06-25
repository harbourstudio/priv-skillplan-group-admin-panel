<?php
/**
 * Single Lander template.
 *
 * The three main sections (hero, course list, completion alert) are rendered
 * via server-side blocks so they can be managed independently in the editor.
 *
 * @package BYS_Groups
 */
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();

if ( ! have_posts() ) {
    get_footer();
    return;
}

the_post();

$footer_colour      = '';
$footer_text_colour = '';
$button_colour      = '';
$page_colour        = '';

if ( function_exists( 'bys_lander_resolve' ) ) {
    $d = bys_lander_resolve( get_the_ID() );

    $footer_colour      = $d['footer_colour']      ?? '';
    $footer_text_colour = $d['footer_text_colour'] ?? '';
    $button_colour      = $d['button_colour']      ?? '';
    $page_colour        = $d['page_colour']         ?? '';
}

if ( $footer_colour || $footer_text_colour || $button_colour || $page_colour ) : ?>
<style>
    <?php if ( $page_colour ) : ?>
        #content {
            background-color: <?php echo esc_attr( $page_colour ); ?> !important;
        }
    <?php endif; ?>
    <?php if ( $footer_colour ) : ?>
        #colophon {
            background-color: <?php echo esc_attr( $footer_colour ); ?> !important;
        }
    <?php endif; ?>
    <?php if ( $footer_text_colour ) : ?>
        #colophon,
        #colophon h1, #colophon h2, #colophon h3, #colophon h4, #colophon h5, #colophon h6,
        #colophon i, #colophon span, #colophon p, #colophon li,
        #colophon a, #colophon a:hover, #colophon a:focus {
            color: <?php echo esc_attr( $footer_text_colour ); ?> !important;
        }
        .footer-brand svg, .footer-brand svg * {
            fill: <?php echo esc_attr( $footer_text_colour ); ?> !important;
        }
    <?php elseif ( $footer_colour ) : ?>
        .footer-brand svg, .footer-brand svg * {
            fill: #fff !important;
        }
    <?php endif; ?>
    <?php if ( $button_colour ) : ?>
        .wp-block-bys-groups-lander-course-list .btn.btn-primary:not([disabled]),
        .wp-block-bys-groups-lander-completion-alert .btn.btn-primary:not([disabled]),
        #content :is(.wp-block-button__link.wp-element-button, .btn.btn-primary):not([disabled]),
        #colophon .btn.btn-primary:not([disabled]) {
            background-color: <?php echo esc_attr( $button_colour ); ?> !important;
            border-color: <?php echo esc_attr( $button_colour ); ?> !important;
        }
        main.bys-lander .wp-block-bys-groups-lander-course-list .hs-dropdown-toggle i {
            color: <?php echo esc_attr( $button_colour ); ?> !important;
        }
    <?php endif; ?>
</style>
<?php endif; ?>

<main class="bys-lander">

    <?php the_content(); ?>

</main>

<?php get_footer(); ?>