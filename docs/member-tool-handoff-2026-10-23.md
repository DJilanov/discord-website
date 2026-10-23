# Member Tool Handoff Review

The October 23 Playwright review starts at the real public leveling setup,
chooses a five-player plan and follows Find a group, Host this plan and the
website's Discord sign-in action. Public checks stop at Discord authorization:
no credentials, live member session, fake event or signup is created.

The Horde dashboard exposes the expected actions. The revised Alliance premade
dashboard did not. The Helper correction restores its existing shared
`ToolGroupActions` component, preserving race, class, faction, party size and
the premade edition in the source link. It does not export private quest progress
or change route calculations, item data, simulator engines or reviewed builds.

## Automated Member Check

`tests/e2e/raids.spec.ts` now exercises an entire ordinary-member OAuth callback,
not only a manually installed fixture session. The local-only Discord transport
returns a non-owner account with no administrator roles. The actual website
creates the member session after its state, PKCE, issuer and membership flow.

The test verifies the preserved title, activity, faction, capacity, source URL
and open signup. Region, PvP ruleset and three-hour duration are checked as form
defaults, not described as preferences carried by a source schema that does not
contain them. It checks 1440px, 390px and 320px layouts, no channel picker and a
403 from the channel-selection API. The test does not submit an event.

Two neighbouring browser cases retain the native-prefill and member-beta routed
posting checks. They all pass against a fresh isolated PostgreSQL database with
fake Discord credentials. Strict TypeScript and scoped lint pass. The database,
SSH forward and browser dev server are stopped after the run.

Use `playwright.raids.config.ts`, never a production database or session cookie.
Its webpack development server also works in isolated worktrees whose dependency
directory is a symlink. `FOREVER_RAIDS_E2E_TOOL_DRAFTS` optionally supplies bounded,
schema-validated draft vectors captured from the real public tools.

## Review Tasks

The public contribution assignments now point to the published class and dungeon
resources. They no longer require reviewers to request private versions of the
six already-published guides. Class review distinguishes simulation evidence,
source confirmation and gameplay observation; ordinary-member testing explicitly
protects callback codes and cookies and stops before fictitious publication.

## Limits

The public check also exposed an HTTP 502 on sign-in with the larger Alliance
reference. The proxy error log confirmed an upstream response-header overflow:
the callback, state and PKCE cookies exceeded Nginx's default header buffer.
The scoped proxy configuration increases that buffer to 16 KiB with matching
buffer limits. Streamed response buffering remains off, and body limits, TLS,
canonical host, cookies and application auth validation are unchanged.

A simulated Discord identity is not evidence that a real person's provider
account completed authorization. Browser checks also do not establish guide
gameplay accuracy, attendance, a host commitment or search-result growth. Those
remain separate requirements in the ecosystem growth audit.

Detailed source, browser and deployment receipts are retained locally in
`artifacts/ecosystem-followup-20261023`. Production publication and sibling-process
checks must be read from the final receipts, not inferred from this procedure.
