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
            // Run block registration
            add_action('init', array($this, 'bys_groups_register_blocks'));
        }

        /**
         * Method for registering blocks
         */
        public function bys_groups_register_blocks() {
            foreach($this->blocks as $block_name) {
                $block_path = BYS_GROUPS_PLUGIN_DIR . "blocks/build/{$block_name}/block.json";

                if(file_exists($block_path)) {
                    // register_block_type handles viewScript enqueue automatically from block.json
                    register_block_type($block_path);
                }
            }
        }
    }
}