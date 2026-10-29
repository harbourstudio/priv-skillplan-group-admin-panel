<?php
$lander_id = get_the_ID();
if ( ! $lander_id ) return;

$d = bys_lander_resolve( $lander_id );

$lander_courses      = $d['lander_courses']      ?? [];
$lander_course_meta  = $d['lander_course_meta']  ?? [];
$courses_group_title = $d['courses_group_title']  ?? '';
$heading_override    = $attributes['headingOverride'] ?? '';

$skill_level_filter = strtolower( trim( $attributes['skillLevelFilter'] ?? '' ) );

if ( '' !== $skill_level_filter ) {
    $lander_courses = array_values( array_filter( $lander_courses, function( $course_id ) use ( $skill_level_filter ) {
        $terms = wp_get_post_terms( $course_id, 'skill-level' );
        if ( empty( $terms ) || is_wp_error( $terms ) ) {
            return true; // no skill-level set — show in all filtered lists
        }
        foreach ( $terms as $term ) {
            if ( strtolower( $term->slug ) === $skill_level_filter || strtolower( $term->name ) === $skill_level_filter ) {
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
