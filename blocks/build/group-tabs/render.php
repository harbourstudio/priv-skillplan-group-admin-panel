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

// Determine if the user may see management tabs (Enrolment, Curriculum, Communications, Settings).
// Permitted: site admin, site editor role, LD group leader, org admin.
$user    = wp_get_current_user();
$user_id = $user->ID;

$is_site_admin   = BYS_Groups_Permissions::is_site_admin( $user_id );
$is_org_admin    = BYS_Groups_Permissions::is_any_org_admin( $user_id );
$is_site_editor  = in_array( 'editor', (array) $user->roles, true );

$has_full_access = $is_site_admin || $is_org_admin;

// Regular LD group leaders (not org admins, not site admins) also get the
// management tabs — they need Enrolment/Curriculum/etc to run their group.
if ( ! $has_full_access ) {
    foreach ( get_user_meta( $user_id ) as $meta_key => $_ ) {
        if ( strpos( $meta_key, 'learndash_group_leaders_' ) === 0 ) {
            $has_full_access = true;
            break;
        }
    }
}

// Current page slug — used to determine the active tab
$current_slug = get_post_field( 'post_name', get_the_ID() );

// Tabs hidden for restricted users (graders etc.) — site editors additionally lose 'settings'
$restricted_tab_ids      = [ 'enrolment', 'curriculum', 'communications', 'settings' ];
$editor_hidden_tab_ids   = [ 'settings' ];

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
    [
        'id'    => 'settings',
        'label' => __( 'Settings', 'bys' ),
        'url'   => home_url( '/administrator-dashboard/settings/' ),
    ],
    [
        'id'    => 'groups',
        'label' => __( 'Groups', 'bys' ),
        'url'   => home_url( '/administrator-dashboard/groups/' ),
    ],
];

if ( $has_full_access ) {
    // All tabs visible — no filtering needed
} elseif ( $is_site_editor ) {
    $tabs = array_values( array_filter( $tabs, fn( $tab ) => ! in_array( $tab['id'], $editor_hidden_tab_ids, true ) ) );
} else {
    $tabs = array_values( array_filter( $tabs, fn( $tab ) => ! in_array( $tab['id'], $restricted_tab_ids, true ) ) );
}

// gate the Groups tab: not rendered unless current user is site admin or an org admin
if ( !$is_site_admin && !$is_org_admin ) {
    $tabs = array_values( array_filter( $tabs, fn( $tab ) => $tab['id'] !== 'groups' ) );
}
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
