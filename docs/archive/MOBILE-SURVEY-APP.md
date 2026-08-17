# HazardOS Mobile Site Survey App

A Progressive Web App (PWA) for field estimators to conduct environmental remediation site assessments. Designed for offline-first operation on mobile devices with automatic sync when connectivity is restored.

## Overview

The mobile survey app is a multi-step wizard that guides estimators through a complete site assessment. It captures property details, access conditions, environmental readings, hazard-specific data (asbestos, mold, lead), and geotagged photos. All data is persisted locally and synced to the database in the background.

**Route:** `/site-surveys/mobile`
**Entry with context:** `/site-surveys/mobile?customerId=xxx&organizationId=xxx`
**Resume existing:** `/site-surveys/mobile?surveyId=xxx`

## Wizard Sections

The survey flows through 6 sections in order. Users can navigate forward/back via buttons or swipe gestures. Jumping to any section via the progress indicator is also supported.

### 1. Property

Captures the physical property being assessed.

| Field | Type | Notes |
|-------|------|-------|
| Address | text | Auto-fill from GPS via "Use Location" button (Nominatim reverse geocoding) |
| City, State, ZIP | text/dropdown | State is a dropdown of all 50 US states + DC |
| Building Type | radio cards | Single-Family, Multi-Family, Commercial, Industrial, Institutional, Warehouse, Retail |
| Year Built | numeric stepper | 1800–current year. Shows pre-1978 warning (lead/asbestos risk) |
| Square Footage | numeric stepper | 0–1,000,000 in increments of 100 |
| Stories | segmented control | 1, 2, 3+ |
| Construction Type | dropdown | Wood Frame, Concrete, Steel, Masonry, Mixed |
| Occupancy Status | segmented control | Occupied (shows hours sub-fields), Vacant, Partial |
| Owner Contact | text fields | Name, phone, email (optional) |

### 2. Access

Documents how crews will access the site.

| Field | Type | Notes |
|-------|------|-------|
| Access Restrictions | yes/no toggle | If yes: checkboxes (gated/locked, security, escort, background check, hours restricted) + notes |
| Parking Available | yes/no toggle | |
| Loading Zone Available | yes/no toggle | |
| Equipment Access | radio cards | Adequate, Limited, Difficult. If limited/difficult: notes field |
| Elevator Available | yes/no/n/a toggle | |
| Min Doorway Width | numeric stepper | 12–120 inches. Warning if < 30" (equipment disassembly may be needed) |

### 3. Environment

Captures on-site environmental conditions.

| Field | Type | Notes |
|-------|------|-------|
| Temperature | numeric stepper | -20 to 150°F |
| Humidity | numeric stepper | 0–100% RH, increments of 5. Warning if > 60% |
| Moisture Issues | multi-select checkboxes | none_observed, active_leak, water_staining, standing_water, condensation, musty_odor. "None observed" clears others. If issues found: notes with voice note button |
| Structural Concerns | yes/no toggle | If yes: checkboxes (foundation cracks, settlement, roof damage, compromised envelope) + notes with voice note |
| Utility Shutoffs Located | yes/no toggle | |

### 4. Hazards

The core assessment section. Select one or more hazard types, then fill in the corresponding sub-form.

**Hazard Type Selector:** Toggle asbestos, mold, lead, other. Each opens a specialized sub-form.

#### Asbestos Sub-Form
- **Materials list** (add/edit/remove): material type (pipe insulation, boiler insulation, ceiling tiles, floor tiles 9x9/12x12, etc.), quantity + unit (linear ft / sq ft / cu ft), location, condition (intact → severe damage), friability, pipe diameter/thickness, notes
- **Summary fields:** estimated waste volume, containment level (1-4), EPA notification required

#### Mold Sub-Form
- **Moisture source:** identified (Y/N), type (roof leak, plumbing, HVAC condensation, etc.), status (active/fixed)
- **Affected areas list** (add/edit/remove): location, square footage, material type (porous/semi-porous/non-porous), affected materials (drywall, studs, insulation, etc.), severity (light/moderate/heavy), moisture reading
- **Summary:** HVAC contaminated, odor level, size category (small/medium/large)

#### Lead Sub-Form
- Children under 6 present (Y/N), work scope (interior/exterior/both)
- **Components list** (add/edit/remove): type (walls, windows, doors, baseboards, siding, etc.), location, quantity, condition
- RRP Rule applies, work method (stabilization/partial/full abatement), total work area

#### Other Hazards
- Freetext description and notes

### 5. Photos

Photo capture and organization.

- Photos organized by category: exterior, interior, asbestos materials, mold areas, lead components, utility access, other
- **Requirement:** minimum 4 exterior photos (enforced at validation)
- Photo tips panel guides users on what to capture
- Photos stored as blobs locally, uploaded to Supabase Storage in background
- GPS coordinates captured with each photo when available

### 6. Review

Final review and submission.

- Completion checklist showing validation status of each section
- Survey summary with all collected data
- Final notes field with voice note button
- Offline warning (if disconnected)
- Photo upload progress indicator
- Submit button (blocked until all sections valid and photos uploaded)
- Save Draft button for partial saves

## Offline-First Architecture

### Local Persistence
All survey data is stored in the browser's localStorage via Zustand's `persist` middleware. This means:
- Surveys survive browser refreshes and app restarts
- No data loss if the user loses connectivity mid-survey
- Multiple surveys can be started and resumed

### Auto-Save
An interval timer saves the current survey to the database every 30 seconds (when dirty). The save reads from `useSurveyStore.getState()` directly to avoid React dependency re-render loops.

### Photo Upload Queue
Photos follow a separate background upload pipeline:

1. User captures photo → stored as blob in localStorage (`photo-queue-store`)
2. `processPhotoQueue()` runs when online (auto or manual)
3. Uploads up to 2 photos concurrently to Supabase Storage
4. Path: `surveys/{surveyId}/{category}/{photoId}.{ext}`
5. Failed uploads retry up to 3 times with 2-second delays
6. On submission, `waitForUploads()` blocks until all photos complete (120s timeout)

### Service Worker
Serwist-powered service worker (`app/sw.ts`) provides:

| Strategy | Target | TTL |
|----------|--------|-----|
| NetworkFirst | Supabase REST API | 5 min cache, 10s timeout |
| CacheFirst | Supabase Storage (photos) | 30 days |
| CacheFirst | Images | 30 days |
| CacheFirst | Google Font files | 1 year |
| StaleWhileRevalidate | JS/CSS assets | 1 day |
| StaleWhileRevalidate | Google Font stylesheets | 1 year |

Navigation requests that fail fall back to `/offline` — a simple page explaining data is saved locally.

### Sync on Reconnect
When the browser comes back online (`navigator.onLine` event):
1. Auto-saves any dirty survey data to the database
2. Kicks off photo queue processing
3. UI updates from "Offline" badge to "Saved" indicator

## PWA Features

### Installation
- `workOrder.json` declares standalone display mode, theme color (#FF6B35), and app icons
- `PWAInstallPrompt` component shows a banner when the browser supports installation
- Dismissible for 7 days via localStorage flag
- Shortcuts: "New Site Survey" and "Jobs" appear in the app launcher

### Mobile Optimization
- All touch targets ≥ 44px (WCAG 2.1 AA)
- Swipe gesture navigation (50px threshold)
- Fixed header (exit, save, sync status) and footer (back/next)
- Scrollable content area between header and footer
- Portrait-primary orientation
- Safe area insets for notched devices

## Data Flow

```
User Input → Zustand Store → localStorage (immediate)
                           → Supabase DB (auto-save every 30s)

Photo Capture → Photo Queue Store → localStorage (immediate)
                                  → Supabase Storage (background upload)

Submission → Validate All Sections
           → Wait for Photo Uploads (120s timeout)
           → PUT survey status='submitted' to Supabase
           → Clear photo queue
           → Navigate to /site-surveys?submitted=true
```

## Validation Rules

| Section | Required |
|---------|----------|
| Property | Address, city, state, zip, building type |
| Access | Has restrictions (Y/N), parking (Y/N), equipment access level |
| Environment | Temperature, humidity, structural concerns (Y/N), utility shutoffs (Y/N) |
| Hazards | At least 1 hazard type selected + at least 1 item in corresponding sub-form |
| Photos | At least 4 exterior photos |
| Review | All other sections must be valid |

Validation is "soft" during navigation (warns but allows proceeding) and "hard" at submission (blocks submit button).

## Key Files

```
app/(dashboard)/site-surveys/mobile/page.tsx    # Entry point
components/surveys/mobile/
  mobile-survey-wizard.tsx                       # Main wizard orchestrator
  sections/
    property-section.tsx                         # Property data collection
    access-section.tsx                           # Access conditions
    environment-section.tsx                      # Environmental readings
    hazards-section.tsx                          # Hazard type selector + sub-forms
    photos-section.tsx                           # Photo capture gallery
    review-section.tsx                           # Review + submit
  wizard-navigation.tsx                          # Progress dots
  wizard-footer.tsx                              # Navigation buttons
lib/stores/
  survey-store.ts                                # Zustand store (form data + DB sync)
  survey-types.ts                                # All TypeScript types
  photo-queue-store.ts                           # Photo upload queue
lib/services/
  photo-upload-service.ts                        # Background upload to Supabase Storage
lib/hooks/
  use-online-status.ts                           # Online/offline + sync hooks
app/sw.ts                                        # Service worker config
public/workOrder.json                             # PWA workOrder
app/(public)/offline/page.tsx                    # Offline fallback
components/pwa/pwa-install-prompt.tsx            # Install banner
```
