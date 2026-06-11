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
            add_action('init',      [$this, 'register_post_type']);
            add_action('acf/init',  [$this, 'register_fields']);
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
                ],
            ]);

            // Populate Gravity Forms choices dynamically so the select shows form names.
            foreach ( ['field_org_onboarding_form', 'field_org_registration_form'] as $_fk ) {
                add_filter( "acf/load_field/key={$_fk}", function( $field ) {
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
