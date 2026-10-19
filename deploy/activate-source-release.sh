#!/bin/sh
set -eu

release_directory=${1:-}
case "$release_directory" in
    /home/wow-forever-discord-source-releases/*) ;;
    *) echo "Expected an immutable Discord source release directory" >&2; exit 2 ;;
esac
cd "$release_directory"
source_commit=$(node -p 'JSON.parse(require("fs").readFileSync("release-source.json", "utf8")).commit')
build_directory=$(node -p 'JSON.parse(require("fs").readFileSync("release-source.json", "utf8")).buildDirectory')
case "$source_commit" in
    ""|*[!0-9a-f]*) echo "Invalid source commit" >&2; exit 2 ;;
esac
test "${#source_commit}" -eq 40
test "$release_directory" = "/home/wow-forever-discord-source-releases/$source_commit"
./node_modules/.bin/tsx scripts/verify-production-build.ts "$build_directory"

FOREVER_RELEASE_ROOT="$release_directory" FOREVER_BUILD_DIR="$build_directory" \
    pm2 startOrReload deploy/ecosystem.config.cjs --only wow-forever-discord --update-env
pm2 save

attempt=0
until curl --fail --silent --show-error http://127.0.0.1:19320/api/health >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
        echo "Discord health did not recover; inspect this release before further changes" >&2
        exit 1
    fi
    sleep 1
done
echo "Activated Discord source commit $source_commit"
