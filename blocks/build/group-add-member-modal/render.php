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
    <div
        id="add-member-modal"
        class="gaam hs-overlay hidden"
        role="dialog"
        tabindex="-1"
        aria-labelledby="gaam__label"
        aria-modal="true"
    >
        <div class="modal-backdrop"></div>
        
        <div class="gaam__inner">
            <div class="gaam__header">
                <h4 id="gaam__label" class="gaam__title">
                    <?php esc_html_e( 'Bulk Upload Members', 'bys' ); ?>
                </h4>
                <button class="gaam__close btn-unstyled" type="button" aria-label="<?php esc_attr_e( 'Close', 'bys' ); ?>">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="gaam__body">
                <!-- Screen 1: Upload -->
                <div class="gaam__screen gaam__screen--upload">
                    <p class="gaam__upload-desc">
                        <?php esc_html_e( 'First, ', 'bys' ); ?>
                        <a href="#" class="gaam__template"><?php esc_html_e( 'download the CSV template', 'bys' ); ?></a>
                        <?php esc_html_e( ' to populate.', 'bys' ); ?>
                    </p>
                    <div class="gaam__dropzone">
                        <i class="fa-solid fa-file-csv"></i>
                        <p><?php esc_html_e( 'Drag and drop your CSV here, or', 'bys' ); ?></p>
                        <button class="gaam__upload btn-unstyled" type="button">
                            <?php esc_html_e( 'Upload CSV', 'bys' ); ?>
                        </button>
                        <input type="file" accept=".csv" class="upload__input" style="display:none;" />
                    </div>
                    <div class="gaam__alert gaam__alert--upload" style="display:none;" role="alert" aria-live="polite"></div>
                </div>

                <!-- Screen 2: Review -->
                <div class="gaam__screen gaam__screen--review" style="display:none;">
                    <div>
                        <div class="gaam__review-group gaam__review-group--add">
                            <h6>
                                <?php esc_html_e( 'Will be added', 'bys' ); ?>
                                <span class="gaam__review-count--add">(0)</span>
                            </h6>
                            <ul class="gaam__review--add"></ul>
                        </div>
                        <div class="gaam__review-group gaam__review-group--already-member" style="display:none;">
                            <h6>
                                <?php esc_html_e( 'Already members', 'bys' ); ?>
                                <span class="gaam__review-count--already-member">(0)</span>
                            </h6>
                            <ul class="gaam__review--already-member"></ul>
                        </div>
                        <div class="gaam__review-group gaam__review-group--invite">
                            <h6>
                                <?php esc_html_e( 'Will receive an invite', 'bys' ); ?>
                                <span class="gaam__review-count--invite">(0)</span>
                            </h6>
                            <ul class="gaam__review--invite"></ul>
                        </div>
                        <div class="gaam__review-group gaam__review-group--already-invited" style="display:none;">
                            <h6>
                                <?php esc_html_e( 'Already invited', 'bys' ); ?>
                                <span class="gaam__review-count--already-invited">(0)</span>
                            </h6>
                            <ul class="gaam__review--already-invited"></ul>
                        </div>
                        <div class="gaam__review-group gaam__review-group--invalid" style="display:none;">
                            <h6><?php esc_html_e( 'Invalid emails', 'bys' ); ?> <span class="gaam__review-count--invalid">(0)</span></h6>
                            <ul class="gaam__review--invalid"></ul>
                        </div>
                    </div>
                </div>

                <!-- Screen 3: Results -->
                <div class="gaam__screen gaam__screen--results" style="display:none;">
                    <div class="gaam__alert gaam__alert--results" aria-live="polite" aria-atomic="true"></div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="gaam__footer">
                <button class="gaam__back btn-unstyled" style="display:none;" type="button">
                    <?php esc_html_e( 'Back', 'bys' ); ?>
                </button>
                <button class="gaam__review btn-unstyled" type="button" disabled>
                    <?php esc_html_e( 'Review Results', 'bys' ); ?>
                </button>
                <button class="gaam__confirm btn-unstyled" style="display:none;" type="button">
                    <?php esc_html_e( 'Confirm', 'bys' ); ?>
                </button>
            </div>
        </div>
    </div>
</div>
