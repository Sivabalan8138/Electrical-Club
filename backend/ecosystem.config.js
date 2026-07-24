module.exports = {
  apps: [
    {
      name: "electrical-club-backend",
      script: "./dist/server.js",
      instances: "max", // Use all available CPU cores
      exec_mode: "cluster", // Enable load balancing
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
