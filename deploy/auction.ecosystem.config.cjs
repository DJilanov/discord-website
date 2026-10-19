module.exports = {
  apps: [
    {
      name: "wow-forever-auction",
      cwd: "/home/wow-forever-discord",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "scripts/auction-worker.ts",
      interpreter: "node",
      uid: "foreverauction",
      gid: "foreverauction",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "250M",
      kill_timeout: 20000,
      restart_delay: 5000,
      env: { NODE_ENV: "production", AUCTION_ENV_FILE: ".env.auction" },
    },
  ],
};
