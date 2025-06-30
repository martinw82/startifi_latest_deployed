import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  Eye, 
  AlertCircle, 
  Loader2, 
  Filter,
  Check
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useAuth } from '../hooks/useAuth';
import { NotificationService } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [markingRead, setMarkingRead] = useState<Record<string, boolean>>({});
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      navigate('/auth');
    }
  }, [user, showUnreadOnly, navigate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error('User is not authenticated');
      }

      // Get notifications based on read filter
      const data = await NotificationService.getNotifications(
        user.id, 
        showUnreadOnly ? false : undefined
      );
      
      setNotifications(data);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setMarkingRead(prev => ({ ...prev, [notificationId]: true }));
      
      const result = await NotificationService.markNotificationAsRead(notificationId);
      
      if (result.success) {
        // Update the notification in the local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true } 
              : notification
          )
        );
      } else {
        throw new Error(result.error || 'Failed to mark notification as read');
      }
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    } finally {
      setMarkingRead(prev => ({ ...prev, [notificationId]: false }));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      
      if (!user) {
        throw new Error('User is not authenticated');
      }
      
      const result = await NotificationService.markAllNotificationsAsRead(user.id);
      
      if (result.success) {
        // Update all notifications in the local state
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
      } else {
        throw new Error(result.error || 'Failed to mark all notifications as read');
      }
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // If the notification has a link, navigate to it
    if (notification.link && !notification.read) {
      // Mark as read first
      handleMarkAsRead(notification.id);
      
      // Navigate to the link
      navigate(notification.link);
    } else if (notification.link) {
      // If already read, just navigate
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mvp_approved':
      case 'payout_initiated':
      case 'payout_completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'mvp_rejected':
      case 'payout_failed':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'new_review':
      case 'new_download':
        return <Eye className="w-6 h-6 text-blue-500" />;
      default:
        return <Clock className="w-6 h-6 text-gray-500" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'mvp_approved': return 'MVP Approved';
      case 'mvp_rejected': return 'MVP Rejected';
      case 'new_review': return 'New Review';
      case 'new_download': return 'New Download';
      case 'payout_initiated': return 'Payout Initiated';
      case 'payout_completed': return 'Payout Completed';
      case 'payout_failed': return 'Payout Failed';
      default: return 'Notification';
    }
  };

  if (loading && !notifications.length) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-neon-green animate-spin" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-neon-green mb-2 flex items-center">
              <Bell className="w-8 h-8 mr-3" />
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Stay updated on your activity
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <GlossyButton
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead || loading || !notifications.some(n => !n.read)}
              className="flex items-center space-x-2"
            >
              {markingAllRead ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Mark All Read</span>
            </GlossyButton>
            
            <GlossyButton
              variant={showUnreadOnly ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>{showUnreadOnly ? 'Showing Unread' : 'Show All'}</span>
            </GlossyButton>
          </div>
        </motion.div>

        {error && (
          <GlassCard className="p-6 mb-6">
            <div className="flex items-center space-x-3 text-red-500">
              <AlertCircle className="w-6 h-6" />
              <p>{error}</p>
            </div>
          </GlassCard>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <GlassCard className="p-6">
            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No notifications
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {showUnreadOnly 
                    ? "You don't have any unread notifications" 
                    : "You don't have any notifications yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start p-4 rounded-xl transition-colors cursor-pointer ${
                      notification.read 
                        ? 'bg-white/5 border border-white/10'
                        : 'bg-neon-green/10 border border-neon-green/30 shadow-neon-green-glow-sm'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="mr-4 mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-neon-cyan">
                          {getNotificationTypeLabel(notification.type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-300' : 'text-white'}`}>
                        {notification.message}
                      </p>
                      
                      {notification.link && (
                        <p className="mt-1 text-xs text-neon-green">
                          Click to view details
                        </p>
                      )}
                    </div>
                    
                    {!notification.read && (
                      <GlossyButton
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        disabled={markingRead[notification.id]}
                        className="ml-2"
                      >
                        {markingRead[notification.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Mark Read'
                        )}
                      </GlossyButton>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};