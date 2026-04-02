# SkillPlan BYS Groups Plugin

A custom WordPress plugin for managing group-based learning experiences within the BYS platform. Provides Gutenberg blocks for displaying group and user data integrated with LearnDash LMS.

## Table of Contents

- [Key Features](#key-features)
- [Requirements](#requirements)
- [Installation & Setup](#installation--setup)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Development](#development)

## Key Features

- **Group Management**: Display and manage groups with assigned leaders
- **User Progress Tracking**: Monitor course and lesson completion
- **Activity Logging**: Event logging for various user actions
- **Quiz Analytics**: Track quiz attempts, scores, and performance
- **REST API**: Exposes group, user, and activity data via custom endpoints

## Requirements

- WordPress 6.0+
- LearnDash LMS (required - plugin will not activate without it)
- PHP 7.4+
- Application Password configured for LearnDash API access

## Installation & Setup

### 1. Plugin Activation

1. Upload plugin to `/wp-content/plugins/skillplan-bys-groups/`
2. Activate via WordPress Admin → Plugins
3. On activation, the plugin creates the `bys_groups_user_activity` database table

### 2. Setup Application Password

The plugin requires an **Application Password** to authenticate API requests to LearnDash.

1. Navigate to /wp-admin Dashboard
2. Go to Users → Your User Profile
3. Scroll to **Application Passwords** section, enter a name (e.g., "BYS Groups API"), and click "Generate Application Password"
4. Copy the generated password
5. Add Application Password to the plugin settings page and save


## Key Classes

Class - Purpose
`BYS_Groups_Core` - Plugin initialization and dependency checking
`BYS_Groups_Rest_API` - Defines all REST API endpoints and callbacks
`BYS_Groups_Activity_Logger` - Logs user activities (logins, course completions, etc.)
`BYS_Groups_Auth` - Manages application password authentication
`BYS_Groups_Blocks` - Registers all Gutenberg blocks
`BYS_Groups_Admin_Settings` - Admin settings UI and storage

## Documentation

Comprehensive documentation is available in separate markdown files:

- **[ACTIVITIES.md](./docs/ACTIVITIES.md)** - Activity logging system, tracked events, database schema

## Development

Blocks use WordPress Script packages (`@wordpress/scripts`) and webpack for compilation.

```bash
# Navigate to blocks directory
cd blocks

# Watch for changes (recompile on save)
npm run watch

# Production build
npm run build
```

## Important Notes for Development
1. **Keep this documentation and other .md files updated** to reflect major changes, including those related to:
- API endpoints
- Database schema modifications
- Class additions and structure changes
2. Update code comments if hook behavior or activity types change
3. Ensure that REST API for Gravity Forms is enabled
 
## Links & References

- [LearnDash REST API Documentation](https://developers.learndash.com/learndash-rest-api-ldlms-v2/)
- [LearnDash Open API](http://skillplanlearn.local/wp-json/ldlms/v2)

