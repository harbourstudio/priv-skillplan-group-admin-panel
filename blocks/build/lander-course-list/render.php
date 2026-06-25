<?php
$lander_id = get_the_ID();
if ( ! $lander_id ) return;

$d = bys_lander_resolve( $lander_id );

$lander_courses      = $d['lander_courses']      ?? [];
$lander_course_meta  = $d['lander_course_meta']  ?? [];
$courses_group_title = $d['courses_group_title']  ?? '';
$heading_override    = $attributes['headingOverride'] ?? '';

if ( ! empty( $attributes['filterByTradeExperience'] ) ) {
    $user_trade_raw = get_user_meta( $d['user_id'] ?? get_current_user_id(), 'trade_experience', true );
    // meta may be stored as an array (e.g. ['Apprentice']); extract the string
    $user_trade = strtolower( trim( is_array( $user_trade_raw ) ? (string) ( $user_trade_raw[0] ?? '' ) : (string) $user_trade_raw ) );

    $lander_courses = array_values( array_filter( $lander_courses, function( $course_id ) use ( $user_trade ) {
        $terms = wp_get_post_terms( $course_id, 'skill-level' );
        if ( empty( $terms ) || is_wp_error( $terms ) ) {
            return true; // no skill-level set — show to everyone
        }
        if ( '' === $user_trade ) {
            return true; // user has no trade set — show everything
        }
        foreach ( $terms as $term ) {
            if ( strtolower( $term->slug ) === $user_trade || strtolower( $term->name ) === $user_trade ) {
                return true;
            }
        }
        return false;
    } ) );
}
$h2_text             = $heading_override ?: ( $courses_group_title ? $courses_group_title . ' Courses' : '' );

$has_group   = ! empty( $courses_group_title );
$has_courses = ! empty( $lander_courses );

$wrapper_attributes = get_block_wrapper_attributes( [ 'class' => 'bys-lander-courses' ] );
?>

<div <?php echo $wrapper_attributes; ?>>

    <?php if ( $h2_text ) : ?>
        <h2><?php echo esc_html( $h2_text ); ?></h2>
    <?php endif; ?>

    <?php if ( ! $has_group ) : ?>
        <p class="bys-lander-courses__notice">
            <?php esc_html_e( 'This lander is not linked to a group yet. Courses will appear once a matching group is found for the user.', 'bys' ); ?>
        </p>
    <?php elseif ( ! $has_courses ) : ?>
        <p class="bys-lander-courses__notice">
            <?php esc_html_e( 'No courses have been added to this group yet.', 'bys' ); ?>
        </p>
    <?php else : ?>
        <div class="courses__row">
            <?php foreach ( $lander_courses as $course_id ) :
                $meta = $lander_course_meta[ $course_id ] ?? [];
            ?>
                <div class="courses__column">
                    <?php get_template_part(
                        'template-parts/content/course-card',
                        null,
                        [
                            'course_id'     => $course_id,
                            'is_required'   => $meta['is_required']   ?? false,
                            'is_locked'     => $meta['is_locked']     ?? false,
                            'prereq_titles' => $meta['prereq_titles'] ?? [],
                            'hide_archive'  => true,
                        ]
                    ); ?>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

</div>
