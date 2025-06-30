/*
  # Add Extended Profile Fields

  1. New Fields
    - `bio`: Text field for user bio/description
    - `profile_picture_url`: Text field for profile picture URL
    - `website_url`: Text field for user's personal website
    - `social_links`: JSONB field for various social media links
    - `display_name`: Text field for public display name

  2. Changes
    - Added new columns to the profiles table
    - No RLS policy changes needed (existing policies cover new fields)
*/

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN bio TEXT,
ADD COLUMN profile_picture_url TEXT,
ADD COLUMN website_url TEXT,
ADD COLUMN social_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN display_name TEXT;

-- Add email to profiles if user doesn't already have one
CREATE OR REPLACE FUNCTION set_profile_email_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Set email from auth.users if not provided
  IF NEW.email IS NULL THEN
    NEW.email := (SELECT email FROM auth.users WHERE id = NEW.id);
  END IF;
  
  -- Set default display name from email if not provided
  IF NEW.display_name IS NULL THEN
    NEW.display_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add a trigger to set email and display_name when a profile is created
CREATE TRIGGER set_profile_email_trigger_on_insert
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_profile_email_on_insert();

-- Create function to update profile email when auth email changes
CREATE OR REPLACE FUNCTION update_profile_email_on_auth_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile email when auth email changes
  IF OLD.email <> NEW.email THEN
    UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add a trigger to update profile email when auth email changes
CREATE TRIGGER update_profile_email_trigger_on_auth_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION update_profile_email_on_auth_update();