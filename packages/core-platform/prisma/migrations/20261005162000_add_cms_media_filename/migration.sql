-- Phase 6F UX: Add filename column to cms_media for display in Admin UI
-- This allows the admin-facing Media Upload Widget to show the original filename
-- without ever exposing the internal UUID to the user.

ALTER TABLE "cms_media" ADD COLUMN "filename" TEXT;
