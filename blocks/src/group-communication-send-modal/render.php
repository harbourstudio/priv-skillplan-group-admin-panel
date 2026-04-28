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
    <div
        id="communication-send-modal"
        class="csm hs-overlay hidden"
        role="dialog"
        tabindex="-1"
        aria-labelledby="csm__modal-prompt"
        aria-modal="true"
    >
        <div class="csm__modal-backdrop"></div>

        <div class="csm__modal-inner">
            <div class="csm__modal-header">
                <div class="csm__modal-header-content">
                    <h4><?php esc_html_e( 'Send Prompt', 'bys' ); ?></h4>
                    <p class="csm__modal-prompt"><?php esc_html_e( 'Password reset', 'bys' ); ?></p>
                </div>
                <button class="csm__modal-close btn-unstyled" aria-label="<?php esc_attr_e( 'Close', 'bys' ); ?>">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="csm__modal-body">
                <form class="csm__form" onsubmit="return false;">

                    <div class="csm__form-group">
                        <label class="csm__form-label"><?php esc_html_e( 'Send to', 'bys' ); ?></label>
                        <div class="csm__radios">
                            <label class="csm__radio">
                                <input type="radio" name="recipient" value="individual" />
                                <?php esc_html_e( 'Individual learner', 'bys' ); ?>
                            </label>
                            <label class="csm__radio">
                                <input type="radio" name="recipient" value="group" checked />
                                <?php esc_html_e( 'Entire group', 'bys' ); ?>
                            </label>
                            <label class="csm__radio">
                                <input type="radio" name="recipient" value="condition" />
                                <?php esc_html_e( 'Meets condition', 'bys' ); ?>
                            </label>
                        </div>
                    </div>

                    <div class="csm__form-group csm__form-group--individual" style="display:none;">
                        <label class="csm__form-label" for="csm__bulk-recipient">
                            <?php esc_html_e( 'recipient', 'bys' ); ?>
                        </label>
                        <select id="csm__bulk-recipient" multiple size="4">
                            <option value="">
                                <?php esc_html_e( 'Users', 'bys' ); ?>
                            </option>
                        </select>
                        <p class="csm__form-hint"><?php esc_html_e( 'Hold Ctrl / ⌘ to select multiple', 'bys' ); ?></p>
                    </div>

                    <div class="csm__form-group csm__form-group--condition" style="display:none;">
                        <label class="csm__form-label" for="csm__condition">
                            <?php esc_html_e( 'Condition', 'bys' ); ?>
                        </label>
                        <select id="csm__condition">
                            <option value="">
                                <?php esc_html_e('Select a condition…', 'bys'); ?>
                            </option>
                            <option value="outstanding_any">
                                <?php esc_html_e('Outstanding on any quiz', 'bys'); ?>
                            </option>
                            <option value="outstanding_required">
                                <?php esc_html_e('Outstanding on a required quiz', 'bys'); ?>
                            </option>
                            <option value="inactive_14">
                                <?php esc_html_e('Not logged in for 14+ days', 'bys'); ?>
                            </option>
                            <option value="completed_all">
                                <?php esc_html_e('Completed all required courses', 'bys'); ?>
                            </option>
                            <option value="not_started">
                                <?php esc_html_e('Has not started any course', 'bys'); ?>
                            </option>
                        </select>
                    </div>

                    <div class="csm__form-group">
                        <label class="csm__form-label" for="csm__subject">
                            <?php esc_html_e('Subject', 'bys'); ?>
                        </label>
                        <input
                            id="csm__subject"
                            type="text"
                            class="csm__input"
                            placeholder="<?php esc_attr_e('Subject...', 'bys'); ?>"
                            disabled
                        />
                    </div>

                    <div class="csm__form-group">
                        <label class="csm__form-label" for="csm__message">
                            <?php esc_html_e('Message', 'bys'); ?>
                        </label>
                        <textarea id="csm__message" rows="5" placeholder="<?php esc_attr_e('Write your message here…', 'bys'); ?>"></textarea>
                        <div id="csm__preview" class="csm__preview" style="display:none;"></div>
                    </div>

                    <div class="csm__form-group">
                        <label class="csm__form-label"><?php esc_html_e('Schedule for', 'bys'); ?></label>
                        <div class="csm__form-schedule">
                            <input type="date" class="csm__form-schedule-date" aria-label="<?php esc_attr_e('Send date', 'bys'); ?>" />
                            <input type="time" class="csm__form-schedule-time" aria-label="<?php esc_attr_e('Send time', 'bys'); ?>" />
                        </div>
                        <p class="csm__form-hint"><?php esc_html_e('Leave blank to send immediately', 'bys'); ?></p>
                    </div>

                    <div class="csm__form-actions">
                        <button class="csm__form-submit btn-unstyled" type="submit">
                            <?php esc_html_e('Send Prompt', 'bys'); ?>
                        </button>
                    </div>

                </form>
            </div>
        </div>
    </div>
</div>
