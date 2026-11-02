# Local preview build retention

`npm run build`, `npm run dev`, `npm run test:e2e`, and `npm run test:raids:e2e`
run preview cleanup after their child command exits, including failed commands.
For `dev`, this happens when the server stops. Normal interrupt/termination
signals are forwarded to the child before cleanup; a forced kill cannot run an
exit hook, so leftovers are considered on the next run.

Cleanup targets 2 GiB of idle `.next-*` development previews, oldest first, and
expires idle previews after seven days. Folders modified in the last hour are
preserved, so recently active output can temporarily exceed the target.

The default `.next`, the current `FOREVER_BUILD_DIR`, and every completed
production build containing `BUILD_ID` are preserved. The cleaner requires a
Next.js development manifest, checks live/unknown lock files and open files,
and rechecks folder contents before deletion. Root symlinks are not followed.
If `lsof` is unavailable or cannot inspect files, deletion is skipped. This
conservative mode supports macOS/Linux; it does not delete previews on Windows.

```sh
npm run clean:builds -- --dry-run
npm run clean:builds
npx tsx --test tests/build-cleanup.test.ts
```

The wrapper passes CLI arguments through and preserves the child command's exit
status. Cleanup errors are reported separately. Direct `npx next`/`npx playwright`
commands bypass automatic cleanup; use the package scripts above. This does not
remove source files, dependencies, database data, screenshots, or test reports,
and does not install a scheduled job.
