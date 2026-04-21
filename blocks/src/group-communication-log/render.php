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

$log_entries = [
    [ 'date' => 'Mar 15', 'label' => 'Quiz reminder: Jane Doe',            'type' => 'prompt', 'batch_date' => 'Mar 15, 2025 · 10:00am' ],
    [ 'date' => 'Mar 12', 'label' => 'Assessment deadline: Entire group',  'type' => 'prompt', 'batch_date' => 'Mar 12, 2025 · 3:00pm'  ],
    [ 'date' => 'Mar 8',  'label' => 'Great progress this week!: John Doe','type' => 'custom', 'batch_date' => 'Mar 8, 2025 · 9:15am'   ],
    [ 'date' => 'Feb 28', 'label' => 'Inactivity nudge: Entire group',     'type' => 'prompt', 'batch_date' => 'Feb 28, 2025 · 8:00am'  ],
    [ 'date' => 'Feb 15', 'label' => 'Quiz reminder: John Doe',            'type' => 'prompt', 'batch_date' => 'Feb 15, 2025 · 11:30am' ],
    [ 'date' => 'Feb 3',  'label' => 'Password reset: Entire group',       'type' => 'prompt', 'batch_date' => 'Feb 3, 2025 · 2:45pm'   ],
    [ 'date' => 'Jan 22', 'label' => 'Welcome message: Entire group',      'type' => 'custom', 'batch_date' => 'Jan 22, 2025 · 9:00am'  ],
    [ 'date' => 'Jan 10', 'label' => 'Course reminder: Jane Doe',          'type' => 'prompt', 'batch_date' => 'Jan 10, 2025 · 4:00pm'  ],
];
?>

<div <?= $wrapper_attributes; ?>>
    <h5 class="comm-log__title"><?php esc_html_e( 'Sent message log', 'bys' ); ?></h5>

    <div class="comm-log">
        <div class="comm-log__list">
            <?php foreach ( $log_entries as $i => $entry ) : ?>
            <button
                class="comm-log__row btn-unstyled<?php echo $i >= 5 ? ' comm-log__row--hidden' : ''; ?>"
                data-opens-modal="#communication-history-modal"
                data-batch-date="<?php echo esc_attr( $entry['batch_date'] ); ?>"
                data-batch-label="<?php echo esc_attr( $entry['label'] ); ?>"
            >
                <span class="comm-log__date"><?php echo esc_html( $entry['date'] ); ?></span>
                <span class="comm-log__label"><?php echo esc_html( $entry['label'] ); ?></span>
                <span class="comm-log__badge comm-log__badge--<?php echo esc_attr( $entry['type'] ); ?>">
                    <?php echo esc_html( ucfirst( $entry['type'] ) ); ?>
                </span>
            </button>
            <?php endforeach; ?>
        </div>

        <?php if ( count( $log_entries ) > 5 ) : ?>
        <button class="comm-log__show-more btn-unstyled">
            <?php esc_html_e( 'Show more', 'bys' ); ?>
        </button>
        <?php endif; ?>
    </div>
</div>
