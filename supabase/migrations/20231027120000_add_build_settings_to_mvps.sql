-- Add build_command and publish_directory to mvps table
-- These will store optional Netlify build settings for each MVP.

ALTER TABLE public.mvps
ADD COLUMN build_command TEXT NULL,
ADD COLUMN publish_directory TEXT NULL;

COMMENT ON COLUMN public.mvps.build_command IS 'Optional Netlify build command for the MVP (e.g., npm run build, hugo)';
COMMENT ON COLUMN public.mvps.publish_directory IS 'Optional Netlify publish directory for the MVP (e.g., dist, public, build)';
