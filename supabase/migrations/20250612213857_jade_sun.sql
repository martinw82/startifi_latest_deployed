/*
  # Fix Profile Insertion Policy

  1. Changes
    - Add missing INSERT policy for users to create their own profiles during registration
    - This allows newly authenticated users to insert their profile row after signup

  2. Security
    - Users can only insert profiles with their own auth.uid() as the id
    - Maintains security while enabling proper registration flow
*/

-- Add the missing INSERT policy for users to create their own profiles
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);