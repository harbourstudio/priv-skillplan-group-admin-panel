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
?>

<div <?= $wrapper_attributes; ?>>
    <div class="gam__header">
        <h5 class="gam__title"><?php esc_html_e( 'Add Member', 'bys' ); ?></h5>
        <p class="gam__subtitle"><?php esc_html_e( 'Enrol by email. New accounts are created automatically.', 'bys' ); ?></p>
    </div>
    <div class="gam__card">
        <div class="gam__field">
            <label class="gam__label" for="gam-email"><?php esc_html_e( 'Email address', 'bys' ); ?></label>
            <input class="gam__input" type="email" id="gam-email" placeholder="learner@company.com" autocomplete="off" />
        </div>
        <div class="gam__roles">
            <label class="gam__radio">
                <input type="radio" name="gam-role" value="learner" checked />
                <span><?php esc_html_e( 'Learner', 'bys' ); ?></span>
            </label>
            <label class="gam__radio gam__radio--leader">
                <input type="radio" name="gam-role" value="leader" />
                <span><?php esc_html_e( 'Group leader', 'bys' ); ?></span>
            </label>
        </div>

        <div class="gam__actions">
            <button class="gam__enrol btn-unstyled" type="button" disabled>
                <?php esc_html_e( 'Enrol', 'bys' ); ?>
            </button>
            <button class="gam__bulk btn-unstyled" type="button" data-hs-overlay="#add-member-modal">
                <?php esc_html_e( 'Bulk Upload', 'bys' ); ?>
            </button>
        </div>
        <div class="gam__message" style="display:none;" aria-live="polite"></div>

        <div class="gam__footer">
            <p class="gam__note">
                <strong><?php esc_html_e( 'Existing accounts:', 'bys' ); ?></strong>
                <?php esc_html_e( ' If this email is already registered, the user will be enrolled immediately. Otherwise, an invitation email is sent and they will be enrolled once they register.', 'bys' ); ?>
            </p>
            <p class="gam__note-permission" style="display:none;">
                <?php esc_html_e( 'Only organization admins can add group leaders.', 'bys' ); ?>
            </p>
        </div>
    </div>
</div>
