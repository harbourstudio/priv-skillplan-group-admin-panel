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
$can_preview  = current_user_can( 'administrator' ) || current_user_can( 'editor' );

$allowed_inline = [ 'strong' => [], 'em' => [], 'br' => [] ];

$slides = [
    [
        'title' => __( 'Welcome to the My Groups Dashboard', 'bys' ),
        'body'  => __( 'This dashboard allows you to stay in touch with your group members and keep track of their progress.', 'bys' ),
        'image' => BYS_GROUPS_PLUGIN_URL . 'assets/images/onboarding-1.png',
        'alt'   => __( 'Group dashboard overview', 'bys' ),
    ],
    [
        'title' => __( 'View Group Progress', 'bys' ),
        'body'  => __( 'The <strong>Overview</strong> page allows you to quickly view stats for your whole group, as well as narrow into individual users’ progress and quiz submissions.', 'bys' ),
        'image' => BYS_GROUPS_PLUGIN_URL . 'assets/images/onboarding-2.png',
        'alt'   => __( 'group progress', 'bys' ),
    ],
    [
        'title' => __( 'Enrol New Users', 'bys' ),
        'body'  => __( 'The <strong>Enrolment</strong> page allows you to invite new users to your group. Invite individually or in batches with the bulk enrolment tool.', 'bys' ),
        'image' => BYS_GROUPS_PLUGIN_URL . 'assets/images/onboarding-3.png',
        'alt'   => __( 'Enrol users', 'bys' ),
    ],
    [
        'title' => __( 'Adjust Your Curriculum', 'bys' ),
        'body'  => __( 'The <strong>Curriculum</strong> page allows you to add and automatically assign courses to your group. Approved group leaders can also control member access to Trade-Specific assessments here.', 'bys' ),
        'image' => BYS_GROUPS_PLUGIN_URL . 'assets/images/onboarding-4.png',
        'alt'   => __( 'Adjust curriculum', 'bys' ),
    ],
    [
        'title' => __( 'Communicate to Your Members', 'bys' ),
        'body'  => __( 'The <strong>Communication</strong> page allows you to contact your members with prompted or custom messages.', 'bys' ),
        'image' => BYS_GROUPS_PLUGIN_URL . 'assets/images/onboarding-5.png',
        'alt'   => __( 'Sending group communications', 'bys' ),
    ],
];

$total = count( $slides );
?>

<div <?= $wrapper_attributes; ?>>
    <?php if ( $can_preview ) : ?>
    <button class="gom__preview-trigger btn-unstyled" type="button" title="<?php esc_attr_e( 'Preview onboarding modal', 'bys' ); ?>">
        <i class="fa-solid fa-eye"></i>
        <?php esc_html_e( 'Preview onboarding', 'bys' ); ?>
    </button>
    <?php endif; ?>

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
