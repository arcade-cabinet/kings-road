# Contributing Content to King's Road

This guide is for agentic content generation (Ralph-TUI) and human authors creating game content for King's Road.

## Content Directory Structure

```
content/
├── world/
│   ├── road-spine.json          # Road spine + anchor definitions
│   └── pacing.json              # Pacing intervals config
├── quests/
│   ├── main-chapter-00.json     # Main quest chapters (1 per file)
│   ├── meso-poisoned-well.json  # Side quests (1 per file)
│   └── ...
├── npcs/
│   └── archetypes.json          # NPC archetype definitions
├── features/
│   └── roadside-features.json   # Roadside feature definitions
├── items/
│   └── items.json               # Item definitions
├── encounters/
│   └── encounters.json          # Encounter definitions
├── game-config.json             # Master config (combines all)
└── CONTRIBUTING.md              # This file
```

## Validation

All content must pass Zod schema validation before merging:

```bash
npx tsx scripts/validate-trove.ts           # Validate all content
npx tsx scripts/validate-trove.ts --verbose  # With detailed stats
```

The validator checks:
- JSON syntax
- Schema conformance (types, lengths, enums)
- Referential integrity (quest prerequisites exist, anchors are valid)
- A/B branch coverage for meso/macro quests
- Dialogue word count minimums
- Substance score (dialogue density per quest)

## Tone Guide

King's Road has a **pastoral, romanticized medieval English** tone.

**DO:**
- Warm, inviting, hopeful language
- Rich sensory descriptions (sunlight, birdsong, bread baking, meadow flowers)
- Characters who are weary but kind, or gruff but fair
- References to seasons, harvests, pilgrimages, holy days
- Arthurian resonance (Grail quests, noble virtues, chivalry)
- Regional English vocabulary (dale, shire, moor, heath, downs, brook)

**DO NOT:**
- Grimdark, edgy, or nihilistic tone
- Gratuitous violence or cruelty
- Modern slang or anachronisms
- Generic fantasy cliches (dark lords, chosen ones with no nuance)
- Sarcasm or irony that breaks the pastoral mood

## Schema Examples

### Quest (micro — linear, no branches required)

```json
{
  "id": "micro-lost-merchant",
  "tier": "micro",
  "title": "The Lost Merchant",
  "estimatedMinutes": 8,
  "anchorAffinity": "anchor-01",
  "trigger": { "type": "roadside", "distanceRange": [5000, 7000] },
  "steps": [
    {
      "id": "step-01",
      "type": "dialogue",
      "npcArchetype": "merchant",
      "dialogueMinWords": 20,
      "dialogueMaxWords": 80,
      "dialogue": "Good traveler, I have lost my way. The road forked and I took the wrong path. Could you escort me to Millbrook?"
    },
    {
      "id": "step-02",
      "type": "escort",
      "destination": "anchor-01",
      "description": "Escort the merchant to Millbrook."
    }
  ],
  "reward": { "type": "item", "itemId": "merchant-map" }
}
```

### Quest (meso — requires A/B branches)

```json
{
  "id": "meso-poisoned-well",
  "tier": "meso",
  "title": "The Poisoned Well",
  "estimatedMinutes": 25,
  "anchorAffinity": "anchor-02",
  "trigger": { "type": "anchor", "anchorId": "anchor-02" },
  "branches": {
    "A": {
      "label": "Confront the poisoner",
      "steps": [
        { "id": "a-01", "type": "investigate", "description": "Search the well house for clues." },
        { "id": "a-02", "type": "encounter", "encounterId": "poisoner-fight" }
      ],
      "reward": { "type": "modifier", "modifierId": "village-hero" }
    },
    "B": {
      "label": "Find the cure",
      "steps": [
        { "id": "b-01", "type": "fetch", "itemId": "moonpetal", "description": "Find moonpetal herbs in the forest." },
        { "id": "b-02", "type": "dialogue", "npcArchetype": "healer", "dialogue": "You found the moonpetal! Let me brew the antidote right away for the village folk.", "dialogueMinWords": 15, "dialogueMaxWords": 60 }
      ],
      "reward": { "type": "modifier", "modifierId": "village-healer" }
    }
  },
  "reward": { "type": "item", "itemId": "well-keeper-ring" }
}
```

### NPC Archetype

```json
{
  "id": "npc-blacksmith-01",
  "archetype": "blacksmith",
  "namePool": ["Aldric", "Brennan", "Cedric"],
  "greetingPool": [
    { "text": "Welcome to my forge, traveler. What can I craft for you today?" },
    { "text": "The anvil sings when good steel meets it. What do you need?" }
  ],
  "appearance": {
    "clothColor": "#8B4513",
    "accessory": "leather_apron"
  }
}
```

### Feature

```json
{
  "id": "feat-stone-bridge-01",
  "tier": "minor",
  "name": "Old Stone Bridge",
  "description": "A weathered stone bridge spanning a gentle brook, covered in moss.",
  "visualType": "stone_bridge",
  "interactable": true,
  "dialogueOnInteract": "The stones here have been worn smooth by centuries of travelers."
}
```

### Item

```json
{
  "id": "merchant-map",
  "name": "Merchant's Map",
  "description": "A hand-drawn map showing hidden paths along the King's Road.",
  "type": "key_item"
}
```

### Encounter

```json
{
  "id": "poisoner-fight",
  "name": "Confronting the Poisoner",
  "type": "combat",
  "difficulty": 4,
  "description": "A tense confrontation with the person responsible for poisoning the village well.",
  "rewards": [
    { "itemId": "poisoner-confession", "chance": 1 },
    { "itemId": "rare-herb", "chance": 0.3 }
  ],
  "failureConsequence": "The poisoner escapes, and the village grows sicker."
}
```

## Length Requirements

| Content Type | Field | Min | Max |
|---|---|---|---|
| Anchor | description | 10 chars | 500 chars |
| Anchor | name | 2 chars | 60 chars |
| Quest | title | 3 chars | 100 chars |
| Quest step dialogue | words | dialogueMinWords (default 15) | dialogueMaxWords (default 80) |
| NPC | name pool entries | 2 chars each | 40 chars each |
| NPC | greeting text | 10 chars | 300 chars |
| NPC | name pool size | 3 minimum | - |
| NPC | greeting pool size | 2 minimum | - |
| Feature | description | 10 chars | 300 chars |
| Item | description | 10 chars | 300 chars |
| Encounter | description | 10 chars | 500 chars |
| Branch | label | 3 chars | 100 chars |

## A/B Branching Rules

- **Micro quests** may use linear `steps` (no branches required)
- **Meso quests** MUST have `branches` with both `A` and `B` paths
- **Macro quests** MUST have `branches` with both `A` and `B` paths
- Each branch must have at least 1 step
- Each branch should offer a meaningfully different approach (not just cosmetic)
- Branch labels should be clear, actionable choices ("Confront the poisoner" vs "Find the cure")

## Balance Constraints

- Micro quests: 5-15 estimated minutes
- Meso quests: 15-45 estimated minutes
- Macro quests: 30-120 estimated minutes
- Encounter difficulty: 1-10 scale
- Reward drop chance: 0.0 to 1.0
- Each anchor should have at least 1 feature
- Road spine must start at distance 0 (home town)
- Road spine requires at least 2 anchors

## Valid Enums

**Anchor types:** VILLAGE_FRIENDLY, VILLAGE_HOSTILE, DUNGEON, WAYPOINT

**Biomes:** MEADOW, FOREST, HILLS, FARMLAND, MOOR, RIVERSIDE

**Quest tiers:** macro, meso, micro

**Quest step types:** dialogue, fetch, escort, investigate, encounter, travel, puzzle

**NPC archetypes:** blacksmith, innkeeper, merchant, wanderer, healer, knight, hermit, farmer, priest, noble, bandit, scholar

**Feature tiers:** ambient, minor, major

**Item types:** key_item, consumable, equipment, quest_item, modifier

**Encounter types:** combat, puzzle, social, stealth, survival

**Reward types:** item, modifier, unlock, currency

**Trigger types:** roadside (with distanceRange), anchor (with anchorId), prerequisite (with questId)
