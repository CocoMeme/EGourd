import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pollinationService } from '../services';

/**
 * Pollination Notification Helper
 * Handles scheduling and managing push notifications for pollination windows
 */

// Set notification handler for when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PollinationNotificationHelper {
  constructor() {
    this.scheduledNotifications = new Map();
  }

  /**
   * Setup notification channels for Android
   */
  async setupNotificationChannels() {
    try {
      await Notifications.setNotificationChannelAsync('pollination', {
        name: 'Pollination Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });
      console.log('✅ Notification channels configured');
    } catch (error) {
      console.error('Error setting up notification channels:', error);
    }
  }

  /**
   * Request notification permissions from user
   */
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(title, body, date, data = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          badge: 1,
          data,
          android: {
            channelId: 'pollination',
            priority: 'max',
            vibrate: [0, 250, 250, 250],
          },
        },
        trigger: {
          type: 'date',
          date
        }
      });

      this.scheduledNotifications.set(data.plantId, notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Schedule pending pollination notifications
   * Fetches from backend and schedules local notifications
   */
  async schedulePendingNotifications() {
    try {
      console.log('🔔 Fetching pending pollination notifications...');

      const response = await pollinationService.getPendingNotifications();
      const notifications = response.data || [];

      console.log(`📋 Found ${notifications.length} pending notifications`);

      const now = new Date();
      let scheduledCount = 0;

      for (const notif of notifications) {
        try {
          const { plantId, plantName, plantNameTagalog, type, message, pollintationWindow } = notif;

          // Calculate the notification time based on type
          let notifTime;
          if (type === 'oneHourBefore') {
            notifTime = new Date(notif.scheduledTime);
          } else if (type === 'thirtyMinsBefore') {
            notifTime = new Date(notif.scheduledTime);
          }

          // Only schedule if time is in the future
          if (notifTime > now) {
            console.log(`⏰ Scheduling ${type} notification for ${plantName} at ${notifTime}`);

            const notificationId = await this.scheduleLocalNotification(
              `🌸 ${plantName} Pollination`,
              message,
              notifTime,
              {
                plantId,
                plantName,
                plantNameTagalog,
                type,
                pollintationWindow
              }
            );

            // Mark as sent on backend
            try {
              await pollinationService.markNotificationSent(plantId, type);
              console.log(`✅ Marked ${type} notification as sent for ${plantName}`);
            } catch (error) {
              console.warn(`Failed to mark notification as sent: ${error.message}`);
            }

            scheduledCount++;
          }
        } catch (error) {
          console.error(`Error scheduling notification for plant ${notif.plantId}:`, error);
        }
      }

      console.log(`✅ Scheduled ${scheduledCount} pollination notifications`);
      return scheduledCount;
    } catch (error) {
      console.error('Error scheduling pending notifications:', error);
      throw error;
    }
  }

  /**
   * Set up notification event listeners
   */
  setupNotificationListeners() {
    try {
      // Handle notification when received while app is open
      this.notificationReceivedListener = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log('📬 Notification received:', notification);
        }
      );

      // Handle notification tap/interaction
      this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const { plantId, plantName, type } = response.notification.request.content.data;
          console.log('🔔 Notification tapped:', { plantId, plantName, type });

          // You can navigate to plant detail or show an alert here
          return {
            success: true,
            plantId,
            action: 'notification-tapped'
          };
        }
      );

      console.log('✅ Notification listeners set up');
    } catch (error) {
      console.error('Error setting up notification listeners:', error);
    }
  }

  /**
   * Clean up notification listeners
   */
  cleanupNotificationListeners() {
    try {
      if (this.notificationReceivedListener) {
        Notifications.removeNotificationSubscription(this.notificationReceivedListener);
      }
      if (this.notificationResponseListener) {
        Notifications.removeNotificationSubscription(this.notificationResponseListener);
      }
      console.log('✅ Notification listeners cleaned up');
    } catch (error) {
      console.error('Error cleaning up notification listeners:', error);
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(plantId) {
    try {
      const notificationId = this.scheduledNotifications.get(plantId);
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        this.scheduledNotifications.delete(plantId);
        console.log(`✅ Cancelled notification for plant ${plantId}`);
      }
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotifications.clear();
      console.log('✅ All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Schedule a pollination result check notification
   * Called when a new pollination entry is added
   * @param {Object} pollination - The pollination entry
   * @param {Object} plant - The plant object
   * @returns {string|null} The notification ID if scheduled
   */
  async schedulePollinationResultNotification(pollination, plant) {
    try {
      if (!pollination.expectedResultDate) {
        console.warn('No expected result date for pollination');
        return null;
      }

      // Set notification time to 6am on the expected date
      const notificationTime = new Date(pollination.expectedResultDate);
      notificationTime.setHours(6, 0, 0, 0);

      // Only schedule if time is in the future
      if (notificationTime <= new Date()) {
        console.log('Expected result date is in the past, not scheduling notification');
        return null;
      }

      const plantName = plant.plantName || plant.displayName?.english || 'Your plant';
      const gourdType = plant.displayName?.english || plant.gourdType?.replace(/_/g, ' ') || '';
      const showGourdType = gourdType && gourdType.toLowerCase() !== (plantName || '').toLowerCase();

      const notificationId = await this.scheduleLocalNotification(
        `🌱 Check ${pollination.label}!`,
        `Time to check if your ${plantName}${showGourdType ? ` (${gourdType})` : ''} pollination was successful! Look for fruit development.`,
        notificationTime,
        {
          plantId: plant._id,
          pollinationId: pollination._id,
          type: 'pollination_result_check',
          label: pollination.label
        }
      );

      console.log(`✅ Scheduled pollination result notification for ${pollination.label} at ${notificationTime}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling pollination result notification:', error);
      return null;
    }
  }

  /**
   * Cancel a pollination result notification
   * @param {string} notificationId - The notification ID to cancel
   */
  async cancelPollinationResultNotification(notificationId) {
    try {
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log(`✅ Cancelled pollination result notification ${notificationId}`);
      }
    } catch (error) {
      console.error('Error cancelling pollination result notification:', error);
    }
  }

  /**
   * Show instant notification when user records a pollination result
   * @param {Object} pollination - The pollination entry
   * @param {Object} plant - The plant object
   * @param {string} status - 'success' or 'failed'
   * @param {number} successCount - Number of successful fruits (if success)
   */
  async showPollinationResultNotification(pollination, plant, status, successCount = 0) {
    try {
      const label = pollination.label || 'Pollination';
      const plantName = plant.plantName || plant.displayName?.english || 'your plant';
      
      let title, body;
      
      if (status === 'success') {
        title = `🎉 ${label} Successful!`;
        body = `Great news! ${successCount} fruit${successCount > 1 ? 's' : ''} developing on ${plantName}!`;
      } else if (status === 'partial') {
        title = `🌿 ${label} Partially Successful`;
        body = `${successCount} of ${pollination.femaleFlowersPollinated} fruit${successCount > 1 ? 's' : ''} developing on ${plantName}.`;
      } else {
        title = `😔 ${label} Failed`;
        body = `No worries! Keep trying with ${plantName}. Next pollination could be the one!`;
      }

      // Show instant notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          badge: 1,
          data: {
            plantId: plant._id,
            pollinationId: pollination._id,
            type: 'pollination_result',
            status
          },
          android: {
            channelId: 'pollination',
            priority: 'max',
          },
        },
        trigger: null // null means show immediately
      });

      console.log(`✅ Showed instant ${status} notification for ${label}`);
    } catch (error) {
      console.error('Error showing pollination result notification:', error);
    }
  }

  /**
   * Initialize notification system
   */
  async initialize() {
    try {
      console.log('🚀 Initializing pollination notification system...');

      // Setup notification channels first (Android)
      await this.setupNotificationChannels();

      // Check if user token exists before proceeding
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('⚠️ No authentication token found. Skipping notification initialization.');
        console.log('   Notifications will be initialized after user login.');
        return false;
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('⚠️ Notification permissions denied');
        return false;
      }

      // Set up listeners
      this.setupNotificationListeners();

      // Schedule pending notifications
      await this.schedulePendingNotifications();

      console.log('✅ Pollination notification system initialized');
      return true;
    } catch (error) {
      console.error('Error initializing notification system:', error);
      return false;
    }
  }
}

export const pollinationNotificationHelper = new PollinationNotificationHelper();
