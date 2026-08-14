<?php
/**
 * Organization post type and ACF field group registration.
 *
 * Registers the 'organization' CPT and its three ACF fields entirely in code
 * so no ACF UI or database configuration is required.
 *
 * Fields:
 *   administrators      — user field (multiple, returns WP_User objects)
 *   groups              — relationship to the 'groups' (LearnDash) CPT
 *   courses             — relationship to the 'sfwd-courses' (LearnDash) CPT
 *   landers             — relationship to the 'lander' CPT
 *   show_onboarding_modal — true/false toggle (default: true)
 *   logo                — image (returns full array)
 *   font                — file upload (returns full array)
 *   hero_start_colour   — colour picker
 *   hero_end_colour     — colour picker
 *   footer_colour       — colour picker
 *   button_colour       — colour picker
 *
 * @package BYS_Groups
 * @since 1.2.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Organization')) {
    class BYS_Groups_Organization {

        public function __construct() {
            add_action('init',                  [$this, 'register_post_type']);
            add_action('acf/init',              [$this, 'register_fields']);
            add_action('gform_after_submission', [$this, 'maybe_suppress_onboarding_modal'], 10, 2);
            add_action('gform_user_registered', [$this, 'add_registered_user_to_org'], 10, 4);
        }

        /**
         * Fires synchronously during form submission (before the async background
         * process creates the user). If this form is a registration form for an org
         * with Show Onboarding Modal disabled, store a short-lived transient so the
         * modal template can suppress auto-open on the next page load — before the
         * background process has had a chance to add the user to the org's users field.
         */
        public function maybe_suppress_onboarding_modal( $entry, $form ) {
            $form_id = intval( $form['id'] );

            $orgs = get_posts([
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'fields'         => 'ids',
            ]);

            foreach ( $orgs as $org_id ) {
                if ( (int) get_field( 'registration_form', $org_id ) !== $form_id ) continue;
                if ( get_field( 'show_onboarding_modal', $org_id ) ) break; // modal enabled — nothing to suppress

                $email = '';
                foreach ( $form['fields'] as $field ) {
                    if ( $field->type === 'email' ) {
                        $email = rgar( $entry, $field->id );
                        break;
                    }
                }

                if ( $email ) {
                    set_transient( 'bys_suppress_modal_' . md5( strtolower( $email ) ), 1, HOUR_IN_SECONDS );
                }
                break;
            }
        }

        public function add_registered_user_to_org( $user_id, $feed, $entry, $password ) {
            $form_id = intval( rgar( $entry, 'form_id' ) );
            if ( ! $form_id || ! $user_id ) return;

            $orgs = get_posts([
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'fields'         => 'ids',
            ]);

            foreach ( $orgs as $org_id ) {
                if ( (int) get_field( 'registration_form', $org_id ) !== $form_id ) continue;

                $raw      = get_field( 'users', $org_id );
                $existing = is_array( $raw ) ? array_map( 'intval', $raw ) : [];
                if ( ! in_array( $user_id, $existing, true ) ) {
                    $existing[] = $user_id;
                    update_field( 'field_org_users', $existing, $org_id );
                }

                // Belt-and-suspenders: if the background process happens to finish
                // before the first page render, ensure the modal won't auto-open.
                if ( ! get_field( 'show_onboarding_modal', $org_id ) ) {
                    update_user_meta( $user_id, 'bys_onboarding_seen', 1 );
                }
                break;
            }
        }

        public function register_post_type() {
            register_post_type('organization', [
                'labels' => [
                    'name'               => __('Organizations', 'bys'),
                    'singular_name'      => __('Organization', 'bys'),
                    'add_new_item'       => __('Add New Organization', 'bys'),
                    'edit_item'          => __('Edit Organization', 'bys'),
                    'new_item'           => __('New Organization', 'bys'),
                    'view_item'          => __('View Organization', 'bys'),
                    'search_items'       => __('Search Organizations', 'bys'),
                    'not_found'          => __('No organizations found', 'bys'),
                    'not_found_in_trash' => __('No organizations found in Trash', 'bys'),
                ],
                'public'          => false,
                'show_ui'         => true,
                'show_in_menu'    => true,
                'show_in_rest'    => false,
                'supports'        => ['title'],
                'menu_icon'       => 'dashicons-building',
                'has_archive'     => false,
                'rewrite'         => false,
                'capability_type' => 'post',
            ]);
        }

        public function register_fields() {
            if (!function_exists('acf_add_local_field_group')) return;

            acf_add_local_field_group([
                'key'    => 'group_organization_fields',
                'title'  => 'Organization Fields',
                'active' => true,

                'location' => [
                    [[
                        'param'    => 'post_type',
                        'operator' => '==',
                        'value'    => 'organization',
                    ]],
                ],

                'fields' => [
                    [
                        'key'           => 'field_org_administrators',
                        'label'         => 'Administrators',
                        'name'          => 'administrators',
                        'type'          => 'user',
                        'multiple'      => 1,
                        'allow_null'    => 1,
                        'return_format' => 'object',
                        'role'          => [],
                    ],
                    [
                        'key'           => 'field_org_users',
                        'label'         => 'Users',
                        'name'          => 'users',
                        'type'          => 'user',
                        'multiple'      => 1,
                        'allow_null'    => 1,
                        'return_format' => 'id',
                        'role'          => [],
                        'wrapper'       => ['width' => '50'],
                    ],
                    [
                        'key'           => 'field_org_groups',
                        'label'         => 'Groups',
                        'name'          => 'groups',
                        'type'          => 'relationship',
                        'post_type'     => ['groups'],
                        'filters'       => ['search'],
                        'return_format' => 'object',
                        'min'           => '',
                        'max'           => '',
                    ],
                    [
                        'key'           => 'field_org_courses',
                        'label'         => 'Courses',
                        'name'          => 'courses',
                        'type'          => 'relationship',
                        'post_type'     => ['sfwd-courses'],
                        'filters'       => ['search'],
                        'return_format' => 'object',
                        'min'           => '',
                        'max'           => '',
                    ],
                    [
                        'key'           => 'field_org_landers',
                        'label'         => 'Landers',
                        'name'          => 'landers',
                        'type'          => 'relationship',
                        'post_type'     => ['lander'],
                        'filters'       => ['search'],
                        'return_format' => 'object',
                        'min'           => '',
                        'max'           => '',
                    ],
                    [
                        'key'           => 'field_org_logo',
                        'label'         => 'Logo',
                        'name'          => 'logo',
                        'type'          => 'image',
                        'return_format' => 'array',
                        'preview_size'  => 'medium',
                        'library'       => 'all',
                        'wrapper'       => ['width' => '50'],
                    ],
                    [
                        'key'           => 'field_org_registration_logo_height',
                        'label'         => 'Registration Logo Height (rem)',
                        'name'          => 'registration_logo_height',
                        'type'          => 'number',
                        'default_value' => '',
                        'min'           => 0.5,
                        'max'           => 20,
                        'step'          => 0.5,
                        'placeholder'   => 'e.g. 3',
                        'wrapper'       => ['width' => '50'],
                    ],
                    [
                        'key'           => 'field_org_body_font',
                        'label'         => 'Body Font',
                        'name'          => 'body_font',
                        'type'          => 'file',
                        'return_format' => 'array',
                        'library'       => 'all',
                        'mime_types'    => 'ttf,otf,woff,woff2',
                        'wrapper'       => ['width' => '33.33'],
                    ],
                    [
                        'key'           => 'field_org_heading_font',
                        'label'         => 'Heading Font',
                        'name'          => 'heading_font',
                        'type'          => 'file',
                        'return_format' => 'array',
                        'library'       => 'all',
                        'mime_types'    => 'ttf,otf,woff,woff2',
                        'wrapper'       => ['width' => '33.33'],
                    ],
                    [
                        'key'           => 'field_org_emphasis_font',
                        'label'         => 'Emphasis Font',
                        'name'          => 'emphasis_font',
                        'type'          => 'file',
                        'return_format' => 'array',
                        'library'       => 'all',
                        'mime_types'    => 'ttf,otf,woff,woff2',
                        'wrapper'       => ['width' => '33.33'],
                    ],
                    [
                        'key'            => 'field_org_hero_start_colour',
                        'label'          => 'Hero Start Colour',
                        'name'           => 'hero_start_colour',
                        'type'           => 'color_picker',
                        'default_value'  => '',
                        'enable_opacity' => 0,
                        'return_format'  => 'string',
                        'wrapper'        => ['width' => '25'],
                    ],
                    [
                        'key'            => 'field_org_hero_end_colour',
                        'label'          => 'Hero End Colour',
                        'name'           => 'hero_end_colour',
                        'type'           => 'color_picker',
                        'default_value'  => '',
                        'enable_opacity' => 0,
                        'return_format'  => 'string',
                        'wrapper'        => ['width' => '25'],
                    ],
                    [
                        'key'            => 'field_org_footer_colour',
                        'label'          => 'Footer Colour',
                        'name'           => 'footer_colour',
                        'type'           => 'color_picker',
                        'default_value'  => '',
                        'enable_opacity' => 0,
                        'return_format'  => 'string',
                        'wrapper'        => ['width' => '25'],
                    ],
                    [
                        'key'            => 'field_org_button_colour',
                        'label'          => 'Button Colour',
                        'name'           => 'button_colour',
                        'type'           => 'color_picker',
                        'default_value'  => '',
                        'enable_opacity' => 0,
                        'return_format'  => 'string',
                        'wrapper'        => ['width' => '25'],
                    ],
                    [
                        'key'           => 'field_org_registration_text',
                        'label'         => 'Registration Text',
                        'name'          => 'registration_text',
                        'type'          => 'wysiwyg',
                        'tabs'          => 'all',
                        'toolbar'       => 'basic',
                        'media_upload'  => 0,
                        'default_value' => '',
                    ],
                    [
                        'key'           => 'field_org_show_onboarding_modal',
                        'label'         => 'Show Onboarding Modal',
                        'name'          => 'show_onboarding_modal',
                        'type'          => 'true_false',
                        'default_value' => 1,
                        'ui'            => 1,
                        'ui_on_text'    => 'Yes',
                        'ui_off_text'   => 'No',
                        'wrapper'       => ['width' => '50'],
                    ],
                    [
                        'key'          => 'field_org_onboarding_form',
                        'label'        => 'Onboarding Form',
                        'name'         => 'onboarding_form',
                        'type'         => 'select',
                        'choices'      => [],
                        'default_value' => '',
                        'allow_null'   => 1,
                        'multiple'     => 0,
                        'ui'           => 1,
                        'return_format' => 'value',
                        'placeholder'  => 'Select a form',
                        'wrapper'      => ['width' => '50'],
                        'conditional_logic' => [
                            [
                                [
                                    'field'    => 'field_org_show_onboarding_modal',
                                    'operator' => '==',
                                    'value'    => '1',
                                ],
                            ],
                        ],
                    ],
                    [
                        'key'          => 'field_org_registration_form',
                        'label'        => 'Registration Form',
                        'name'         => 'registration_form',
                        'type'         => 'select',
                        'choices'      => [],
                        'default_value' => '',
                        'allow_null'   => 1,
                        'multiple'     => 0,
                        'ui'           => 1,
                        'return_format' => 'value',
                        'placeholder'  => 'Select a form',
                        'wrapper'      => ['width' => '50'],
                    ],
                    [
                        'key'          => 'field_org_user_update_form',
                        'label'        => 'User Update Form',
                        'name'         => 'user_update_form',
                        'type'         => 'select',
                        'choices'      => [],
                        'default_value' => '',
                        'allow_null'   => 1,
                        'multiple'     => 0,
                        'ui'           => 1,
                        'return_format' => 'value',
                        'placeholder'  => 'Select a form',
                        'wrapper'      => ['width' => '50'],
                    ],
                ],
            ]);

            // Populate Gravity Forms choices dynamically so the select shows form names.
            //
            // acf/load_field fires on every request that calls get_field() — frontend
            // and backend alike. The choices array only matters when an editor is
            // actually looking at the field on an organization edit screen. Everywhere
            // else ACF uses the saved integer (form ID) directly, so loading all GF
            // forms on every other page is pure CPU waste.
            //
            // These are plain `select` fields with ui=>1 (select2 styling only).
            // Their choices are server-rendered on page load — no AJAX fetch — so
            // restricting to the organization screen is safe; nothing breaks.
            foreach ( ['field_org_onboarding_form', 'field_org_registration_form', 'field_org_user_update_form'] as $_fk ) {
                add_filter( "acf/load_field/key={$_fk}", function( $field ) {
                    if ( ! is_admin() ) {
                        return $field;
                    }
                    $screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
                    if ( ! $screen || $screen->post_type !== 'organization' ) {
                        return $field;
                    }
                    $field['choices'] = [];
                    if ( class_exists( 'GFAPI' ) ) {
                        $forms = GFAPI::get_forms();
                        usort( $forms, fn( $a, $b ) => strcmp( $a['title'], $b['title'] ) );
                        foreach ( $forms as $form ) {
                            $field['choices'][ $form['id'] ] = esc_html( $form['title'] );
                        }
                    }
                    return $field;
                } );
            }
        }
    }
}
