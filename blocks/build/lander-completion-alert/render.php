<?php
$lander_id = get_the_ID();
if ( ! $lander_id ) return;

$d = bys_lander_resolve( $lander_id );
if ( empty( $d ) ) return;

$locked_text    = ( $attributes['lockedText']    ?? '' ) ?: get_field( 'completion_locked_text',    $lander_id );
$unlocked_text  = ( $attributes['unlockedText']  ?? '' ) ?: get_field( 'completion_unlocked_text',  $lander_id );
$cta_label      = ( $attributes['ctaLabel']      ?? '' ) ?: get_field( 'completion_cta_label',      $lander_id );
$cta_url        = ( $attributes['ctaUrl']        ?? '' ) ?: get_field( 'completion_cta_url',        $lander_id );
$cta_open_modal = ! empty( $attributes['ctaOpenModal'] )
    ? true
    : (bool) get_field( 'completion_cta_open_modal', $lander_id );

$lander_courses = $d['lander_courses'];
$user_id        = $d['user_id'];

if ( ! $locked_text || empty( $lander_courses ) ) return;

$all_complete = $user_id && array_reduce(
    $lander_courses,
    fn( $carry, $cid ) => $carry && learndash_course_status( $cid, $user_id ) === 'Completed',
    true
);

$alert_text  = $all_complete ? $unlocked_text : $locked_text;
$alert_state = $all_complete ? 'bys-lander-completion-alert--unlocked' : 'bys-lander-completion-alert--locked';
$icon_class  = $all_complete ? 'fa-circle-check' : 'fa-lock';

$wrapper_attributes = get_block_wrapper_attributes( [ 'class' => 'bys-lander-courses' ] );
?>

<div <?php echo $wrapper_attributes; ?>>
    <div class="bys-lander-completion-alert <?php echo esc_attr( $alert_state ); ?>">

        <div class="bys-lander-completion-alert__body">
            <i class="fa-solid <?php echo esc_attr( $icon_class ); ?> bys-lander-completion-alert__icon" aria-hidden="true"></i>
            <p class="bys-lander-completion-alert__message"><?php echo wp_kses_post( $alert_text ); ?></p>
        </div>

        <?php if ( $cta_label ) : ?>
            <div class="bys-lander-completion-alert__cta">
                <?php if ( $all_complete ) : ?>
                    <?php if ( $cta_open_modal && $cta_url ) : ?>
                        <button type="button"
                                class="btn btn-primary bys-lander-completion-alert__btn is-modal-button"
                                aria-haspopup="dialog"
                                aria-expanded="false"
                                aria-controls="<?php echo esc_attr( ltrim( $cta_url, '#' ) ); ?>"
                                data-overlay="<?php echo esc_attr( $cta_url ); ?>">
                            <?php echo esc_html( $cta_label ); ?>
                        </button>
                    <?php elseif ( $cta_url ) : ?>
                        <a href="<?php echo esc_url( $cta_url ); ?>" class="btn btn-primary bys-lander-completion-alert__btn">
                            <?php echo esc_html( $cta_label ); ?>
                        </a>
                    <?php endif; ?>
                <?php else : ?>
                    <button type="button"
                            class="btn btn-secondary bys-lander-completion-alert__btn bys-lander-completion-alert__btn--disabled"
                            disabled
                            aria-disabled="true">
                        <i class="fa-solid fa-lock fa-xs" aria-hidden="true"></i>
                        <?php echo esc_html( $cta_label ); ?>
                    </button>
                <?php endif; ?>
            </div>
        <?php endif; ?>

    </div>
</div>
