# HazardOS Database Setup Verification Checklist

## 🔍 **Quick Verification Steps**

### **1. Run Structure Verification SQL**
Execute this in **Supabase SQL Editor**:
```sql
-- Copy and paste contents of: docs/database/09-structure-verification.sql
```

### **2. Test Application Functionality**
Visit: `https://your-app.vercel.app/db-test`
- This page will run automated tests of all database components
- Check for any red errors that need attention

### **3. Manual Verification Checklist**

## ✅ **Required Tables**
Verify these tables exist in Supabase Dashboard > Table Editor:

- [ ] `organizations` - Company/tenant data
- [ ] `profiles` - User profiles with roles
- [ ] `site_surveys` - Field assessment data (renamed from assessments)
- [ ] `site_survey_photos` - Media file metadata (renamed from assessment_photos)
- [ ] `customers` - Customer contact and relationship management
- [ ] `labor_rates` - Hourly labor pricing by role and organization
- [ ] `equipment_rates` - Equipment rental and usage pricing
- [ ] `material_costs` - Material pricing and supplier information
- [ ] `disposal_fees` - Hazardous material disposal costs by type
- [ ] `travel_rates` - Mileage and travel time pricing
- [ ] `pricing_settings` - Organization-specific markup and pricing rules
- [ ] `equipment_catalog` - Equipment items (schema ready)
- [ ] `materials_catalog` - Material items (schema ready)
- [ ] `estimates` - Cost estimates (schema ready)
- [ ] `jobs` - Scheduled work (schema ready)
- [ ] `platform_settings` - Global platform config
- [ ] `tenant_usage` - Usage tracking
- [ ] `audit_log` - Activity logging
- [ ] `tenant_invitations` - User invitations

## ✅ **Critical Table Structures**

### **site_surveys table should have:**
- [ ] `id` (UUID, Primary Key)
- [ ] `organization_id` (UUID, Foreign Key)
- [ ] `estimator_id` (UUID, Foreign Key)
- [ ] `customer_id` (UUID, Foreign Key) - Links to customers table
- [ ] `job_name` (TEXT)
- [ ] `customer_name` (TEXT) - Deprecated, use customer_id instead
- [ ] `site_address`, `site_city`, `site_state`, `site_zip` (TEXT)
- [ ] `hazard_type` (ENUM: asbestos, mold, lead, vermiculite, other)
- [ ] `containment_level` (INTEGER)
- [ ] `area_sqft`, `linear_ft`, `volume_cuft` (NUMERIC)
- [ ] `occupied`, `clearance_required` (BOOLEAN)
- [ ] `status` (ENUM: draft, submitted, estimated, quoted, scheduled, completed)
- [ ] `site_location` (POINT - PostGIS)
- [ ] `scheduled_date` (DATE) - When survey is scheduled
- [ ] `scheduled_time_start`, `scheduled_time_end` (TIME) - Time slots
- [ ] `assigned_to` (UUID) - Assigned technician/estimator
- [ ] `appointment_status` (ENUM: scheduled, confirmed, in_progress, completed, cancelled, rescheduled)
- [ ] Mobile survey fields for hazard assessments (JSONB)
- [ ] `created_at`, `updated_at` (TIMESTAMPTZ)

### **assessment_photos table should have:**
- [ ] `id` (UUID, Primary Key)
- [ ] `assessment_id` (UUID, Foreign Key → assessments.id)
- [ ] `file_name` (TEXT)
- [ ] `file_path` (TEXT, UNIQUE)
- [ ] `file_size` (INTEGER)
- [ ] `file_type` (TEXT)
- [ ] `url` (TEXT)
- [ ] `caption` (TEXT, nullable)
- [ ] `created_at`, `updated_at` (TIMESTAMPTZ)

## ✅ **Row Level Security (RLS)**
Verify RLS is enabled on these tables:
- [ ] `assessments` - RLS enabled
- [ ] `assessment_photos` - RLS enabled
- [ ] `profiles` - RLS enabled
- [ ] `organizations` - RLS enabled

## ✅ **Storage Configuration**

### **Supabase Dashboard > Storage:**
- [ ] Bucket named `assessment-media` exists
- [ ] Bucket is set to **Private** (not public)
- [ ] File size limit: 50MB or higher
- [ ] Allowed MIME types: `image/*`, `video/*`

### **Storage Policies (in Storage > assessment-media > Policies):**
- [ ] "Users can upload assessment media to their organization folder"
- [ ] "Users can view assessment media from their organization folder"
- [ ] "Users can delete assessment media from their organization folder"
- [ ] "Platform owners can access all assessment media"

## ✅ **Custom Types/Enums**
Verify these exist in Database > Types:
- [ ] `hazard_type` (asbestos, mold, lead, vermiculite, other)
- [ ] `assessment_status` (draft, submitted, estimated, quoted, scheduled, completed)
- [ ] `user_role` (platform_owner, platform_admin, tenant_owner, admin, estimator, technician, viewer)
- [ ] `organization_status` (active, suspended, cancelled, trial)
- [ ] `subscription_tier` (trial, starter, professional, enterprise)

## ✅ **Indexes for Performance**
Check these indexes exist:
- [ ] `idx_assessment_photos_assessment_id` on `assessment_photos(assessment_id)`
- [ ] `idx_assessment_photos_created_at` on `assessment_photos(created_at)`
- [ ] `idx_assessments_organization_id` on `assessments(organization_id)`
- [ ] `idx_assessments_status` on `assessments(status)`

## ✅ **Triggers**
Verify these triggers exist:
- [ ] `set_updated_at_assessment_photos` on `assessment_photos`
- [ ] `set_updated_at_assessments` on `assessments`
- [ ] `handle_new_user` trigger for profile creation

## ✅ **Sample Data**
Verify you have:
- [ ] At least one organization (HazardOS Platform)
- [ ] Platform owner profile (mark.hope@asymmetric.pro)
- [ ] Sample tenant organizations (optional)

## ✅ **Application Integration Tests**

### **Visit `/db-test` page and verify:**
- [ ] Database Connection: ✅ Success
- [ ] User Authentication: ✅ Success
- [ ] Organization Access: ✅ Success
- [ ] Assessments Table: ✅ Success
- [ ] Assessment Photos Table: ✅ Success
- [ ] Storage Bucket Access: ✅ Success
- [ ] Assessment CRUD Operations: ✅ Success

### **Test Assessment Form:**
- [ ] Can create new assessment at `/assessments/new`
- [ ] Form saves draft automatically
- [ ] Can upload photos/videos
- [ ] Media files appear in Storage bucket
- [ ] Media metadata saved to `assessment_photos` table
- [ ] Can view assessments at `/assessments`
- [ ] Can edit existing assessments

## 🚨 **Common Issues & Solutions**

### **Storage Upload Fails:**
- Check bucket exists and is named exactly `assessment-media`
- Verify storage policies are created in Storage > Policies (not SQL Editor)
- Ensure bucket is Private, not Public

### **RLS Permission Denied:**
- Verify user has profile with organization_id
- Check RLS policies allow access based on organization_id
- Ensure platform_owner role has global access

### **Assessment Creation Fails:**
- Check all required fields are provided
- Verify foreign key constraints (organization_id, estimator_id exist)
- Ensure ENUM values match exactly (e.g., 'asbestos', not 'Asbestos')

### **Media Files Not Appearing:**
- Check file path format: `organization_id/assessment_id/filename`
- Verify assessment_photos table has correct assessment_id
- Ensure storage policies allow access to organization folder

## 📊 **Performance Verification**

Run these queries to check performance:
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public';
```

## ✅ **Final Verification**

If all checkboxes above are ✅, your database structure is properly configured for:
- ✅ Multi-tenant assessment management
- ✅ Photo/video upload with compression
- ✅ Row-level security and data isolation
- ✅ Platform owner administration
- ✅ Mobile-first assessment forms

**Ready for production use!** 🎉