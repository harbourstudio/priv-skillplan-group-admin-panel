<?php
$attrs = ['blockId'];
foreach ($attrs as $a) {
    if (isset($attributes[$a])) {
        if (is_bool($attributes[$a])) {
            ${$a} = $attributes[$a];
        } elseif (is_string($attributes[$a])) {
            ${$a} = $attributes[$a] !== '' ? $attributes[$a] : '';
        } else {
            ${$a} = $attributes[$a] !== null ? $attributes[$a] : '';
        }
    } else {
        ${$a} = '';
    }
}

$wrapper_attributes = get_block_wrapper_attributes();
$is_site_editor = in_array( 'editor', (array) wp_get_current_user()->roles, true );
if ( $is_site_editor ) return;

$user_id      = get_current_user_id();
$already_seen = $user_id && get_user_meta( $user_id, 'bys_group_tutorial_seen', true );
$auto_open    = $already_seen ? 'false' : 'true';
$can_preview  = is_user_logged_in();

$allowed_inline = [ 'strong' => [], 'em' => [], 'br' => [] ];

$slides = [
    [
        'title' => __( 'Welcome to the My Groups Dashboard', 'bys' ),
        'body'  => __( 'Monitor your learners\' progress and manage their access to training in the My Groups Dashboard.', 'bys' ),
        'image' => BYS_GROUPS_PLUGIN_URL . 'assets/img/welcome.gif',
        'alt'   => __( 'Group dashboard overview', 'bys' ),
    ],
    [
        'title' => __( 'Overview', 'bys' ),
        'body'  => __( 'The <strong>Overview</strong> page provides a snapshot of your group\'s progress, with options to view detailed progress for individual courses and learners.', 'bys' ),
        'image' => BYS_GROUPS_PLUGIN_URL . 'assets/img/overview-page.gif',
        'alt'   => __( 'group progress', 'bys' ),
    ],
    [
        'title' => __( 'Enrolment', 'bys' ),
        'body'  => __( 'The <strong>Enrolment</strong> page lets you invite or remove learners and assign group leaders. You can also add multiple learners at once using bulk enrolment.', 'bys' ),
        'image' => BYS_GROUPS_PLUGIN_URL . 'assets/img/enrolment-page.gif',
        'alt'   => __( 'Enrol users', 'bys' ),
    ],
    [
        'title' => __( 'Curriculum', 'bys' ),
        'body'  => __( 'The <strong>Curriculum</strong> page lets you add courses and assign them to your group. You can also manage access to trade-specific assessments.', 'bys' ),
        'image' => BYS_GROUPS_PLUGIN_URL . 'assets/img/curriculum-page.gif',
        'alt'   => __( 'Adjust curriculum', 'bys' ),
    ],
    [
        'title' => __( 'Communications', 'bys' ),
        'body'  => __( 'The <strong>Communications</strong> page lets you send messages to your group. Choose from message templates or create your own message.', 'bys' ),
        'image' => BYS_GROUPS_PLUGIN_URL . 'assets/img/communications-page.gif',
        'alt'   => __( 'Sending group communications', 'bys' ),
    ],
];

$nav_items = [
    [ 'label' => __( 'Overview', 'bys' ),       'slide' => 2 ],
    [ 'label' => __( 'Enrolment', 'bys' ),      'slide' => 3 ],
    [ 'label' => __( 'Curriculum', 'bys' ),     'slide' => 4 ],
    [ 'label' => __( 'Communications', 'bys' ), 'slide' => 5 ],
];

$total = count( $slides );
?>

<div <?= $wrapper_attributes; ?>>
    <div
        id="onboarding-modal"
        class="gom hs-overlay hidden"
        role="dialog"
        tabindex="-1"
        aria-labelledby="gom-slide-title-1"
        aria-modal="true"
        data-auto-open="<?= esc_attr( $auto_open ); ?>"
    >
        <div class="modal-backdrop"></div>

        <div class="gom__inner">
            <button class="gom__close btn-unstyled" type="button" aria-label="<?php esc_attr_e( 'Close', 'bys' ); ?>">
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="gom__body">
                <?php foreach ( $slides as $i => $slide ) :
                    $n          = $i + 1;
                    $is_last    = $n === $total;
                    $is_first   = $n === 1;
                ?>
                <div
                    class="gom__slide<?= $is_first ? ' is-active' : ''; ?>"
                    data-slide="<?= $n; ?>"
                    aria-hidden="<?= $is_first ? 'false' : 'true'; ?>"
                >
                    <div class="gom__slide-content">
                        <div class="gom__slide-content-inner">
                        <nav class="gom__slide-nav" aria-label="<?php esc_attr_e( 'Jump to section', 'bys' ); ?>">
                            <?php foreach ( $nav_items as $item ) : ?>
                            <button
                                class="gom__slide-nav-pill btn-unstyled<?= $n === $item['slide'] ? ' is-active' : ''; ?>"
                                type="button"
                                data-slide="<?= $item['slide']; ?>"
                            ><?= esc_html( $item['label'] ); ?></button>
                            <?php endforeach; ?>
                        </nav>
                        <div class="gom__slide-text">
                            <h4 id="gom-slide-title-<?= $n; ?>" class="gom__slide-title">
                                <?= esc_html( $slide['title'] ); ?>
                            </h4>
                            <p class="gom__slide-body">
                                <?= wp_kses( $slide['body'], $allowed_inline ); ?>
                            </p>
                        </div>
                        <div class="gom__slide-action">
                            <?php if ( $is_last ) : ?>
                                <button class="gom__finish btn-unstyled" type="button">
                                    <?php esc_html_e( 'Get started', 'bys' ); ?>
                                    <i class="fa-solid fa-check"></i>
                                </button>
                                <button class="gom__restart btn-unstyled" type="button">
                                    <i class="fa-solid fa-rotate-left"></i>
                                    <?php esc_html_e( 'View again', 'bys' ); ?>
                                </button>
                            <?php else : ?>
                                <button class="gom__next btn-unstyled" type="button">
                                    <?php esc_html_e( 'Next', 'bys' ); ?>
                                    <i class="fa-solid fa-arrow-right"></i>
                                </button>
                            <?php endif; ?>
                        </div>
                        </div>
                    </div>

                    <div class="gom__slide-image">
                        <img
                            src="<?= esc_url( $slide['image'] ); ?>"
                            alt="<?= esc_attr( $slide['alt'] ); ?>"
                            width="400"
                            height="300"
                        />
                    </div>
                </div>
                <?php endforeach; ?>
            </div>

            <div class="gom__footer">
                <div class="gom__dots" role="tablist" aria-label="<?php esc_attr_e( 'Slide navigation', 'bys' ); ?>">
                    <?php for ( $n = 1; $n <= $total; $n++ ) : ?>
                    <button
                        class="gom__dot<?= $n === 1 ? ' is-active' : ''; ?> btn-unstyled"
                        data-dot="<?= $n; ?>"
                        role="tab"
                        aria-selected="<?= $n === 1 ? 'true' : 'false'; ?>"
                        aria-label="<?= esc_attr( sprintf( __( 'Slide %d of %d', 'bys' ), $n, $total ) ); ?>"
                    ></button>
                    <?php endfor; ?>
                </div>
            </div>
        </div>
    </div>
</div>
