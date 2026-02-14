const { Pollination } = require('../models');

/**
 * Pollination notification scheduler
 * Sends notifications 1 hour before and 30 minutes before pollination window
 */

class NotificationScheduler {
  constructor() {
    this.scheduledJobs = new Map();
  }

  /**
   * Get pollination timing for a plant
   */
  getPollinationTiming(plantName) {
    const timingMap = {
      ampalaya: { startHour: 6, endHour: 9, label: 'Morning (6:00 AM - 9:00 AM)' },
      kalabasa: { startHour: 6, endHour: 9, label: 'Morning (6:00 AM - 9:00 AM)' },
      kundol: { startHour: 6, endHour: 8, label: 'Morning (6:00 AM - 8:00 AM)' },
      patola: { startHour: 17, endHour: 20, label: 'Evening (5:00 PM - 8:00 PM)' },
      upo: { startHour: 17, endHour: 20, label: 'Evening (5:00 PM - 8:00 PM)' },
    };

    return timingMap[plantName] || null;
  }

  /**
   * Get pending notifications for a user
   * Returns plants that need pollination notifications
   */
  async getPendingNotifications(userId) {
    try {
      // Find plants that are pollinated and haven't had notifications sent yet
      const plants = await Pollination.find({
        user: userId,
        status: 'pollinated',
        'pollinationTiming.scheduledDate': { $exists: true },
      });

      const now = new Date();
      const notifications = [];

      for (const plant of plants) {
        if (!plant.pollinationTiming) continue;

        const { startHour, scheduledDate, notificationScheduled } = plant.pollinationTiming;

        if (!scheduledDate) continue;

        // Create dates for notification times
        const schedDate = new Date(scheduledDate);
        schedDate.setHours(0, 0, 0, 0); // Set to midnight of that day

        // 1 hour before pollination starts
        const oneHourBefore = new Date(schedDate);
        oneHourBefore.setHours(startHour - 1, 0, 0, 0);

        // 30 minutes before pollination starts
        const thirtyMinsBefore = new Date(schedDate);
        thirtyMinsBefore.setHours(startHour - 1, 30, 0, 0);

        // Check if we should send 1 hour before notification
        if (!notificationScheduled.oneHourBefore && now >= oneHourBefore) {
          notifications.push({
            plantId: plant._id,
            plantName: plant.displayName?.english || plant.name,
            plantNameTagalog: plant.displayName?.tagalog || plant.name,
            type: 'oneHourBefore',
            scheduledTime: oneHourBefore,
            message: `🌸 Pollination starts in 1 hour! ${plant.displayName?.english || plant.name} is ready at ${startHour}:00`,
            pollintationWindow: `${startHour}:00 - ${plant.pollinationTiming.endHour}:00`,
          });
        }

        // Check if we should send 30 mins before notification
        if (
          !notificationScheduled.thirtyMinsBefore &&
          now >= thirtyMinsBefore &&
          now < oneHourBefore
        ) {
          notifications.push({
            plantId: plant._id,
            plantName: plant.displayName?.english || plant.name,
            plantNameTagalog: plant.displayName?.tagalog || plant.name,
            type: 'thirtyMinsBefore',
            scheduledTime: thirtyMinsBefore,
            message: `🌸 Pollination in 30 minutes! Get your tools ready!`,
            pollintationWindow: `${startHour}:00 - ${plant.pollinationTiming.endHour}:00`,
          });
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as sent
   */
  async markNotificationAsSent(plantId, notificationType) {
    try {
      const plant = await Pollination.findById(plantId);
      if (!plant) throw new Error('Plant not found');

      if (notificationType === 'oneHourBefore') {
        plant.pollinationTiming.notificationScheduled.oneHourBefore = true;
      } else if (notificationType === 'thirtyMinsBefore') {
        plant.pollinationTiming.notificationScheduled.thirtyMinsBefore = true;
      }

      await plant.save();
      return plant;
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      throw error;
    }
  }

  /**
   * Format time for display
   */
  formatTime(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  }

  /**
   * Get pollination summary for a plant
   */
  getPollinationSummary(plantName) {
    const timing = this.getPollinationTiming(plantName);
    if (!timing) return null;

    return {
      plant: plantName,
      window: timing.label,
      startHour: timing.startHour,
      endHour: timing.endHour,
      oneHourNotif: `${this.formatTime(timing.startHour - 1)}`,
      thirtyMinsNotif: `${this.formatTime(timing.startHour - 1)} (+ 30 mins)`,
    };
  }
}

module.exports = new NotificationScheduler();
