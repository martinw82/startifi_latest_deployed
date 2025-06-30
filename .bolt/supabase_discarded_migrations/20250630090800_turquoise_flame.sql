/*
  # Add Price Index and Search Improvements

  1. Add Index
    - Add an index on the price column to improve search performance
    
  2. Security
    - All security settings (RLS) remain unchanged
    - Read-only operation
*/

-- Add index on price column for better price range filtering
CREATE INDEX IF NOT EXISTS idx_mvps_price ON mvps(price);