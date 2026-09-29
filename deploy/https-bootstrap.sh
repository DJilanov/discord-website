#!/bin/sh
set -eu
cd /home/wow-forever-discord
test ! -e /etc/nginx/sites-available/wow-forever-discord
mkdir -p /var/www/wowforever-acme
install -m 0644 deploy/nginx-bootstrap.conf /etc/nginx/sites-available/wow-forever-discord
ln -s /etc/nginx/sites-available/wow-forever-discord /etc/nginx/sites-enabled/wow-forever-discord
nginx -t
systemctl reload nginx
certbot certonly --webroot -w /var/www/wowforever-acme -d wowforeverdiscord.online -d www.wowforeverdiscord.online --cert-name wowforeverdiscord.online --non-interactive --agree-tos --register-unsafely-without-email
install -m 0755 deploy/certbot-renew-hook.sh /etc/letsencrypt/renewal-hooks/deploy/wow-forever-discord
install -m 0644 deploy/nginx.conf /etc/nginx/sites-available/wow-forever-discord
nginx -t
systemctl reload nginx
