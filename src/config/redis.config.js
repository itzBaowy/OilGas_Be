import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis: Too many retry attempts, giving up');
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err.message);
});

redisClient.on('connect', () => {
  console.log('Redis: Connecting...');
});

redisClient.on('ready', () => {
  console.log('Redis: Connected successfully');
});

redisClient.on('reconnecting', () => {
  console.log('Redis: Reconnecting...');
});

redisClient.on('end', () => {
  console.log('Redis: Connection closed');
});

// Connect redis
const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    console.log('Session timeout will use JWT-only mode (no activity tracking)');
  }
};

// Disconnect redis
const disconnectRedis = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (error) {
    console.error('Failed to disconnect from Redis:', error.message);
  }
};

export { redisClient, connectRedis, disconnectRedis };
