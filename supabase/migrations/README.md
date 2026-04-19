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

## Migration Series Overview

**Total Migrations**: 80 files (as of April 19, 2026)  
**Status**: Active development with ongoing feature additions

### 🏗️ Major Migration Series (Chronological)

#### **Phase 1: Foundation (Jan 31, 2026) - 9 migrations**
- Initial schema, RLS policies, customers, pricing tables
- Mobile survey wizard support
- Basic multi-tenant architecture

#### **Phase 2: CRM Rebuild (Apr 3-8, 2026) - 25+ migrations**
- Companies and enhanced contacts system
- Opportunities and pipeline management  
- Job management within CRM context
- Multi-touch attribution system
- Enhanced organization and user management

#### **Phase 3: Advanced Features (Apr 6-19, 2026) - 45+ migrations**
- Invoice delivery and payment services
- Job reminders and calendar sync
- Properties feature (Apr 18)
- Job documents with video support (Apr 18)
- SMS inbound handling and templates (Apr 18)
- Performance indexes and security hardening
- Auto activity tracking and notifications

### 📊 Current Database Status

The database includes comprehensive functionality for:
- **Multi-tenant SaaS platform** with full organization isolation
- **Complete CRM system** with companies, contacts, opportunities, pipeline
- **Properties management** with work history tracking
- **Mobile site surveys** with offline support and media upload
- **Job management** with scheduling, completion tracking, documents
- **Invoice system** with delivery automation and payment tracking
- **SMS communications** with two-way messaging and templates
- **Advanced integrations** with QuickBooks, Google Calendar, Twilio
- **Security & performance** optimizations with proper indexing

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