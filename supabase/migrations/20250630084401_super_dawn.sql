/*
  # Add Review Rating Trigger

  1. New Trigger
    - `update_review_rating_trigger`: Automatically updates MVP ratings when reviews change
    - Calls the existing `update_mvp_rating` function after review operations
    - Ensures MVP average_rating stays accurate after all review changes

  2. Operations Covered
    - INSERT: When a new review is added
    - UPDATE: When an existing review is modified
    - DELETE: When a review is removed

  3. Security
    - Uses existing function that has SECURITY DEFINER privileges
    - Ensures MVP ratings are always calculated correctly
*/

-- Create trigger to automatically update MVP ratings when reviews change
CREATE OR REPLACE FUNCTION review_rating_trigger_handler()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT and UPDATE, use the new review's mvp_id
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM update_mvp_rating(NEW.mvp_id);
  -- For DELETE, use the old review's mvp_id
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM update_mvp_rating(OLD.mvp_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the reviews table
DROP TRIGGER IF EXISTS update_review_rating_trigger ON reviews;

CREATE TRIGGER update_review_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION review_rating_trigger_handler();