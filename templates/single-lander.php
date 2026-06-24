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
?>

<main class="bys-lander">

    <?php the_content(); ?>

</main>

<?php get_footer(); ?>