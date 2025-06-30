/*
  # Email Column for Profiles and Additional Fields for Disputes

  1. Changes
    - Add email column to profiles table to store user email
    - Add version_number to disputes table to track which version of the MVP is disputed
    - Add a function to set the email from auth.users when a profile is created
*/

-- Add email column to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add version_number to disputes table
ALTER TABLE disputes
ADD COLUMN IF NOT EXISTS version_number TEXT;

-- Create function to set profile email on insert
CREATE OR REPLACE FUNCTION set_profile_email_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Set email from auth.users if not provided
  IF NEW.email IS NULL THEN
    NEW.email := (SELECT email FROM auth.users WHERE id = NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS set_profile_email_trigger_on_insert ON profiles;
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

-- Add trigger to update profile email when auth email changes
DROP TRIGGER IF EXISTS update_profile_email_trigger_on_auth_update ON auth.users;
CREATE TRIGGER update_profile_email_trigger_on_auth_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION update_profile_email_on_auth_update();