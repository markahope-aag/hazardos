# Supabase Migrations

This folder contains the official Supabase CLI migrations for HazardOS.

## Migration Files

### Initial Schema (Applied)
- `20260131170746_initial_schema.sql` - Base database schema with organizations, profiles, assessments, etc.
- `20260131170912_rls_policies.sql` - Row Level Security policies for multi-tenancy

### Site Survey Migration (Pending)
- `20260131131550_add_assessment_photos_table.sql` - Adds assessment_photos table if missing
- `20260131131600_rename_assessments_to_site_surveys.sql` - Renames assessments → site_surveys

## How to Apply Migrations

### Using Supabase CLI (Recommended)
```bash
# Apply all pending migrations
supabase db push

# Check migration status
supabase db status
```

### Manual Application
Copy/paste the SQL content from each file into Supabase Dashboard → SQL Editor in chronological order.

## Migration Status

To check if migrations have been applied, visit:
- **App**: `/database-status` page
- **SQL**: Run verification queries in the migration files

## Important Notes

1. **Order matters** - Apply migrations in chronological order (by timestamp)
2. **Backup first** - Supabase provides daily backups, but consider manual backup for critical data
3. **Test after** - Use the `/database-status` page to verify successful application
4. **Site Survey migration is required** - The app code expects the new table names

## Related Documentation

- `docs/MIGRATION-GUIDE.md` - Complete migration guide with both CLI and manual options
- `docs/database/` - Legacy manual SQL scripts (for reference)
- `docs/DATABASE-SETUP-CHECKLIST.md` - Database setup verification steps