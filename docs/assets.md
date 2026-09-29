# Visual Assets

## Owner-Supplied Discord Screenshots

Four channel-list screenshots were supplied and approved for website use on September 29, 2026. Inspected images contain channel names, not private messages or member lists. Originals were copied unchanged to `discord-welcome.png` (856 x 2064), `discord-classes-addons.png` (860 x 2172), `discord-faction-groups.png` (826 x 1992), and `discord-trading.png` (838 x 460) under `public/images`. Source captures were taken at 21:26:15, 21:26:31, 21:26:44 and 21:26:51 respectively.

The owner confirmed that Discord's report and appeal forums can be read by other members. Screenshot captions and nearby guidance must not imply that those forums are private. Website evidence remains protected separately. The editorial image catalog supplies intrinsic dimensions and descriptions; arbitrary remote and private-storage URLs cannot render as article images.

`group-post-form.png` (734 x 706) is a browser capture of the local website's empty group-submission fields on the same date. It contains no personal data, submitted event, anti-abuse token, or invented public activity. The group guide labels it as an empty form.

World of Warcraft names, logos, screenshots, and artwork remain the property of their respective rights holders. This is an unofficial fan community. Attribution is not a transfer of rights; review Blizzard's current fan-content requirements before advertising, merchandising, or granting others permission to reuse assets.

- `public/images/wow-forever-logo.png`: [Blizzard's official WoW Forever game-page logo](https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt527dd61848a757c7/6aa3316cad92093ee45628fd/camelot-logo-gamepage.png).
- `app/icon.png`: [Blizzard's official Forever icon](https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltb85c5fab7b152371/6aab0d1a2c058061d2274050/icon_512x512.png).
- `public/images/azeroth.webp`: Azeroth scenery screenshot, [source image hosted by PC Gamer](https://cdn.mos.cms.futurecdn.net/mwMGyipjp3dBpxoS69VvSE-1200-80.jpg).
- `public/images/pvp.webp`: Warcraft battle artwork, [source image hosted by Millenium](https://static1-us.millenium.gg/articles/6/46/26/%40/51756-battleground-amp_main_media_schema-1.jpg).
- `public/images/rp.webp`: Elwynn scenery, [source screenshot](https://gamer-guides.com/wp-content/uploads/2025/09/Elywnn-Forest-Scenery.png).
- `public/images/pve.webp` and `community.webp`: existing Warcraft art/game imagery reused from the owner's KFC project's recruitment and community assets. They carry no KFC logo and are not presented as screenshots of a new Forever raid.

The social share image combines the official game logo with the Forever masthead artwork and explicitly identifies an unofficial community Discord. Image assets are stored locally to avoid loading third-party tracking resources in visitors' browsers.

## Visual Redesign, September 2026

The following assets come from [Blizzard's WoW Forever game page](https://worldofwarcraft.blizzard.com/en-us/forever). The downloaded originals are retained only in local audit artifacts. Public copies are WebP-encoded at or below their original dimensions, not AI-upscaled. The mobile masthead is Blizzard's separately composed portrait artwork; the browser selects it through a responsive `picture`, without downloading both versions.

Next.js negotiates AVIF/WebP delivery. The mobile masthead uses quality 60; other images retain quality 75. This is a bounded quality allowlist, not an unrestricted image-encoding endpoint. The main scene and visible hero logo load eagerly; below-fold artwork remains lazy-loaded.

| Local asset                | Source                                                                                                                                                                                      | Public dimensions |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `forever-hero.webp`        | [Desktop masthead](https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt4d412035d16da095/6aa204fb2c0580bfcf273e54/masthead-art.jpg)                               | 2600 x 1725       |
| `forever-hero-mobile.webp` | [Mobile masthead](https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt09d4f876d494a584/6aa1ead14b66aa844291d284/masthead-bg-sm.jpg)                              | 960 x 1880        |
| `forever-stories.webp`     | [Explore Untold Stories](https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt4865ad3281f25cb8/6aa09df51deff31ac7439163/Explore_Untold_Stories.jpg)               | 1400 x 788        |
| `forever-adventure.webp`   | [Claim New Power](https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt2dc686732f526be5/6aa09db81deff3540b439161/Claim_New_Power.jpg)                             | 1400 x 788        |
| `forever-world.webp`       | [Soak in Breathtaking Expanses](https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt491397daad992c6d/6aa09e0ec751e10dc30c50e0/Soak_in_Breathtaking_Expanses.jpg) | 1800 x 1013       |
| `forever-mulgore.webp`     | [Mulgore preview](https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltf8ea7f909345c09b/6a985e23203da3e3fcf0e10e/Updates_Mulgore.jpg)                             | 1800 x 1012       |

These are official promotional images, not photographs of this Discord's members or proof of an organized community event. The site remains explicitly unofficial, with Blizzard ownership acknowledged in the footer. No embedded credits or marks were removed. [Blizzard's legal FAQ](https://www.blizzard.com/en-sg/legal/c1ae32ac-7ff9-4ac3-a03b-fc04b8697010/blizzard-legal-faq) and [trademark guidelines](https://www.blizzard.com/en-us/legal/38fd0408-8431-469a-99bc-2cd9eb9462c8/blizzard-entertainment-trademark-usage-guidelines) remain relevant; this asset inventory is not a legal clearance or permission to monetize or redistribute the art.

The old image paths remain available for existing/custom admin content and rollback. The one-time `npm run content:refresh-design` command updates only the four seeded guide covers still using their original default paths, and replaces only unchanged starter announcement/hero copy. Custom guide covers, admin copy, invitations, and membership settings are preserved. Running it again is a no-op.
