<?php
$wrapper_attributes = get_block_wrapper_attributes();
?>

<div <?= $wrapper_attributes; ?>>

    <div class="org-groups__management-wrap">
        <?php if ( current_user_can( 'manage_options' ) ) : ?>
            <div class="org-groups__new-org">
                <button class="org-groups__new-org-btn btn-unstyled" type="button">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i> New organization
                </button>
                <div class="org-groups__new-org-form">
                    <input
                        class="org-groups__new-org-input"
                        type="text"
                        placeholder="Organization name…"
                        maxlength="100"
                    />
                    <button class="org-groups__new-org-submit btn-unstyled" type="button">Create</button>
                    <button class="org-groups__new-org-cancel btn-unstyled" type="button">Cancel</button>
                </div>
            </div>
            <?php endif; ?>

        <div class="org-groups__search-wrap">
            <i class="fa-solid fa-magnifying-glass org-groups__search-icon" aria-hidden="true"></i>
            <input
                type="search"
                class="org-groups__search"
                placeholder="<?php esc_attr_e( 'Search organizations and groups…', 'bys' ); ?>"
                autocomplete="off"
                aria-label="<?php esc_attr_e( 'Search organizations and groups', 'bys' ); ?>"
            />
        </div>
    </div>

    <div class="org-groups__skeleton" aria-hidden="true">
        <?php foreach ( [ [160, 3], [120, 2] ] as [$hw, $count] ) : ?>
        <div class="skeleton-org-section">
            <div class="skeleton-org-header">
                <span class="skeleton-text" style="width: <?= $hw; ?>px;"></span>
            </div>
            <div class="skeleton-org-card">
                <?php for ( $i = 0; $i < $count; $i++ ) : ?>
                <div class="skeleton-group-row">
                    <span class="skeleton-text" style="width: <?= 120 + $i * 30; ?>px;"></span>
                    <span class="skeleton-pill"></span>
                </div>
                <?php endfor; ?>
            </div>
        </div>
        <?php endforeach; ?>
    </div>

    <div class="org-groups__list"></div>

</div>
