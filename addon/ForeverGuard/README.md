# ForeverGuard 0.1.0 Alpha

Optional local player notes and reviewed community context for WoW Forever.

The TOC targets interface 16001, corresponding to the installed 1.60.1 beta
client examined during development. Core logic is tested outside the game.
In-game UI and beta API compatibility still require playtesting. This is an
alpha, not a Blizzard-supported or certified addon.

Install the `ForeverGuard` folder in the active client's `Interface/AddOns`
directory and restart the game or reload the UI. Keep `Data.lua`, `Core.lua`,
and `ForeverGuard.lua` together. Never overwrite your SavedVariables to update.

- `/fg check Name-Realm`: check the exact region, character and realm.
- `/fg note Name-Realm text`: add a private local note.
- `/fg forget Name-Realm`: remove a local note.
- `/fg scan`: scan your current party or raid.
- `/fg report`: open a copyable private report template.
- `/fg region EU`, `NA`, or `OCE`: choose the identity namespace.
- `/fg threshold 1` through `4`: choose minimum warning severity.
- `/fg alerts on` or `off`: enable or hide community warnings.
- `/fg version`: show the local dataset version and generation time.

The addon does not connect to the internet, send whispers, submit reports,
kick players, or automate gameplay. Notes stay in local SavedVariables.
Expired alerts are ignored. A warning is context, not proof of current conduct.

Update the reviewed list from:
https://www.wowforeverdiscord.online/api/addons/foreverguard/list?format=lua

Replace `Data.lua` while the game is closed, or reload after replacing it.
Only obtain this executable Lua data file from the official community domain.
Pending appeals and overturned cases are removed from new exports, but an old
local copy cannot receive remote corrections. Refresh before a group session.

The export is delivered over HTTPS; it is not cryptographically verified by
the addon. ZIP checksums verify file integrity only, not publisher identity.

Reports and appeals: https://www.wowforeverdiscord.online/reports
