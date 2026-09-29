#!/bin/sh
set -eu
cd /home/wow-forever-discord
if ! id wowforever >/dev/null 2>&1; then
    useradd --system --home-dir /home/wow-forever-discord --shell /usr/sbin/nologin wowforever
fi
mkdir -p .data/private
chown -R wowforever:wowforever /home/wow-forever-discord
chmod 700 .data .data/private
chmod 600 .env.local
install -d -m 0700 -o wowforever -g wowforever /var/backups/wow-forever-discord
pm2 startOrReload deploy/ecosystem.config.cjs --only wow-forever-discord --update-env
pm2 save
install -m 0644 deploy/maintenance.cron /etc/cron.d/wow-forever-discord
install -m 0644 deploy/logrotate.conf /etc/logrotate.d/wow-forever-discord
