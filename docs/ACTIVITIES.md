# Activity Logging System

## Overview

The Plugin's Activity Logging system tracks various user-related events. Some events are logged to a custom database table (`bys_groups_user_activity`) and exposed via the REST API endpoint `/wp-json/bys-groups/v1/users/{user_id}/activity`.

**Implementation**:
- `includes/classes/class-activator.php` - Database schema and plugin setup
- `includes/classes/class-activity-logger.php` - Activity event logging (system, form, LearnDash events)
- `includes/classes/class-rest-api.php` - REST API endpoint (merges custom table + GamiPress data)

## Database Schema
On activation, the plugin creates the `bys_groups_user_activity` database table

Table: `*_bys_groups_user_activity`

Column -  Type -  Description
`id` -  INT PRIMARY KEY -  Auto-incrementing record ID
`user_id` -  INT -  WordPress user ID
`activity` -  VARCHAR(255) -  Activity type identifier
`initiated_by` -  VARCHAR(50) -  Who triggered the action: `self`, `system`, or `admin`
`object_id` -  INT -  ID of the related LearnDash/GamiPress object (course, quiz, achievement, etc.)
`object_title` -  VARCHAR(255) -  Human-readable title of the object
`object_type` -  VARCHAR(50) -  Type of object: `course`, `lesson`, `topic`, `quiz`, `form`, `achievement`
`meta` -  JSON -  Additional metadata specific to the activity type
`created_at` -  DATETIME -  Timestamp when activity occurred

## Implementation Details

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

## User Activity Block Filters

The user-activity block provides filter controls for querying and displaying user activity:
- All filter values submitted together when the **Filter** button clicked
- When filters are applied, they are passed to the REST API as follows...
EG:
  | `activity[]=value1&activity[]=value2...` (multiple activity types)
  | `date_from=YYYY-MM-DD` (optional)
  | `date_to=YYYY-MM-DD` (optional)
  | `per_page=20` (default)
- Form reset button clears all filters and resets to defaults

## Other Integrations

Some activities (like `certificate_earned`) fetch additional data from the LearnDash REST API:

## GamiPress Integrations

Achievement Earned events (`achievement_earned`) are fetched via GamiPress REST API at request time rather than logged to the custom table. This eliminates data duplication while maintaining metadata availability for modal displays.

### Implementation Details

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

### Conditional Fetching

GamiPress data is only fetched when:
- No activity filter is applied (showing all activities), OR
- User has specifically selected the `achievement_earned` activity type filter

This improves performance by avoiding unnecessary API calls.

## Common issues:
- **Missing transient deduplication**: Page views logging multiple times → check transient settings
- **API auth failures**: Achievement data not loading → verify Application Password is set and GamiPress REST is enabled
- **Form events not logging**: Check Gravity Form IDs (16 = Profile, 15 = Settings)
- **Achievement metadata empty**: GamiPress API authorization issue → check `BYS_Groups_Auth::get_auth_header()` configuration