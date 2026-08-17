# Site Survey Terminology Update

## Overview

As of January 31, 2026, HazardOS has updated its terminology from "Assessments" to "Site Surveys" throughout the application. This change better reflects the nature of the field data collection process and aligns with industry terminology.

## What Changed

### Database Schema
- **Table:** `assessments` → `site_surveys`
- **Table:** `assessment_photos` → `site_survey_photos`
- **Column:** `assessment_id` → `site_survey_id`
- **Type:** `assessment_status` → `site_survey_status`
- **Indexes:** All assessment-related indexes renamed
- **RLS Policies:** All policies updated with new terminology

### Application Routes
- **Old:** `/assessments` → **New:** `/site-surveys`
- **Old:** `/assessments/new` → **New:** `/site-surveys/new`
- **Old:** `/assessments/[id]` → **New:** `/site-surveys/[id]`

### TypeScript Types
- **Old:** `Assessment` → **New:** `SiteSurvey`
- **Old:** `AssessmentStatus` → **New:** `SiteSurveyStatus`
- **Old:** `AssessmentPhoto` → **New:** `SiteSurveyPhoto`
- **Old:** `AssessmentInsert` → **New:** `SiteSurveyInsert`

### Services & Components
- **Old:** `DatabaseService` → **New:** `SiteSurveyService`
- **Old:** `SimpleAssessmentForm` → **New:** `SimpleSiteSurveyForm`
- **Old:** `assessment.ts` validation → **New:** `site-survey.ts`

### User Interface
- All buttons, labels, and messages updated
- Navigation menu updated
- Dashboard cards and quick actions updated
- Form titles and descriptions updated

## Migration Steps

### 1. Database Migration
Run the following SQL script in your Supabase SQL Editor:
```sql
-- See: docs/database/10-rename-assessments-to-site-surveys.sql
```

### 2. Storage Bucket (Optional)
You may optionally rename the storage bucket from `assessment-media` to `site-survey-media`, but this is not required as the existing bucket will continue to work.

### 3. Update Environment Variables
No environment variable changes are required.

## Backward Compatibility

### Legacy Support
- **Type Aliases:** `Assessment = SiteSurvey` (and similar for all types)
- **Service Wrapper:** `DatabaseService` extends `SiteSurveyService`
- **Route Redirects:** Old `/assessments/*` routes redirect to `/site-surveys/*`
- **Validation Exports:** Old assessment validation still available

### Migration Timeline
- **Phase 1:** New terminology implemented with backward compatibility
- **Phase 2:** Gradual migration of existing code (optional)
- **Phase 3:** Legacy support removal (future, if desired)

## Updated Terminology Guide

| Old Term | New Term | Context |
|----------|----------|---------|
| Assessment | Site Survey | The field data collection process |
| Create Assessment | Create Site Survey | UI buttons and actions |
| Assessment Form | Site Survey Form | Form components |
| Assessment List | Site Survey List | List views |
| Assessment Photos | Site Survey Photos | Media attachments |
| Assessment Status | Site Survey Status | Workflow states |

## Code Examples

### Before (Still Works)
```typescript
import { Assessment, DatabaseService } from '@/types/database'

const assessments = await DatabaseService.getAssessments(orgId)
```

### After (Recommended)
```typescript
import { SiteSurvey, SiteSurveyService } from '@/types/database'

const siteSurveys = await SiteSurveyService.getSiteSurveys(orgId)
```

## Testing

### Verification Steps
1. **Database:** Run structure verification SQL
2. **Routes:** Test all `/site-surveys/*` routes work
3. **Redirects:** Verify `/assessments/*` routes redirect properly
4. **Forms:** Create and edit site surveys successfully
5. **Media:** Upload photos/videos to site surveys
6. **Legacy:** Confirm old code still functions

### Test Checklist
- [ ] Site survey creation works
- [ ] Site survey editing works
- [ ] Photo/video upload works
- [ ] Site survey list displays correctly
- [ ] Navigation shows "Site Surveys"
- [ ] Old assessment URLs redirect properly
- [ ] Database queries use new table names
- [ ] RLS policies enforce proper access

## Rollback Plan

If rollback is needed:
1. Revert database table names using reverse migration
2. Restore old component files from git history
3. Update routes back to `/assessments`
4. Revert navigation changes

## Support

For questions or issues related to this terminology update:
- Check the database verification tools at `/db-test`
- Review migration logs in Supabase
- Test functionality with the updated forms
- Verify all redirects work as expected

---

**Note:** This update maintains full backward compatibility. Existing code will continue to work while new code should use the Site Survey terminology.