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
| `activity` | VARCHAR(255) | No | Activity type identifier (e.g., `quiz_submitted`, `lesson_completed`) |
| `initiated_by` | VARCHAR(50) | No | Who triggered the action: `self`, `system`, or `admin` |
| `object_id` | BIGINT | No | ID of the related LearnDash/GamiPress object (course, quiz, achievement, etc.) |
| `object_title` | VARCHAR(255) | Yes | Human-readable title of the object |
| `object_type` | VARCHAR(50) | Yes | Type of object: `course`, `lesson`, `topic`, `quiz`, `form`, `achievement` |
| `meta` | LONGTEXT | Yes | JSON-encoded metadata specific to the activity type |
| `created_at` | DATETIME | No | Timestamp when activity occurred (UTC) |

### Indexes
- `PRIMARY KEY (id)`
- Index on `user_id` - Fast lookup by user
- Index on `activity` - Fast lookup by activity type
- Index on `created_at` - Fast chronological queries

## Implementation Details

- `includes/classes/class-activator.php` - Database schema and plugin setup
- `includes/classes/class-activity-logger.php` - Activity event logging (system, form, LearnDash events)
- `includes/classes/class-rest-api.php` - REST API endpoint (merges custom table + GamiPress data)

### Hook Registration

Review the register_hooks() method of BYS_Groups_Activity_Logger to see what event hooks are registered

```php
private function register_hooks() {
    // System events
    add_action('wp_login', [$this, 'on_user_login'], 10, 2);
    
    // LearnDash events
    add_action('learndash_course_completed', [$this, 'on_certificate_earned'], 10, 1);
    add_action('learndash_lesson_completed', [$this, 'on_lesson_completed'], 10, 1);
    
    // ... more hooks
}
```

### Transient-Based Deduplication

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

### Block Filters

### Available Filters
- **Activity Type** - Select one or more activity types (e.g., quiz_submitted, lesson_completed, etc.)
- **Resource Type** - Filter by object type: Course, Module (lesson), Lesson (topic), Quiz, Form, Achievement
- **Date Range** - Optional start and end dates (YYYY-MM-DD format)

### Pagination
- **Default**: 25 items per page (PER_PAGE constant)
- **Load More**: Fetches next 25 items incrementally via view.js

### Query Parameters
When filters are applied, they are passed to the REST API endpoint as query parameters:
- `activity[]=value1&activity[]=value2...` (multiple activity types)
- `object_type[]=course&object_type[]=quiz...` (multiple resource types)
- `date_from=YYYY-MM-DD` (optional, start date)
- `date_to=YYYY-MM-DD` (optional, end date)
- `page=1&per_page=25` (pagination)

### Filter Behavior
- All filter values are submitted together when the **Filter** button is clicked
- Form reset button clears all filters and resets to defaults
- Filters are cumulative (AND logic): only activities matching ALL selected filters are shown

## Other Integrations

### LearnDash

Some activities (like `certificate_earned`) fetch additional data from the LearnDash REST API:

### GamiPress Integrations

Achievement Earned events (`achievement_earned`) are fetched via GamiPress REST API at request time rather than logged to the custom table. This eliminates data duplication while maintaining metadata availability for modal displays.

**Location**: `includes/classes/class-rest-api.php` - `get_gamipress_achievements()` method

**Data Flow**:
1. Fetches achievements from `/wp-json/wp/v2/gamipress-user-earnings` endpoint
   - Filters by user_id, ordered by date (descending)
   - Only includes post_type: `badge`

2. Fetches achievement logs from `/wp-json/wp/v2/gamipress-logs` endpoint
   - Filters by user_id and type `achievement_award`
   - Indexes logs by date for matching with earnings

3. For each earning:
   - Matches with corresponding log entry to determine `trigger_type`
   - Filters to only include `gamipress_award_achievement` or `gamipress_earned_achievement` trigger types
   - Determines `initiated_by`:
     - `admin` if trigger_type is `gamipress_award_achievement` (manually awarded)
     - `system` if trigger_type is `gamipress_earned_achievement` (earned by user)

4. Transforms to activity log format:
   ```
   {
     "activity": "achievement_earned",
     "initiated_by": "system|admin",
     "object_id": <achievement_id>,
     "object_title": <achievement_title>,
     "object_type": "achievement",
     "meta": {
       "gamipress_earning": {
         "earning_id": <id>,
         "title": <title>,
         "post_type": "badge",
         "points": <points>,
         "points_type": <type>,
         "date": <date>
       }
     },
     "created_at": <mysql_date>
   }
   ```

5. Merges with custom table activities and sorts by `created_at` timestamp
6. Applies pagination to combined results

GamiPress data is only fetched when:
- No activity filter is applied (showing all activities), OR
- User has specifically selected the `achievement_earned` activity type filter

AND:
- No resource type filter is applied (showing all resource types), OR
- User has specifically selected the `achievement` resource type filter

**Key Behavior**: When filtering by `object_type` (resource type):
- Database activities are filtered by `object_type IN (...)` clause
- GamiPress achievements (which don't exist in custom table) are only fetched if:
  - No object_type filter is set, OR
  - User explicitly selected `achievement` in the resource type filter
- This prevents requesting GamiPress data when user is filtering for non-achievement resource types

This conditional logic improves performance by avoiding unnecessary API calls.

## Common issues:
- **Missing transient deduplication**: Page views logging multiple times → check transient settings
- **API auth failures**: Achievement data not loading → verify Application Password is set and GamiPress REST is enabled
- **Form events not logging**: Check Gravity Form IDs (16 = Profile, 15 = Settings)
- **Achievement metadata empty**: GamiPress API authorization issue → check `BYS_Groups_Auth::get_auth_header()` configuration