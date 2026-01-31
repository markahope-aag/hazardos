# Supabase Migrations

This folder contains the **official Supabase CLI migrations** for HazardOS.

⚠️ **Important**: This is the ONLY location used by Supabase CLI. The `/docs/database/` folder is for documentation only.

## Creating New Migrations

```bash
# Create a new migration
.\supabase.exe migration new descriptive_name

# This creates: supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql
# Edit the generated file with your SQL changes
```

## Applying Migrations

```bash
# Apply all pending migrations
.\supabase.exe db push

# Check migration status
.\supabase.exe db status
```

## Current Migration Files

### ✅ Applied Migrations (In Chronological Order)

1. `20260131170746_initial_schema.sql` - Base database schema with organizations, profiles, assessments, etc.
2. `20260131170912_rls_policies.sql` - Row Level Security policies for multi-tenancy  
3. `20260131135419_create_customers_table.sql` - Customer contact and relationship management
4. `20260131135551_add_customer_linkage_to_site_surveys.sql` - Links site surveys to customer records
5. `20260131135626_add_scheduling_fields_to_site_surveys.sql` - Scheduling and appointment status fields
6. `20260131135724_create_pricing_settings_tables.sql` - Pricing tables (labor, equipment, materials, etc.)
7. `20260131180000_rename_assessments_to_site_surveys.sql` - Renames assessments → site_surveys
8. `20260131200000_add_mobile_survey_fields.sql` - Mobile survey wizard JSONB fields
9. `20260131210000_fix_rls_infinite_recursion.sql` - Fixed RLS infinite recursion issue

### 📊 Migration Status: **COMPLETE** ✅

All migrations have been successfully applied. Database is production-ready with:
- Complete customer management system
- Site survey scheduling capabilities  
- Comprehensive pricing tables
- Mobile survey support
- Secure RLS policies

## Migration Workflow

### 1. Create Migration
```bash
.\supabase.exe migration new add_feature_name
```

### 2. Edit Generated File
Add your SQL changes to the generated file in `supabase/migrations/`

### 3. Apply Migration
```bash
.\supabase.exe db push
```

### 4. Verify Success
- Use `.\supabase.exe db status` to check migration status
- Visit `/database-status` page in the app for health checks

## Migration Naming Convention

**Format**: `YYYYMMDDHHMMSS_descriptive_name.sql`

**Examples**:
- `20260201120000_add_user_preferences.sql`
- `20260201130000_create_notifications_table.sql`
- `20260201140000_update_user_roles.sql`

## Important Notes

1. **Only this folder** is used by Supabase CLI
2. **Timestamp order** determines execution sequence
3. **Never modify** applied migrations - create new ones instead
4. **Always backup** before applying to production
5. **Commit migrations** to version control after creation

## Related Documentation

- `../docs/MIGRATION-GUIDE.md` - Complete migration workflow guide
- `../docs/DATABASE-SETUP-CHECKLIST.md` - Database verification steps
- `../docs/database/` - Legacy reference materials (not used by CLI)