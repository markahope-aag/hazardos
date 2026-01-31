# HazardOS Database Migration Guide

## 📁 Migration File Locations

### `/supabase/migrations/` - **Official Supabase CLI Migrations** ⭐
- **Purpose**: Official versioned migrations managed by Supabase CLI
- **Format**: `<timestamp>_<descriptive_name>.sql` (e.g., `20260201120000_add_user_preferences.sql`)
- **Usage**: Production deployments, version control, team collaboration
- **This is the ONLY location** used by Supabase CLI for migrations

### `/docs/database/` - **Legacy Documentation** 📖
- **Purpose**: Documentation, reference materials, and historical scripts
- **Status**: **Legacy/Reference Only** - Not used by Supabase CLI
- **Usage**: Understanding schema evolution, manual reference
- **Note**: These files are NOT automatically applied by `supabase db push`

## 🚀 Current Migration Status

### Required Migrations (In Order):

1. **Add Assessment Photos Table** (if missing)
   - **Supabase CLI**: `supabase/migrations/20260131131550_add_assessment_photos_table.sql`
   - **Manual**: `docs/database/08-assessment-photos-table-only.sql`

2. **Rename to Site Surveys** (main migration)
   - **Supabase CLI**: `supabase/migrations/20260131131600_rename_assessments_to_site_surveys.sql`
   - **Manual**: `docs/database/10-rename-assessments-to-site-surveys.sql`

## 🛠️ How to Create and Run Migrations

### Creating New Migrations

**Using Supabase CLI (Recommended)**:
```bash
# Create a new migration
.\supabase.exe migration new add_user_preferences

# This creates: supabase/migrations/20260201HHMMSS_add_user_preferences.sql
# Edit the generated file with your SQL changes
```

**Manual Creation** (if CLI not available):
```bash
# Create file with timestamp format: YYYYMMDDHHMMSS_description.sql
# Example: supabase/migrations/20260201120000_add_user_preferences.sql
```

### Applying Migrations

**Option A: Using Supabase CLI (Recommended)**
```bash
# Apply all pending migrations
.\supabase.exe db push

# Check migration status
.\supabase.exe db status
```

**Option B: Manual Execution** (Emergency/Troubleshooting Only)
1. **Go to**: Supabase Dashboard → Your Project → SQL Editor
2. **Copy/paste** the SQL content from the migration file
3. **Execute** the SQL manually

⚠️ **Important**: Manual execution bypasses migration tracking and should only be used for troubleshooting.

## 🔍 Verification

### Check Migration Status:

1. **Visit**: `https://your-app.vercel.app/database-status`
2. **Or run SQL**:
   ```sql
   -- Check if migration completed
   SELECT 
     CASE 
       WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_surveys')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_survey_photos')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments')
       THEN 'MIGRATION COMPLETE ✅'
       WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments')
       THEN 'MIGRATION NOT RUN ❌'
       ELSE 'PARTIAL MIGRATION ⚠️'
     END as migration_status;
   ```

## 📋 What Each Migration Does

### Migration 1: Add Assessment Photos Table
- Creates `assessment_photos` table if it doesn't exist
- Adds proper indexes, RLS policies, and triggers
- Ensures photos functionality works before rename

### Migration 2: Rename to Site Surveys
- `assessments` → `site_surveys`
- `assessment_photos` → `site_survey_photos`
- `assessment_id` → `site_survey_id`
- `assessment_status` → `site_survey_status`
- Updates all indexes, triggers, and RLS policies
- Maintains data integrity and relationships

## 🎯 After Migration

### Application Changes Already Made:
- ✅ All TypeScript types updated with aliases for backward compatibility
- ✅ New `SiteSurveyService` with legacy `DatabaseService` wrapper
- ✅ UI components updated to use "Site Survey" terminology
- ✅ Routes redirected: `/assessments/*` → `/site-surveys/*`
- ✅ Forms and validation schemas updated

### Storage Configuration:
- The `assessment-media` storage bucket can keep its name (works fine)
- Storage policies are organization-based, so they continue working
- Optionally rename bucket to `site-survey-media` for consistency

## 🚨 Important Notes

1. **Run migrations in order** - photos table must exist before rename
2. **Backup your data** before running migrations (Supabase auto-backups daily)
3. **Test thoroughly** after migration using `/database-status` page
4. **The app expects the new table names** - migration is required for functionality

## 🔄 Migration Best Practices

### Always Use Supabase CLI
```bash
# Create migration
.\supabase.exe migration new descriptive_name

# Apply migrations
.\supabase.exe db push

# Check status
.\supabase.exe db status
```

### Migration Naming Convention
- **Format**: `YYYYMMDDHHMMSS_descriptive_name.sql`
- **Examples**: 
  - `20260201120000_add_user_preferences.sql`
  - `20260201130000_create_notifications_table.sql`
  - `20260201140000_update_user_roles.sql`

### Development Workflow
1. **Create migration** using Supabase CLI
2. **Write SQL** in the generated file
3. **Test locally** if possible
4. **Apply to production** with `supabase db push`
5. **Commit migration file** to version control

### Important Notes
- **Only `/supabase/migrations/` files** are processed by Supabase CLI
- **Migration order** is determined by timestamp in filename
- **Never modify** existing migration files after they've been applied
- **Always backup** before running migrations on production

## 📞 Troubleshooting

If you encounter issues:

1. **Check current state**: Visit `/database-status` page
2. **Verify table existence**: Run verification SQL above  
3. **Check migration logs**: Look for error messages in Supabase Dashboard
4. **Rollback if needed**: Contact support or restore from backup

The migration system is now properly organized for reliable database management! 🎉