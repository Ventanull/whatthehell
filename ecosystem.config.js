module.exports = {
  apps: [
    {
      name: "whatsapp-saas-backend",
      script: "./backend/index.js",
      instances: 1, // Use 1 instance initially to prevent session conflicts in Baileys if not using shared store
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
