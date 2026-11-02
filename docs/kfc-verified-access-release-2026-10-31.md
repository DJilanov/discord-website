# KFC verified community and private guild access

Status: the access repair is live. The first applying run completed at
**11:29:45 UTC on October 31, 2026**. Native Rules Screening remains disabled;
the existing MEE6 verification flow is retained. The native onboarding cutover
is implemented and guarded until screening is enabled.

This implements the [verification/access plan](kfc-verified-access-plan-2026-10-31.md).
Changes apply only to KFC Global Pugs `1411533815356194968`. The other community
server, website release, guild rosters, raid signups and existing role
assignments were not changed by this deployment. Source remains uncommitted.

## Live result

| Area | Result | Status |
| --- | --- | --- |
| Guild privacy | Booster and other ordinary-role allows removed from protected areas; Certified/authorized staff retained | Live |
| Case privacy | attendance-cases remains staff-only | Live |
| TBC guild applications | Verified community members can read and post in tbc-application without Certified; the pinned template and public joining guide explain this route | Live |
| Entry path | Welcome, verification, rules, announcements, public joining instructions and Forever application information are readable without Verified | Live |
| Instruction channels | Ordinary Verified/Certified members cannot post; Management and publishing bot retain access | Live |
| Role menu | Verified can now read the existing message history; a pinned notice explains that the older NEEDED wording is obsolete | Live |
| Verification guidance | New pinned notice links the original MEE6 button and explains community verification versus officer-approved Certified membership | Live |
| Native welcome routing | Discord's system channel moved from hidden newcomers to public introductions; its topic links start-here | Live and read back |
| Readiness checks | Defaults assessed by accessibility/quota instead of an obsolete exact seven; game routes use actual raiding bindings; access audit included | Implemented |
| Native onboarding | Guarded operator prepares a nine-default flow and one neutral raid lobby after screening is enabled | Implemented; not activated |
| Native screening / Verified automation | No unsupported API or assumed completion signal used; MEE6 remains the current role-granting mechanism | Owner setting/capability check pending |
| Fresh-member desktop/phone journey | Configuration and message readbacks verified; ordinary client trial remains necessary | Pending |

The first run made 19 explicit channel updates. The current policy protects
**22 guild/staff areas and checks 33 role profiles**, including no-role, Verified,
Booster, Certified, ordinary managed integration roles and combined ordinary
roles. Known individual private-channel exceptions were checked against current
guild membership. Redundant per-person View Channel grants for ordinary
Certified members were removed, retaining their access through Certified so
later revocation works. Only authorized staff/bot exceptions remain. Private
membership exceptions do not imply publishing rights on public instructions.

### Rollout correction: applicant-facing TBC channel

The initial entry policy made tbc-application readable before verification at
**11:29 UTC**. At **11:52 UTC**, the operator changed it to staff-only based on
an assumption that it was confidential staff review. That assumption was not
established by reading application contents and did not reflect the owner's
intended application workflow. The owner clarified that this is where people
apply for the TBC guild, separate from Forever applications.

At **12:43 UTC**, Verified members' read, history and posting permissions were
restored. Certified is not required to apply. Only this channel's permissions
changed in the correction; actual guild chats remain Certified/staff-only.
The maintained application template, topic and joining instructions now point
applicants to this channel and distinguish application from officer acceptance.
Applicants can choose a private Management DM if preferred.

Earlier operation receipts and snapshots are retained as the audit trail;
the old staff-only classification is superseded. No applicant history was
read, edited or deleted. Regression tests now require Verified applicants to
read and post while keeping guild conversations hidden from those applicants.

The repair preserves Certified access without requiring Verified on existing
guild members. Guild access is not granted by interest selection, an application
label, boosting interest or successful community verification. Staff remains a
separate audience. The legacy Booster menu option can no longer open the guild
channels even if its label is still selectable in MEE6.

Current maintained guidance:

- [Verification and community access](https://discord.com/channels/1411533815356194968/1412584845829345280/1566054314751959062)
- [Optional interests and guild membership](https://discord.com/channels/1411533815356194968/1411545206704308235/1566054349099114527)
- [Start here](https://discord.com/channels/1411533815356194968/1557974301095755900)
- [TBC guild application template](https://discord.com/channels/1411533815356194968/1411545946155909150/1558008796763258881)

Both new notices are pinned, suppress mentions and are protected by durable
creation receipts. A rerun verified the same message IDs without creating
duplicates. The original MEE6 messages were not edited by another bot. Its
dashboard verification target, old dropdown configuration and separate welcome
settings still need their own review. Changing Discord's system destination
does not rewrite MEE6 dashboard configuration or prove that a notification was
delivered to a member.

## Verification

- **72 access/readiness/community/guidance tests passed** on the server.
- Strict TypeScript checking passed for the changed source/test files and
  their imported dependencies, including the TBC correction.
- Live applying readback passed for all 22 protected areas / 33 role profiles,
  with separate checks for applicant access.
- A fresh preview returned no remaining permission changes. The two maintained
  notices were reread and remained pinned with the same IDs.
- Covered cases include parent and child leaks, mixed roles, accidental admin
  grants on ordinary roles, individual member exceptions, missing inventory,
  Certified/staff separation, readonly publishing, idempotent application,
  overwrite drift, moved destinations and uncertain writes.
- Native onboarding tests require the actual screening feature, preserve
  unrelated choices and refuse Verified/Certified through interest answers.

These checks do not complete MEE6's human challenge or constitute an ordinary
desktop/phone join. A real member should confirm the Verify result and check
that community access works while guild channels remain hidden without
Certified. No synthetic members or successful verification events were created
in the live server.

## Remaining native setup

Discord's supported API documents the native pending transition but has removed
the authoring API for Membership Screening. This setting needs an administrator
in the Discord UI:

1. Open **KFC → Server Settings → Safety Setup → DM and Spam Protection**.
2. Enable **Members must accept rules before they can talk or DM**, enter/review
   the server rules and save.
3. Leave the working MEE6 gate enabled during this check. Confirm in MEE6 that
   its current verification target is only `verified` and no self-service
   option grants Certified or staff access.
4. Tell the operator when native screening is enabled. It can independently
   read the guild feature and run the guarded onboarding cutover.

After this, verify whether the existing bot supports a reliable post-screening
Verified assignment. The current permission repair does not claim a new
automatic native role synchronizer. Keep one clear verification path; retire
the duplicate mandatory MEE6 check only after the replacement and its failure
recovery have passed a real-member test.

[Discord Membership Screening API status](https://docs.discord.com/developers/resources/guild#membership-screening-object),
[Rules Screening setup](https://support.discord.com/hc/en-us/articles/1500000466882-Rules-Screening-FAQ).

## Operations

Run from `/home/wow-forever-discord` on the existing server, using its existing
environment and dependencies:

```sh
# Read-only preview; saves exact before/after permissions privately.
node_modules/.bin/tsx scripts/kfc-access.ts

# Apply the saved scoped preview, rejecting drift and verifying live access.
node_modules/.bin/tsx scripts/kfc-access.ts --apply

# Preview or reconcile the two owned guidance notices and public welcome route.
node_modules/.bin/tsx scripts/kfc-access-notices.ts
node_modules/.bin/tsx scripts/kfc-access-notices.ts --apply

# Check the native prerequisite, then finish the nine-default setup when ready.
node_modules/.bin/tsx scripts/kfc-access-onboarding.ts
node_modules/.bin/tsx scripts/kfc-access-onboarding.ts --apply
```

The onboarding operator leaves Discord untouched while screening is disabled;
an applying invocation reports a blocked prerequisite. It creates at most one
neutral community raid lobby and preserves existing game choices, prompt IDs,
optional class choices and role assignments. Guild conversations are never used
to satisfy Discord's five public writable defaults.

Private runtime state is `.data/kfc-access/`, with its lock, reviewed preview,
per-notice creation receipts, final verification and fsynced operation journal.
Evidence and source/check logs are `.data/kfc-verified-access-20261031/`.
Credentials remain in the existing environment, outside artifacts.

The original applying snapshot is
`.data/kfcbot-audits/1411533815356194968-TFwH5A/`. Each write also records exact
before/after permission fields in the private journal. Any rollback must compare
current values with the recorded applied values and restore only reviewed
fields. Restoring the old Booster allows would reopen the original privacy
problem; do not restore an entire old category or community migration blindly.
An uncertain creation receipt is held for reconciliation, not automatically
retried. No history, roles or member signups are deleted during recovery.

No website build or PM2 restart was required: these were scoped bot/API
configuration operations with new operator modules and no new dependencies.
