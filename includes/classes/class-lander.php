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
                'key'    => 'group_lander_content_fields',
                'title'  => 'Lander Content',
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
                        'key'          => 'field_lander_heading',
                        'label'        => 'Heading',
                        'name'         => 'heading',
                        'type'         => 'text',
                        'instructions' => 'Defaults to page title.',
                    ],
                    [
                        'key'          => 'field_lander_subtext',
                        'label'        => 'Subtext',
                        'name'         => 'subtext',
                        'type'         => 'wysiwyg',
                        'toolbar'      => 'basic',
                        'media_upload' => 0,
                    ],
                    [
                        'key'          => 'field_lander_video_url',
                        'label'        => 'Video URL',
                        'name'         => 'video_url',
                        'type'         => 'url',
                        'instructions' => 'Replaces image when set.',
                    ],
                    [
                        'key'           => 'field_lander_image',
                        'label'         => 'Image',
                        'name'          => 'image',
                        'type'          => 'image',
                        'return_format' => 'array',
                        'preview_size'  => 'medium',
                        'library'       => 'all',
                    ],
                    [
                        'key'   => 'field_lander_completion_tab',
                        'label' => 'Completion Alert',
                        'name'  => '',
                        'type'  => 'tab',
                    ],
                    [
                        'key'          => 'field_lander_completion_locked_text',
                        'label'        => 'Locked Message',
                        'name'         => 'completion_locked_text',
                        'type'         => 'wysiwyg',
                        'toolbar'      => 'basic',
                        'media_upload' => 0,
                        'instructions' => 'Shown below the course list until all courses are complete. Leave blank to hide the alert entirely.',
                        'wrapper'      => ['width' => '50'],
                    ],
                    [
                        'key'          => 'field_lander_completion_unlocked_text',
                        'label'        => 'Unlocked Message',
                        'name'         => 'completion_unlocked_text',
                        'type'         => 'wysiwyg',
                        'toolbar'      => 'basic',
                        'media_upload' => 0,
                        'instructions' => 'Shown once all courses are complete.',
                        'wrapper'      => ['width' => '50'],
                    ],
                    [
                        'key'          => 'field_lander_completion_cta_label',
                        'label'        => 'CTA Button Label',
                        'name'         => 'completion_cta_label',
                        'type'         => 'text',
                        'wrapper'      => ['width' => '33'],
                    ],
                    [
                        'key'          => 'field_lander_completion_cta_url',
                        'label'        => 'CTA Button URL',
                        'name'         => 'completion_cta_url',
                        'type'         => 'text',
                        'instructions' => 'Supports full URLs or anchor links (e.g. #section-id).',
                        'wrapper'      => ['width' => '33'],
                    ],
                    [
                        'key'         => 'field_lander_completion_cta_modal',
                        'label'       => 'Open as Modal',
                        'name'        => 'completion_cta_open_modal',
                        'type'        => 'true_false',
                        'ui'          => 1,
                        'ui_on_text'  => 'Yes',
                        'ui_off_text' => 'No',
                        'message'     => 'Trigger the link as a modal instead of navigating to the URL',
                        'wrapper'     => ['width' => '33'],
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
