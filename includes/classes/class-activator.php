<?php
/**
 * Plugin Activator Class
 * 
 * @package BYS_Groups
 * @since 1.0.0
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Activator')) {
    class BYS_Groups_Activator {

        public static function activate() {
            self::create_tables();
        }
    
        public static function create_tables() {
            global $wpdb;
            $charset_collate = $wpdb->get_charset_collate();

            $sql = "CREATE TABLE {$wpdb->prefix}" . BYS_GROUPS_USER_ACTIVITY_TABLE . " (
                id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id      BIGINT UNSIGNED NOT NULL,
                activity     VARCHAR(64)     NOT NULL,
                initiated_by VARCHAR(64)     NOT NULL,
                object_id    BIGINT UNSIGNED DEFAULT 0,
                object_title VARCHAR(255)    DEFAULT NULL,
                object_type  VARCHAR(64)     DEFAULT NULL,
                meta         LONGTEXT        DEFAULT NULL,
                created_at   DATETIME        NOT NULL,
                PRIMARY KEY  (id),
                KEY user_activity_date (user_id, activity, created_at)
                ) $charset_collate;";

            require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
            dbDelta($sql);

            // error_log('BYS Groups: Created/updated bys_groups_user_activity table');

        }
    }
}