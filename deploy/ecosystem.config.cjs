module.exports = {
  apps: [
    {
      name: "wow-forever-discord",
      cwd: "/home/wow-forever-discord",
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 -p 19320",
      interpreter: "node",
      uid: "wowforever",
      gid: "wowforever",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "650M",
      kill_timeout: 10000,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        FOREVER_BUILD_DIR: process.env.FOREVER_BUILD_DIR || ".next",
      },
    },
  ],
};
