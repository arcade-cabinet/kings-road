# Product: King's Road

Config-driven 3D RPG engine. The player walks a 30km pilgrimage — the King's Road — from the farming village of Ashford to the ancient temple of Grailsend, seeking the Holy Grail.

## Core Loop

Walk the road, encounter NPCs, complete quests (macro/meso/micro tiers), explore towns and ruins, collect items. All non-micro quests offer A/B branching with meaningful choices.

## Mood & Tone

Pastoral, romanticized medieval English. Warm cream backgrounds, golden sunlight, Lora/Crimson Text typography. No grimdark, edgy, or nihilistic content. Think rolling meadows, stone bridges, thatched-roof taverns.

## Content Model

All game content (quests, NPCs, features, encounters, items, monsters) is authored as JSON files in `content/`, validated against Zod schemas in `src/schemas/`. Content is never placed in `src/`.
