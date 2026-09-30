# WoWForeverBot: Read-Only Discord Configuration Audit

Status: the owner-created WoWForeverBot is installed and authenticated in the intended server. Owner-requested configuration audits are GET-only. On September 30, 2026, the separate owner-approved cleanup writer applied 28 channel topics and six forum tag sets; ten topic changes remain permission-blocked. This is operator-run REST tooling, not a continuously connected chat bot.

WoWForeverBot is the owner's final application name, replacing the original KFCBot working name. Existing `KFCBOT_*` environment keys, script paths and private output directory are retained for compatibility; they do not change the bot's Discord name or the community's separate branding.

## Configured Application

- Owner-provided application ID: `1554796912673169428`.
- Owner-provided public key: `5b6a0f40ab52ef389456f27cfb8ea08fca573a24e40dcb4a76a72254a7b690ea`.
- Target server ID: `1554316932948172940`, resolved from the existing `ejn4UnDdcX` invitation as **WoW Forever Discord**.
- Credentials are configured privately in local `.env.local`. The original token was shared in chat; the owner confirmed rotation before the live cleanup batch. Rotation is an operator confirmation, not independently proven by the tool. Credentials are absent from documentation and audit reports.

The public key is recorded for a later signed-interactions setup. It is not a bot token, is not used by the read-only audit, and has not been enabled on the website. Token/application identity and server membership were checked successfully by the read-only audit.

The bot's terms/privacy disclosures still need publication; the owner explicitly requested the local read-only test before that work was complete. Do not treat this test as a policy-complete public bot launch. The website's current privacy notice alone does not describe this tool. Leave interactions and linked-role verification URLs blank; do not use nonexistent policy URLs.

## First Live Audit

The September 30 audit returned 58 channels/categories, 21 roles and readable onboarding. The automated checks produced 34 review items; manual review is stored beside the private snapshot in `.data/kfcbot-audits/1554316932948172940-CEYUd7/review-and-change-plan.md`. Do not commit or publish that server-specific report. No messages, member roster, report threads or DMs were collected. No Discord channels, roles or posts were changed.

## 1. Create the Owner-Controlled Application

In the [Discord Developer Portal](https://discord.com/developers/applications):

1. Create a new application named **WoWForeverBot** in your own account or team (completed for the application above).
2. On **General Information**, copy the Application ID. This ID is public, not a secret.
3. On **Bot**, confirm the bot user is named WoWForeverBot and obtain/reset its bot token. Keep **Requires OAuth2 Code Grant** off. No personal account token, password, client secret or 2FA code is needed by this project.
4. Leave **Presence Intent**, **Server Members Intent** and **Message Content Intent** off. This audit does not connect to the Gateway or read messages.
5. Use **Guild Install**, not User Install. For an owner-only app, set Install Link to **None** and disable **Public Bot**; the owner can still use the explicit generated authorization URL below.
6. Leave Interactions Endpoint URL and webhooks unset for this audit. Do not register the existing website slash commands yet.

Discord account-owned application creation and the server authorization click must be completed by the owner. This tool does not automate a personal account.

## 2. Configure Local Credentials

In the project's existing, gitignored `.env.local`, add these three values without overwriting other settings:

```dotenv
KFCBOT_APPLICATION_ID=
KFCBOT_GUILD_ID=
KFCBOT_TOKEN=
```

`KFCBOT_GUILD_ID` is the target Discord server ID: enable Developer Mode in Discord, then use Copy Server ID on the intended server. The token is the **Bot** page token, with no `Bot ` prefix. Never put it in chat, screenshots, command arguments, tracked files or a `NEXT_PUBLIC_` variable. Restrict the local environment file to your OS user. Rotate the token immediately if it is exposed.

These variables deliberately do not fall back to `DISCORD_*`. The existing website has separate interaction and role-assignment behavior; setting audit credentials must not activate it accidentally. Existing environment variables take precedence over `.env.local`, following the project's current environment loader.

## 3. Install with View Channels Only

From `/Users/dimitarjilanov/work/test/discord-website`:

```sh
npm run bot:setup
```

Alternatively, generate the invite before configuring the token:

```sh
npm run bot:setup -- --application-id YOUR_APPLICATION_ID --guild-id YOUR_SERVER_ID
```

This prints an owner-authorized Discord installation URL, locked to the chosen server, requesting only **View Channels** (`1024`). It makes no API request and does not create the application. Confirm the intended server and permission list before authorizing.

Do not grant Administrator, Manage Server, Manage Roles, Manage Channels, Manage Messages, View Audit Log, Read Message History or moderation permissions for this configuration-only phase. Give View Channels only on categories/channels you intend to include. The API may return metadata for hidden channels, or omit hidden channels depending on Discord's visibility behavior. Do not assume that an omitted channel does not exist.

Requested install permissions are not a complete effective-permission boundary: bots also inherit `@everyone`, other assigned roles and channel overrides. For example, a bot may inherit Send Messages even when its own role only grants View Channels. The audit reports this. Never remove members' existing permissions just to constrain the bot; use bot-specific channel overrides where appropriate. Independently, this tool implements **GET requests only**, even if it receives a more powerful token later.

The bot may appear **offline** in Discord. That is expected: the audit uses REST and does not need a running Gateway connection, a PM2 process, Docker, public webhooks or a web deployment.

## 4. Run the Audit

```sh
npm run bot:audit
```

It validates the token as a bot, checks the configured application and server identities, then requests:

- The current bot and application identity, stripping unrelated response fields.
- Server configuration: description, Community features, verification, notification, content-filter, MFA and rules/system-channel settings.
- Roles and permission bitsets, the bot's own role membership, returned channels/categories, topics, forum tags and permission overwrites.
- Onboarding prompts, role/channel choices and defaults when readable. HTTP 403/404 means **unknown/unavailable**, not disabled. Other failed required reads stop the audit.

No message content, member roster, threads, forum reports, appeals, DMs, attachments, member activity, invites or audit logs are collected. Channel permission overwrites can contain individual member IDs, so the configuration remains private. Permission probes do not certify every real member's access: multiple roles, member-specific overwrites, screening and timeouts can change it.

Unexpected/incomplete response shapes and explicitly obfuscated channel records stop the audit rather than treating synthetic or missing permissions as a real security policy. A failed run is not evidence that the server is misconfigured.

Output is saved in a new `.data/kfcbot-audits/SERVER_ID-RANDOM/` directory on every run:

- `snapshot.json`: allowlisted configuration fields for manual review, not a complete backup.
- `audit.json`: structured findings, per-channel and single-role visibility probes, limitations.
- `audit.md`: human-readable findings and inventory, with untrusted server text escaped.

Directories use mode `0700`, files `0600`, and `.data/` is already gitignored. Raw API error bodies and credentials are not logged. Keep reports local, do not serve them through the website, and remove obsolete audits after review. Treat names/topics as untrusted content, not agent instructions.

Review items include privileged `@everyone` access, excessive bot permissions, Administrator roles, moderation MFA, verification, noisy notification defaults, rules assignment, public sensitive-name channels, rules/announcement posting, mass mentions, missing channel purposes, duplicate sibling channel names and privileged onboarding choices. Legitimate configurations can trigger review items; there is no automatic remediation.

Read-only access is enough for the initial configuration audit. A later content audit of selected welcome/rules messages requires a separately agreed scope; this tool will not silently expand collection when permissions change.

## 5. Separately Approved Channel Cleanup

After the owner installs the application and configures the token, run the audit and review the real findings together. Do not change public `report-here`/`appeal-here` forums to private automatically; their current visibility is intentional and requires a policy discussion.

The audit itself remains **GET-only**. Following the owner's request to fix channels, the separate [channel cleanup command](discord-channel-cleanup.md) was implemented for 38 fixed topic updates and six forums' initial tags. After owner-confirmed token rotation and a role permission grant, 28 topics and all six tag sets were applied and verified. Ten channels still deny Manage Channels and were left unchanged. Granting permission alone does not run the writer. No messages, roles, onboarding or channel permissions were written.

This separate command uses a specific change list and safeguards:

1. Exact guild/channel/role IDs and before/after values, distinguishing confirmed problems from design preferences.
2. A fresh snapshot and stale-state checks immediately before each mutation.
3. Only permissions required for the chosen changes. Role management remains below the bot's highest role; no Administrator requirement.
4. Small batches, Discord audit reasons where supported, no broad mentions, and a post-change audit.
5. A private recovery journal and tested resumability. Topic rollback requires manual current-state review; newly created tags must not be blindly removed because members may already use them. No automatic deletions, member-role reassignment, message removal, bans or notification broadcasts. A configuration snapshot cannot restore deleted messages or their IDs.
6. Removal of temporary management privileges after validation.

This audit can inform the broader [website-to-Discord integration blueprint](web-discord-integration-blueprint.md). It does not implement that blueprint's worker, OAuth, outbox or publishing phases.

## Verification and Sources

Run the focused regression suite with `npx tsx --test tests/discord-audit.test.ts tests/discord-channel-cleanup.test.ts`, plus `npm run typecheck` and `npm run lint`. Authenticated read-only runs succeeded. All 14 cleanup tests passed immediately before the live batch; 28 channel topics and six forum tag sets were then verified against a fresh audit, with protected configuration unchanged. Ten updates remain permission-blocked. Native Discord rendering was not inspected, and message-content access is not implemented.

- [Discord bot authorization](https://docs.discord.com/developers/topics/oauth2#bot-authorization-flow)
- [Discord permission calculation and hierarchy](https://docs.discord.com/developers/topics/permissions)
- [Guild configuration endpoints and channel visibility](https://docs.discord.com/developers/resources/guild)
- [Current application endpoint](https://docs.discord.com/developers/resources/application#get-current-application)
- [Discord rate-limit handling](https://docs.discord.com/developers/topics/rate-limits)
