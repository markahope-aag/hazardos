# HazardOS Database Migration Guide

## 📁 Migration File Locations

We have database migrations in **two locations** for different purposes:

### 1. `/supabase/migrations/` - **Official Supabase CLI Migrations** ⭐
- **Purpose**: Proper versioned migrations managed by Supabase CLI
- **Format**: Timestamped files (e.g., `20260131131600_rename_assessments_to_site_surveys.sql`)
- **Usage**: For production deployments and version control
- **Recommended**: Use these for all database changes going forward

### 2. `/docs/database/` - **Manual SQL Scripts** 📖
- **Purpose**: Documentation, one-off scripts, and manual database setup
- **Format**: Descriptive names (e.g., `10-rename-assessments-to-site-surveys.sql`)
- **Usage**: For manual execution in Supabase Dashboard or understanding schema changes
- **Legacy**: These were created before proper Supabase CLI setup

## 🚀 Current Migration Status

### Required Migrations (In Order):

1. **Add Assessment Photos Table** (if missing)
   - **Supabase CLI**: `supabase/migrations/20260131131550_add_assessment_photos_table.sql`
   - **Manual**: `docs/database/08-assessment-photos-table-only.sql`

2. **Rename to Site Surveys** (main migration)
   - **Supabase CLI**: `supabase/migrations/20260131131600_rename_assessments_to_site_surveys.sql`
   - **Manual**: `docs/database/10-rename-assessments-to-site-surveys.sql`

## 🛠️ How to Run Migrations

### Option A: Using Supabase CLI (Recommended)

```bash
# If you have Supabase CLI installed
supabase db push

# This will apply all pending migrations in /supabase/migrations/
```

### Option B: Manual Execution in Supabase Dashboard

1. **Go to**: Supabase Dashboard → Your Project → SQL Editor
2. **Run migrations in order**:
   ```sql
   -- First, run this if assessment_photos table doesn't exist:
   -- Copy/paste content from: supabase/migrations/20260131131550_add_assessment_photos_table.sql
   
   -- Then, run the main migration:
   -- Copy/paste content from: supabase/migrations/20260131131600_rename_assessments_to_site_surveys.sql
   ```

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

## 🔄 Going Forward

- **Use `/supabase/migrations/`** for all future database changes
- **Keep `/docs/database/`** for documentation and reference
- **Always create timestamped migrations** for proper version control
- **Test migrations locally** before applying to production

## 📞 Troubleshooting

If you encounter issues:

1. **Check current state**: Visit `/database-status` page
2. **Verify table existence**: Run verification SQL above  
3. **Check migration logs**: Look for error messages in Supabase Dashboard
4. **Rollback if needed**: Contact support or restore from backup

The migration system is now properly organized for reliable database management! 🎉