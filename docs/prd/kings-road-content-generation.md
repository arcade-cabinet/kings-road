# King's Road Content Generation PRD

> **Target:** Ralph-TUI overnight content generation
> **Version:** 1.0.0
> **Date:** 2026-03-09

## Overview

King's Road is a config-driven 3D RPG built on a Holy Grail narrative spine. The player walks the King's Road from Ashford to Grailsend, encountering quests, NPCs, and features along the way. All game content is defined as JSON files validated against Zod schemas.

This PRD defines user stories for generating the complete content trove. Each story produces JSON files that must pass `npx tsx scripts/validate-trove.ts` before merging.

## Content Architecture

```
content/
├── world/
│   └── road-spine.json          # Already exists (6 anchors, 30km road)
├── main-quest/
│   ├── chapter-00.json          # US1: Ashford
│   ├── chapter-01.json          # US1: Millbrook
│   ├── chapter-02.json          # US1: Thornfield Ruins
│   ├── chapter-03.json          # US1: Ravensgate
│   ├── chapter-04.json          # US1: The Pilgrim's Rest
│   └── chapter-05.json          # US1: Grailsend
├── side-quests/
│   ├── macro/
│   │   ├── macro-*.json         # US2: 3 macro quest chains
│   ├── meso/
│   │   ├── meso-*.json          # US3: 10 meso quests
│   └── micro/
│       ├── micro-*.json         # US4: 25 micro encounters
├── npcs/
│   ├── blacksmith.json          # US5: NPC archetype definitions
│   ├── innkeeper.json
│   ├── merchant.json
│   ├── wanderer.json
│   ├── healer.json
│   ├── knight.json
│   ├── hermit.json
│   ├── farmer.json
│   ├── priest.json
│   ├── noble.json
│   ├── bandit.json
│   └── scholar.json
└── features/
    └── roadside-features.json   # US6: 30 feature definitions
```

## Reference Documents

- **Tone guide:** `content/CONTRIBUTING.md` -- pastoral, romanticized medieval English
- **Schema definitions:** `src/schemas/` -- Zod schemas for all content types
- **Validation:** `scripts/validate-trove.ts` -- automated validation pipeline
- **Road spine:** `content/world/road-spine.json` -- 6 anchors defining the road

## Global Acceptance Criteria (all stories)

1. Every JSON file validates against its Zod schema: `npx tsx scripts/validate-trove.ts` exits 0
2. Tone is pastoral, romanticized medieval English (see `content/CONTRIBUTING.md`)
3. No grimdark, nihilistic, or modern language
4. All dialogue meets word count minimums (15 words default for quest steps)
5. NPC name pools use regional English / Arthurian naming conventions
6. IDs are kebab-case, unique across the entire trove
7. All `anchorAffinity` values reference valid anchor IDs from `road-spine.json`
8. All `encounterId` values reference encounters that exist or will exist
9. All `npcArchetype` values are from the valid enum: blacksmith, innkeeper, merchant, wanderer, healer, knight, hermit, farmer, priest, noble, bandit, scholar

---

## US1: Main Quest Chapters

**As a** player walking the King's Road,
**I want** a 6-chapter main quest telling the story of a Holy Grail pilgrimage,
**so that** I have a compelling narrative spine driving me from Ashford to Grailsend.

### Description

Generate 6 main quest chapter files, one per anchor in `road-spine.json`. The main quest is linear and fixed -- the same every playthrough. It tells the story of a humble traveler called to seek the Holy Grail, passing through villages, ruins, and monasteries along the King's Road.

### Chapters

| File | Anchor | Chapter | Theme |
|------|--------|---------|-------|
| `chapter-00.json` | Ashford (home) | The Call | The player receives the call to seek the Grail. Departure from home. |
| `chapter-01.json` | Millbrook | The First Test | A test of kindness or wisdom at the market town. Earns trust of a companion or ally. |
| `chapter-02.json` | Thornfield Ruins | The Old Secret | Exploring ancient ruins for a clue to the Grail's location. A trial of courage. |
| `chapter-03.json` | Ravensgate | The Tyrant's Shadow | Navigating a hostile town under a cruel lord. A test of justice. |
| `chapter-04.json` | The Pilgrim's Rest | The Vigil | A spiritual vigil at the monastery. Reflection, purification, final preparation. |
| `chapter-05.json` | Grailsend | The Grail | The final temple. The Grail is found -- but it is not what was expected. |

### JSON Shape (per chapter)

```json
{
  "id": "main-chapter-00",
  "tier": "macro",
  "title": "The Call",
  "estimatedMinutes": 30,
  "anchorAffinity": "home",
  "trigger": { "type": "anchor", "anchorId": "home" },
  "branches": {
    "A": {
      "label": "Accept the call willingly",
      "steps": [
        { "id": "ch00-a-01", "type": "dialogue", "npcArchetype": "priest", "dialogue": "...", "dialogueMinWords": 20, "dialogueMaxWords": 100 },
        { "id": "ch00-a-02", "type": "travel", "destination": "anchor-01", "description": "..." }
      ],
      "reward": { "type": "modifier", "modifierId": "willing-pilgrim" }
    },
    "B": {
      "label": "Accept reluctantly, driven by duty",
      "steps": [ ... ],
      "reward": { "type": "modifier", "modifierId": "dutiful-pilgrim" }
    }
  },
  "reward": { "type": "item", "itemId": "pilgrims-staff" }
}
```

### Acceptance Criteria

- [ ] 6 files in `content/main-quest/`, one per anchor
- [ ] Each chapter has A/B branches (macro tier requires branches)
- [ ] Each chapter has 3-6 steps per branch
- [ ] Estimated duration: 20-40 minutes per chapter
- [ ] Chapters chain sequentially: chapter-01 has prerequisite chapter-00, etc.
- [ ] Dialogue is rich, atmospheric, minimum 20 words per dialogue step
- [ ] A and B branches are meaningfully different approaches (not cosmetic variations)
- [ ] The narrative arc follows the Grail quest from call to revelation
- [ ] Each chapter includes at least one dialogue step, one non-dialogue step
- [ ] Trigger type is `anchor` with the correct `anchorId`
- [ ] Validates: `npx tsx scripts/validate-trove.ts`

---

## US2: Macro Side Quests

**As a** player exploring off the main road,
**I want** 3 substantial multi-part quest chains,
**so that** I have deep optional content spanning multiple locations.

### Description

Generate 3 macro side quest chains. These are 1-2 hour quest lines that span multiple off-road locations and involve multi-step narratives with A/B branching. They run parallel to the main quest but are entirely optional.

### Quest Concepts

1. **The Cartographer's Legacy** -- A retired mapmaker's hidden maps reveal forgotten paths. The player must decide whether to share the maps with the local lord (A) or a band of wandering merchants (B).

2. **The Silent Bell** -- A chapel bell has gone silent, and the village believes it cursed. Investigate the bell tower (A: confront a hermit squatter) or seek a blessing from a traveling priest (B: pilgrimage to a shrine).

3. **The Shepherd's Reckoning** -- Sheep are vanishing from the hillside. Track the culprit -- a desperate bandit family (A: bring them to justice) or discover they're fleeing a worse threat (B: help them escape).

### Acceptance Criteria

- [ ] 3 files in `content/side-quests/macro/`
- [ ] Each has A/B branches with meaningfully different outcomes
- [ ] 4-8 steps per branch
- [ ] Estimated duration: 60-120 minutes each
- [ ] Each references valid anchors for `anchorAffinity`
- [ ] Trigger type can be `anchor` or `prerequisite`
- [ ] Each involves at least 2 different NPC archetypes
- [ ] Dialogue-heavy: minimum 30 total dialogue words per quest
- [ ] Validates: `npx tsx scripts/validate-trove.ts`

---

## US3: Meso Side Quests

**As a** player arriving at an anchor point,
**I want** self-contained 15-30 minute quests at various locations,
**so that** each stop on the road feels alive with stories.

### Description

Generate 10 meso side quests distributed across anchor types. Each is self-contained at one location, taking 15-30 minutes. All require A/B branching.

### Distribution

| Anchor Affinity | Count | Example Themes |
|-----------------|-------|----------------|
| Ashford (home) | 1 | A childhood friend needs help before you leave |
| Millbrook | 2 | Market day dispute, poisoned well |
| Thornfield Ruins | 2 | Lost explorer, cursed artifact |
| Ravensgate | 2 | Prisoner rescue, smuggling ring |
| The Pilgrim's Rest | 2 | Stolen relic, sick pilgrim |
| Grailsend | 1 | Guardian's riddle, final trial |

### Acceptance Criteria

- [ ] 10 files in `content/side-quests/meso/`
- [ ] Each has A/B branches
- [ ] 2-4 steps per branch
- [ ] Estimated duration: 15-45 minutes each
- [ ] Each references a valid anchor for `anchorAffinity`
- [ ] Trigger type is `anchor` with the correct `anchorId`
- [ ] Each involves at least 1 NPC archetype
- [ ] A/B branches offer meaningfully different approaches
- [ ] Validates: `npx tsx scripts/validate-trove.ts`

---

## US4: Micro Roadside Encounters

**As a** player walking between anchor points,
**I want** quick 5-10 minute encounters along the roadside,
**so that** the journey itself feels eventful and varied.

### Description

Generate 25 micro quests. These are short roadside encounters triggered by distance along the road. They can be linear (no A/B branches required for micro tier). They should feel like chance meetings -- a lost merchant, a broken cart, a wandering knight, a riddle-telling hermit.

### Distribution by Road Segment

| Distance Range | Count | Segment |
|----------------|-------|---------|
| 0 - 6,000 | 5 | Ashford to Millbrook (gentle farmland) |
| 6,000 - 12,000 | 5 | Millbrook to Thornfield (deepening forest) |
| 12,000 - 17,000 | 5 | Thornfield to Ravensgate (moor and hills) |
| 17,000 - 21,000 | 5 | Ravensgate to Pilgrim's Rest (open heath) |
| 21,000 - 28,000 | 5 | Pilgrim's Rest to Grailsend (mountain approach) |

### Acceptance Criteria

- [ ] 25 files in `content/side-quests/micro/`
- [ ] Tier is `micro`
- [ ] May use linear `steps` (no branches required)
- [ ] 1-3 steps each
- [ ] Estimated duration: 5-15 minutes each
- [ ] Trigger type is `roadside` with `distanceRange` within valid segment
- [ ] Each has an `anchorAffinity` referencing the nearest anchor
- [ ] Dialogue is concise but flavorful (minimum 15 words per dialogue step)
- [ ] No two micro quests are thematically identical
- [ ] Validates: `npx tsx scripts/validate-trove.ts`

---

## US5: NPC Dialogue Pools

**As a** player interacting with NPCs at anchor points,
**I want** varied and characterful NPC dialogue,
**so that** each NPC archetype feels distinct and the world feels populated.

### Description

Generate NPC definitions for all 12 archetypes. Each definition provides a pool of names and greetings that the game randomly selects from at runtime. Quest-specific dialogue is optional and links to quest IDs.

### Archetypes

| Archetype | Personality | Setting |
|-----------|-------------|---------|
| blacksmith | Gruff, honest, proud of craft | Forge, anvil |
| innkeeper | Warm, gossipy, protective of guests | Tavern, hearth |
| merchant | Shrewd but fair, well-traveled | Market stall, cart |
| wanderer | Mysterious, philosophical, road-weary | Roadside, crossroads |
| healer | Gentle, knowledgeable, herbalist | Garden, cottage |
| knight | Noble, duty-bound, sometimes weary | Road, gatehouse |
| hermit | Eccentric, wise, solitary | Cave, forest clearing |
| farmer | Practical, weather-wise, community-minded | Field, barn |
| priest | Devout, kind, scholarly | Chapel, monastery |
| noble | Proud, cultured, sometimes out of touch | Manor, carriage |
| bandit | Desperate, cunning, not purely evil | Woods, camp |
| scholar | Curious, bookish, absent-minded | Library, study |

### JSON Shape (per archetype)

```json
{
  "id": "npc-blacksmith-01",
  "archetype": "blacksmith",
  "namePool": ["Aldric", "Brennan", "Cedric", "Dunstan", "Edric"],
  "greetingPool": [
    { "text": "Welcome to my forge, traveler. The anvil's warm and the iron is ready." },
    { "text": "Steel speaks truer than words, I always say. What do you need?" },
    { "text": "Mind the sparks, friend. I've been at this since before dawn." },
    { "text": "A good blade needs a steady hand and honest ore. I have both." },
    { "text": "You've the look of someone who knows the value of a well-forged tool." }
  ],
  "appearance": {
    "clothColor": "#8B4513",
    "accessory": "leather_apron"
  }
}
```

### Acceptance Criteria

- [ ] 12 files in `content/npcs/`, one per archetype
- [ ] Each has at least 5 entries in `namePool`
- [ ] Each has at least 5 entries in `greetingPool`
- [ ] Names are regionally appropriate (English, Arthurian, pastoral)
- [ ] Greetings are 10-300 characters each, in character for the archetype
- [ ] Each greeting reflects the archetype's personality and setting
- [ ] No greeting is generic enough to work for any NPC type
- [ ] Greetings use pastoral vocabulary (no modern slang)
- [ ] Name pool entries are 2-40 characters each
- [ ] `appearance` includes `clothColor` (hex) and `accessory` where relevant
- [ ] Validates: `npx tsx scripts/validate-trove.ts`

---

## US6: Feature Descriptions

**As a** player walking the King's Road,
**I want** ambient features along the roadside (bridges, shrines, ruins, streams),
**so that** the landscape feels rich and lived-in.

### Description

Generate 30 feature definitions across three tiers: ambient (background flavor), minor (interactable landmarks), and major (significant locations with dialogue).

### Distribution

| Tier | Count | Examples |
|------|-------|---------|
| ambient | 15 | Wildflower patch, stone wall, sheep grazing, birdsong clearing, moss-covered log, old well, hay bale, fence post, abandoned cart wheel, ivy-covered wall, milestone marker, dried creek bed, worn signpost, dovecote, sundial |
| minor | 10 | Stone bridge, wayside shrine, ancient oak, shepherd's cairn, holy spring, ruined watchtower, crossroads marker, pilgrim's bench, bee garden, old mill wheel |
| major | 5 | Chapel ruin, abandoned hermitage, fairy ring, standing stones, roadside inn ruin |

### JSON Shape

```json
{
  "id": "feat-stone-bridge-01",
  "tier": "minor",
  "name": "Old Stone Bridge",
  "description": "A weathered stone bridge spanning a gentle brook, its arches worn smooth by centuries of travelers.",
  "visualType": "stone_bridge",
  "interactable": true,
  "dialogueOnInteract": "The stones here have been worn smooth by countless pilgrims. Initials are carved into the keystone, too faded to read."
}
```

### Acceptance Criteria

- [ ] 1 file in `content/features/` containing an array or individual files per feature
- [ ] 15 ambient features (`interactable: false`, no `dialogueOnInteract`)
- [ ] 10 minor features (`interactable: true`, with `dialogueOnInteract`)
- [ ] 5 major features (`interactable: true`, with `dialogueOnInteract`)
- [ ] Descriptions are 10-300 characters, evocative and pastoral
- [ ] `dialogueOnInteract` is 10-300 characters where present
- [ ] `visualType` uses snake_case identifiers
- [ ] Each feature has a unique `id` prefixed with `feat-`
- [ ] Features feel appropriate to a medieval English countryside
- [ ] Validates: `npx tsx scripts/validate-trove.ts`

---

## Execution Order

Stories can be generated in any order, but the following dependencies exist:

1. **US1** (main quest) should be generated first -- it establishes the narrative spine
2. **US5** (NPCs) should be generated early -- quests reference NPC archetypes
3. **US2, US3, US4** (side quests) can be generated in parallel after US1 and US5
4. **US6** (features) is independent and can be generated at any time

## Validation Workflow

After generating each batch of content:

```bash
# Validate all content
npx tsx scripts/validate-trove.ts

# Check for validation errors
echo $?  # 0 = all pass, 1 = failures exist

# Review the report
cat content/validation-report.json | jq '.summary'
```

Fix any validation errors before proceeding to the next story.

## Content Quality Checklist

Before submitting generated content, verify:

- [ ] Read each quest aloud -- does the dialogue sound natural?
- [ ] A/B branches lead to meaningfully different outcomes, not just different words
- [ ] NPC greetings are distinct to their archetype (a blacksmith sounds like a blacksmith)
- [ ] Feature descriptions paint a vivid scene in 1-2 sentences
- [ ] No anachronisms (no "okay", "cool", "guys", etc.)
- [ ] Rich sensory language: what does the player see, hear, smell?
- [ ] Names feel English/Arthurian: Aldric, Millbrook, Thornfield -- not Zyx'thar or CyberKnight
- [ ] Duration estimates are realistic (count the steps, estimate play time)
