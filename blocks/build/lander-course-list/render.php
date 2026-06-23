<?php
$lander_id = get_the_ID();
if ( ! $lander_id ) return;

$d = bys_lander_resolve( $lander_id );
if ( empty( $d ) || empty( $d['lander_courses'] ) ) return;

$lander_courses     = $d['lander_courses'];
$lander_course_meta = $d['lander_course_meta'];
$courses_group_title = $d['courses_group_title'];

$wrapper_attributes = get_block_wrapper_attributes( [ 'class' => 'bys-lander-courses' ] );
?>

<div <?php echo $wrapper_attributes; ?>>

    <?php if ( $courses_group_title ) : ?>
        <h2><?php echo esc_html( $courses_group_title ); ?> Courses</h2>
    <?php endif; ?>

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

</div>
