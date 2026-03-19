<?php
/**
 * Blocks plugin class.
 *
 * Notes: LearnDash may be abbreviated as LD in code comments across plugin classes
 *
 * @package BYS_Groups
 * @since 1.0.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Blocks')) {
    class BYS_Groups_Blocks {

        private $blocks = [
            'group-reporting',
            'group-select',
            'group-stats',
            'user-activity',
            'user-info',
            'user-progress',
            'user-quiz-attempts-modal',
            'user-quiz-details',
            'user-stats',
            'user-tabs'
        ];
        
        public function __construct() {
            $this ->init();
        }

        private function init() {
            // Enqueue WordPress Interactivity API script
            add_action('wp_enqueue_scripts', array($this, 'enqueue_interactivity_api'));

            // Run block registration
            add_action('init', array($this, 'bys_groups_register_blocks'));
        }

        /**
         * Enqueue WordPress Interactivity API script
         */
        public function enqueue_interactivity_api() {
            wp_enqueue_script('wp-interactivity');
        }

        /**
         * Method for registering blocks
         */
        public function bys_groups_register_blocks() {
            foreach($this->blocks as $block_name) {
                $block_path = BYS_GROUPS_PLUGIN_DIR . "blocks/build/{$block_name}/block.json";

                if(file_exists($block_path)) {
                    register_block_type($block_path);

                    // Manually enqueue viewScriptModule if it exists
                    $view_module_path = BYS_GROUPS_PLUGIN_DIR . "blocks/build/{$block_name}/view.module.js";
                    $view_module_asset_path = BYS_GROUPS_PLUGIN_DIR . "blocks/build/{$block_name}/view.module.asset.php";

                    if (file_exists($view_module_path) && file_exists($view_module_asset_path)) {
                        $asset_data = require $view_module_asset_path;
                        $version = isset($asset_data['version']) ? $asset_data['version'] : '1.0.0';

                        // Map module specifiers to WordPress script handles
                        $raw_deps = isset($asset_data['dependencies']) ? $asset_data['dependencies'] : array();
                        $dependencies = array();
                        foreach ($raw_deps as $dep) {
                            if ($dep === '@wordpress/interactivity') {
                                $dependencies[] = 'wp-interactivity';
                            } else {
                                $dependencies[] = $dep;
                            }
                        }

                        wp_register_script(
                            "bys-groups-{$block_name}-view",
                            BYS_GROUPS_PLUGIN_URL . "blocks/build/{$block_name}/view.module.js",
                            $dependencies,
                            $version,
                            array('type' => 'module')
                        );
                        wp_enqueue_script("bys-groups-{$block_name}-view");
                    }
                }
            }
        }
    }
}