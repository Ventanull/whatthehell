const Redis = require("ioredis");

const getRedisClient = () => {
  const redisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    keepAlive: 30000,
    socket: {
      keepAlive: true,
    },
  };

  // Use TLS for cloud Redis (Upstash)
  if (process.env.REDIS_URL) {
    redisOptions.tls = {};
  }

  // Pass options as second argument for proper merging
  const redis = new Redis(process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0,
  }, redisOptions);

  redis.on("error", (err) => {
    console.error("Redis Error:", err.message);
  });

  redis.on("connect", () => {
    console.log("Redis Connected");
  });

  redis.on("ready", () => {
    console.log("Redis Ready");
  });

  return redis;
};

module.exports = getRedisClient;
