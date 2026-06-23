<?php
/**
 * Lander post type registration.
 *
 * 'lander' posts are custom landing pages that can be attached to a group,
 * organization, or user. This class also registers the relationship fields on
 * those other objects so all lander linkage is defined in one place.
 *
 * @package BYS_Groups
 * @since 1.2.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Lander')) {
    class BYS_Groups_Lander {

        public function __construct() {
            add_action('init',             [$this, 'register_post_type']);
            add_action('acf/init',         [$this, 'register_fields']);
            add_filter('template_include', [$this, 'load_template']);
        }

        public function load_template($template) {
            if (!is_singular('lander')) return $template;
            $plugin_template = BYS_GROUPS_PLUGIN_DIR . 'templates/single-lander.php';
            return file_exists($plugin_template) ? $plugin_template : $template;
        }

        public function register_post_type() {
            register_post_type('lander', [
                'labels' => [
                    'name'               => __('Landers', 'bys'),
                    'singular_name'      => __('Lander', 'bys'),
                    'add_new_item'       => __('Add New Lander', 'bys'),
                    'edit_item'          => __('Edit Lander', 'bys'),
                    'new_item'           => __('New Lander', 'bys'),
                    'view_item'          => __('View Lander', 'bys'),
                    'search_items'       => __('Search Landers', 'bys'),
                    'not_found'          => __('No landers found', 'bys'),
                    'not_found_in_trash' => __('No landers found in Trash', 'bys'),
                ],
                'public'          => true,
                'show_ui'         => true,
                'show_in_menu'    => true,
                'show_in_rest'    => true,
                'supports'        => ['title', 'editor', 'thumbnail', 'custom-fields'],
                'menu_icon'       => 'dashicons-welcome-view-site',
                'has_archive'     => false,
                'rewrite'         => ['slug' => 'lander', 'with_front' => false],
                'capability_type' => 'post',
            ]);
        }

        public function register_fields() {
            if (!function_exists('acf_add_local_field_group')) return;

            // ── Lander CPT ───────────────────────────────────────────────────────
            acf_add_local_field_group([
                'key'    => 'group_lander_colour_overrides',
                'title'  => 'Colour Overrides',
                'active' => true,

                'location' => [
                    [[
                        'param'    => 'post_type',
                        'operator' => '==',
                        'value'    => 'lander',
                    ]],
                ],

                'fields' => [
                    [
                        'key'            => 'field_lander_footer_colour',
                        'label'          => 'Footer Colour',
                        'name'           => 'lander_footer_colour',
                        'type'           => 'color_picker',
                        'instructions'   => 'Overrides the organization footer colour for this lander. Leave blank to use the organization default.',
                        'enable_opacity' => 0,
                        'return_format'  => 'string',
                        'wrapper'        => ['width' => '50'],
                    ],
                    [
                        'key'            => 'field_lander_button_colour',
                        'label'          => 'Button Colour',
                        'name'           => 'lander_button_colour',
                        'type'           => 'color_picker',
                        'instructions'   => 'Overrides the primary button colour across all blocks on this lander.',
                        'enable_opacity' => 0,
                        'return_format'  => 'string',
                        'wrapper'        => ['width' => '50'],
                    ],
                ],
            ]);

            // ── Group CPT ────────────────────────────────────────────────────────
            acf_add_local_field_group([
                'key'    => 'group_group_lander_fields',
                'title'  => 'Lander Settings',
                'active' => true,

                'location' => [
                    [[
                        'param'    => 'post_type',
                        'operator' => '==',
                        'value'    => 'groups',
                    ]],
                ],

                'fields' => [
                    [
                        'key'           => 'field_group_landers',
                        'label'         => 'Landers',
                        'name'          => 'landers',
                        'type'          => 'relationship',
                        'post_type'     => ['lander'],
                        'filters'       => ['search'],
                        'return_format' => 'object',
                        'min'           => '',
                        'max'           => '',
                    ],
                ],
            ]);

            // ── User profile ─────────────────────────────────────────────────────
            acf_add_local_field_group([
                'key'    => 'group_user_lander_fields',
                'title'  => 'Lander Settings',
                'active' => true,

                'location' => [
                    [[
                        'param'    => 'user_form',
                        'operator' => '==',
                        'value'    => 'all',
                    ]],
                ],

                'fields' => [
                    [
                        'key'           => 'field_user_landers',
                        'label'         => 'Landers',
                        'name'          => 'landers',
                        'type'          => 'relationship',
                        'post_type'     => ['lander'],
                        'filters'       => ['search'],
                        'return_format' => 'object',
                        'min'           => '',
                        'max'           => '',
                    ],
                ],
            ]);
        }
    }
}
