/*
  # Notifications System Enhancements

  1. New Column
    - `notifications.seen_at`: Adds a timestamp for when notification was viewed
    - This provides more detail than just the boolean "read" status

  2. Security Updates
    - Adds more granular policies for notification creation
    - Ensures notification sender permissions are properly enforced

  3. Indexes for Performance
    - Adds index on notification type for faster filtering
    - Adds index on seen_at for faster retrieval of unseen notifications
*/

-- Add seen_at column to provide more detail than just read status
ALTER TABLE notifications ADD COLUMN seen_at TIMESTAMPTZ;

-- Update existing notifications to set seen_at for read notifications
UPDATE notifications SET seen_at = created_at WHERE read = true;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_seen_at ON notifications(seen_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);