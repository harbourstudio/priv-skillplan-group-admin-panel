<?php
$wrapper_attributes = get_block_wrapper_attributes();
?>

<div <?= $wrapper_attributes; ?>>

    <div class="user-groups__skeleton" aria-hidden="true">
        <?php foreach ( [ [140, 2], [100, 1] ] as [$hw, $count] ) : ?>
        <div class="skeleton-org-section">
            <div class="skeleton-org-header">
                <span class="skeleton-text" style="width: <?= $hw; ?>px;"></span>
            </div>
            <div class="skeleton-org-card">
                <?php for ( $i = 0; $i < $count; $i++ ) : ?>
                <div class="skeleton-group-row">
                    <span class="skeleton-text" style="width: <?= 120 + $i * 40; ?>px;"></span>
                    <span class="skeleton-pill"></span>
                </div>
                <?php endfor; ?>
            </div>
        </div>
        <?php endforeach; ?>
    </div>

    <div class="user-groups__list"></div>

</div>
