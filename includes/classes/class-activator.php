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

            $current_version = get_option('bys_groups_db_version');

            if (version_compare((string) $current_version, BYS_GROUPS_DB_VERSION, '<')) {
                self::create_tables();
                update_option('bys_groups_db_version', BYS_GROUPS_DB_VERSION, true);
            }

            // Flag a rewrite flush so new CPTs are recognised on the next load.
            // Checked and cleared in BYS_Groups_Core::init() after all CPTs register.
            update_option('bys_flush_rewrite_rules', true, true);
        }

    
        public static function create_tables() {
            global $wpdb;
            $charset_collate = $wpdb->get_charset_collate();

            require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

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
            dbDelta($sql);

            $sql_invites = "CREATE TABLE {$wpdb->prefix}" . BYS_GROUPS_INVITES_TABLE . " (
                id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                group_id    BIGINT UNSIGNED NOT NULL,
                email       VARCHAR(255)    NOT NULL,
                role        VARCHAR(32)     NOT NULL DEFAULT 'learner',
                status      VARCHAR(32)     NOT NULL DEFAULT 'pending',
                invited_by  BIGINT UNSIGNED NOT NULL DEFAULT 0,
                invited_at  DATETIME        NOT NULL,
                enrolled_at DATETIME                 DEFAULT NULL,
                user_id     BIGINT UNSIGNED          DEFAULT NULL,
                PRIMARY KEY (id),
                KEY group_status (group_id, status),
                KEY email (email)
                ) $charset_collate;";
            dbDelta($sql_invites);

            $sql_comms = "CREATE TABLE {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . " (
                id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                message_id       VARCHAR(255)    DEFAULT NULL,
                recipient_email  VARCHAR(255)    NOT NULL,
                group_id         BIGINT UNSIGNED NOT NULL,
                sender_user_id   BIGINT UNSIGNED NOT NULL,
                prompt_type      VARCHAR(50)     NOT NULL,
                batch_id         VARCHAR(36)     NOT NULL DEFAULT '',
                subject          VARCHAR(255)    DEFAULT NULL,
                body_html        LONGTEXT        DEFAULT NULL,
                body_text        TEXT            DEFAULT NULL,
                delivery_status  VARCHAR(50)     DEFAULT 'pending',
                bounce_type      VARCHAR(50)     DEFAULT NULL,
                delivered_at     DATETIME        DEFAULT NULL,
                scheduled_at     DATETIME        DEFAULT NULL,
                condition_meta   TEXT            DEFAULT NULL,
                created_at       DATETIME        NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY message_id (message_id),
                KEY group_sender (group_id, sender_user_id),
                KEY batch_id (batch_id),
                KEY delivery_status (delivery_status),
                KEY scheduled_at (scheduled_at)
                ) $charset_collate;";
            dbDelta($sql_comms);

        }
    }
}