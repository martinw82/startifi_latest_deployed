/*
  # Add utility functions for MVP Library Platform

  1. Functions
    - `increment_mvp_downloads`: Safely increment download count for an MVP
    - `update_mvp_rating`: Recalculate and update average rating for an MVP

  2. Security
    - Functions use SECURITY DEFINER to safely update data
    - Proper error handling and validation
*/

-- Function to safely increment MVP download count
CREATE OR REPLACE FUNCTION increment_mvp_downloads(mvp_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE mvps 
  SET 
    download_count = download_count + 1,
    updated_at = NOW()
  WHERE id = mvp_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MVP with ID % not found', mvp_id_param;
  END IF;
END;
$$;

-- Function to recalculate and update MVP average rating
CREATE OR REPLACE FUNCTION update_mvp_rating(mvp_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rating DECIMAL(2,1);
BEGIN
  SELECT ROUND(AVG(rating), 1) INTO avg_rating
  FROM reviews 
  WHERE mvp_id = mvp_id_param;
  
  -- If no ratings exist, set to 0
  IF avg_rating IS NULL THEN
    avg_rating := 0.0;
  END IF;
  
  UPDATE mvps 
  SET 
    average_rating = avg_rating,
    updated_at = NOW()
  WHERE id = mvp_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MVP with ID % not found', mvp_id_param;
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_mvp_downloads(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_mvp_rating(UUID) TO authenticated;