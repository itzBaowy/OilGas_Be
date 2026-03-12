import { redisClient } from '../config/redis.config.js';
import { systemConfigService } from './systemConfig.service.js';

const SESSION_PREFIX = 'session:';

export const sessionService = {
  /**
   * Create/Update session trong Redis với TTL
   * @param {string} userId - User ID
   * @param {object} sessionData - Session data (ip, device, etc.)
   * @param {number} timeoutMinutes - Session timeout in minutes
   */
  async createSession(userId, sessionData = {}, timeoutMinutes) {
    try {
      if (!redisClient.isOpen) {
        console.warn('Redis not connected, skipping session creation');
        return;
      }

      const sessionKey = `${SESSION_PREFIX}${userId}`;
      const ttlSeconds = timeoutMinutes * 60;

      await redisClient.set(
        sessionKey,
        JSON.stringify({
          userId,
          ...sessionData,
          createdAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
        }),
        { EX: ttlSeconds }
      );

      console.log(`Session created for user ${userId}, TTL: ${timeoutMinutes}m`);
    } catch (error) {
      console.error('Failed to create session:', error.message);
    }
  },

  /**
   * Get session từ Redis
   * @param {string} userId - User ID
   * @returns {object|null} Session data or null if not found
   */
  async getSession(userId) {
    try {
      if (!redisClient.isOpen) {
        console.warn('Redis not connected, skipping session check');
        return null;
      }

      const sessionKey = `${SESSION_PREFIX}${userId}`;
      const sessionData = await redisClient.get(sessionKey);

      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData);
    } catch (error) {
      console.error('Failed to get session:', error.message);
      return null;
    }
  },

  /**
   * Update TTL của session (reset timeout khi có activity)
   * @param {string} userId - User ID
   * @returns {boolean} Success status
   */
  async refreshSession(userId) {
    try {
      if (!redisClient.isOpen) {
        return false;
      }

      const sessionKey = `${SESSION_PREFIX}${userId}`;
      
      // Check if session exists
      const exists = await redisClient.exists(sessionKey);
      if (!exists) {
        return false;
      }

      // Get session timeout from config
      const sessionTimeoutPolicy = await systemConfigService.getSessionTimeoutPolicy();
      const ttlSeconds = sessionTimeoutPolicy.timeoutMinutes * 60;

      // Update TTL (reset timeout)
      await redisClient.expire(sessionKey, ttlSeconds);

      // Update lastActivityAt
      const sessionData = await this.getSession(userId);
      if (sessionData) {
        sessionData.lastActivityAt = new Date().toISOString();
        await redisClient.set(sessionKey, JSON.stringify(sessionData), { EX: ttlSeconds });
      }

      return true;
    } catch (error) {
      console.error('Failed to refresh session:', error.message);
      return false;
    }
  },

  /**
   * Delete session (logout)
   * @param {string} userId - User ID
   */
  async deleteSession(userId) {
    try {
      if (!redisClient.isOpen) {
        console.warn('⚠️  Redis not connected, skipping session deletion');
        return;
      }

      const sessionKey = `${SESSION_PREFIX}${userId}`;
      await redisClient.del(sessionKey);

      console.log(`🗑️  Session deleted for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to delete session:', error.message);
    }
  },

  /**
   * Check if session exists and is valid
   * @param {string} userId - User ID
   * @returns {boolean} True if session is valid
   */
  async isSessionValid(userId) {
    try {
      if (!redisClient.isOpen) {
        // Redis not available, fallback to JWT-only mode
        return true;
      }

      const session = await this.getSession(userId);
      return session !== null;
    } catch (error) {
      console.error('❌ Failed to check session validity:', error.message);
      return true; // Fallback to allow access if Redis fails
    }
  },

  /**
   * Get TTL của session (còn bao nhiêu giây nữa hết hạn)
   * @param {string} userId - User ID
   * @returns {number} TTL in seconds, -1 if not found
   */
  async getSessionTTL(userId) {
    try {
      if (!redisClient.isOpen) {
        return -1;
      }

      const sessionKey = `${SESSION_PREFIX}${userId}`;
      return await redisClient.ttl(sessionKey);
    } catch (error) {
      console.error('❌ Failed to get session TTL:', error.message);
      return -1;
    }
  },
};
