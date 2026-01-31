# HazardOS Database Documentation (Legacy)

⚠️ **Important**: This folder contains **legacy documentation and reference materials only**.

**For actual database migrations**, use `/supabase/migrations/` with the Supabase CLI:
```bash
.\supabase.exe db push
```

See the [Migration Guide](../MIGRATION-GUIDE.md) for current database setup procedures.

---

## Legacy Database Setup Guide

This guide documents the historical manual setup process for reference.

## Prerequisites

1. ✅ Supabase project created at https://supabase.com
2. ✅ Environment variables added to `.env.local`
3. ✅ HazardOS application running locally

## Step 1: Create Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the contents of `01-schema.sql`
5. Click **Run** to execute the schema creation

This will create:
- All necessary tables (organizations, profiles, assessments, photos, etc.)
- Custom types (hazard_type, assessment_status, user_role)
- Indexes for performance
- Triggers for automatic timestamp updates

## Step 2: Configure Row Level Security

1. In the same SQL Editor, create another new query
2. Copy and paste the contents of `02-rls-policies.sql`
3. Click **Run** to execute the RLS policies

This will:
- Enable RLS on all tables
- Create policies to ensure users only see data from their organization
- Set up automatic profile creation for new users
- Configure proper permissions for different user roles

## Step 3: Add Sample Data (Optional)

1. Create another new query in SQL Editor
2. Copy and paste the contents of `03-sample-data.sql`
3. Click **Run** to execute

This will add:
- Sample organization (Acme Environmental Services)
- Equipment catalog with common items
- Materials catalog with typical supplies

## Step 4: Create Storage Bucket

1. Navigate to **Storage** in the left sidebar
2. Click **New bucket**
3. Create a bucket named: `assessment-photos`
4. Set it as **Public** (for easy photo access)
5. Configure the following policies:

### Storage Policies

```sql
-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload photos for their assessments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'assessment-photos' AND
  auth.role() = 'authenticated'
);

-- Allow users to view photos for assessments in their organization
CREATE POLICY "Users can view photos for their organization" ON storage.objects
FOR SELECT USING (
  bucket_id = 'assessment-photos' AND
  auth.role() = 'authenticated'
);
```

## Step 5: Test the Connection

1. Start your development server: `npm run dev`
2. Navigate to: `http://localhost:3000/test-db`
3. Click **Test Connection** to verify everything is working

## Database Structure Overview

```
organizations
├── profiles (users)
├── assessments
│   ├── photos
│   └── estimates
│       └── jobs
├── equipment_catalog
└── materials_catalog
```

## User Roles & Permissions

- **Admin**: Full access to organization data, can manage users
- **Estimator**: Can create/edit assessments and estimates
- **Technician**: Can view jobs and update job progress
- **Viewer**: Read-only access to assessments and reports

## Next Steps

After completing the database setup:

1. **Create your first user** through the Supabase Auth dashboard
2. **Assign the user to an organization** by updating their profile
3. **Test creating an assessment** through the application
4. **Upload photos** to test the storage integration

## Troubleshooting

### Connection Issues
- Verify your `.env.local` file has the correct Supabase URL and anon key
- Check that RLS policies are properly configured
- Ensure the user has a profile record in the `profiles` table

### Permission Errors
- Check that the user's profile has an `organization_id` set
- Verify RLS policies are enabled on all tables
- Ensure the user's role is set correctly in their profile

### Photo Upload Issues
- Confirm the `assessment-photos` storage bucket exists and is public
- Check storage policies allow authenticated users to upload
- Verify the bucket has proper CORS settings if accessing from browser

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Review the Supabase logs in your project dashboard
3. Test individual SQL queries in the SQL Editor
4. Verify your environment variables are correct

---

**Next:** [Create Your First Assessment](../assessment-guide.md)