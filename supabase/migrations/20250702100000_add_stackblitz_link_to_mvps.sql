-- Add stackblitz_link column to mvps table
ALTER TABLE IF EXISTS public.mvps
ADD COLUMN IF NOT EXISTS stackblitz_link TEXT;

-- Add a comment to the new column
COMMENT ON COLUMN public.mvps.stackblitz_link IS 'Optional URL for StackBlitz project embed.';
