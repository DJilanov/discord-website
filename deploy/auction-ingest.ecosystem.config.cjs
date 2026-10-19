module.exports = {
  apps: [
    {
      name: "kfc-helper-ingest",
      namespace: "kfc",
      cwd: "/home/wow-trader-system/releases/kfc-helper-ingest-auction-20261001-r1",
      script:
        "/home/wow-trader-system/releases/kfc-helper-ingest-auction-20261001-r1/scripts/run-production.sh",
      args: "ingest",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "350M",
      kill_timeout: 10000,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        WOW_TRADER_ENV_FILE: "/home/wow-trader-system/shared/env/ingest.env",
      },
    },
  ],
};
