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

### Applied Migrations
- `20260131170746_initial_schema.sql` - Base database schema with organizations, profiles, assessments, etc.
- `20260131170912_rls_policies.sql` - Row Level Security policies for multi-tenancy

### Pending Migrations
- `20260131180000_rename_assessments_to_site_surveys.sql` - Renames assessments → site_surveys with full schema update

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