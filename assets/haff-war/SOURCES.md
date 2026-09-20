# Haff Currency War Prototype Assets

## Bond Mastery (2026-09-11)

These are original fan-game mechanics. The existing six memberships and two/three-operator thresholds are retained: two distinct deployed operators activate a bond, three unlock its final mastery. Bench copies do not count; fallen deployed members still count, as before.

| Bond | Two-member improvement | Three-member mastery |
| --- | --- | --- |
| Smoke | Extend smoke by one round and grant front units 10%-max-HP shields | Extend by two, grant 15% shields, arm every living front unit's next basic attack with one 100%-attack follow-up; one stored shot per unit |
| Demolition | 50%-attack extra explosion, including against a sole boss | 100%-attack explosion against all enemies; if the triggering action kills an enemy, one additional 100%-attack wave, never an unbounded chain |
| Flash | One extra blinded target; mark affected blinded targets for two rounds | Blind/mark every enemy and let the highest-attack eligible other member fire a 120%-attack follow-up; rear members remain automatic |
| Defense | 60 shield to the first front unit | 30%-max-HP shields to the entire front; every front unit can retaliate for 80% attack after personal shields absorb a direct enemy action, once per defender per round |
| Healing | 45 healing and 15 base energy to the weakest front unit | Heal living front units for 20% max HP, restore 20 base energy to the team, and revive one fallen front unit at 50% HP once per battle when healing is triggered; this is not a fatal-hit prevention effect |
| DOT | Two shock ticks plus an immediate 25-base-damage tick | Apply three shock ticks to every enemy, then detonate all remaining burn, bleed, shock, cold-field and wire-field damage without consuming durations or allowing critical hits |

Each bond's skill activation remains once per round. Armed shots, per-defender retaliation counters and the single revival persist in validated battle checkpoints. Reactions deal damage only and never grant controllable rear turns or retrigger ordinary action/skill hooks. Energy benefits include needle-progress conversion for Stinger, rather than requiring him in a team. Existing armor, damage/healing modifiers, shield caps and actual damage/healing attribution continue to apply; DOT detonations credit the original effect owners. Healing events now identify their source so a Tempest anchor recovery can activate healing relay even during an enemy turn.

The existing icon-only sidebar is retained. Mastered bonds get a stronger outline and updated hover descriptions; named mastery feedback appears in battle. Focused checks cover all six masteries, bounded reactions, last-target explosions, rear follow-ups and checkpoint persistence.

## Supreme Collectibles (2026-09-11)

The catalog now has 19 collectibles. Heart of Africa keeps the stable `heart` save key; Ocean's Tears uses `ocean`. Both are red, 1x1 items. Ocean artwork is the unchanged original CDN asset at https://playerhub.df.qq.com/playerhub/60004/object/15080050142.png, located through https://cai-hong-tu-blog.pages.dev/sjzdh/. Only that page's image identification is used, not its fictional abilities. The footprint is cross-checked against https://github.com/yangtaoytt/DropDeltaServer/blob/master/public.sql. Image provenance and SHA-256 are recorded in `relics/SOURCES.json`.

All following combat effects and sale prices are fan-game rules, not official item abilities or live market quotations:

- Heart: +300 HP, +100 attack, +25 speed; guaranteed direct critical hits at 300% base multiplier, plus existing link critical-damage upgrades. Its first completed attack, skill or off-axis station support each round adds a 200%-attack critical explosion against every enemy. Assists, DOT and extra damage cannot retrigger the explosion. Base sale price: 13,141,314 Haff coins.
- Ocean: +500 HP, +60 attack, +100% charge efficiency; guaranteed direct critical hits at 250% base multiplier, plus link upgrades. When incoming damage reduces a front ally to 25% HP or less, a living wearer (including the wearer taking a fatal hit) restores/revives the entire deployed team to full HP, clears harmful effects and regular cooldowns, fills energy/needles and shields to the normal 50%-max-HP cap, then deals a 300%-attack critical tidal blast to every enemy. One rescue per wearer per battle; works from either row and before a last-front death can end combat. Base sale price: 22,222,222.
- Both use the existing critical-hit calculation and damage/healing attribution. Periodic and delayed damage remain noncritical. Trigger counters persist in checkpoints; retired heart rally counters are removed on restore. Revived on-axis units rejoin the queue without giving rear operators manual turns.
- Neither enters ordinary relic/supply pools. Heart retains a 0.4% second-plane roll; third-plane rare rolls allocate 0.2% each to Ocean and Heart. Drops still arrive sealed in battle parcels.
- Local original art, distinct inventory borders, exact sale amounts, parcel reveal and named battle effects identify the two supreme items. Reduced-motion settings disable shake and expanding battle effects.

These are existing Delta Force promotional illustrations, not generated replacement characters. The renderer uses portrait frames from the originals. Copyright remains with the respective rights holders. Public availability does not establish a redistribution license; review permissions before commercial use.

- `vyron-wiki.jpg`: https://play-deltaforce.com/vyron/
  Image: https://play-deltaforce.com/wp-content/uploads/2025/01/Vyron-1024x683.jpg
- `uluru-wiki.jpg`: https://play-deltaforce.com/ururu/
  Image: https://play-deltaforce.com/wp-content/uploads/2025/01/Ururu-1024x683.jpg
- `stinger-wiki.jpg`: https://play-deltaforce.com/stinger/
  Image: https://play-deltaforce.com/wp-content/uploads/2025/01/Stinger-Operator-1024x683.jpg
- `dwolf-wiki.jpg`: https://play-deltaforce.com/d-wolf/
  Image: https://play-deltaforce.com/wp-content/uploads/2025/01/D-wolf-1024x576.jpg
- `luna-wiki.jpg`: https://play-deltaforce.com/luna/
  Image: https://play-deltaforce.com/wp-content/uploads/2025/01/Luna-1024x576.jpg
- `hackclaw-wiki.jpg`: https://play-deltaforce.com/hackclaw/
  Image: https://play-deltaforce.com/wp-content/uploads/2025/01/Hackclaw-1024x576.jpg
- `saeed-handbook.jpg`: https://thedeltahandbook.com/AI.html
  Image: https://thedeltahandbook.com/assets/images/saeed.jpg
- `ahsarah-official-guide.jpg`: official Delta Force account, elite-soldier guide on TapTap, 2024-09-27.
  Source: https://www.taptap.cn/moment/588731281915773370
  Image: https://img2-tc.tapimg.com/moment/etag/loat75XKOuz4-hpuR8r0fedh2hVF.png/_tap_ugc.jpg
  Only the Machine Gunner and Shieldbearer sections are used. The top portrait is Reis, not Saeed, and is not used as a unit.

## Skill References

### Shared In-Run Tactic Pool (Save Version 13)

Opening and in-run tactic decisions use the same 36-entry pool. Each plane's entry fight leads to a dedicated, persisted three-choice tactic node, then to the existing supply/market/elite branch. These nodes are appended to preserve all earlier node IDs. Selection screens replace preparation until the decision is complete; the compact path is visible in the top preparation bar on desktop and mobile.

One option of each quality is drawn. Owned tactics do not repeat; same-family candidates must be higher-quality upgrades. An upgrade replaces the earlier tactic and its enemy-risk contribution, granting only the difference in immediate resources. Different families stack combat and financial effects. Battle checkpoints carry the active tactic list and round-limited relay state. Draws, RNG state and claimed nodes survive reload without new rolls or duplicate rewards.

The separate three-item black-market investment shop is retired. Version-12 saves keep paid legacy investments; the opening bounty/fund reference formerly stored in both fields is counted only once. Existing battles retain their current attributes. Past tactic nodes are not replayed or retroactively rewarded on old saves.

### Quality-Based Tactics (2026-09-11)

The opening pool contains 36 original fan-game tactics: twelve families with purple, gold and red variants. New runs draw one option per quality, selected without cost; saved drafts are not rerolled. Existing investments are purple and contribute their own risk when purchased, without double-counting a matching opening key.

Tactic enemy modifiers: purple +8% HP/+4% attack; gold +22% HP/+12% attack/+5% speed; red +45% HP/+25% attack/+10% speed. Multiple tactics add their percentages before multiplying node, difficulty and challenge modifiers. These are game-design values, not official Delta Force mechanics.

Family effects cover combat, smoke, salvage, interest, recruitment, bounty, dividends, charge, shields, deliveries, terminal discounts and node income. Red combat triggers use the existing damage/healing/energy accounting. Ultimate relay is capped at once per squad per round and persisted in checkpoints. Regular-action healing/shields include automatic rear-axis actions and round-based reserve support, but exclude ultimates and assists. Extra parts and battle cash remain sealed until the parcel is opened. Previously saved battles keep their existing stats and do not receive a retroactive opening reset.

### Sineva, Nitro, Toxik And Echo (2026-09-11)

Skill themes were checked against the local operator archive and these references:
- Sineva: https://m.ali213.net/news/gl2501/1599843.html
- Nitro: https://wiki.biligame.com/deltaoperation2024/液氮
- Toxik: https://wiki.biligame.com/deltaoperation2024/蛊
- Echo: https://gl.ali213.net/html/2026-5/1770185.html

Shield/grapple/wire, cold grenades, adrenaline/firefly interference, and acoustic detection retain the original skill themes. All damage, duration, freeze immunity, rear-only effects and promotion bonuses are invented turn-based adaptations. Toxik's suppression reduces outgoing damage instead of changing enemy maximum HP. Save version 12 extends recruitment, copies and damage statistics to thirteen operators without rerolling existing assets.

The current local portraits for these four are temporary stand-ins (Sineva uses Uluru; Nitro uses Stinger; Toxik uses Vyron; Echo uses No Name), not verified depictions of those operators. Official source downloads failed during this update. Replacement source URLs from the operator archive:
- Sineva: https://web.df.garena.com/02_h5/240923_official_website/zh_tw/pc/operator_list_08.jpg
- Nitro: https://web.df.garena.com/02_h5/240923_official_website/zh_tw/pc/operator_list_016.jpg
- Toxik: https://web.df.garena.com/02_h5/240923_official_website/zh_tw/pc/operator_list_09.jpg
- Echo: https://web.df.garena.com/02_h5/240923_official_website/zh_tw/pc/operator_list_015.jpg

### Butterfly, Tempest And No Name (2026-09-09)

Garena official operator portraits, reused from this project's operator archive:
- Butterfly: https://web.df.garena.com/02_h5/240923_official_website/zh_tw/pc/operator_list_014.jpg
- Tempest: https://web.df.garena.com/02_h5/240923_official_website/zh_tw/pc/operator_list_010.jpg
- No Name: https://web.df.garena.com/02_h5/240923_official_website/zh_tw/pc/operator_list_011.jpg

Skill themes cross-checked against the local archive and community references:
- https://wiki.biligame.com/deltaoperation2024/蝶
- https://wiki.biligame.com/deltaoperation2024/疾风
- https://wiki.biligame.com/deltaoperation2024/无名

All numerical effects, action durations, rear-row passives and star upgrades are fan-game adaptations, not original-game balance. Tempest's rear-row ally anchor and No Name's stealth damage modifiers are explicitly adapted for this turn-based system. Save version 11 adds the three roster entries without replacing existing inventory or damage totals.

- Official world archive: https://www.playdeltaforce.com/act/wikimap/m.html
- Garena operator descriptions: https://deltaforce.garena.com/zh_tw/?redirect=0
- Stinger healing-gun / smoke update: https://deltaforce.garena.com/zh_tw/news/system/YECJDU
- Vyron control reference: https://wiki.biligame.com/deltaoperation2024/%E5%A8%81%E9%BE%99

HP, damage, armor, action order, cooldowns and enemy patterns are fan-game balancing, not original-game statistics. Tiger cannon retains control without direct damage; jet-assisted shooting damage belongs to the weapon. Cover, delayed explosives and healing smoke have real simulation effects.

Version 0.3 presents basic attack plus three active skills for each operator. Professional Rescue is a separate, automatic once-per-battle passive adaptation; Stinger's third active is the smoke drone. Tiger Cannon and Loitering Munition consume 100 charge in this fan ruleset. Stinger instead starts with three needles, spends one per healing-gun action, and replenishes one every two battle rounds while below capacity. That two-round interval is a turn-based design choice, not an original-game cooldown claim. Hive smoke only gains healing after the healing gun activates it. Equipment grades, HP bonuses, armor mitigation and speed penalties are prototype balance values, not a replica of Delta Force armor or penetration calculations.

Original-game references distinguish magazine capacity from reserve ammunition. The official August 8, 2025 update adjusted Stinger's initial reserve ammunition, not the fan game's turn-based recovery interval: https://deltaforce.garena.com/zh_tw/news/event/DDZ7WD

## Campaign Adaptation (0.4)

The action has twelve fictional encounter/supply nodes across three sectors of Zero Dam. It is not an original-game route guide. Version 0.5 has six recruitable operators: Vyron, Uluru, Stinger, D-Wolf, Luna and Hackclaw. Three deploy at once; reserves retain equipment. A shop has three recruitment offers and two equipment offers, not all six operators guaranteed each refresh.

D-Wolf retains the exoskeleton, triple launcher and breakthrough smoke, with kill healing/extension. Luna retains detection and volt arrows, enhanced frag grenades and damage marking. Hackclaw retains signal decoding, data knives, flash drones and stealth. Action durations, charge requirements, damage multipliers, marks bypassing smoke, forced basic attacks from interference, and passive damage reductions are explicit turn-based adaptations, not original-game behavior or statistics. Skill references are the operator pages above and the official Garena descriptions. Mixed-role, double-assault and double-recon synergies are fan rules. Version-one saves migrate without rerolling the current shop or changing currency, inventory, or checkpoint resources.

Recruitment, three-copy promotion, paid rerolls, shop locking, interest, a limited deployed roster, one selected support and two/three active collectible slots form the campaign economy. Battles restore unit HP and skill resources; lost encounters reduce campaign integrity. The final boss must be defeated to extract. Each physical item has a unique inventory ID and a single owner; equipped or active items must be removed before sale. Rewards and supply selections resolve once. Saves include the random generator state and the current battle checkpoint.

Collectible names reference Delta Force items, but ALL collectible battle bonuses, sale prices, drop probabilities and operation payouts are invented fan-game balance. Ordinary defeated enemies drop equipment or common collectibles. Africa's Heart has a separate rare roll after sector one, and Saeed's Pocket Watch has a separate boss roll; both have dedicated narrative text and red reveal styling. They are not mixed into a generic item-name sentence template.

Name references:
- https://steamcommunity.com/sharedfiles/filedetails/?id=3544405069
- https://www.acgice.com/sjz/v/scp_book?grade=6&mtype=1&p=1&top=3-2

## Rear-Row Rules

All six passives are now rear-only fan adaptations. Vyron assists front-row attacks once per round. D-Wolf rallies on another ally's kill. Luna marks through damage and assists marked targets. Stinger heals at turn start and can rescue once per battle. Uluru and Hackclaw leave the ordinary initiative queue in the rear: they perform round-based support, gain energy from support conditions, and automatically use their charged ultimates. Support effects have a separate persisted queue and cannot recursively trigger an unlimited assist chain. Defeated or interrupted support cannot fire.

Every ultimate, including Stinger's needle-consuming healing gun, preserves the operator's ordinary action and does not advance personal cooldowns. Base initial energy is 20, basic attacks grant 45, ordinary skills 35 and actual damage received 12. Weapon passives and active collectibles can improve energy efficiency, capped at +100%; efficiency also accelerates the medic's 200-point needle recovery meter. K416 and MP5 improve efficiency, UZI grants opening resources, Bizon rewards basic attacks, and M7 rewards kills. These are invented weapon passives, not Delta Force weapon properties.

Selling an operator requires confirmation, sells all collected copies at 70% of their standard recruitment price, removes their deployment and returns all worn equipment to inventory. The final deployed operator cannot be sold. Existing saves retain currencies, items, energy, medical stock and pending actions; legacy medical progress is converted to the new meter units.

Preparation uses four frontline positions and two non-targetable support positions, with a separate six-slot reserve bench. Campaign deployment starts at two operators and grows by one per terminal level, up to six at level five. Upgrade costs are 80000, 120000, 160000 and 200000. Terminal controls sit to the right of the reserve bench. The training preset remains three operators. Level two still unlocks the third relic slot and external support; later levels only increase deployment capacity. Position and item ownership persist in the campaign save. The small rifle, SMG, helmet and vest SVG icons are original category pictograms for this fan game, not official item artwork.

## Three-Plane Campaign (Version 3)

The current route is Zero Dam, Space City and Tide Prison. Each plane uses explicit directed edges: entry fight to supply, market or elite; supply/market to elite; elite to boss; boss to the next plane. Non-final boss defeats cost 45/50 integrity but still allow progression if integrity remains. The prison boss must be defeated to extract; defeat costs 55 integrity and ends the run. These encounter routes are fan-created, not factual traversal guides.

The original Space City and Tide Prison placeholder commanders were replaced by researched map-specific encounters in the September 2026 update below. Their internal IDs remain stable for saved battles.

Phases are finance, prep/build, combat, loot/settlement and route selection, with separate supply/market stops. Investment agreements are non-refundable purchases; interest is based on pre-payout cash. Components combine into three invented tactical gear recipes. Their sale prices are below component acquisition costs even with all resale bonuses. Strip-all returns the exact item instances without cost or duplication.

The event bus has a TypeScript declaration contract. Rear triggers subscribe to combat-action events, financial modifiers subscribe to settlement, and the UI subscribes to campaign transitions. Save version 2 retains owned assets but migrates an unfinished legacy battle to preparation; new checkpoints retain their battle state.

## Runtime

Tactical and support icons: Lucide (ISC license), https://github.com/lucide-icons/lucide.
Vendored icons and license are in icons/. They are UI symbols, not official Delta Force artwork.

## Streamlined Preparation (Save Version 6)

Funding revision 2 raises starting cash to 300000, supply parcels to 80000-120000, normal victory base income to 70000/90000/110000 by plane, and adds 50000 for boss victories. Defeat income is 30000; the cash supply option gives 100000. Prices and interest rules are unchanged. Existing unfinished saves receive exactly one sealed 120000 cash adjustment parcel; previously sealed rewards are not rerolled.

The board now has three frontline positions and three non-targetable support positions. The terminal still starts with a total deployment cap of two and expands to six. Save migration remaps the former 4+2 board; if necessary, the former fourth frontline position becomes the third support position. Existing equipment and checkpoint resources remain owned.

Combat settlement creates one sealed delivery containing actual defeated-enemy loot, a basic component on victory, and the fixed pre-payout economy receipt. Cash and items are credited only when opened. Non-final fights return directly to preparation with inline route choices; the separate loot and recurring finance pages are removed. Old unresolved rewards migrate with zero extra cash because legacy settlement had already paid that cash. End-of-run deliveries can still be opened.

Nine tier-one components support eighteen two-component recipes. Starter supplies guarantee one craftable pair plus an extra random component. Crafted bonuses are fan-game values. The right-hand armory only displays unequipped inventory; worn icons remain under operator portraits. Duplicate roster listings, inactive battle records and redundant equipment slots were removed from preparation.

## Random Opening (Save Version 5)

Opening protocols are a free, unique three-choice draw from twelve fan-designed strategies. One random operator is assigned before the draw. Opening choices, sealed parcel contents and the random generator state are persisted immediately. Parcels deliver 3-7 ten-thousand Haff coins plus random equipment only when explicitly opened; the original 180000 starting cash remains separate. Starter crafting components are also inside the parcel. Equipment is delivered unequipped. Old saves retain their chosen strategy and existing assets without receiving a duplicate starter package.

Inspiration: Currency Wars' interest-cap, free-refresh, equipment-supply and crystal-ore reward strategies. These are adaptations, not copied numerical balance or official Delta Force rules:
- https://honkai-star-rail.fandom.com/wiki/Currency_Wars%3A_Zero-Sum_Game/Investment_Strategy
- https://wiki.biligame.com/sr/%E5%A2%9E%E5%8F%91%E8%B4%A7%E5%B8%81

The interactive delivery-case graphic uses original CSS artwork. Opening reveals a receipt; the reward transaction completes atomically before the presentation.

Phaser 3.90.0, MIT license, vendored from https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js
License: ../vendor/PHASER-LICENSE.md

## Single-Cell Collectibles and Skill Builds (2026-09-11)

The 18 collectibles now use actual Delta Force item names and downloaded official item art. Each has length=1 and width=1 in the inspected [DeltaForceData collection snapshot](https://github.com/jiansenc/DeltaForceData/blob/main/public/json/props/collection.json). Grade 4/5/6 maps to purple/gold/red. This is a community-preserved item-data snapshot, not a claim of live season completeness. Pixel aspect ratio is not inventory footprint.

Images were downloaded unchanged from the `pic` URLs on `playerhub.df.qq.com`. Individual source URLs, object IDs, dimensions, grades and SHA-256 hashes are recorded in `relics/SOURCES.json`. Local files remove runtime hotlink dependencies. Artwork rights remain with the respective game owners; the data repository does not grant an artwork license, and no commercial redistribution permission is claimed.

All bonuses, sale values, trigger rules and discovery stories are original fan-game adaptations, not official item effects or live market prices. Stable keys preserve owned and sealed items: silver is now polyethylene fiber, telescope is the spy pen, binoculars is the lens, radio is the electronic jammer, rotor is coffee, tally is RAM, pulseCore is the programmable processor, governor is CPU, and dogtags is the pirate saber. Saeed's watch and Heart of Africa retain their identity. Seven more verified 1x1 items expand the pool.

Nine existing two-component recipes now have skill-linked passives. Twenty-four new tactics (eight families with purple/gold/red tiers) join the existing shared draw pool, bringing it to sixty. Reconnaissance, explosives, control, mobility, defense, cold, persistent damage and squad buffs have separate triggers derived from completed skill IDs. Normal attacks, DOT ticks and assists cannot recursively trigger them. A source fires at most once per operator per round, with that limit saved across reloads; rear-axis skills and automatic reserve ultimates qualify without granting manual control. Damage uses the normal damage/kill accounting. Personal shields remain capped at 50% max HP, and cold retains freeze immunity.

The programmable processor retains the former ultimate-stacking build but can gain only one layer per round, including when several hormone shots are fired. Other speed-stacking builds remain. Red collectibles stay outside ordinary supply selections: Heart of Africa retains its 0.4% later-plane roll; the three added rare reds share a separate 1.2% later-plane roll. Saeed's watch retains its 12% Saeed-only roll, checked first. All reds use an individual discovery story and the existing precious-loot presentation.

## Operator Role Audit: Assault Windows (2026-09-11)

This audit concerns this fan game's implementation, not official Delta Force balance. All 13 kits were inspected for direct damage, offensive amplification, control, sustain and their automatic action priorities.

| Operator | Role and finding | Adjustment |
| --- | --- | --- |
| Tempest / 疾风 | Assault kit had three defensive/control skills with no inherent damage | Roll grants +30% damage/+20% sorting speed through the next regular action; spike deals 90% attack plus two 25-base shock ticks and a stun; ultimate grants +35% sorting speed and three-shot basic attacks for two regular actions while retaining the fatal-hit anchor |
| D-Wolf / 红狼 | Has grenade damage and a damage/speed ultimate, but AI could spend its short buff window on smoke | Prefer damaging skills or basic attacks while overdrive is active |
| No Name / 无名 | Has direct damage, bleeding and stealth amplification, but AI could spend stealth on a flash | Prefer razor or basic attack while stealth is active |
| Vyron / 威龙 | Dash shot, delayed bomb and group knockdown form an offensive/control kit | Retained |
| Uluru / 乌鲁鲁 | Cover, burning area and explosive ultimate; reserve artillery support | Retained |
| Sineva / 深蓝 | Tank/control identity, grapple damage, wire DOT and shield ultimate | Retained; not evaluated as an assault damage dealer |
| Nitro / 液氮 | Cold DOT, freeze setup and six damaging grenades | Retained |
| Luna / 露娜 | Shock, grenade damage and team gun-damage amplification through marking | Retained |
| Hackclaw / 骇爪 | Damaging knife amplified by trace, flash and recon setup; rear assists | Retained |
| Echo / 回响 | Recon/control with team gun-damage amplification and skill-linked follow-up builds | Retained; lack of direct skill damage is intentional for this utility kit |
| Stinger / 蜂医 | Healing resources, smoke defense, revival support | Retained as support |
| Butterfly / 蝶 | Healing, speed/smoke utility and revival/shield rescue | Retained as support |
| Toxik / 蛊 | Team damage/speed amplification, blind and enemy suppression | Retained as support |

Tempest's three shots are 65% attack each, retarget remaining enemies after a kill, and count as only one normal attack/action for gear, relics and energy. Ultimate and roll sorting bonuses add to each other and multiply current stacked speed; the round-based initiative queue applies them on its next sort. Star upgrades extend the spike's full damage/control/DOT package to additional enemies. Rear Tempest remains automatic: she retains her own offensive buff while the anchor protects the front ally. New timers persist in checkpoints and default to zero for legacy saves. Damage attribution includes all three shots and her own electric ticks. Supplemental damage retains the completed action's temporary buffs/debuffs rather than losing them when its action counter advances.


### Verified replacements for Sineva, Toxik, Nitro and Echo (2026-09-11)

The four legacy stand-ins noted above are now superseded by original official Garena images in `portraits-verified/`. Old files are preserved. Each identity was checked against `assets/wiki-data.js` and the downloaded artwork. `portraits-verified/SOURCES.json` records source URLs and SHA-256 hashes. The Sineva URL ends in `.jpg` but serves a PNG; the local file uses its actual format. All four images are 445 × 206. Dedicated crop metadata is used for game portraits, and restored combat snapshots rebind visual metadata to the current operator catalog.

### Relic fusion and weapon deliveries (2026-09-14)

Fan-game economy rules, not official Delta Force recipes. The existing item artwork and combat passives are unchanged. All 21 unordered purple pairs produce gold relics, and all 28 unordered gold pairs produce ordinary red relics. Doubles require two distinct inventory instances. Fixed recipes are previewable in inventory and work on a wearer without consuming another operator's items. A worn ingredient's relic slot is retained; invalid or full-slot crafting is transactional.

Heart of Africa, Ocean's Tears and Saeed's watch remain exclusive drops, never fusion outputs. Ordinary gold/red relics no longer enter random loot or material-supply rewards. Starter deliveries contain three purple materials; victories guarantee one purple material and one weapon, in sealed parcels. Advanced guns formerly crafted from components now join weapon deliveries in later planes. The 31 armor/helmet recipes remain available; existing weapons, relics, and sealed legacy rewards are preserved. Older unfinished saves receive a one-time two-material parcel. Gold/red fusion has an inline reveal with reduced-motion support and red-specific flavor text.

### Component retirement and live combat inspection (2026-09-14)

This revision supersedes component crafting above: all component acquisition, purchasing and equipment recipes are retired. Existing components convert one-for-one to purple relics with their inventory IDs preserved; worn conversions use empty relic slots or return to stock. Sealed deliveries convert as well. In-progress legacy battles retain original component stats until settlement, then migrate. Finished weapons and armor remain intact and are obtained through deliveries, including formerly crafted armor. Challenge and tactic component rewards now grant relic materials.

Rear abilities are listed alongside active skills, with activation state. The combat inspector reads a snapshot without advancing combat, RNG or effect memory. It shows friendly and enemy units, prepared/current attribute deltas, shared-core speed and outgoing-damage multipliers, crit, energy, actual effect timers, shields, relic stacks and skill-link triggers. Common damage multipliers exclude target-dependent bonuses, which are listed separately. Inspection pauses simulation without changing manual/automatic mode or a pending targeting selection.

## Map-specific enemy encounters (2026-09-14)

- Zero Dam retains Saeed and the Ahsarah soldiers.
- Space City uses Haavk shieldbearers, machine gunners, flamethrowers and snipers. Desmoulins is the launch-zone boss, with targeting and autonomous-vehicle rocket support represented as her skills, not an independently targetable vehicle.
- Tide Prison has separate factions: wardens/riot guards at entry, prisoner hammer guards in the cellblock, Raven and his hammer guards in the pre-supply challenge, then Ghroth with his guards in the final encounter. Raven and Ghroth are never placed on the same team. The five-enemy cap and stable node IDs remain unchanged.
- These encounter placements, timings, status effects and combat numbers are fan-game adaptations, not a simulation of original-game spawn rules. Old in-progress rosters remain valid until settlement; subsequent encounters use the current catalog.

Research:
- Official Space City guide: https://www.taptap.cn/moment/564129131101424794
- Official Haavk elite guide: https://www.taptap.cn/moment/612980534846426177
- Official War Ablaze update, Ghroth and the two prison factions: https://deltaforce.garena.com/zh_tw/news/all/YFNFMQ
- Official Fireworks update, Desmoulins and autonomous vehicles: https://deltaforce.garena.com/zh_tw/news/system/YECJDU
- Player strategy research (Raven/hammer guards): https://www.taptap.cn/moment/692408663201024716

Local imagery (all portraits are view crops; copyrighted game art remains owned by its respective rights holders):
- `enemies/haavk-guide.jpg`: official guide image, https://img2-tc.tapimg.com/moment/etag/FuJ6DMl5sCg4zzh8oEJl61GUlfze.png/_tap_ugc.jpg
- `enemies/desmoulins.png`: https://thedeltahandbook.com/assets/images/des.png, identified on https://thedeltahandbook.com/AI.html
- `enemies/warden-close.jpg`: game cinematic showing Ghroth in the center, shieldbearer at left and armed guard at right, https://img2-tc.tapimg.com/moment/etag/FswJlt7VyiMI63uisJCLBA8LLhwv_20251105200233.jpg/_tap_ugc.jpg, from https://www.taptap.cn/moment/735226302662971221
- `enemies/raven-portrait.jpg`: first-frame JPEG of the Raven gameplay clip https://img2-tc.tapimg.com/moment/etag/FmffoQVg888YnzvKlHHK2GluUBIg.gif/_tap_ugc.gif, from the player strategy research above.
- `enemies/hammer.svg`: Lucide hammer icon, https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/hammer.svg; see existing `icons/LICENSE`. A clearly labeled class-icon fallback, not a verified character portrait. A suitable hammer-guard portrait is still needed.

Only key regression checks were run: map roster/asset validity, telegraphed and interrupted sniper attacks, effective front-only statuses, burn attribution, and both legacy roster generations. Existing combat-inspector critical checks remain passing.
