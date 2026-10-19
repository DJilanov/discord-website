module.exports = {
  apps: [
    {
      name: "wow-forever-listings",
      cwd: "/home/wow-forever-discord",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "scripts/discord-listings-worker.ts",
      interpreter: "node",
      uid: "foreverlistings",
      gid: "foreverlistings",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "200M",
      kill_timeout: 20000,
      restart_delay: 5000,
      env: { NODE_ENV: "production", LISTINGS_ENV_FILE: ".env.listings" },
    },
  ],
};
