# CMS Architecture Audit: Single-Page School Website Transition

Based on the requirement to pivot from a multi-page CMS to a data-driven **single-page school website builder**, an architecture audit has been performed on the existing infrastructure.

## 1. Current CMS Capabilities
- **Models**: `CmsSiteConfig` (global settings), `CmsPage` (multi-page content), `CmsAnnouncement` (news/bulletins), `CmsNavigationItem` (menu links), `CmsMedia` (file storage).
- **Media**: Robust tenant-isolated media upload and serving capability (`CmsMedia`).
- **Isolation**: Strong multi-tenant and multi-school isolation using Prisma relations, `tenantContext`, and `WorkspaceContextInterceptor`.
- **UI**: Administrative CRUD interfaces for Pages, Announcements, Navigation, and general Site Configuration (mostly basic forms).

## 2. Missing Capabilities
- **Section Management**: No capability to order, toggle, or manage specific single-page sections (Hero, About, Events, Gallery, etc.).
- **Events Engine**: Missing entirely. Needs date, time, location, and featured media.
- **Gallery Engine**: Missing entirely. Needs curated, ordered image collections with captions.
- **Leadership/Staff Public Layer**: No safe mechanism to display staff publicly without leaking internal administrative HR data.
- **Blog Engine**: Missing entirely. Needs excerpts, rich content, author attribution, and publication dates.
- **Advanced Theming**: Only primary/secondary colors exist. Missing typography (fonts, sizes, weights), background colors, and light/dark modes.

## 3. Existing Models & Reusability
- **`CmsSiteConfig`**: **Highly Reusable**. We can leverage the existing JSON `themePayload` column to store both **Advanced Typography** and **Section Ordering/Visibility**.
- **`CmsMedia`**: **Highly Reusable**. Should be used as the backbone for Gallery images, Blog thumbnails, Staff photos, and Event banners. Avoid building a separate media system.
- **`CmsAnnouncement`**: **Reusable As-Is**. Fits perfectly into the proposed "Announcements" section.
- **`CmsNavigationItem`**: **Repurpose**. Instead of absolute URLs (`/about`), links should default to section anchors (`/#about`, `/#events`).
- **`CmsPage`**: **De-emphasize**. The current "Create Page" flow is redundant for a single-page site. The model should be hidden from the primary UI, retaining it solely for standalone legal documents (e.g., Privacy Policy, Terms) if ever requested, rather than deleting the table entirely.

## 4. Proposed Schema Changes
We must introduce new models that maintain strict `tenantId` and `schoolId` relations:

```prisma
model CmsEvent {
  id              String   @id @default(uuid())
  tenantId        String
  schoolId        String
  title           String
  description     String   @db.Text
  eventDate       DateTime
  startTime       String?
  endTime         String?
  location        String?
  featuredMediaId String?
  status          CmsPublicationStatus @default(DRAFT)
  orderIndex      Int      @default(0)
  // ... relations to CmsMedia, Tenant, School
}

model CmsGalleryItem {
  id         String   @id @default(uuid())
  tenantId   String
  schoolId   String
  mediaId    String
  caption    String?
  altText    String?
  isActive   Boolean  @default(true)
  orderIndex Int      @default(0)
  // ... relations to CmsMedia, Tenant, School
}

model CmsPublicStaff {
  id             String   @id @default(uuid())
  tenantId       String
  schoolId       String
  staffProfileId String?  // Optional link to internal HR profile
  name           String
  role           String
  bio            String?  @db.Text
  photoMediaId   String?
  isActive       Boolean  @default(true)
  orderIndex     Int      @default(0)
  // ... relations
}

model CmsBlogPost {
  id              String   @id @default(uuid())
  tenantId        String
  schoolId        String
  title           String
  slug            String
  excerpt         String?
  content         String   @db.Text
  featuredMediaId String?
  authorId        String
  publishedAt     DateTime?
  status          CmsPublicationStatus @default(DRAFT)
  // ... relations
}
```

## 5. Proposed API Changes
- **New CRUD Controllers/Services**: Create endpoints for `/v1/cms/admin/events`, `/gallery`, `/staff`, and `/blog`.
- **`UpdateSiteConfigDto` Enhancement**: Explicitly define the `themePayload` schema to accept:
  - `sections`: Array of objects `{ id: 'hero', isActive: true, orderIndex: 0, content: { heading: '...' } }`.
  - `typography`: Object defining font families, sizes, and weights.
  - `appearance`: Extended color palettes.

## 6. Proposed Admin UI Changes
1. **Remove "Pages"** from the main sidebar. Replace with **"Sections & Layout"**.
2. **Sections Drag-and-Drop**: A visual interface in the Settings page to drag section blocks (Hero, About, Events, Gallery, etc.) to reorder them and toggle their visibility.
3. **New Data Tables**: Dedicated UI pages for managing Events, Gallery, Public Staff, and Blog Posts.
4. **Theme Customizer**: Expand the existing Settings tab to include Font pickers and expanded color settings.

## 7. Proposed Public Website Rendering Changes
- The frontend route (`app/(public)/[schoolSlug]/page.tsx` or similar) will fetch the master configuration.
- It will iterate over `CmsSiteConfig.themePayload.sections` and dynamically render React components in the exact sorted order:
  ```tsx
  {sortedSections.map(section => {
    if (!section.isActive) return null;
    switch(section.id) {
      case 'hero': return <HeroSection data={section.content} />;
      case 'events': return <EventsSection data={fetchedEvents} />;
      // etc...
    }
  })}
  ```

## 8. Migration Considerations
- Because the CMS is largely a fresh implementation, there is minimal destructive migration risk.
- Existing `CmsPage` records (like the 'home' page) can be left alone or mapped via a one-time script to populate the new `themePayload.sections` defaults.
- Schema push will be additive (creating new tables).

## 9. Security / Tenant-Isolation Considerations
- **No HR Leakage**: The `CmsPublicStaff` model intentionally decouples from the internal `StaffProfile`/`User` tables to prevent exposing sensitive internal data (e.g., salaries, internal roles, contact info).
- **Tenant Scope**: All new models must include `tenantId` and `schoolId` indexed columns. All controller methods must use the existing `req.workspace` object validated by the `WorkspaceContextInterceptor`.
- **Media Security**: `CmsGalleryItem` and `CmsEvent` will link to `CmsMedia`. The existing media guard properly handles cross-tenant access prevention.

## 10. Recommended Implementation Phases
- **Phase 1: Database & Core Config** - Apply Prisma schema updates. Update `CmsSiteConfig` service to handle section ordering and extended typography.
- **Phase 2: Backend APIs** - Implement NestJS controllers, DTOs, and services for Events, Gallery, Staff, and Blog.
- **Phase 3: Admin Dashboard** - Build the drag-and-drop section manager and the CRUD UI for the new modules.
- **Phase 4: Public Renderer** - Overhaul the public-facing React application to dynamically consume and render the ordered sections.
