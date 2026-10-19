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

previous_root=$(pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const p=JSON.parse(s).find(p=>p.name==="wow-forever-discord");if(!p)process.exit(1);console.log(p.pm2_env.pm_cwd)})')
previous_build=$(pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const p=JSON.parse(s).find(p=>p.name==="wow-forever-discord");if(!p)process.exit(1);console.log(p.pm2_env.FOREVER_BUILD_DIR||".next")})')
switched=0
rollback() {
    status=$?
    if [ "$status" -ne 0 ] && [ "$switched" -eq 1 ]; then
        echo "Activation failed; restoring the previous website definition" >&2
        pm2 delete wow-forever-discord >/dev/null 2>&1 || true
        if FOREVER_RELEASE_ROOT="$previous_root" FOREVER_BUILD_DIR="$previous_build" \
            pm2 start "$previous_root/deploy/ecosystem.config.cjs" --only wow-forever-discord; then
            pm2 save
        else
            echo "Rollback failed; inspect the named website process immediately" >&2
        fi
    fi
}
trap rollback EXIT

# PM2 reload preserves an existing process's cwd and executable. Recreate only this definition.
switched=1
pm2 delete wow-forever-discord
FOREVER_RELEASE_ROOT="$release_directory" FOREVER_BUILD_DIR="$build_directory" \
    pm2 start deploy/ecosystem.config.cjs --only wow-forever-discord
pm2 jlist | FOREVER_EXPECTED_ROOT="$release_directory" node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const p=JSON.parse(s).find(p=>p.name==="wow-forever-discord");if(!p||p.pm2_env.pm_cwd!==process.env.FOREVER_EXPECTED_ROOT||!p.pm2_env.pm_exec_path.startsWith(process.env.FOREVER_EXPECTED_ROOT+"/node_modules/next/"))process.exit(1)})'

attempt=0
until curl --fail --silent --show-error http://127.0.0.1:19320/api/health >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
        echo "Discord health did not recover; inspect this release before further changes" >&2
        exit 1
    fi
    sleep 1
done
switched=0
trap - EXIT
pm2 save
echo "Activated Discord source commit $source_commit"
