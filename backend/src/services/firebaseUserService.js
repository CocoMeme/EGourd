const { firebaseConfig } = require('../config/firebase');
const User = require('../models/User');

/**
 * Service class for Firebase user management and synchronization
 */
class FirebaseUserService {
  /**
   * Sync Firebase user with local database
   */
  async syncFirebaseUser(firebaseUser, additionalData = {}) {
    try {
      let localUser = await User.findOne({ firebaseUid: firebaseUser.uid });

      if (!localUser) {
        // Create new user from Firebase data
        const userData = {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.email_verified,
          provider: firebaseUser.firebase?.sign_in_provider || 'firebase',
          ...this.extractUserProfile(firebaseUser),
          ...additionalData,
          isActive: true,
          lastLogin: new Date(),
        };

        // Generate username if not provided
        if (!userData.username && userData.email) {
          userData.username = await this.generateUniqueUsername(userData.email);
        }

        localUser = new User(userData);
        await localUser.save();
      } else {
        // Update existing user
        localUser.lastLogin = new Date();
        localUser.emailVerified = firebaseUser.email_verified;

        // Update profile picture if available from Firebase
        if (firebaseUser.picture && !localUser.profilePicture) {
          localUser.profilePicture = firebaseUser.picture;
        }

        // Update name fields if they're empty and Firebase has them
        const firebaseProfile = this.extractUserProfile(firebaseUser);
        if (firebaseProfile.firstName && !localUser.firstName) {
          localUser.firstName = firebaseProfile.firstName;
        }
        if (firebaseProfile.lastName && !localUser.lastName) {
          localUser.lastName = firebaseProfile.lastName;
        }

        await localUser.save();
      }

      return {
        success: true,
        user: localUser,
        isNewUser: !localUser.lastLogin || localUser.createdAt === localUser.lastLogin,
      };
    } catch (error) {
      console.error('Error syncing Firebase user:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract user profile information from Firebase user object
   */
  extractUserProfile(firebaseUser) {
    const profile = {};

    // Extract name information
    if (firebaseUser.name) {
      const nameParts = firebaseUser.name.split(' ');
      profile.firstName = nameParts[0] || '';
      profile.lastName = nameParts.slice(1).join(' ') || '';
    }

    // Extract profile picture
    if (firebaseUser.picture) {
      profile.profilePicture = firebaseUser.picture;
    }

    return profile;
  }

  /**
   * Generate a unique username from email
   */
  async generateUniqueUsername(email) {
    const baseUsername = email.split('@')[0].toLowerCase();
    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  /**
   * Update user's Firebase custom claims
   */
  async updateUserClaims(uid, claims) {
    try {
      const result = await firebaseConfig.setCustomUserClaims(uid, claims);
      return result;
    } catch (error) {
      console.error('Error updating user claims:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Assign role to user (both in database and Firebase)
   */
  async assignRole(userId, role) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Update local database
      user.role = role;
      await user.save();

      // Update Firebase custom claims
      if (user.firebaseUid) {
        const customClaims = { role };
        await this.updateUserClaims(user.firebaseUid, customClaims);
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Error assigning role:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete user from both Firebase and local database
   */
  async deleteUser(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Delete from Firebase if Firebase UID exists
      if (user.firebaseUid) {
        const firebaseResult = await firebaseConfig.deleteUser(user.firebaseUid);
        if (!firebaseResult.success) {
          console.warn('Failed to delete user from Firebase:', firebaseResult.error);
          // Continue with local deletion even if Firebase deletion fails
        }
      }

      // Delete from local database
      await User.deleteOne({ _id: userId });

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user analytics and statistics
   */
  async getUserAnalytics(uid) {
    try {
      const user = await User.findOne({ firebaseUid: uid });
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // TODO: Add actual analytics from scan data when available
      const analytics = {
        totalScans: 0, // await Scan.countDocuments({ userId: user._id }),
        accountAge: Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24)), // days
        lastActive: user.lastLogin,
        provider: user.provider,
        emailVerified: user.emailVerified,
      };

      return {
        success: true,
        analytics,
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Batch update users (for admin operations)
   */
  async batchUpdateUsers(updates) {
    try {
      const results = [];

      for (const update of updates) {
        try {
          const user = await User.findById(update.userId);
          if (user) {
            Object.assign(user, update.data);
            await user.save();
            results.push({
              userId: update.userId,
              success: true,
            });
          } else {
            results.push({
              userId: update.userId,
              success: false,
              error: 'User not found',
            });
          }
        } catch (error) {
          results.push({
            userId: update.userId,
            success: false,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error('Error in batch update:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
module.exports = new FirebaseUserService();
