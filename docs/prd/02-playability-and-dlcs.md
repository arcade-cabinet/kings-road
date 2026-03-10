# Playability Analysis & Future Expansions (DLCs)

## 1. Playability Gaps & UX Improvements

### Core Issue: The "Dead Zone" Problem
Our headless AI playtester identified a critical playability gap: players traveling along the main King's Road frequently encounter "dead zones"—stretches of 20+ tiles with no settlements, encounters, or interactable features. 

**Root Cause:** The `feature-placement.ts` algorithm currently excludes all road tiles (`if (tile.hasRoad) continue;`). Since the safest and most obvious path for the player is the road, they are paradoxically starved of ambient content (shrines, milestones, abandoned camps) which are only spawning in the deep wilderness.

**UX Resolution Plan:**
1. **Roadside Features:** Modify the world generator to explicitly place specific features (`milestone_marker`, `wayside_shrine`, `crossroads_sign`, `abandoned_camp`) directly adjacent to or on road tiles.
2. **Visual Density:** Leverage the `3DPSX` Nature and Props asset libraries to populate these dead zones with high-fidelity rocks, bushes, and thematic props.
3. **Automated Enforcement:** Introduce a dedicated `playability-gaps.test.ts` suite to strictly enforce that the maximum distance between points of interest on the main path never exceeds 15 tiles.

---

## 2. Expansion Concepts (DLCs)

To keep building and expanding the kingdom, we will transition from purely procedural "Lego-block" rendering to a **Hybrid Rendering Architecture**. We will use our procedural generation to place footprints, logical interactions, and physics, but we will render actual CC0 high-fidelity models (specifically from the `3DPSX/Fantasy` collection) over them.

### DLC 1: "The Thriving Towns" (Hybrid Town Overhaul)
- **Theme:** Vibrant, high-density settlement life using actual handcrafted models.
- **Mechanics:** Expands the settlement system. Hamlets and Villages transition from boxy primitive buildings to full PSX-style meshes.
- **Assets Needed:** Leverage `3DPSX/Fantasy/Village Buildings` for all town and city rendering. Utilize `Props/Farm` (fences, carts, crops) and `Props/Kitchen` for ambient town detailing.

### DLC 2: "Shadows of the Underdark" (Hybrid Dungeons)
- **Theme:** Subterranean exploration and deep-tier danger.
- **New Biomes:** Modular Caverns and Crystal Mines.
- **Mechanics:** Dungeon generation will compose procedural floor plans mapped to the `3DPSX/Fantasy/PSX Dungeon` model kits.
- **Assets Needed:** Utilize the `PSX Dungeon Boxes and Barrels Pack`, `PSX Dungeon Mine Prop Pack`, and `PSX Dungeon Loot Pack` to build modular dungeon rooms filled with interactive elements.

### DLC 3: "The Bandit King's Rebellion"
- **Theme:** Dynamic faction warfare along the King's Road.
- **Mechanics:** 
  - Road tiles in `moor` and `forest` biomes have a dynamically increasing encounter rate for `bandit` and `bandit_leader` archetypes.
  - New "Ambush" encounters where trees/bushes obscure line of sight.
- **Assets Needed:** Utilize the `Props/Weapons` assets to construct fortified bandit barricades across the road.
