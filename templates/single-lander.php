<?php
/**
 * Single Lander template.
 *
 * @package BYS_Groups
 */
if (!defined('ABSPATH')) exit;

get_header();

if (!have_posts()) {
    get_footer();
    return;
}

the_post();

$lander_id = get_the_ID();

// ── Resolve parent organization ───────────────────────────────────────────────

$org_id = null;
$orgs   = get_posts([
    'post_type'      => 'organization',
    'post_status'    => 'publish',
    'posts_per_page' => -1,
    'fields'         => 'ids',
]);
foreach ($orgs as $oid) {
    foreach ((array) get_field('landers', $oid) as $l) {
        $lid = $l instanceof WP_Post ? $l->ID : intval($l);
        if ($lid === $lander_id) {
            $org_id = $oid;
            break 2;
        }
    }
}

// ── Lander fields ─────────────────────────────────────────────────────────────

$heading   = get_field('heading', $lander_id) ?: get_the_title();
$subtext   = get_field('subtext', $lander_id);
$video_url = get_field('video_url', $lander_id);
$image     = get_field('image', $lander_id);

// ── Org fields ────────────────────────────────────────────────────────────────

$logo              = $org_id ? get_field('logo', $org_id)               : null;
$hero_start_colour = ($org_id ? get_field('hero_start_colour', $org_id) : '') ?: '#1a1a2e';
$hero_end_colour   = ($org_id ? get_field('hero_end_colour', $org_id)   : '') ?: '#16213e';
$footer_colour     = $org_id ? get_field('footer_colour', $org_id)      : '';

// ── Courses ───────────────────────────────────────────────────────────────────
// Find the org group this user belongs to, then surface its enrolled courses.
// If the user is a member of multiple org groups, the first match wins.

$user_id             = get_current_user_id();
$lander_courses      = [];   // ordered list of course IDs to render
$lander_required_ids = [];   // subset that are required
$lander_course_meta  = [];   // per-course: is_required, is_locked, prereq_titles
$courses_group_title = '';

if ($org_id) {
    $org_groups = (array) get_field('groups', $org_id);

    $user_group_ids = array_map('intval', array_unique(array_merge(
        (array) learndash_get_users_group_ids($user_id),
        (array) learndash_get_administrators_group_ids($user_id)
    )));

    $matched_group_id = null;
    foreach ($org_groups as $g) {
        $gid = $g instanceof WP_Post ? $g->ID : intval($g);
        if (in_array($gid, $user_group_ids, true)) {
            $matched_group_id = $gid;
            break;
        }
    }

    if ($matched_group_id) {
        $courses_group_title = get_the_title($matched_group_id);

        $raw_required        = get_post_meta($matched_group_id, '_bys_required_course_ids', true);
        $lander_required_ids = is_array($raw_required) ? array_map('intval', $raw_required) : [];

        $enrolled = array_unique(array_map('intval', (array) learndash_group_enrolled_courses($matched_group_id)));

        // Pass 1: compute meta for every enrolled course
        foreach ($enrolled as $cid) {
            $unmet = BYS_Groups_Prerequisites::get_unmet_prerequisites($cid, $matched_group_id, $user_id);
            $lander_course_meta[$cid] = [
                'is_required'   => in_array($cid, $lander_required_ids, true),
                'is_locked'     => !empty($unmet),
                'prereq_titles' => array_map('get_the_title', $unmet),
            ];
        }

        // Pass 2: sort — required → optional → locked, each bucket ordered by admin-set course order
        $bucket_required = array_values(array_filter($enrolled, fn($id) => $lander_course_meta[$id]['is_required'] && !$lander_course_meta[$id]['is_locked']));
        $bucket_optional = array_values(array_filter($enrolled, fn($id) => !$lander_course_meta[$id]['is_required'] && !$lander_course_meta[$id]['is_locked']));
        $bucket_locked   = array_values(array_filter($enrolled, fn($id) => $lander_course_meta[$id]['is_locked']));

        $course_order = BYS_Course_Order::get_order($matched_group_id);
        if (!empty($course_order)) {
            $order_map = array_flip($course_order);
            $sort_by_order = function (array &$bucket) use ($order_map) {
                usort($bucket, function ($a, $b) use ($order_map) {
                    $ai = $order_map[$a] ?? PHP_INT_MAX;
                    $bi = $order_map[$b] ?? PHP_INT_MAX;
                    return $ai <=> $bi;
                });
            };
            $sort_by_order($bucket_required);
            $sort_by_order($bucket_optional);
            $sort_by_order($bucket_locked);
        }

        $lander_courses = array_merge($bucket_required, $bucket_optional, $bucket_locked);
    }
}


?>
<style>
/* ── Hero ───────────────────────────────────────────────────────────────────── */
.bys-lander-hero__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--wp--preset--spacing--6);;
    padding: var(--wp--preset--spacing--8) 0;
}
.bys-lander-hero__left {
    flex: 6;
    min-width: 0;
}
.bys-lander-hero__left-inner {
    max-width: 32rem;
}
@media screen and (min-width: 992px){
    .bys-lander-hero__left-inner {
        padding-right: 1rem;
    }
}
.bys-lander-hero__right {
    flex: 5;
    min-width: 0;
}
.bys-lander-hero__logo {
    margin-bottom: 20px;
}
.bys-lander-hero__logo img {
    max-width: 180px;
    max-height: 80px;
    width: auto;
    height: auto;
    display: block;
    object-fit: contain;
}
.bys-lander-hero__heading {
    color: #fff;
}
.bys-lander-hero__subtext,
.bys-lander-hero__subtext p {
    color: rgba(255, 255, 255, 0.88);
}

/* ── Video / Image ──────────────────────────────────────────────────────────── */
.bys-lander-hero__video {
    position: relative;
    border-radius: 1rem;
    overflow: hidden;
    aspect-ratio: 16 / 9;
    background: rgba(0, 0, 0, 0.25);
}
.bys-lander-hero__video iframe,
.bys-lander-hero__video video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
}
.bys-lander-hero__image {
    aspect-ratio: 3 / 2;
    border-radius: 1rem;
    overflow: hidden;
}
.bys-lander-hero__image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

/* ── Courses ────────────────────────────────────────────────────────────────── */
.bys-lander-courses {
    background: #f4f5f6;
    padding: 5rem 0 0 0;
}
.bys-lander-courses h2 {
    margin-bottom: var(--wp--preset--spacing--5, 1.5rem);
}
.bys-lander-courses .courses__row {
    display: grid;
    gap: var(--wp--preset--spacing--5, 1.5rem);
    grid-template-columns: repeat(2, 1fr);
}
.bys-lander-completion-alert p{
    margin-bottom: 0 !important;
}
@media (min-width: 1024px) {
    .bys-lander-courses .courses__row {
        grid-template-columns: repeat(3, 1fr);
    }
}
@media (max-width: 767px) {
    .bys-lander-courses .courses__row {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x mandatory;
        padding-bottom: var(--wp--preset--spacing--3, 1rem);
        width: 100vw;
        padding-right: 20vw;
    }
    .bys-lander-courses .courses__column {
        width: 85vw;
        flex-shrink: 0;
        scroll-snap-align: start;
    }
}

/* ── Footer override ────────────────────────────────────────────────────────── */
<?php if ($footer_colour) : ?>
#colophon { background-color: <?php echo esc_attr($footer_colour); ?> !important; }
<?php endif; ?>
.footer-brand svg,
.footer-brand svg * { fill: #fff !important; }

/* ── Responsive ─────────────────────────────────────────────────────────────── */
@media (max-width: 1024px) {
    .bys-lander-hero__left  { flex: 6; }
    .bys-lander-hero__right { flex: 6; }
}
@media (max-width: 768px) {
    .bys-lander-hero__inner {
        flex-direction: column;
        gap: 32px;
    }
    .bys-lander-hero__left,
    .bys-lander-hero__right { flex: none; width: 100%; }
}
</style>

<main class="bys-lander">

    <!-- ── Hero ───────────────────────────────────────────────────────────── -->
    <section class="bys-lander-hero pt-hh" style="background: linear-gradient(135deg, <?php echo esc_attr($hero_start_colour); ?>, <?php echo esc_attr($hero_end_colour); ?>);">
        <div class="container">
            <div class="bys-lander-hero__inner">

                <div class="bys-lander-hero__left">
                    <div class="bys-lander-hero__left-inner">

                        <?php if ($logo) : ?>
                            <div class="bys-lander-hero__logo">
                                <img src="<?php echo esc_url($logo['url']); ?>"
                                     alt="<?php echo esc_attr($logo['alt'] ?: get_the_title($org_id)); ?>"
                                     width="<?php echo esc_attr($logo['width']); ?>"
                                     height="<?php echo esc_attr($logo['height']); ?>">
                            </div>
                        <?php endif; ?>

                        <h1 class="bys-lander-hero__heading">
                            <?php echo esc_html($heading); ?>
                        </h1>

                        <?php if ($subtext) : ?>
                            <div class="bys-lander-hero__subtext">
                                <?php echo wp_kses_post($subtext); ?>
                            </div>
                        <?php endif; ?>

                    </div>
                </div>

                <div class="bys-lander-hero__right">

                    <?php if ($video_url) : ?>
                        <div class="bys-lander-hero__video">
                            <?php
                            $embed = wp_oembed_get($video_url, ['width' => 640]);
                            if ($embed) {
                                echo $embed;
                            } else {
                                printf(
                                    '<video src="%s" controls playsinline></video>',
                                    esc_url($video_url)
                                );
                            }
                            ?>
                        </div>
                    <?php elseif ($image) : ?>
                        <div class="bys-lander-hero__image">
                            <img src="<?php echo esc_url($image['url']); ?>"
                                 alt="<?php echo esc_attr($image['alt']); ?>"
                                 width="<?php echo esc_attr($image['width']); ?>"
                                 height="<?php echo esc_attr($image['height']); ?>">
                        </div>
                    <?php endif; ?>

                </div>

            </div>
        </div>
    </section>

    <!-- ── Courses ────────────────────────────────────────────────────────── -->
    <?php if (!empty($lander_courses)) : ?>
    <section class="bys-lander-courses">
        <div class="container">

            <?php if ($courses_group_title) : ?>
                <h2><?php echo esc_html($courses_group_title); ?> Courses</h2>
            <?php endif; ?>

            <div class="courses__row">
                <?php foreach ($lander_courses as $course_id) :
                    $meta = $lander_course_meta[$course_id] ?? [];
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
    </section>
    <?php endif; ?>

    <!-- ── Completion alert ──────────────────────────────────────────────── -->
    <?php
    $locked_text   = get_field('completion_locked_text',   $lander_id);
    $unlocked_text = get_field('completion_unlocked_text', $lander_id);
    $cta_label     = get_field('completion_cta_label',     $lander_id);
    $cta_url       = get_field('completion_cta_url',       $lander_id);

    $cta_open_modal = get_field('completion_cta_open_modal', $lander_id);

    if ( $locked_text && !empty($lander_courses) ) :
        $all_complete = $user_id && array_reduce(
            $lander_courses,
            fn($carry, $cid) => $carry && learndash_course_status($cid, $user_id) === 'Completed',
            true
        );
        $alert_text = $all_complete ? $unlocked_text : $locked_text;
    ?>
    <section class="bys-lander-courses" style="padding-top:2rem;padding-bottom:3rem;">
        <div class="container">
            <div class="bys-lander-completion-alert flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-sm border p-5 <?php echo $all_complete ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-100 border-yellow-300 text-yellow-800'; ?>">
                <div class="flex items-start gap-3">
                    <i class="fa-solid <?php echo $all_complete ? 'fa-circle-check text-green-500' : 'fa-lock text-yellow-600'; ?> mt-1" aria-hidden="true"></i>
                    <p class="!mb-0 text-sm"><?php echo wp_kses_post($alert_text); ?></p>
                </div>
                <?php if ($cta_label) : ?>
                    <?php if ($all_complete) : ?>
                        <?php if ($cta_open_modal && $cta_url) : ?>
                            <button type="button"
                                    class="btn btn-primary whitespace-nowrap flex-shrink-0 !bg-green-500 !border-green-500 locked-btn is-modal-button"
                                    aria-haspopup="dialog"
                                    aria-expanded="false"
                                    aria-controls="<?php echo esc_attr(ltrim($cta_url, '#')); ?>"
                                    data-overlay="<?php echo esc_attr($cta_url); ?>">
                                <?php echo esc_html($cta_label); ?>
                            </button>
                        <?php elseif ($cta_url) : ?>
                            <a href="<?php echo esc_attr($cta_url); ?>" class="btn btn-primary whitespace-nowrap flex-shrink-0 !bg-green-500 !border-green-500 locked-btn">
                                <?php echo esc_html($cta_label); ?>
                            </a>
                        <?php endif; ?>
                    <?php else : ?>
                        <button type="button" class="btn btn-secondary opacity-50 cursor-not-allowed flex-shrink-0 locked-btn" disabled aria-disabled="true">
                            <i class="fa-solid fa-lock fa-xs" aria-hidden="true"></i>
                            <?php echo esc_html($cta_label); ?>
                        </button>
                    <?php endif; ?>
                <?php endif; ?>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <!-- ── Freeform (block editor) ────────────────────────────────────────── -->
    <?php the_content(); ?>

</main>

<?php get_footer(); ?>
