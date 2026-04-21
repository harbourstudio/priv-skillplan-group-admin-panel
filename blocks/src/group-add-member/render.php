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
?>

<div <?= $wrapper_attributes; ?>>
    <div class="add-member__header">
        <h5 class="add-member__title"><?php esc_html_e( 'Add Member', 'bys' ); ?></h5>
        <p class="add-member__subtitle"><?php esc_html_e( 'Enroll by email. New accounts are created automatically.', 'bys' ); ?></p>
    </div>
    <div class="add-member__card">
        <div class="add-member__field">
            <label class="add-member__label" for="add-member-email"><?php esc_html_e( 'Email address', 'bys' ); ?></label>
            <input class="add-member__input" type="email" id="add-member-email" placeholder="learner@company.com" autocomplete="off" />
        </div>
        <div class="add-member__roles">
            <label class="add-member__radio">
                <input type="radio" name="add-member-role" value="learner" checked />
                <span><?php esc_html_e( 'Learner', 'bys' ); ?></span>
            </label>
            <label class="add-member__radio">
                <input type="radio" name="add-member-role" value="leader" />
                <span><?php esc_html_e( 'Group leader', 'bys' ); ?></span>
            </label>
        </div>
        <div class="add-member__actions">
            <button class="add-member__enrol btn-unstyled" type="button" disabled>
                <?php esc_html_e( 'Enrol', 'bys' ); ?>
            </button>
            <button class="add-member__bulk btn-unstyled" type="button" data-hs-overlay="#add-member-modal">
                <?php esc_html_e( 'Bulk Upload', 'bys' ); ?>
            </button>
        </div>
        <div class="add-member__message" style="display:none;" aria-live="polite"></div>

        <div class="add-member__footer">
            <p class="add-member__note">
                <strong><?php esc_html_e( 'Existing accounts:', 'bys' ); ?></strong>
                <?php esc_html_e( ' If this email is already registered, the user will be enrolled immediately. Otherwise, an invitation email is sent and they will be enrolled once they register.', 'bys' ); ?>
            </p>
        </div>
    </div>
</div>
