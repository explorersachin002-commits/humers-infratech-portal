module.exports = {
  apps: [
    {
      name: 'humers-infratech-portal',
      script: 'server.js',
      instances: 1, // Single instance to coordinate atomic file writes
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
