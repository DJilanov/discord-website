module.exports = {
  apps: [
    {
      name: "kfc-community-calendar",
      cwd: "/home/wow-forever-discord",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "scripts/kfc-event-maintenance.ts --apply --watch",
      interpreter: "node",
      uid: "wowforever",
      gid: "wowforever",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "200M",
      kill_timeout: 120000,
      restart_delay: 5000,
      env: { NODE_ENV: "production" },
    },
  ],
};
