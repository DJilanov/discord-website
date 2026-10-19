module.exports = {
  apps: [
    {
      name: "wow-forever-raids",
      cwd: "/home/wow-forever-discord",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "scripts/raids-discord-worker.ts",
      interpreter: "node",
      uid: "wowforever",
      gid: "wowforever",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "250M",
      kill_timeout: 30000,
      restart_delay: 5000,
      env: { NODE_ENV: "production" },
    },
  ],
};
