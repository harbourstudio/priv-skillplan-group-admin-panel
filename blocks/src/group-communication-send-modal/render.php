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
        class="gcsm hs-overlay hidden"
        role="dialog"
        tabindex="-1"
        aria-labelledby="gcsm__modal-prompt"
        aria-modal="true"
    >
        <div class="gcsm__modal-backdrop"></div>

        <div class="gcsm__modal-inner">
            <div class="gcsm__modal-header">
                <div class="gcsm__modal-header-content">
                    <h4><?php esc_html_e( 'Send Prompt', 'bys' ); ?></h4>
                    <p class="gcsm__modal-prompt"><?php esc_html_e( 'Password reset', 'bys' ); ?></p>
                </div>
                <button class="gcsm__modal-close btn-unstyled" aria-label="<?php esc_attr_e( 'Close', 'bys' ); ?>">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="gcsm__modal-body">
                <div class="gcsm__skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e('Loading form', 'bys'); ?>">
                    <div class="skeleton"></div>
                    <div class="skeleton"></div>
                </div>

                <form class="gcsm__form" novalidate onsubmit="return false;" style="display:none;">

                    <div>
                        <label><?php esc_html_e( 'Send to', 'bys' ); ?></label>
                        <div class="gcsm__radios-wrapper">
                            <label>
                                <input type="radio" name="recipient" value="individual" />
                                <?php esc_html_e( 'Individual learner', 'bys' ); ?>
                            </label>
                            <label>
                                <input type="radio" name="recipient" value="group" checked />
                                <?php esc_html_e( 'Entire group', 'bys' ); ?>
                            </label>
                            <label>
                                <input type="radio" name="recipient" value="condition" />
                                <?php esc_html_e( 'Meets condition', 'bys' ); ?>
                            </label>
                        </div>
                    </div>

                    <div class="gcsm__recipient-mode gcsm__recipient-mode--individual" style="display:none;">
                        <label for="gcsm__recipient-selection">
                            <?php esc_html_e( 'Recipient', 'bys' ); ?>
                        </label>
                        <div class="gcsm__skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e('Loading recipients', 'bys'); ?>" style="display:none;">
                            <div class="skeleton"></div>
                            <div class="skeleton"></div>
                            <div class="skeleton"></div>
                        </div>
                        <select id="gcsm__recipient-selection" multiple size="4"></select>
                        <p class="gcsm__hint"><?php esc_html_e( 'Hold Ctrl / ⌘ to select multiple', 'bys' ); ?></p>
                    </div>

                    <div class="gcsm__recipient-mode gcsm__recipient-mode--condition" style="display:none;">
                        <label for="gcsm__condition">
                            <?php esc_html_e( 'Condition', 'bys' ); ?>
                        </label>
                        <select id="gcsm__condition">
                            <option value=""><?php esc_html_e('Select a condition…', 'bys'); ?></option>
                            <option value="outstanding_login"><?php esc_html_e('Hasn\'t logged in (ever)', 'bys'); ?></option>
                            <option value="inactive_days"><?php esc_html_e('Hasn\'t logged in for N days', 'bys'); ?></option>
                            <option value="outstanding_course_access"><?php esc_html_e('Hasn\'t accessed a course', 'bys'); ?></option>
                            <option value="outstanding_quiz_completed"><?php esc_html_e('Hasn\'t completed a quiz', 'bys'); ?></option>
                            <option value="outstanding_course_completed"><?php esc_html_e('Hasn\'t completed a course', 'bys'); ?></option>
                            <option value="registered_for_days"><?php esc_html_e('Registered for N+ days', 'bys'); ?></option>
                            <option value="enrolled_for_days"><?php esc_html_e('Enrolled in a course for N+ days', 'bys'); ?></option>
                            <option value="course_completed"><?php esc_html_e('Completed a course', 'bys'); ?></option>
                        </select>

                        <div class="gcsm__condition-fields">
                            <div class="gcsm__condition-field gcsm__condition-field--course" style="display:none;">
                                <label for="gcsm__condition-course">
                                    <?php esc_html_e('Course', 'bys'); ?>
                                </label>
                                <select id="gcsm__condition-course">
                                    <option value=""><?php esc_html_e('Select a course…', 'bys'); ?></option>
                                </select>
                            </div>
    
                            <div class="gcsm__condition-field gcsm__condition-field--quiz" style="display:none;">
                                <label for="gcsm__condition-quiz">
                                    <?php esc_html_e('Quiz', 'bys'); ?>
                                </label>
                                <select id="gcsm__condition-quiz">
                                    <option value=""><?php esc_html_e('Select a quiz…', 'bys'); ?></option>
                                </select>
                            </div>

                            <div class="gcsm__condition-field gcsm__condition-field--days" style="display:none;">
                                <label for="gcsm__condition-days">
                                    <?php esc_html_e('Days', 'bys'); ?>
                                </label>
                                <input id="gcsm__condition-days" type="text" inputmode="numeric" placeholder="1" />
                                <p class="gcsm__hint gcsm__hint--days-error">
                                    <?php esc_html_e('Please enter a positive whole number.', 'bys'); ?>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label for="gcsm__subject">
                            <?php esc_html_e('Subject', 'bys'); ?>
                        </label>
                        <input
                            id="gcsm__subject"
                            type="text"
                            placeholder="<?php esc_attr_e('Subject...', 'bys'); ?>"
                            disabled
                        />
                    </div>

                    <label for="gcsm__message">
                        <?php esc_html_e('Message', 'bys'); ?>
                        <textarea id="gcsm__message" rows="5" placeholder="<?php esc_attr_e('Write your message here…', 'bys'); ?>"></textarea>
                    </label>
                    <div id="gcsm__preview" class="gcsm__preview" style="display:none;"></div>

                    <div class="gcsm__recipients-preview" style="display:none;">
                        <h6><?php esc_html_e('Recipients', 'bys'); ?></h6>
                        <p class="gcsm__hint gcsm__hint--recipients-empty">
                            <?php esc_html_e('Select a condition to preview recipients.', 'bys'); ?>
                        </p>
                        <div class="gcsm__skeleton" role="status" aria-busy="true" aria-label="<?php esc_attr_e('Loading matching recipients', 'bys'); ?>" style="display:none;">
                            <div class="skeleton"></div>
                            <div class="skeleton"></div>
                            <div class="skeleton"></div>
                        </div>
                        <div class="gcsm__recipients-preview-table" role="table">
                            <div class="gcsm__recipients-preview-header" role="row">
                                <span role="columnheader"><?php esc_html_e('Name', 'bys'); ?></span>
                                <span role="columnheader"><?php esc_html_e('Email', 'bys'); ?></span>
                                <span role="columnheader"><?php esc_html_e('User ID', 'bys'); ?></span>
                            </div>
                            <ul class="gcsm__recipients-preview-list" role="rowgroup"></ul>
                        </div>
                    </div>

                    <div>
                        <label><?php esc_html_e('Schedule for', 'bys'); ?></label>
                        <div class="gcsm__form-schedule">
                            <input type="text" id="gcsm__schedule-datetime" aria-label="<?php esc_attr_e('Send date and time', 'bys'); ?>" readonly />
                            <i class="fa-regular fa-calendar" aria-hidden="true"></i>
                            <button type="button" class="gcsm__schedule-clear btn-unstyled" aria-label="<?php esc_attr_e('Clear scheduled time', 'bys'); ?>" style="display:none;">
                                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                            </button>
                        </div>
                        <p class="gcsm__hint"><?php esc_html_e('Leave blank to send immediately', 'bys'); ?></p>
                    </div>

                    <div class="gcsm__form-actions">
                        <div class="gcsm__feedback" style="display: none;"></div>
                        <button class="gcsm__form-submit btn-unstyled" type="submit">
                            <?php esc_html_e('Send Prompt', 'bys'); ?>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
