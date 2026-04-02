# Activity Logging System

## Overview

The Plugin's Activity Logging system tracks various user-related events. Some events are logged to a custom database table (`bys_groups_user_activity`) and exposed via the REST API endpoint `/wp-json/bys-groups/v1/users/{user_id}/activity`.

## Database Schema

On activation, the plugin creates the `bys_groups_user_activity` database table.

**Table Name**: `wp_bys_groups_user_activity` (with WordPress table prefix)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | BIGINT | No | Auto-incrementing primary key |
| `user_id` | BIGINT | No | WordPress user ID |
| `activity` | VARCHAR(255) | No | Activity type identifier (e.g., `user_login`, `lesson_visited`, `certificate_earned`) |
| `initiated_by` | VARCHAR(50) | No | Who triggered the action: `self`, `system`, or `admin` |
| `object_id` | BIGINT | No | ID of the related LearnDash/GamiPress object (course, quiz, achievement, etc.) |
| `object_title` | VARCHAR(255) | Yes | Human-readable title of the object |
| `object_type` | VARCHAR(50) | Yes | Type of object: `course`, `lesson`, `topic`, `quiz`, `form`, `achievement` |
| `meta` | LONGTEXT | Yes | JSON-encoded metadata specific to the activity type |
| `created_at` | DATETIME | No | Timestamp when activity occurred (UTC) |

## Implementation Details

- `includes/classes/class-activator.php` - Database schema and plugin setup
- `includes/classes/class-activity-logger.php` - Activity event logging
- `includes/classes/class-rest-api.php` - REST API endpoint (merges custom table + other API data)

### Hook Registration

Review the register_hooks() method of BYS_Groups_Activity_Logger to see what event hooks are registered

```php
private function register_hooks() {
    // System events
    add_action('wp_login', [$this, 'on_user_login'], 10, 2);
    add_action('template_redirect', [$this, 'on_page_view'], 10);

    // ... more hooks
}
```

### Transients for Deduplication

View events (like `lesson_visited`, `topic_visited`) use WordPress transients to prevent duplicate and redundant logging:

EG: For a 30 minute transient

```php
$transient_key = 'bys_page_view_' . $user_id . '_' . $post_id;
if (get_transient($transient_key)) {
    return; // Already logged within time window
}
// Log activity...
set_transient($transient_key, true, 30 * MINUTE_IN_SECONDS);
```

## Block

The `user-activity` Gutenberg block displays activities in the frontend.

**Pagination**
- Default: 25 items per page (PER_PAGE constant)
- Load More: Fetches next 25 items incrementally via view.js

**Query Parameters**
When filters are applied, they are passed to the REST API endpoint as query parameters:
- `activity[]=value1&activity[]=value2...`
- `object_type[]=course&object_type[]=quiz...`
- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`
- `page=1&per_page=25`

**Filter Behavior**
- All filter values are submitted together when the **Filter** button is clicked
- Form reset button clears all filters and resets to defaults
- Filters are cumulative (AND logic): only activities matching ALL selected filters are shown

## Other Integrations

### LearnDash

LearnDash completion events (`lesson_completed`, `topic_completed`, `quiz_completed`, `quiz_submitted`) are not logged to the custom table, but fetched on-demand from LearnDash's API at request time.

**Data Flow**
`includes/classes/class-rest-api.php` - `get_learndash_activity()` method
1. Queries `learndash_user_activity` table for completion events filtered by activity type (lesson, topic, quiz)
2. Respects `activity[]` filters (`lesson_completed`, `topic_completed`, `quiz_submitted`, `quiz_completed`)
3. Respects `object_type[]` filters (lesson, topic, quiz)
4. Applies date range filtering (`date_from`, `date_to`)
5. Transforms LearnDash data to activity log format with course metadata
6. Returns transformed items for merging with custom table and other integrations

### GamiPress

Achievement events (`achievement_earned`) are not logged to the custom table, but are fetched on-demand from GamiPress API at request time.

**Data Flow**
`includes/classes/class-rest-api.php` - `get_gamipress_achievements()` method
1. Fetches achievements from `/wp-json/wp/v2/gamipress-user-earnings` endpoint
   - Filters by user_id, ordered by date (descending)
   - Only includes post_type: `badge`

2. Fetches achievement logs from `/wp-json/wp/v2/gamipress-logs` endpoint
   - Filters by user_id and type `achievement_award`
   - Indexes logs by date for matching with earnings

3. For each earning, matches with corresponding log entry to determine `trigger_type`
   - Filters to only include `gamipress_award_achievement` or `gamipress_earned_achievement` trigger types
   - Determines `initiated_by`:
     - `admin` if trigger_type is `gamipress_award_achievement` (manually awarded)
     - `system` if trigger_type is `gamipress_earned_achievement` (earned by user)

4. Transforms to activity log format with complete GamiPress earning metadata
5. Returns transformed items for merging with custom table and other integrations
6. Final merge and pagination happens in main `get_user_activity()` endpoint


### Gravity Forms

Form submission events (`profile_update`, `account_settings_update`) are not logged to the custom table, but are fetched on-demand from Gravity Forms API at request time.

**Data Flow**
`includes/classes/class-rest-api.php` - `get_gravity_forms_submissions()` method
1. Maps form IDs to activity slugs:
   - Form 16 → `profile_update`
   - Form 15 → `account_settings_update`
2. Fetches entries from `/wp-json/gf/v2/forms/{form_id}/entries` endpoint filtered by `created_by` user
3. Transforms each entry to activity log format with `object_type: 'form'`
4. Returns transformed items for merging with custom table and other integrations
5. Final merge and pagination happens in main `get_user_activity()` endpoint

**Note**: Ensure that REST API is enabled for Gravity Forms

## Common issues:
- Page views logging multiple times → check transient settings
- Form events not showing → Check Gravity Form IDs and if REST API is enabled for Gravity Forms 