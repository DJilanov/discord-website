# WoW Forever Discord: Visual Redesign Blueprint

Date: 2026-09-29
Status: implemented and deployed on 2026-09-29. See [release evidence and remaining limits](design-release.md).

This document develops section 14 of [the project blueprint](../blueprint.md). It supersedes that section's draft visual direction, not the product, moderation, security, or infrastructure architecture.

The audit below describes the pre-redesign baseline. The implementation plan is retained as the design specification; the release report records what shipped and how it was verified.

## 1. Decision

Build a **cinematic Warcraft community homepage with useful community tools immediately within reach**. Give it the visual confidence of KFC without copying KFC's identity or presenting this project as a single guild.

The intended impression is: "This is a recognizable Warcraft community, somebody cares about it, and I can find people here."

The current site is readable and functional, but it feels like a collection of similarly styled components. The redesign needs a stronger composition, a coherent set of images, more deliberate typography, and evidence of actual community life. Adding effects to the existing layout would not solve that problem.

The largest visual investment belongs in the homepage, Discord overview, community pages, and guides. Guild finding, LFG, reporting, and administration must remain focused tools, not oversized promotional pages.

### Non-Negotiables

- Standalone WoW Forever Discord identity; prominent existing game logo and clear unofficial-community disclosure.
- Equal welcome for Alliance and Horde, and useful destinations for PvE, PvP, and RP.
- KFC's organizational background belongs on About, not in the masthead or as this Discord's membership count.
- Existing routes, editable invitations, permissions, moderation safeguards, and database boundaries remain intact.
- Website-first operation continues. The redesign does not require the deferred Discord application.
- No fabricated members, chat messages, events, endorsements, guild listings, or addon capabilities.
- No production Docker, Cloudflare requirement, backend rewrite, or new animation framework.
- Mobile gets its own composition and image crop, not a compressed desktop screenshot.

## 2. What The Audit Found

### Method And Limits

Compared the live KFC and Forever homepages in Chromium at 1440 x 1000 and 390 x 844, using screenshots and rendered layout measurements. Also inspected the Forever guild directory and a published guide at both sizes, plus the corresponding local components and styles.

The four additional directory/article page loads returned HTTP 200, with no horizontal overflow at those viewport sizes. This is a visual baseline, not a complete accessibility, performance, or browser-compatibility certification.

The text-fetch browser could not retrieve the two homepages; direct Playwright browser access succeeded. The comparison below comes from the rendered pages, not search snippets. Full-page captures of KFC can omit sections waiting for scroll-triggered reveals; this must not be mistaken for missing live content.

Local evidence is under `artifacts/design-audit/`, including:

- `kfc-desktop-first.png` and `kfc-mobile-first.png`.
- `forever-desktop-first.png` and `forever-mobile-first.png`.
- Both homepages' full-page and middle-section captures.
- `forever-guilds-desktop.png` and `forever-guilds-mobile.png`.
- `forever-guide-desktop.png` and `forever-guide-mobile.png`.

These are local audit artifacts, not public site assets.

### Comparison

| Area              | KFC reference                                                    | Current Forever site                                               | Design implication                                                            |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| First impression  | Large central identity over a recognizable portal scene          | Small left-aligned logo and heading over a broad landscape         | Establish one unmistakable focal point                                        |
| Display hierarchy | Desktop KFC title around 220px; section titles around 64px       | Visible desktop hero text 36px; most section titles 31px           | Increase selected display moments, not every heading                          |
| Fonts             | Cinzel and Inter, with monospace details                         | Already Cinzel and Inter                                           | Composition matters more than another font download                           |
| Hero              | Approximately one full desktop viewport                          | Approximately 560px on the audited desktop viewport                | Neither height alone is the answer; compose the content around the scene      |
| Image character   | Strong subject, silhouettes, foreground/background depth         | Low-resolution sunset panorama with little subject emphasis        | Acquire better source art before polishing overlays                           |
| Section rhythm    | Contrasting large editorial moments and actual guild content     | Repeated three-item grids and similar green-black bands            | Give different content different layouts                                      |
| Community proof   | Actual guild news and raid content                               | Mostly general promises; directory currently has zero listings     | Use real published material and honest launch states                          |
| Mobile            | Recognizable identity, but hero consumes nearly the whole screen | Clean layout, but very small labels and limited visual distinction | Keep clarity while adding stronger brand scale and a purposeful portrait crop |

The current homepage source is `app/(site)/page.tsx`. Presentation is mostly in `app/globals.css`, with shared patterns in `components/ui.tsx`, `components/site-nav.tsx`, and `components/guide-card.tsx`.

### Specific Weak Points

1. **The hero does not own the screen.** The empty part of the image has more visual area than the brand, but little interesting subject matter. Its source is only 1200 x 675. Increasing its rendered size would make the weakness more apparent.
2. **Almost every section has the same volume.** Three community cards, three utility links, three guide cards, and repetitive borders make the page predictable rather than memorable.
3. **The artwork is not one coherent collection.** The PvE portrait does not clearly communicate PvE gameplay, and repeating community images for guides reduces their editorial identity.
4. **The copy is pleasant but interchangeable.** Headings such as "A little help for the road ahead" could appear on many unrelated sites. Visitors should immediately recognize guilds, groups, guides, and the actual Discord.
5. **The proof strip mostly repeats the hero.** "All playstyles," "One community," and "Both factions" consume prime space without providing new evidence or useful destinations.
6. **Safety takes a large central position before the page has shown much community activity.** Keep the safeguards, but introduce the people and useful resources first.
7. **Small text undermines polish.** Some mobile labels and brand subtitles reach single-digit font sizes. A premium appearance must not depend on unreadable fine print.
8. **The CSS has accumulated overrides.** Later hero rules supersede earlier rules, so editing an apparent heading size can have no visible effect. Consolidate only the styles touched by the redesign.

### What To Borrow From KFC

Borrow its sense of scale, recognizable game imagery, deliberate spacing, restrained gold details, and contrast between dramatic and practical sections.

Do not copy its logo, statistics, dark portal as the new brand's main scene, full-screen hero on every device, sound control, heavily darkened imagery, viewport-scaled typography, or content that starts invisible pending JavaScript. The new project represents multiple guilds and communities.

## 3. Art Direction

### Recommended Direction: A Living Azeroth

A recognizable Warcraft vista with actual visual depth, a prominent Forever mark, strong editorial headings, neutral charcoal reading surfaces, and a small amount of gold. Alliance blue, Horde red, and the natural colors in the artwork provide variation without recoloring the entire interface.

Use the game world to communicate adventure and the content to communicate community. Avoid a hostile or punitive identity built around player reports.

### The First Viewport

The preferred composition is a **centered identity over one full-bleed scene**, provided the chosen scene has a quiet central area for the logo and text. Foreground architecture or characters should frame it rather than sit behind the wording. The world must remain visible and recognizable, not blurred into a texture.

If the strongest usable asset has its subject in the center, use a left-aligned identity with the subject clearly visible on the right. This is a fallback crop of one full-bleed scene, not a split layout with a boxed illustration.

The primary scene should depict the world or a gathering of players, not a single-faction victory image or an unrelated expansion boss. Do not imply an older Warcraft screenshot is a verified Forever gameplay capture.

### Visual System

These are proposed starting tokens, subject to contrast checks on real surfaces:

| Role              | Starting value | Use                                            |
| ----------------- | -------------- | ---------------------------------------------- |
| Main background   | `#0C0D10`      | Neutral charcoal, not a green or brown wash    |
| Alternate surface | `#15171C`      | Reading areas and individual repeated items    |
| Raised surface    | `#1E2228`      | Menus, form controls, genuine framed tools     |
| Primary text      | `#F1F2F4`      | Clear off-white, not a cream-dominated palette |
| Secondary text    | `#B7BDC7`      | Supporting copy and metadata                   |
| Gold              | `#E0B95B`      | Primary actions and selected editorial details |
| Alliance accent   | `#76B8F5`      | Faction-specific details with explicit labels  |
| Horde accent      | `#E58680`      | Faction-specific details with explicit labels  |
| Success accent    | `#8BC6A4`      | Actual status, not general decoration          |

- Keep Cinzel for selected display headings and Inter for reading, navigation, forms, and data.
- Use fixed rem-based type steps at explicit breakpoints; no viewport-width font scaling. Letter spacing stays zero.
- Initial hero type range: 48-56px desktop, 30-36px mobile, with smaller explicit short-viewport variants if needed.
- Major homepage headings: 40-48px desktop and 28-32px mobile. Tool-page headings: 28-36px desktop and 24-28px mobile.
- Body copy: 16px. Long guide copy: 17-18px desktop, at least 16px mobile. Metadata: normally 13-14px, not 8-10px.
- Use sentence case for UI and most labels. Reserve the distinctive serif treatment for hierarchy, not every line of a listing.
- Keep content around 1200-1280px wide, with 20-24px mobile gutters. Article text should have a narrower 65-75-character reading measure.
- Use spacing steps of 4, 8, 12, 16, 24, 32, 48, 64, and 96px. Desktop and mobile section spacing need separate values.
- Page sections are unframed layouts or full-width bands. Do not turn every section into a floating card or place cards inside cards.
- Use 4-6px radii for individual cards and controls, never more than 8px without a functional reason.
- Keep ornament sparse: a fine rule, a small divider, or a subtle raster material texture where it contributes. No particles, orbs, bokeh, glitter, or decorative charts.
- Continue using Lucide icons. Unfamiliar icon-only controls need accessible names and tooltips; main conversion actions retain clear text.

## 4. Homepage Composition

### Desktop Sequence

```text
Compact navigation: brand | Community | Guilds | Groups | Guides | Join Discord

Full-bleed Warcraft scene
                WoW Forever logo
                Community Discord
       Clear invitation for both factions and all three playstyles
              Join Discord       Find a guild

PvE / PvP / RP destination headers visibly beginning below the hero

Three media-led community destinations with distinct subjects

Useful now: published guild recruitment / LFG / latest resources

Guides: one featured story + two compact supporting stories

Compact trust section: moderation standards, reports, appeals

Short FAQ

Second, restrained full-width image band + Join Discord
Footer: community links, policies, unofficial disclosure, About
```

Navigation labels in the sketch are conceptual. Preserve direct access to Addons and Safety through a compact community/resources menu or the existing navigation if it still fits. Do not bury reporting behind an unclear icon.

### 4.1 Navigation And Announcement

- Use a readable logo lockup. Replace the miniature brand subtitle with text that remains legible on a phone.
- Target a 64-72px desktop header and approximately 64px on mobile.
- Keep Join Discord visible. Mobile also gets an accessible menu button with a minimum 44px target.
- Remove the permanent generic announcement from the normal composition. Display this band only for a concrete, current announcement with a useful destination, using the existing admin setting.
- Avoid stacking a sticky announcement, sticky header, and sticky mobile bottom bar. Start with only the existing header behavior and review whether more is actually needed.

### 4.2 Hero

- Make the official Forever logo substantially more prominent while retaining natural aspect ratio. Prototype around 280-340px wide on desktop and 170-210px on normal-height phones; shorter screens require a smaller mark.
- Keep a single semantic H1 that reads "WoW Forever Community Discord." The existing logo-plus-text pattern can provide this if its accessible name is correct. No hidden keyword blocks or duplicate headings for different breakpoints.
- Supporting copy should be direct: "Find guilds, groups, and other WoW Forever players. PvE, PvP, and RP. Alliance and Horde."
- Show a short, readable unofficial-community label. Do not imply Blizzard endorsement through the logo treatment.
- Use one dominant Join Discord action and one secondary Find a guild link. Route joining through the existing `/join` handler so admin settings and tracking still work.
- Keep the scene full-bleed. No glass rectangle behind the entire content block. Use a localized contrast scrim only where text needs it, retaining the actual scene's color elsewhere.
- Do not add a carousel, countdown unless confirmed and needed, autoplay soundtrack, mandatory video, or introduction sequence.
- Target roughly 70-80% of the available viewport on common tall screens, but calculate the composition around actual content and header height. Always leave a meaningful glimpse of the next section at default text size, including wide desktops.
- On short screens, reduce spacing and logo size, shorten the copy, and move repeated coverage metadata into the next section. Never clip content or shrink controls to force the layout to fit.
- At enlarged text/zoom, readable natural document flow takes precedence over keeping the entire hero and next-section hint on screen.

### 4.3 PvE, PvP, And RP Destinations

Replace the current generic cards with three art-led linked destinations. These are legitimate repeated items, not three boxed mini landing pages.

| Destination | Image brief                                                            | Content                                  |
| ----------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| PvE         | Recognizable party or dungeon/raid scene                               | Dungeons, raids, and guild recruitment   |
| PvP         | Clearly readable battleground or player-versus-player scene            | Premades and PvP communities             |
| RP          | Characters gathering in a town, tavern, or recognizable social setting | Roleplay guilds and community gatherings |

Use the same image treatment and aspect ratio across these three items, with different subjects. Put readable titles and one line of supporting text at the image edge or directly below it. A real link must remain apparent without hover.

Desktop uses three columns. Mobile stacks all three with shallower image crops so visitors can compare them without navigating an auto-scrolling carousel. Preserve the existing `/servers/...` destinations, making clear these pages organize communities rather than assert unannounced Blizzard realm details.

Alliance and Horde receive equal visual weight through labeled accents or small sourced faction marks. Do not impose a faction-selection screen before the user can browse.

### 4.4 Useful Community Content

Remove the existing pseudo-statistics band. Replace repeated promises with content people can act on.

Use the existing guild, LFG, and guide data. Public content must pass the same publication, moderation, and expiry rules as its directory page; do not create a looser homepage query.

- With published listings: show a compact selection of real guilds or active groups, their real region/faction/activity, and a clear browse link.
- Without listings: show a concise invitation to submit a guild or group and lead with the actual published resources. Do not fill empty space with sample listings or a large "0 members" counter.
- With only one item: use one full-width editorial row, not a three-column layout with empty slots.
- Member count appears only when it represents this Discord, is supplied from a trusted source, and is current enough to be meaningful. No KFC roster import and no unexplained "online now" number.
- Do not add a Discord chat embed containing invented messages. A real channel preview is optional later, after reviewing what is actually configured and safe to expose.
- Events and automated live Discord activity are separate future features; the redesign must not invent an event subsystem to make the homepage look busy.

### 4.5 Guides

Use one featured published guide with a larger image and two compact supporting entries. The text remains outside decorative frames, and each image reflects its actual article subject.

Replace "A little help for the road ahead" with a literal title such as "WoW Forever guides." Display meaningful category, author, and update information already present in the content model.

When fewer than three guides are published, adapt the layout to the actual number. On mobile, put the lead story first and use compact supporting entries beneath it.

### 4.6 Trust And Safety

Retain the existing report, review, appeal, and transparency destinations. Use a smaller, confident section after the community content, with three factual principles: private reporting, evidence review, and the right to appeal.

No public accusation ticker, named offender hero, guaranteed-protection claim, or implication that the addon is already released. This is a community with safeguards, not a blacklist service as its primary identity.

### 4.7 FAQ And Closing Invitation

Keep four or five high-intent questions: unofficial status, factions/playstyles, joining without changing guild, regional coverage, and reporting concerns. Answers should be visible to crawlers and accessible with keyboard and touch.

Close with a second full-width scene cropped differently from the hero and a simple Join Discord action. Keep it shallower than the hero. It is a final invitation, not another full-screen introduction.

## 5. Carry The Design Through The Site

| Surface                         | Planned treatment                                                                                                               | Functional constraint                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `/discord`                      | Strong brand heading, relevant scene, concise overview of the actual community spaces, clear invitation                         | No fictional channel activity, unnecessary OAuth, or bot dependency                        |
| PvE/PvP/RP and region pages     | Compact subject-specific masthead, useful links, factual coverage, related resources                                            | Do not duplicate the full homepage or invent realm availability                            |
| `/guild-recruitment` and `/lfg` | Compact heading, readable filter toolbar, disciplined result rows, clear empty states                                           | Search, filters, pagination, and submission remain the first-class experience              |
| Guild detail                    | Identity/banner where supplied, clear recruitment information, schedule and contact hierarchy                                   | No decorative statistics, endorsements, or fields without real data                        |
| Guide index                     | Editorial lead plus organized list; distinct useful cover images                                                                | Preserve real publication ordering and all available guides                                |
| Guide detail                    | Clear title and byline, relevant cover, comfortable reading measure, heading-based contents navigation where length warrants it | Derive contents from the same Markdown structure; no regex-only parser or invented anchors |
| Addons                          | Actual product state, genuine screenshots when available, readable compatibility and release information                        | Keep unreleased downloads unavailable and test-state labels accurate                       |
| Reports, appeals, case status   | Quiet form layout, clear progress/error/success/permission states                                                               | No decorative motion around sensitive actions; preserve proof-of-work and validation       |
| `/admin`                        | Shared readable colors, typography, controls, and spacing only                                                                  | Keep dense operational tables and all existing authorization boundaries                    |
| About and policies              | Readable editorial layout and transparent organization information                                                              | Preserve standalone identity and appropriate KFC disclosure                                |

The live guild directory currently spends substantial vertical space on its heading and empty state. Reduce those areas so filters and useful next actions are visible sooner. Avoid compensating for an empty directory with a large fantasy illustration.

For mobile articles, improve text size before adding ornaments. Related guides should follow the article naturally, and a contents menu must not cover the reading area or trap focus.

## 6. Asset Work Before Layout Polish

The redesign should not proceed with a larger version of the current 1200px sunset as its final hero. Use a genuinely stronger source, not interpolation presented as new detail.

| Asset             | Acquisition / production brief                                                                                                                 | Initial delivery target                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Main scene        | High-resolution official promotional art or an owner-provided game capture with suitable usage rights; recognizable subject and negative space | 2560px or larger source, responsive AVIF/WebP variants   |
| Mobile hero       | Purposeful portrait crop of the scene; a separate approved capture if the wide scene cannot crop well                                          | Approximately 900-1200px portrait source                 |
| Logo              | Reuse the existing official Forever logo without redrawing it                                                                                  | Optimized existing raster asset with explicit dimensions |
| PvE/PvP/RP        | Three coherent, relevant images; no duplicate hero crops                                                                                       | Approximately 1200px source per image                    |
| Guide covers      | Match each published article, not a random category image                                                                                      | Responsive covers with stable aspect ratios              |
| Closing scene     | Complementary world/community view, visibly distinct from the hero                                                                             | Around 1600px source                                     |
| Social share      | Matching landscape composition with readable Forever/community identity and unofficial status                                                  | 1200 x 630 raster composition, checked at feed size      |
| Addon screenshots | Genuine captures of available, tested behavior                                                                                                 | Deferred until such captures exist                       |

Record origin and usage notes in [assets.md](assets.md). The fact an image appears on a publisher's site does not itself establish permission to reuse it. Check the applicable terms before adding new assets; do not remove watermarks or assume attribution grants rights.

Prefer coherent official or owner-supplied imagery over unrelated third-party article thumbnails. Generated concept art, if used later, must remain identifiable as illustration, never as evidence of actual Forever gameplay or real community attendance. Do not regenerate the game logo.

For every candidate hero, inspect the actual desktop and phone crop with the real logo, copy, and buttons overlaid. Reject assets that only work when heavily blurred, nearly blacked out, or cropped away from their subject.

## 7. Motion And Interaction

Motion supports hierarchy; it is not the source of the visual identity.

- Start with a complete static design. It must look finished with JavaScript unavailable or reduced motion enabled.
- Use short 150-220ms hover/focus transitions for controls and image emphasis. Keep box dimensions stable.
- Optional section entrances should be restrained, around 300-450ms, and cannot leave server-rendered text invisible when JavaScript fails.
- If parallax materially improves the chosen scene, limit it to a small background shift on fine-pointer desktop devices. No React state update on every scroll event, no moving text, and no mobile requirement.
- Avoid looping image zoom, cursor effects, scroll hijacking, particles, decorative WebGL, bouncing CTA buttons, and long stagger sequences.
- Do not add video to the first implementation. Consider it only after the still composition is strong and there is a genuine clip worth showing. It must not be required for the initial render or introduce audio.
- Honor `prefers-reduced-motion`, keyboard focus, touch behavior, and page visibility. Do not rely on hover to reveal a title, destination, or required action.
- Reuse native CSS and existing React boundaries. Add a small client component only for an interaction that cannot stay server-rendered.

## 8. Mobile And Accessibility Requirements

### Mobile Composition

- At 390 x 844, show the identity, readable invitation, Join action, and a meaningful beginning of the next section.
- At 390 x 667 and 320px widths, use explicit compact spacing/logo variants. Keep buttons at usable sizes and let long text wrap.
- Preserve a usable mobile header even when the menu is open. Menu state, focus handling, Escape, and returning focus to its trigger must work.
- Do not add a fixed bottom CTA in the first pass. It can obscure forms, browser controls, or reading content and would duplicate an already visible Join action.
- Never use horizontal scrolling to conceal an overflowing layout. Horizontal scroll is acceptable only for a genuinely wide data table with a labeled, keyboard-accessible container.
- Search and filters need visible labels. Use menus/selects for multi-option filters and proper segmented controls only where a small mutually exclusive set warrants them.
- Keep all three playstyle destinations available without a swipe-only interaction.

### Accessibility Gates

- Check actual foreground/background combinations, including text over every hero crop. Target WCAG AA contrast; color cannot be the only faction or status cue.
- Use at least 44 x 44px targets for primary touch controls as this project's ergonomic target.
- Maintain one page H1, logical heading order, landmarks, a working skip link, and visible focus states.
- Give meaningful images specific alt text; repeated decorative art can have empty alt text. Avoid generic "a scene from World of Warcraft" for every article cover.
- Test text enlargement to 200%, zoom/reflow, reduced motion, keyboard-only use, and the no-JavaScript reading/navigation experience.
- Keep loading, empty, unavailable invitation, error, success, and permission-limited states designed and legible.
- Do not put essential text inside a bitmap or shrink words below the readable type scale to accommodate a layout.

## 9. Performance, Discovery, And Conversion

### Performance Budget

Targets for real users are LCP at or below 2.5 seconds, INP at or below 200ms, and CLS at or below 0.1, evaluated at the 75th percentile separately for mobile and desktop. These are targets, not current measurements. Lighthouse alone cannot establish field INP. See [Google's Web Vitals guidance](https://web.dev/articles/vitals).

Initial project-specific asset budgets:

- Main hero delivery: aim below 300KB on mobile and 500KB on desktop, then judge the actual visual quality and LCP.
- Keep the initial visible image payload around 650KB or less on the tested phone profile, including logo and any next-section media actually needed.
- Lazy-load below-fold artwork and set explicit aspect ratios to avoid layout shift.
- Preload only assets needed for the initial viewport. Do not preload the entire image collection or download both hero crops unnecessarily.
- Use accurate responsive image sizes, retain the existing font-loading approach, and avoid an additional display-font family.
- No animation package, background video, or third-party Discord widget in the critical path.
- Compare a production build before and after under the same mobile throttling profile. Record transfer size, LCP, CLS, and long tasks; do not claim a field result from one local run.

### Discovery Guardrails

Keep server-rendered meaningful content, current canonical paths, crawlable links, published guide metadata, sitemap behavior, and truthful structured data. Update the social image to match the new identity without weakening title/description usefulness.

A more attractive design is expected to improve perceived credibility and may improve participation, but that is a hypothesis to measure. Visual effects are not a ranking strategy or a guarantee of first-page placement. Google explicitly distinguishes helpful page experience from guaranteed ranking success; relevant content still matters. See [Google's page-experience guidance](https://developers.google.com/search/docs/appearance/page-experience).

For search and assistant discovery, the design should make the actual community identity, participation routes, original guides, and organization information easy to read and link to. No invisible SEO text, simulated testimonials, or invented structured-data claims. This redesign does not promise Google or ChatGPT recommendations.

### Measure The Outcome Honestly

- Preserve existing privacy-aware `page_view` and `discord_click` tracking through `/join`; retain Do Not Track and Global Privacy Control behavior.
- Compare homepage-to-Discord click-through before and after, segmented by mobile/desktop and traffic source where available.
- Review guide entry pages and directory browsing as secondary paths, not just the homepage.
- A Discord click is an outbound click, not a confirmed server join or retained member. Membership attribution remains limited while the Discord application is deferred.
- Review real guild/group submissions as a product outcome. Add new analytics events only when a specific question cannot be answered with existing data, and preserve privacy protections.
- With little traffic, use qualitative feedback and measured usability rather than claiming statistically significant A/B results.

## 10. Implementation Plan

### Phase 1: Art And First-Viewport Prototype

Deliver one recommended composition using actual candidate art, plus its mobile version. Prototype the navigation, hero, and beginning of the community destinations before rebuilding every section.

Acceptance: the Forever identity is unmistakable; the scene stays recognizable; the invitation is clear; both factions are welcome; the main action is immediately available; the next section is visible. The short-phone version must pass too.

Do not approve a static desktop mockup as sufficient evidence. Review rendered desktop and mobile screenshots with real production-length copy.

### Phase 2: Homepage And Shared Foundation

Implement the chosen asset set, scoped public-site tokens, navigation refinements, homepage section hierarchy, and content-aware empty states. Consolidate superseded hero rules instead of adding another override block at the end of the stylesheet.

Use server-rendered content and existing helpers. Keep JoinButton, settings, current directory visibility rules, and existing guide queries as the foundation. Extract a component only when the new composition genuinely benefits from it.

Acceptance: the entire static homepage feels coherent before optional motion is added. It must work with zero, one, and several published items.

### Phase 3: Interior Pages And Social Presentation

Apply the same art direction to Discord/community pages and guides, then improve directory typography and density. Update the shared social image. Review operational forms and admin for unintended global-style regressions rather than giving them cinematic layouts.

Acceptance: navigation into a guide, guild listing, group, or form still feels like the same site; task completion remains straightforward.

### Phase 4: Restrained Motion And Verification

Add only interactions that improve the approved static design. Run the viewport, accessibility, performance, and functional checks below. Fix defects and re-capture affected screens.

Acceptance: no regression in invitation editing, joining, public content filtering, forms, permission boundaries, or metadata. Reduced-motion and static views remain complete.

### Phase 5: Controlled Release

Only after implementation and verification, use the existing PM2/Nginx deployment workflow and preserve the previous build for rollback. Verify canonical redirects, public routes, metadata, responsive images, and `/join` against the live domain. KFC and other server applications remain untouched.

The redesign was deployed using the existing workflow without a schema migration. See [the release report](design-release.md) for the active output directory and rollback notes.

### Expected File Touchpoints

| File / area                                        | Planned change                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `app/(site)/page.tsx`                              | Hero composition, section order, real-content selection and empty states                     |
| `app/globals.css`                                  | Scoped public design tokens, type/spacing scale, consolidated hero rules, responsive layouts |
| `components/site-nav.tsx`, `components/footer.tsx` | Readable identity and consistent navigation treatments                                       |
| `components/ui.tsx`                                | Shared headings/buttons and states without forcing homepage scale onto tools                 |
| `components/guide-card.tsx`                        | Editorial variants where actually used                                                       |
| `components/directory.tsx`                         | Filter/result readability and responsive density                                             |
| `components/markdown.tsx`                          | Only if heading navigation is implemented; use the existing Markdown pipeline                |
| `content/community.ts`, `content/pages.ts`         | More literal labels and image mapping; preserve factual coverage                             |
| Discord, guide, and community route files          | Page-appropriate visual hierarchy                                                            |
| `public/images/`, social-image implementation      | Approved assets, responsive variants, consistent share composition                           |
| `docs/assets.md`, relevant tests                   | Provenance and behavior/visual regression coverage                                           |

No initial schema, authentication, reporting-policy, Discord-bot, or infrastructure change is needed. Read the packaged Next.js documentation before changing image-loading or other version-specific APIs.

## 11. Feedback Loop And Release Gates

### Review Loop

1. Capture the existing baseline and identify the specific weaknesses. **Completed.**
2. Produce the new hero and first-scroll prototype with actual artwork. **Completed.**
3. Compare desktop, mobile, and short-height screenshots with the baseline. Check identity, composition, legibility, action clarity, and the next-section hint. **Completed.**
4. Correct the largest visual weakness before extending the design. **Completed.**
5. Complete the homepage and representative inner pages, then repeat screenshot and interaction review. **Completed.**
6. Run functional, accessibility, responsive, and production-build checks; fix failures and retest the affected flows. **Completed within the documented browser/lab scope.**
7. Deploy the verified implementation and inspect the live result. **Completed.** Conversion monitoring remains ongoing and must not confuse clicks with membership.

Use concrete defects rather than an arbitrary "10/10" design score. Passing technical checks is necessary but does not establish that the composition looks good; explicit visual review is required too.

### Viewport Matrix

| Profile         | Size        | Main concern                                              |
| --------------- | ----------- | --------------------------------------------------------- |
| Narrow phone    | 320 x 740   | Long words, button fit, no overflow                       |
| Short phone     | 390 x 667   | Hero content and next-section visibility                  |
| Typical phone   | 390 x 844   | Portrait crop and touch navigation                        |
| Larger phone    | 430 x 932   | Card rhythm and reading comfort                           |
| Tablet portrait | 768 x 1024  | Navigation breakpoint and grid changes                    |
| Short laptop    | 1366 x 768  | Hero sizing without hiding the next section               |
| Desktop         | 1440 x 1000 | Composition, readable content width, section rhythm       |
| Wide desktop    | 1920 x 1080 | Sharp art, no empty oversized hero, sensible line lengths |
| Phone landscape | 844 x 390   | Natural scrolling and no fixed-height clipping            |

At each relevant size, inspect the first viewport, first scroll, page ending, open navigation, a guide, a directory with/without results, and a form with errors. Never seed fake production data for these checks; use isolated test fixtures.

### Definition Of Done

- No text overlaps, missing artwork, unintended horizontal overflow, clipped buttons, or hover-induced layout movement.
- Forever is recognizable immediately, and the site cannot be mistaken for a KFC guild recruitment page or an official Blizzard service.
- Hero, community destinations, editorial content, and tools have distinct but coherent hierarchy.
- The main artwork is sharp enough and composed correctly at every tested crop; visual review confirms more than merely successful image requests.
- Navigation, invitation fallback/unavailable state, filters, pagination, submissions, and existing admin controls work.
- Sensitive workflows retain their existing authorization, anti-abuse, validation, and moderation behavior.
- Keyboard, reduced motion, contrast, enlarged text, and no-JavaScript content/navigation checks pass for the relevant surfaces.
- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build` after implementation. Run `npm run verify:public` against the intended environment. Run addon tests if addon-related code is touched.
- Extend existing Playwright coverage for hero/action visibility, menu behavior, overflow, real image decoding, and important new empty-state branches. Use screenshots for art direction, not just DOM assertions.
- Check Chromium and a second browser engine before release where available; explicitly report any browser/device testing that could not be performed.
- Compare repeatable production-build performance measurements, and disclose any remaining field-data gap.
- Preserve canonical URLs, sitemap eligibility, metadata, semantic heading structure, and the editable Discord invitation.

## 12. Original Starting Point

The implementation started with **the artwork, hero, navigation, and first community section**. Those determined the site's visual identity. Desktop, normal-phone, and short-phone screenshots were reviewed before extending the design to the remaining pages.

This is an art-direction and frontend refinement project, not a platform rebuild. Its success should be visible in the first few seconds, and its usefulness should remain obvious after the visual impression has worn off.
