#!/bin/sh
set -eu
test "$(id -u)" = 0
project=/home/wow-forever-discord
stage=${RAIDS_STAGE:-/home/wow-forever-raids-stage-20261003-r1}
build=${RAIDS_BUILD:-.next-release-native-raids-20261003-r1}
backup=${RAIDS_BACKUP:-/var/backups/wow-forever-discord/release-native-raids-20261003-r1}
case "$stage" in /home/wow-forever-raids-stage-*) ;; *) exit 1 ;; esac
case "$build" in .next-release-*/* | *..*) exit 1 ;; .next-release-*) ;; *) exit 1 ;; esac
case "$backup" in /var/backups/wow-forever-discord/release-*) ;; *) exit 1 ;; esac
test -s "$backup/source-before.tar.gz"
test -s "$stage/$build/BUILD_ID"
test -s "$stage/deploy/raids-release-files.txt"
test ! -e "$project/$build"
umask 077
tar -czf "$backup/source-new.tar.gz" -C "$stage" -T "$stage/deploy/raids-release-files.txt"
rsync -rlt --exclude=scripts/maintenance.ts --files-from="$stage/deploy/raids-release-files.txt" "$stage/" "$project/"
# Copy only the release's new pure-JS dependencies; existing modules stay in place.
mkdir -p -m 0755 "$project/node_modules/@js-temporal"
mkdir -p -m 0755 "$project/node_modules/@dnd-kit"
mkdir -p -m 0755 "$project/node_modules/@preact"
rsync -a "$stage/node_modules/@js-temporal/polyfill/" "$project/node_modules/@js-temporal/polyfill/"
rsync -a "$stage/node_modules/@dnd-kit/" "$project/node_modules/@dnd-kit/"
rsync -a "$stage/node_modules/@preact/signals-core/" "$project/node_modules/@preact/signals-core/"
rsync -a "$stage/node_modules/jsbi/" "$project/node_modules/jsbi/"
rsync -a "$stage/$build/" "$project/$build/"
cd "$project"
npm run db:generate
install -m 0644 "$stage/scripts/maintenance.ts" "$project/scripts/maintenance.ts"
while IFS= read -r path; do
  chown -R wowforever:wowforever "$project/$path"
  chmod -R u+rwX,go+rX "$project/$path"
done < "$stage/deploy/raids-release-files.txt"
chown -R wowforever:wowforever "$project/$build" "$project/public/images/raids" "$project/node_modules/.prisma"
chown -R wowforever:wowforever "$project/node_modules/@dnd-kit" "$project/node_modules/@js-temporal" "$project/node_modules/@preact" "$project/node_modules/jsbi"
chmod -R u+rwX,go+rX "$project/node_modules/@dnd-kit" "$project/node_modules/@js-temporal" "$project/node_modules/@preact" "$project/node_modules/jsbi"
runuser -u wowforever -- test -r "$project/scripts/raids-discord-worker.ts"
runuser -u wowforever -- test -r "$project/lib/raids/native-worker.ts"
runuser -u wowforever -- node -e 'require("@js-temporal/polyfill")'
runuser -u wowforever -- node -e 'require("@dnd-kit/react")'
test -r .env.local
echo 'Verified Linux build installed. Active website build remains unchanged until activation.'
