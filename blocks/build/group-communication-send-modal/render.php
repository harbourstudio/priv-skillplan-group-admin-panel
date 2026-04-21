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

$sample_members = [
    'Wade Ouellet',
    'Sarah Mitchell',
    'James Chen',
    'Emily Russo',
    'Marcus Webb',
    'Priya Sharma',
    'Tom Becker',
    'Leila Haddad',
];
?>

<div <?= $wrapper_attributes; ?>>
    <div
        id="communication-send-modal"
        class="comm-send-modal hs-overlay hidden"
        role="dialog"
        tabindex="-1"
        aria-labelledby="communication-send-modal-title"
        aria-modal="true"
    >
        <div class="modal-backdrop"></div>

        <div class="modal__inner">
            <div class="modal__header">
                <div class="modal__header-titles">
                    <h4 id="communication-send-modal-title"><?php esc_html_e( 'Send Prompt', 'bys' ); ?></h4>
                    <p class="modal__prompt-name"><?php esc_html_e( 'Password reset', 'bys' ); ?></p>
                </div>
                <button class="modal__close btn-unstyled" aria-label="<?php esc_attr_e( 'Close', 'bys' ); ?>">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="modal__body">
                <form class="comm-send-form" onsubmit="return false;">

                    <div class="comm-form-group">
                        <label class="comm-form-label"><?php esc_html_e( 'Send to', 'bys' ); ?></label>
                        <div class="comm-radios">
                            <label class="comm-radio">
                                <input type="radio" name="comm_recipients" value="individual" />
                                <?php esc_html_e( 'Individual learner', 'bys' ); ?>
                            </label>
                            <label class="comm-radio">
                                <input type="radio" name="comm_recipients" value="group" checked />
                                <?php esc_html_e( 'Entire group', 'bys' ); ?>
                            </label>
                            <label class="comm-radio">
                                <input type="radio" name="comm_recipients" value="condition" />
                                <?php esc_html_e( 'Meets condition', 'bys' ); ?>
                            </label>
                        </div>
                    </div>

                    <div class="comm-form-group comm-form-group--individual" style="display:none;">
                        <label class="comm-form-label" for="comm-bulk-recipients">
                            <?php esc_html_e( 'Recipients', 'bys' ); ?>
                        </label>
                        <select id="comm-bulk-recipients" class="comm-select comm-select--multi" multiple size="4">
                            <?php foreach ( $sample_members as $member ) : ?>
                            <option value="<?php echo esc_attr( sanitize_title( $member ) ); ?>">
                                <?php echo esc_html( $member ); ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="comm-form-hint"><?php esc_html_e( 'Hold Ctrl / ⌘ to select multiple', 'bys' ); ?></p>
                    </div>

                    <div class="comm-form-group comm-form-group--condition" style="display:none;">
                        <label class="comm-form-label" for="comm-condition-select">
                            <?php esc_html_e( 'Condition', 'bys' ); ?>
                        </label>
                        <select id="comm-condition-select" class="comm-select">
                            <option value=""><?php esc_html_e( 'Select a condition…', 'bys' ); ?></option>
                            <option value="outstanding_any"><?php esc_html_e( 'Outstanding on any quiz', 'bys' ); ?></option>
                            <option value="outstanding_required"><?php esc_html_e( 'Outstanding on a required quiz', 'bys' ); ?></option>
                            <option value="inactive_14"><?php esc_html_e( 'Not logged in for 14+ days', 'bys' ); ?></option>
                            <option value="completed_all"><?php esc_html_e( 'Completed all required courses', 'bys' ); ?></option>
                            <option value="not_started"><?php esc_html_e( 'Has not started any course', 'bys' ); ?></option>
                        </select>
                    </div>

                    <div class="comm-form-group">
                        <label class="comm-form-label" for="comm-subject">
                            <?php esc_html_e( 'Subject', 'bys' ); ?>
                        </label>
                        <input
                            id="comm-subject"
                            type="text"
                            class="comm-input comm-input--disabled"
                            value="<?php esc_attr_e( 'Auto-filled from template', 'bys' ); ?>"
                            disabled
                        />
                    </div>

                    <div class="comm-form-group">
                        <label class="comm-form-label" for="comm-message">
                            <?php esc_html_e( 'Message', 'bys' ); ?>
                        </label>
                        <textarea id="comm-message" class="comm-textarea" rows="5" placeholder="<?php esc_attr_e( 'Your message will be pre-filled from the selected template…', 'bys' ); ?>"></textarea>
                    </div>

                    <div class="comm-form-group">
                        <label class="comm-form-label"><?php esc_html_e( 'Schedule for', 'bys' ); ?></label>
                        <div class="comm-schedule">
                            <input type="date" class="comm-date" aria-label="<?php esc_attr_e( 'Send date', 'bys' ); ?>" />
                            <input type="time" class="comm-time" aria-label="<?php esc_attr_e( 'Send time', 'bys' ); ?>" />
                        </div>
                        <p class="comm-form-hint"><?php esc_html_e( 'Leave blank to send immediately', 'bys' ); ?></p>
                    </div>

                    <div class="comm-form-actions">
                        <button class="comm-submit-btn btn-unstyled" type="submit">
                            <?php esc_html_e( 'Send Prompt', 'bys' ); ?>
                        </button>
                    </div>

                </form>
            </div>
        </div>
    </div>
</div>
