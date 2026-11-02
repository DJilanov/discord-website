# KFC class guide discussion release

Published on 31 October 2026 at 16:56 UTC in **KFC only**. The nine existing class pins and class index now prioritize our original level-60 guides and simulators instead of the old level-30 Wowhead pointers. Existing human messages and channel permissions were preserved.

[Class guide index](https://discord.com/channels/1411533815356194968/1411616667879997530/1557974393433489429) | [KFC Forever discussion heads-up](https://discord.com/channels/1411533815356194968/1548519535177629707/1566133795189432542)

## Member experience

Each class has a class-colored embed with its icon, talent calculator, role-specific simulator links, an actionable comparison and a class-specific conversation starter. The three buttons open the DPS guide, class simulator selector and discussion thread. Paladin, Mage and Druid also link the relevant existing starter guides.

The class-guide channels remain reference shelves. Ordinary members already cannot reply there, so the public discussion threads live under KFC's existing Forever discussion channel. No role or permission changes were necessary.

| Class | Discussion |
| --- | --- |
| Warrior | [Level 60 builds and gear](https://discord.com/channels/1411533815356194968/1566133618588524654) |
| Paladin | [Level 60 builds and gear](https://discord.com/channels/1411533815356194968/1566133648200302703) |
| Hunter | [Level 60 builds and gear](https://discord.com/channels/1411533815356194968/1566133664650367066) |
| Rogue | [Level 60 builds and gear](https://discord.com/channels/1411533815356194968/1566133680051855602) |
| Priest | [Level 60 builds and gear](https://discord.com/channels/1411533815356194968/1566133699144187935) |
| Mage | [Level 60 builds and gear](https://discord.com/channels/1411533815356194968/1566133716432982026) |
| Warlock | [Level 60 builds and gear](https://discord.com/channels/1411533815356194968/1566133737454833847) |
| Druid | [Level 60 builds and gear](https://discord.com/channels/1411533815356194968/1566133759454093362) |
| Shaman | [Level 60 builds and gear](https://discord.com/channels/1411533815356194968/1566133773471449210) |

There is one honest bot-authored starter in each thread and one untagged heads-up in the parent chat. No invented member conversations, user impersonation, mass pings, DMs, crossposts or recurring messages were added. Attribution is **Open source contributors**.

## Content boundaries

- The class guides expose saved talents, action priorities, equipment and benchmark assumptions. Historical reference dates are retained; newer simulator engines may not replay an older reference exactly.
- There are no fixed DPS/HPS figures in the Discord posts. Readers can inspect the current comparison and its model version.
- Tanking and actual healing engines are linked separately from damage profiles. All four healing classes have live healing tools; a Holy damage profile is not presented as healing evidence.
- Hunter's recorded Survival example is identified as melee. Pet, positioning, mana and complete equipment packages remain part of the comparisons.
- Solo, raid, tank and healer results have different assumptions. No universal BiS, live-log guarantee or raid-slot gate is claimed.
- This is Forever coverage. TBC builds and mechanics remain in the TBC areas.

The KFC discussion channel participates in the existing shared-chat bridge, but both its policy and worker reject bot/webhook messages (`lib/discord-bridge/policy.ts`, `workers/discord-bridge/src/main.ts`). This release makes no writes to the separate WoW Forever community server.

## Publisher and recovery

The scoped source files are `content/kfc-class-labs.ts`, `lib/kfc-class-labs.ts`, `scripts/kfc-class-labs.ts` and `tests/kfc-class-labs.test.ts`. The older broad community/channel migration must not be rerun to publish these resources.

The publisher defaults to a GET-only Discord preview. `--apply` is the explicit write mode. It checks the bot identity, exact KFC destinations, ownership and pinned state, public discussion access, payload limits and every public resource URL. It edits only the existing bot guides and their channel topics, creates the nine public threads and posts their starters plus one announcement.

Runtime and private recovery files are under `/home/wow-forever-discord/.data/kfc-class-labs-20261031/`. `state.json` records exact IDs and the original bot resources/channel overwrites; JSONL journals record completed operations. The isolated `runtime/` uses the existing installed dependencies. No website source, production process, database or environment file was changed. The existing bot credential was loaded into the child process environment in memory.

An exclusive operator lock covers state reading through final verification. Known thread/message IDs are reused; new messages also use Discord's bounded nonce deduplication. A pending or uncertain create stops for inspection rather than blindly retrying. A completed guide changed outside this release stops a rerun rather than overwriting it. Never delete the recovery state merely to retry publication.

Threads use a 1,440-minute inactivity archive setting and remain linked from the class pins. A rerun stops on a locked/archived or otherwise unexpected thread; inspect its state instead of replacing it. [Discord thread creation documentation](https://docs.discord.com/developers/resources/channel#start-thread-without-message), [message creation and editing documentation](https://docs.discord.com/developers/resources/message).

## Verification

- 14 focused tests passed: coverage, role distinctions, payload limits, URL allowlist, mention suppression, ownership, normalized readbacks, permission fingerprints, thread destination and scoped transport.
- Strict targeted TypeScript check passed for all four new TypeScript files.
- Targeted ESLint passed with zero warnings. The isolated CLI-only source copy emits the existing Next rule's informational missing-pages-directory message; no app routes are involved.
- All 65 public guide, simulator, calculator, ranking and class-image URLs returned HTTP 200 with the expected content type.
- Publication read back all ten pins, verified their intended presentation and preserved pinned state, and confirmed the original overwrite fingerprints for all ten resource channels and the discussion parent.
- An independent GET-only check compared all eleven channels to the saved pre-publication overwrite fingerprints; all matched.
- The second `--apply` completed at 16:59 UTC with the same thread/message IDs. Its journal contains only `begin` and `complete`: zero additional guide/topic edits, message posts or thread creates.

Native Discord desktop/mobile rendering is not screenshot-verified; validation uses Discord's live API responses, embed/component limits and actual resource endpoints.
