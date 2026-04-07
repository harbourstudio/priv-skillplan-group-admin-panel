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

// Current page slug — used to determine the active tab
$current_slug = get_post_field( 'post_name', get_the_ID() );

$tabs = [
    [
        'id'    => 'administrator-dashboard',
        'label' => __( 'Overview', 'bys' ),
        'url'   => home_url( '/administrator-dashboard/' ),
    ],
    [
        'id'    => 'enrolment',
        'label' => __( 'Enrolment', 'bys' ),
        'url'   => home_url( '/administrator-dashboard/enrolment/' ),
    ],
    [
        'id'    => 'curriculum',
        'label' => __( 'Curriculum', 'bys' ),
        'url'   => home_url( '/administrator-dashboard/curriculum/' ),
    ],
    [
        'id'    => 'communications',
        'label' => __( 'Communications', 'bys' ),
        'url'   => home_url( '/administrator-dashboard/communications/' ),
    ],
    [
        'id'    => 'grading',
        'label' => __( 'Grading', 'bys' ),
        'url'   => home_url( '/administrator-dashboard/grading/' ),
    ],
];
?>

<div <?= $wrapper_attributes; ?>>
    <nav class="group-tabs" aria-label="<?php esc_attr_e( 'Group dashboard sections', 'bys' ); ?>">
        <?php foreach ( $tabs as $tab ) :
            $is_active = $current_slug === $tab['id'];
        ?>
        <a href="<?php echo esc_url( $tab['url'] ); ?>"
           class="group-tab<?php echo $is_active ? ' group-tab--active' : ''; ?>"
           <?php echo $is_active ? 'aria-current="page"' : ''; ?>
        >
            <?php echo esc_html( $tab['label'] ); ?>
        </a>
        <?php endforeach; ?>
    </nav>
</div>
