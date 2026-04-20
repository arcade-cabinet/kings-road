---
title: Changelog
updated: 2026-04-09
status: current
domain: technical
---

# Changelog

All notable changes to King's Road will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.19](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.18...kings-road-v1.5.19) (2026-04-20)


### Documentation

* **plans:** path-to-1.0 PRD with macro/meso/micro tiers ([#218](https://github.com/arcade-cabinet/kings-road/issues/218)) ([06f5f7a](https://github.com/arcade-cabinet/kings-road/commit/06f5f7a8f6e194e7a0ff08633997c1e1e762bf04))

## [1.5.18](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.17...kings-road-v1.5.18) (2026-04-20)


### Documentation

* **audit:** log entries 23-32 from this session's bug-hunt ([#216](https://github.com/arcade-cabinet/kings-road/issues/216)) ([8fb5d7b](https://github.com/arcade-cabinet/kings-road/commit/8fb5d7ba8537599f57043afb52739a8b28bba4d5))

## [1.5.17](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.16...kings-road-v1.5.17) (2026-04-20)


### Fixed

* **save:** autosave on enterDungeon/exitDungeon/moveToRoom ([#214](https://github.com/arcade-cabinet/kings-road/issues/214)) ([dad1f8e](https://github.com/arcade-cabinet/kings-road/commit/dad1f8ee884d136f9f8229f715d5f67103f4fe8f))

## [1.5.16](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.15...kings-road-v1.5.16) (2026-04-20)


### Fixed

* **save:** autosave on collectGem — relic pickups were not persisted ([#212](https://github.com/arcade-cabinet/kings-road/issues/212)) ([6d06399](https://github.com/arcade-cabinet/kings-road/commit/6d063997bd7301384c438b23ddd1ea1ab518435d))

## [1.5.15](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.14...kings-road-v1.5.15) (2026-04-20)


### Fixed

* **audio:** dispose every Tone node on layer teardown, not just gain ([#210](https://github.com/arcade-cabinet/kings-road/issues/210)) ([83ac3f0](https://github.com/arcade-cabinet/kings-road/commit/83ac3f054bac44d0ea04566680b77eb6dc67cee2))

## [1.5.14](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.13...kings-road-v1.5.14) (2026-04-20)


### Fixed

* **input:** clear held keys/mouse buttons on window blur ([#207](https://github.com/arcade-cabinet/kings-road/issues/207)) ([f446d91](https://github.com/arcade-cabinet/kings-road/commit/f446d912b1e6ee20a7e4a351d18e76287697015a))
* **test:** update KeyboardMouseProvider listener count for blur handler ([#209](https://github.com/arcade-cabinet/kings-road/issues/209)) ([7c2b2d7](https://github.com/arcade-cabinet/kings-road/commit/7c2b2d726fc2977df460c7fbf650a451e09612ce))

## [1.5.13](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.12...kings-road-v1.5.13) (2026-04-20)


### Fixed

* **dungeon:** dispose per-room wall material clone on unmount ([#203](https://github.com/arcade-cabinet/kings-road/issues/203)) ([c83e72f](https://github.com/arcade-cabinet/kings-road/commit/c83e72fb786185d08237b6cfa8d73cc9ed790ae1))
* **road:** dispose merged geometry + cloned material on unmount ([#200](https://github.com/arcade-cabinet/kings-road/issues/200)) ([596e23a](https://github.com/arcade-cabinet/kings-road/commit/596e23a61e94b8212638592eb3fe66d8eb7c6327))
* **save:** force-flush pending writes on tab hide/unload ([#205](https://github.com/arcade-cabinet/kings-road/issues/205)) ([9f86292](https://github.com/arcade-cabinet/kings-road/commit/9f86292a0f5e3d2bffb7b4dad8bf8df49dc285cd))

## [1.5.12](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.11...kings-road-v1.5.12) (2026-04-20)


### Fixed

* **combat-vfx:** dispose pooled sphere geo + SDF materials on unmount ([#202](https://github.com/arcade-cabinet/kings-road/issues/202)) ([4103013](https://github.com/arcade-cabinet/kings-road/commit/4103013e24a4be13a291a0315138403a0cfb2b1a))
* **ocean:** dispose PlaneGeometry + ShaderMaterial on unmount ([#199](https://github.com/arcade-cabinet/kings-road/issues/199)) ([d45c06f](https://github.com/arcade-cabinet/kings-road/commit/d45c06f5e480078a82379b966e99de45b0341dbe))

## [1.5.11](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.10...kings-road-v1.5.11) (2026-04-20)


### Fixed

* **relic:** clean up imperative pickup overlays on unmount ([#198](https://github.com/arcade-cabinet/kings-road/issues/198)) ([11bd889](https://github.com/arcade-cabinet/kings-road/commit/11bd8896aa4f50d7d6c20b0ac78024731d47d758))

## [1.5.10](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.9...kings-road-v1.5.10) (2026-04-20)


### Fixed

* **deps:** align jsdom specifier with lockfile to fix frozen-install drift ([#196](https://github.com/arcade-cabinet/kings-road/issues/196)) ([4be12e4](https://github.com/arcade-cabinet/kings-road/commit/4be12e407b446951d69e516d272df1a23eb01ad4))

## [1.5.9](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.8...kings-road-v1.5.9) (2026-04-20)


### Fixed

* **touch:** let scrollable modals finger-scroll on mobile ([#194](https://github.com/arcade-cabinet/kings-road/issues/194)) ([781bd9b](https://github.com/arcade-cabinet/kings-road/commit/781bd9b949265db804d29070e429748b5dbe5fdf))

## [1.5.8](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.7...kings-road-v1.5.8) (2026-04-20)


### Fixed

* **loading-overlay:** cancel inner fade-out timer on unmount ([#184](https://github.com/arcade-cabinet/kings-road/issues/184)) ([ffe451d](https://github.com/arcade-cabinet/kings-road/commit/ffe451da6bd89514e5986cd26c51d9e68d6b712d))

## [1.5.7](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.6...kings-road-v1.5.7) (2026-04-20)


### Fixed

* **errors:** stop showing two overlays for one uncaught error ([#179](https://github.com/arcade-cabinet/kings-road/issues/179)) ([503c5ef](https://github.com/arcade-cabinet/kings-road/commit/503c5ef5e0be92af2c3de5862ec6952cc32ca11c))

## [1.5.6](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.5...kings-road-v1.5.6) (2026-04-20)


### Documentation

* **debug:** correct README — applyDebugSpawn runs in prod ([#172](https://github.com/arcade-cabinet/kings-road/issues/172)) ([1ddf35e](https://github.com/arcade-cabinet/kings-road/commit/1ddf35ea30dd8c5d1ae35260b3a825c18d199130))

## [1.5.5](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.4...kings-road-v1.5.5) (2026-04-20)


### Fixed

* **world:** clear isGenerating on error so overlay doesn't strand ([#169](https://github.com/arcade-cabinet/kings-road/issues/169)) ([ce4452c](https://github.com/arcade-cabinet/kings-road/commit/ce4452c637a40cefc6a454adeddcda2e1cece03b))

## [1.5.4](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.3...kings-road-v1.5.4) (2026-04-20)


### Fixed

* **save:** skip corrupt slots in listSaveSlots instead of crashing ([#166](https://github.com/arcade-cabinet/kings-road/issues/166)) ([eb9262a](https://github.com/arcade-cabinet/kings-road/commit/eb9262ad60a76a847694cd65e6ab0580cad8598c))

## [1.5.3](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.2...kings-road-v1.5.3) (2026-04-20)


### Fixed

* **dialogue:** cancel close-animation timer on unmount ([#164](https://github.com/arcade-cabinet/kings-road/issues/164)) ([dfe0137](https://github.com/arcade-cabinet/kings-road/commit/dfe013737704c6fc9bcfcc769e15534b5f983141))

## [1.5.2](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.1...kings-road-v1.5.2) (2026-04-20)


### Fixed

* dispose tinted material clones in GlbInstancer ([#16](https://github.com/arcade-cabinet/kings-road/issues/16)) ([#160](https://github.com/arcade-cabinet/kings-road/issues/160)) ([cb1e3c8](https://github.com/arcade-cabinet/kings-road/commit/cb1e3c8c3f31fbce1a8e89f0d94919b6d3a65427))

## [1.5.1](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.5.0...kings-road-v1.5.1) (2026-04-20)


### Fixed

* dynamic shadow frustum far at dawn/dusk ([#12](https://github.com/arcade-cabinet/kings-road/issues/12)) ([#157](https://github.com/arcade-cabinet/kings-road/issues/157)) ([f31f0bd](https://github.com/arcade-cabinet/kings-road/commit/f31f0bded6865e6dd626ae792993fdda2a7e7e71))
* pause simulation on tab-hidden ([#21](https://github.com/arcade-cabinet/kings-road/issues/21)) ([#153](https://github.com/arcade-cabinet/kings-road/issues/153)) ([acab934](https://github.com/arcade-cabinet/kings-road/commit/acab9345eebc9e971f641f2022f0cf63fbf01c08))
* pin Canvas outputColorSpace to sRGB explicitly ([#15](https://github.com/arcade-cabinet/kings-road/issues/15)) ([#158](https://github.com/arcade-cabinet/kings-road/issues/158)) ([7551301](https://github.com/arcade-cabinet/kings-road/commit/755130180152e4fc82b733b91e34565a1e46e622))


### Documentation

* add 2026-04-20 hidden-behavior audit log ([#156](https://github.com/arcade-cabinet/kings-road/issues/156)) ([2ba3971](https://github.com/arcade-cabinet/kings-road/commit/2ba3971f71cdbf3a07419ff04c25702c649a1912))

## [1.5.0](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.4.0...kings-road-v1.5.0) (2026-04-20)


### Added

* **benchmark:** automated route runner + capture + Playwright CI (task [#20](https://github.com/arcade-cabinet/kings-road/issues/20)) ([#70](https://github.com/arcade-cabinet/kings-road/issues/70)) ([0c17c08](https://github.com/arcade-cabinet/kings-road/commit/0c17c08d4925024011e1a4634c7f9ac2b4d59104))
* **benchmark:** Thornfield performance harness (task [#22](https://github.com/arcade-cabinet/kings-road/issues/22)) ([#148](https://github.com/arcade-cabinet/kings-road/issues/148)) ([d1bf784](https://github.com/arcade-cabinet/kings-road/commit/d1bf784c0fdd88b5f68e843bb575ffbf7116dd3e))
* **biome:** scaffold src/biome/ Layer-2a package ([#60](https://github.com/arcade-cabinet/kings-road/issues/60)) ([7425e77](https://github.com/arcade-cabinet/kings-road/commit/7425e77bd9c2778cd83e01006da569c6da361551))
* **ci:** package boundary enforcement ([#65](https://github.com/arcade-cabinet/kings-road/issues/65)) ([c7541bb](https://github.com/arcade-cabinet/kings-road/commit/c7541bbe45e84f3f3104ed41325eabc06fe10564))
* **composition/ruins:** Thornfield dead-town compositor + 33 ruin assets ([#61](https://github.com/arcade-cabinet/kings-road/issues/61)) ([bcb0cd8](https://github.com/arcade-cabinet/kings-road/commit/bcb0cd8198993a4ef3cd96890690cca6eb9fdd9d))
* **composition/story-props:** narrative seed-layer compositor, 8 archetypes ([#63](https://github.com/arcade-cabinet/kings-road/issues/63)) ([b9d69ac](https://github.com/arcade-cabinet/kings-road/commit/b9d69aca4c15fc7394f10aa9f072ab97180b8034))
* **composition:** dungeon-kit compositor — Layer-3 modular dungeon composer ([#71](https://github.com/arcade-cabinet/kings-road/issues/71)) ([5a4cdd9](https://github.com/arcade-cabinet/kings-road/commit/5a4cdd984a3779ce267b4320f1e927232ad62e45))
* **composition:** vegetation compositor — biome-aware Poisson-disk foliage placement ([#74](https://github.com/arcade-cabinet/kings-road/issues/74)) ([2bfaf9e](https://github.com/arcade-cabinet/kings-road/commit/2bfaf9e1d3541594e96073ef9d0571dd28660ebe))
* **content:** Thornfield biome — 15 PBR + 2 HDRIs + palette + config (task [#6](https://github.com/arcade-cabinet/kings-road/issues/6)) ([#80](https://github.com/arcade-cabinet/kings-road/issues/80)) ([a2d6418](https://github.com/arcade-cabinet/kings-road/commit/a2d641815c6edf3812499345b3f2b31fc535c071))
* **core:** scaffold src/core/ Layer-0 package ([#57](https://github.com/arcade-cabinet/kings-road/issues/57)) ([fe4bd7d](https://github.com/arcade-cabinet/kings-road/commit/fe4bd7daa46c13e726fb6c89906e3bc9194d9f67))
* **debug:** src/debug/ — spawn override + live-fire helpers (task [#8](https://github.com/arcade-cabinet/kings-road/issues/8)) ([#66](https://github.com/arcade-cabinet/kings-road/issues/66)) ([e248adf](https://github.com/arcade-cabinet/kings-road/commit/e248adf2cd9b21793eba440c1ca34e123c400583))
* **errors:** runtime error bus + remove silent fallbacks ([#144](https://github.com/arcade-cabinet/kings-road/issues/144)) ([c2c3806](https://github.com/arcade-cabinet/kings-road/commit/c2c3806603dc430c511a7206baef5a11f01e4a94))
* **fixtures:** Phase A+B1 — FixtureStage + weapons + ruins visual tests ([#150](https://github.com/arcade-cabinet/kings-road/issues/150)) ([135d998](https://github.com/arcade-cabinet/kings-road/commit/135d998af53c6d31f88854bb43c6faa1bdd4dbc1))
* **hud:** concrete functional HUD + recenter FPS viewmodel for mobile ([#102](https://github.com/arcade-cabinet/kings-road/issues/102)) ([d038ecc](https://github.com/arcade-cabinet/kings-road/commit/d038ecc3c03d71d93cb6fbdf6fd7bd5860aab268))
* **pages:** default Thornfield spawn + post-processing on GH Pages ([#97](https://github.com/arcade-cabinet/kings-road/issues/97)) ([244dfa3](https://github.com/arcade-cabinet/kings-road/commit/244dfa31bd6ddda3531ee222ac6faa28e95decbc))
* **scene/dungeon:** kit renderer + AccumulativeShadows + bake (task [#15](https://github.com/arcade-cabinet/kings-road/issues/15)) ([#84](https://github.com/arcade-cabinet/kings-road/issues/84)) ([93ed17d](https://github.com/arcade-cabinet/kings-road/commit/93ed17d8327993c0e80c27cf21994479717ed6ba))
* **scene/environment:** HDRI IBL + biome-driven sky (task [#14](https://github.com/arcade-cabinet/kings-road/issues/14)) ([#79](https://github.com/arcade-cabinet/kings-road/issues/79)) ([afa9b32](https://github.com/arcade-cabinet/kings-road/commit/afa9b32554d25cc0c857545172ed5d4933819873))
* **scene/terrain:** TerrainChunk + SplatBlendMaterial (task [#13](https://github.com/arcade-cabinet/kings-road/issues/13)) ([#85](https://github.com/arcade-cabinet/kings-road/issues/85)) ([5ba62b9](https://github.com/arcade-cabinet/kings-road/commit/5ba62b96072ebe1103ddc613530c87b42d89185f))
* **scene:** rewire Chunk.tsx to consume composition output (task [#16](https://github.com/arcade-cabinet/kings-road/issues/16)) ([#89](https://github.com/arcade-cabinet/kings-road/issues/89)) ([79945b0](https://github.com/arcade-cabinet/kings-road/commit/79945b026b3922dce4ff9a3db5f44a19424736db))
* VFX pipeline — SDF combat effects, biome postprocessing, mobile perf guard ([#17](https://github.com/arcade-cabinet/kings-road/issues/17)+[#18](https://github.com/arcade-cabinet/kings-road/issues/18)+[#19](https://github.com/arcade-cabinet/kings-road/issues/19)) ([#86](https://github.com/arcade-cabinet/kings-road/issues/86)) ([2029fd0](https://github.com/arcade-cabinet/kings-road/commit/2029fd0ffbf9c75f14d9c744ab30025059b367fa))
* **village:** Phase A — authored village parts catalog + schema ([#147](https://github.com/arcade-cabinet/kings-road/issues/147)) ([361924b](https://github.com/arcade-cabinet/kings-road/commit/361924bf4351f79ebe23243977401a690859e013))
* **village:** Phase B — procedural composer + Chunk integration ([#151](https://github.com/arcade-cabinet/kings-road/issues/151)) ([25646a6](https://github.com/arcade-cabinet/kings-road/commit/25646a6b4a35f262e07c957d7715cd571303bf84))
* **world/terrain:** heightmap loader + displaced geometry + splat-map (task [#7](https://github.com/arcade-cabinet/kings-road/issues/7)) ([#68](https://github.com/arcade-cabinet/kings-road/issues/68)) ([50d89b0](https://github.com/arcade-cabinet/kings-road/commit/50d89b05cc7ac9761087c6417e92c8fe382df09e))


### Fixed

* **assets:** harden loader + ingest scripts against traversal and concurrent loads ([#87](https://github.com/arcade-cabinet/kings-road/issues/87)) ([5a62669](https://github.com/arcade-cabinet/kings-road/commit/5a6266982b18e67b8d1f97e070c794c7dead2a7f))
* **assets:** ingest whole pack dirs, AmbientCG native filenames ([#67](https://github.com/arcade-cabinet/kings-road/issues/67)) ([be71fd6](https://github.com/arcade-cabinet/kings-road/commit/be71fd68a2f5899bc3bff28d4e0aa194203a4847))
* auto-persist quest progress ([#20](https://github.com/arcade-cabinet/kings-road/issues/20)) ([#154](https://github.com/arcade-cabinet/kings-road/issues/154)) ([e885333](https://github.com/arcade-cabinet/kings-road/commit/e88533323a8842b7c1faf3c13b5319e5d5c36fca))
* **benchmark:** use settlement-relative spawn so scene actually renders ([#149](https://github.com/arcade-cabinet/kings-road/issues/149)) ([ff2c5f3](https://github.com/arcade-cabinet/kings-road/commit/ff2c5f335461a0a7756bfc6cd9d076f0701a4ef6))
* **biome:** schema cross-validation + same-biome short-circuit + ChunkRoleTag rename ([#91](https://github.com/arcade-cabinet/kings-road/issues/91)) ([1beb43c](https://github.com/arcade-cabinet/kings-road/commit/1beb43cdaf511767887851de415c2bccc576b246))
* **ci:** actually run browser tests — install playwright, fail on errors ([#145](https://github.com/arcade-cabinet/kings-road/issues/145)) ([6462447](https://github.com/arcade-cabinet/kings-road/commit/6462447beda31e7b01625a5c60e4193fbba4ab4f))
* **db:** replace jeep-sqlite web path with sql.js, fix wasm LinkError ([#92](https://github.com/arcade-cabinet/kings-road/issues/92)) ([8535d50](https://github.com/arcade-cabinet/kings-road/commit/8535d50a92232ea628d63e147a2de813dae8b317))
* **debug:** load content DB + generate kingdom in applyDebugSpawn ([#95](https://github.com/arcade-cabinet/kings-road/issues/95)) ([4477c29](https://github.com/arcade-cabinet/kings-road/commit/4477c29c9c1460addb06ce91625f088bbaaa5636))
* **dungeon:** dark background when inDungeon so sky-blue doesn't flash through ([#104](https://github.com/arcade-cabinet/kings-road/issues/104)) ([3bef4f9](https://github.com/arcade-cabinet/kings-road/commit/3bef4f95e641dcefc4d444e20934ad7f9d4b34a9))
* **env:** wire fog to biome config ([#106](https://github.com/arcade-cabinet/kings-road/issues/106)) ([6f066db](https://github.com/arcade-cabinet/kings-road/commit/6f066dbe8f18d7d5f5b432eae2b1911567eaf179))
* fog decay + benchmark sampler priority ([#152](https://github.com/arcade-cabinet/kings-road/issues/152)) ([7d119c6](https://github.com/arcade-cabinet/kings-road/commit/7d119c6f8ccf242dfc4ab1dd3135aff6e9a7c16d))
* gate sword swings on forward-cone hit test ([#19](https://github.com/arcade-cabinet/kings-road/issues/19)) ([#155](https://github.com/arcade-cabinet/kings-road/issues/155)) ([f515d8e](https://github.com/arcade-cabinet/kings-road/commit/f515d8e361a17ed8c2462da28c732a7f86fe41a2))
* **gltf:** disable frustum culling on InstancedMesh so grass actually renders ([#117](https://github.com/arcade-cabinet/kings-road/issues/117)) ([e66f7d4](https://github.com/arcade-cabinet/kings-road/commit/e66f7d475458b7342c483e46b8786d75a1ca6e9c))
* **gltf:** duck-type MeshStandardMaterial check so tint actually fires ([#114](https://github.com/arcade-cabinet/kings-road/issues/114)) ([846d3d3](https://github.com/arcade-cabinet/kings-road/commit/846d3d38a067ea4010f9d353a077bf4ab6015e08))
* **gltf:** set InstancedMesh.frustumCulled imperatively in useEffect ([#118](https://github.com/arcade-cabinet/kings-road/issues/118)) ([d3b3be4](https://github.com/arcade-cabinet/kings-road/commit/d3b3be4879d225c263ec9d51967e09419b6e1329))
* **lint:** biome organize-imports + formatting in ruins/compose ([#93](https://github.com/arcade-cabinet/kings-road/issues/93)) ([0155818](https://github.com/arcade-cabinet/kings-road/commit/01558184a3e246037529fb4140f7a7e0cadc7a93))
* **pages:** disable post-processing until render-loop interaction is resolved ([#99](https://github.com/arcade-cabinet/kings-road/issues/99)) ([67389f1](https://github.com/arcade-cabinet/kings-road/commit/67389f1f2f1be2c8fcade48783497abb626d3e40))
* **pbr:** AO + displacement maps now actually affect the render ([#146](https://github.com/arcade-cabinet/kings-road/issues/146)) ([d91c048](https://github.com/arcade-cabinet/kings-road/commit/d91c048c641c4c14e25f3431e669e8676bc72967))
* **player:** correct the inverted right-vector so strafe goes the right way ([#101](https://github.com/arcade-cabinet/kings-road/issues/101)) ([356481f](https://github.com/arcade-cabinet/kings-road/commit/356481f23afe75953fb3348a7e1c92ce29cfac36))
* **postprocessing:** bypass @react-three/postprocessing to stop JSON cycle crash ([#98](https://github.com/arcade-cabinet/kings-road/issues/98)) ([dcbfce3](https://github.com/arcade-cabinet/kings-road/commit/dcbfce388115701ccb6646d29e9ae7e561156d8a))
* **road:** stop floating + bind PBR material instead of flat colour ([#100](https://github.com/arcade-cabinet/kings-road/issues/100)) ([1b14180](https://github.com/arcade-cabinet/kings-road/commit/1b14180ee93a7126b6de8cf3c8d35c58445703b7))
* **ruins:** scale ruin assets + denser placement for Thornfield ([#109](https://github.com/arcade-cabinet/kings-road/issues/109)) ([3ad7f85](https://github.com/arcade-cabinet/kings-road/commit/3ad7f85f018cf5a38d8556372bf5f007c6f9a925))
* **scene+hud:** scale foliage, orient sword, add HUD frame ([#108](https://github.com/arcade-cabinet/kings-road/issues/108)) ([9c5ce86](https://github.com/arcade-cabinet/kings-road/commit/9c5ce866dbd3adb13ca59ec88990c0fb989fb04d))
* **scripts:** replace top-level file loop with fs.cpSync in ingest scripts ([#83](https://github.com/arcade-cabinet/kings-road/issues/83)) ([62182a7](https://github.com/arcade-cabinet/kings-road/commit/62182a788669bc8e5cfb86f07424c738cc10989a))
* task [#21](https://github.com/arcade-cabinet/kings-road/issues/21) integration blockers — unreferenced assets + postprocessing crash + spawn wiring ([#94](https://github.com/arcade-cabinet/kings-road/issues/94)) ([a0a8273](https://github.com/arcade-cabinet/kings-road/commit/a0a8273ea39af2400fb39622174f8dc96442e30c))
* **terrain:** correct MAX_TERRAIN_HEIGHT to match rendered displacement ([#107](https://github.com/arcade-cabinet/kings-road/issues/107)) ([54f1796](https://github.com/arcade-cabinet/kings-road/commit/54f17968e1b663ceec33dc077fc7e09ef06f0159))
* **thornfield:** land PBR + shader + spawn + viewmodel fixes for visible world ([#96](https://github.com/arcade-cabinet/kings-road/issues/96)) ([42f261a](https://github.com/arcade-cabinet/kings-road/commit/42f261a211c1bb28b3ef5fd4815837ff6a3a0a12))


### Documentation

* asset size budget + CI gate (100 MB baked-in ceiling) ([#76](https://github.com/arcade-cabinet/kings-road/issues/76)) ([e026ce5](https://github.com/arcade-cabinet/kings-road/commit/e026ce5560677ee5babe4bcbd9448652a550ce5d))
* PBR Material Standard + Thornfield curation picks ([#72](https://github.com/arcade-cabinet/kings-road/issues/72)) ([74a068f](https://github.com/arcade-cabinet/kings-road/commit/74a068fe158566e87f3894333d86cfd414988736))
* refresh STATE + ARCHITECTURE post-v1.4.0, archive asset-inventory ([#52](https://github.com/arcade-cabinet/kings-road/issues/52)) ([85e58ee](https://github.com/arcade-cabinet/kings-road/commit/85e58ee0d4a164b888b3868fa0fa9d1f852a0bfa))
* refresh visual-bugs.md post-v1.4.0 ([#54](https://github.com/arcade-cabinet/kings-road/issues/54)) ([77d7081](https://github.com/arcade-cabinet/kings-road/commit/77d70810136a9fabde74d3f1fc06a73f74d8479b))
* rewrite ASSET_SIZE_BUDGET around per-chunk resident memory ([#82](https://github.com/arcade-cabinet/kings-road/issues/82)) ([c00ea09](https://github.com/arcade-cabinet/kings-road/commit/c00ea090576ff889f968edf9057308c4bffc4a8e))

## [1.4.0](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.3.0...kings-road-v1.4.0) (2026-04-18)


### Added

* **textures:** replace procedural canvas with Polyhaven PBR ([#50](https://github.com/arcade-cabinet/kings-road/issues/50)) ([d82e029](https://github.com/arcade-cabinet/kings-road/commit/d82e02914ebb95911797b307ef6c0adbf4a9bf2e))

## [1.3.0](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.2.0...kings-road-v1.3.0) (2026-04-18)


### Added

* add ECS actions for player, NPC, and quest management ([9554ced](https://github.com/arcade-cabinet/kings-road/commit/9554ced7a8b0a55a4c95197391da079cb5d841ab))
* add master game config schema combining all sub-schemas ([f2ac063](https://github.com/arcade-cabinet/kings-road/commit/f2ac0638a3c3de94fa28a737364d016708558072))
* add NPC, feature, item, encounter, pacing schemas ([db3ac7a](https://github.com/arcade-cabinet/kings-road/commit/db3ac7a0046338cf084adda34b9b9a009fd6b0f9))
* add pacing engine for deterministic feature placement (E2) ([188c443](https://github.com/arcade-cabinet/kings-road/commit/188c4438ad16f47383a4cea582b18138718d41fd))
* add quest schema — macro/meso/micro tiers with A/B branching ([964d5c2](https://github.com/arcade-cabinet/kings-road/commit/964d5c28a2295f1b43783275188243519712302c))
* add road spine loader with Zod validation and helpers (E1) ([58036fc](https://github.com/arcade-cabinet/kings-road/commit/58036fc504590cbe4634b51d7634d79088e8d38a))
* add trove validation pipeline and contribution guide ([9d58161](https://github.com/arcade-cabinet/kings-road/commit/9d58161606860cdd41d69afb29d9cb3141c30ec9))
* add world schema — road spine, anchor points, regions ([355356d](https://github.com/arcade-cabinet/kings-road/commit/355356debf667b3e10a9e766407833bb5275d892))
* add zod dependency, scaffold schema directory ([60157af](https://github.com/arcade-cabinet/kings-road/commit/60157afe969770e7aee82f2bc5b05376443b9242))
* Capacitor migration, app/src restructure, CI fixes, browser test harness ([#33](https://github.com/arcade-cabinet/kings-road/issues/33)) ([07392df](https://github.com/arcade-cabinet/kings-road/commit/07392dfe911bc9eb821a32b27cad41c16ae30090))
* complete content trove + NPC archetype caricature system ([#8](https://github.com/arcade-cabinet/kings-road/issues/8)) ([c947927](https://github.com/arcade-cabinet/kings-road/commit/c94792784a77471114925638f8273b8b580334ca))
* define core ECS traits -- player, spatial, quest, NPC, pacing ([6742117](https://github.com/arcade-cabinet/kings-road/commit/6742117a650b35d861e6ff80758f0b65f4a6381d))
* dungeon persistence, combat fixes, kingdom map gen ([#9](https://github.com/arcade-cabinet/kings-road/issues/9)) ([39ddd6a](https://github.com/arcade-cabinet/kings-road/commit/39ddd6addc7af5772bd4e881c494cc48b1f4b670))
* **ecs:** add getSessionEntity + unsafe_resetSessionEntity (Koota Phase 0) ([#37](https://github.com/arcade-cabinet/kings-road/issues/37)) ([62e07c1](https://github.com/arcade-cabinet/kings-road/commit/62e07c1b1b4a2d18f618403f4093e167b9ce7449))
* **ecs:** Koota Phase 1 — InventoryUI Session trait behind inventoryStore facade ([#39](https://github.com/arcade-cabinet/kings-road/issues/39)) ([9e00662](https://github.com/arcade-cabinet/kings-road/commit/9e0066222fc5ca23edd2c94db2edb61a4b9dc4b5))
* Engine v2 — config-driven blueprint architecture ([#5](https://github.com/arcade-cabinet/kings-road/issues/5)) ([f872535](https://github.com/arcade-cabinet/kings-road/commit/f872535ea71c7ddf21d5889063c984a108ccfa35))
* Fix web build and integrate 3DPSX Chibi NPCs ([#13](https://github.com/arcade-cabinet/kings-road/issues/13)) ([526bd80](https://github.com/arcade-cabinet/kings-road/commit/526bd80a33bc4d1d3511aa1702a72186e51964ae))
* install koota, create ECS game world ([fca2328](https://github.com/arcade-cabinet/kings-road/commit/fca2328bc1b6526d70ae4a1cf1b0fd52870b4563))
* King's Road — complete game engine with pastoral medieval redesign ([d15b2d2](https://github.com/arcade-cabinet/kings-road/commit/d15b2d26d8acb509078550341370d2ecb46080c1))
* landing polish, diegetic gameplay frame, app/ reorganization, self-hosted fonts ([#36](https://github.com/arcade-cabinet/kings-road/issues/36)) ([3fa3b85](https://github.com/arcade-cabinet/kings-road/commit/3fa3b852a36b5e3d20be57eec1519e111734fb3c))
* migrate web build from Vite to Expo/Metro ([#11](https://github.com/arcade-cabinet/kings-road/issues/11)) ([c85ec85](https://github.com/arcade-cabinet/kings-road/commit/c85ec8596723664d3aca4d5775646318902bda9c))
* refactor worldGen to be road-aware with optional roadSpine (E3) ([cfdcb2c](https://github.com/arcade-cabinet/kings-road/commit/cfdcb2c04754f3e2d8974713cdd7c0a88f8102d8))
* wire Koota WorldProvider into React app ([c2da24e](https://github.com/arcade-cabinet/kings-road/commit/c2da24e25d2fa01a85eae239e4bc4f713dacdcfb))


### Fixed

* ensure content JSON loads on GitHub Pages ([#12](https://github.com/arcade-cabinet/kings-road/issues/12)) ([b38907f](https://github.com/arcade-cabinet/kings-road/commit/b38907f04f55dc798c7327d5293f33d949a3462c))
* pin @types/node to v22 matching CI Node version ([#4](https://github.com/arcade-cabinet/kings-road/issues/4)) ([b523250](https://github.com/arcade-cabinet/kings-road/commit/b52325077a98f4ff22525bd8521efda74304d7a5))
* resolve all Biome lint errors in game components ([3fb7213](https://github.com/arcade-cabinet/kings-road/commit/3fb72135191dd858c59fd688dbb32d20f1153234))
* resolve CI TypeScript check failures ([#3](https://github.com/arcade-cabinet/kings-road/issues/3)) ([11c8596](https://github.com/arcade-cabinet/kings-road/commit/11c8596a174ddde17dc47f81690977a453fe9030))
* **tsc:** remove vite.config.ts from main tsconfig include (double-include caused TS6305) ([#35](https://github.com/arcade-cabinet/kings-road/issues/35)) ([f70341f](https://github.com/arcade-cabinet/kings-road/commit/f70341f5fc211b53e98639e3f39a5983fb852b80))


### Documentation

* add CLAUDE.md for Claude Code sessions ([2d7ac5b](https://github.com/arcade-cabinet/kings-road/commit/2d7ac5b9b5135201fc94694573b884daae577a1b))
* add Ralph-TUI PRD for overnight content generation ([fefbcc8](https://github.com/arcade-cabinet/kings-road/commit/fefbcc8b5f2af08b67422c67247757e1f77a6a66))
* rewrite all documentation for King's Road redesign ([c4f97fb](https://github.com/arcade-cabinet/kings-road/commit/c4f97fb76e7a5bea64426ec57dc380122d3cd9eb))

## [1.2.0](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.1.0...kings-road-v1.2.0) (2026-04-18)


### Added

* **ecs:** add getSessionEntity + unsafe_resetSessionEntity (Koota Phase 0) ([#37](https://github.com/arcade-cabinet/kings-road/issues/37)) ([62e07c1](https://github.com/arcade-cabinet/kings-road/commit/62e07c1b1b4a2d18f618403f4093e167b9ce7449))
* **ecs:** Koota Phase 1 — InventoryUI Session trait behind inventoryStore facade ([#39](https://github.com/arcade-cabinet/kings-road/issues/39)) ([9e00662](https://github.com/arcade-cabinet/kings-road/commit/9e0066222fc5ca23edd2c94db2edb61a4b9dc4b5))

## [1.1.0](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.0.0...kings-road-v1.1.0) (2026-04-18)


### Added

* add ECS actions for player, NPC, and quest management ([9554ced](https://github.com/arcade-cabinet/kings-road/commit/9554ced7a8b0a55a4c95197391da079cb5d841ab))
* add master game config schema combining all sub-schemas ([f2ac063](https://github.com/arcade-cabinet/kings-road/commit/f2ac0638a3c3de94fa28a737364d016708558072))
* add NPC, feature, item, encounter, pacing schemas ([db3ac7a](https://github.com/arcade-cabinet/kings-road/commit/db3ac7a0046338cf084adda34b9b9a009fd6b0f9))
* add pacing engine for deterministic feature placement (E2) ([188c443](https://github.com/arcade-cabinet/kings-road/commit/188c4438ad16f47383a4cea582b18138718d41fd))
* add quest schema — macro/meso/micro tiers with A/B branching ([964d5c2](https://github.com/arcade-cabinet/kings-road/commit/964d5c28a2295f1b43783275188243519712302c))
* add road spine loader with Zod validation and helpers (E1) ([58036fc](https://github.com/arcade-cabinet/kings-road/commit/58036fc504590cbe4634b51d7634d79088e8d38a))
* add trove validation pipeline and contribution guide ([9d58161](https://github.com/arcade-cabinet/kings-road/commit/9d58161606860cdd41d69afb29d9cb3141c30ec9))
* add world schema — road spine, anchor points, regions ([355356d](https://github.com/arcade-cabinet/kings-road/commit/355356debf667b3e10a9e766407833bb5275d892))
* add zod dependency, scaffold schema directory ([60157af](https://github.com/arcade-cabinet/kings-road/commit/60157afe969770e7aee82f2bc5b05376443b9242))
* Capacitor migration, app/src restructure, CI fixes, browser test harness ([#33](https://github.com/arcade-cabinet/kings-road/issues/33)) ([07392df](https://github.com/arcade-cabinet/kings-road/commit/07392dfe911bc9eb821a32b27cad41c16ae30090))
* complete content trove + NPC archetype caricature system ([#8](https://github.com/arcade-cabinet/kings-road/issues/8)) ([c947927](https://github.com/arcade-cabinet/kings-road/commit/c94792784a77471114925638f8273b8b580334ca))
* define core ECS traits -- player, spatial, quest, NPC, pacing ([6742117](https://github.com/arcade-cabinet/kings-road/commit/6742117a650b35d861e6ff80758f0b65f4a6381d))
* dungeon persistence, combat fixes, kingdom map gen ([#9](https://github.com/arcade-cabinet/kings-road/issues/9)) ([39ddd6a](https://github.com/arcade-cabinet/kings-road/commit/39ddd6addc7af5772bd4e881c494cc48b1f4b670))
* Engine v2 — config-driven blueprint architecture ([#5](https://github.com/arcade-cabinet/kings-road/issues/5)) ([f872535](https://github.com/arcade-cabinet/kings-road/commit/f872535ea71c7ddf21d5889063c984a108ccfa35))
* Fix web build and integrate 3DPSX Chibi NPCs ([#13](https://github.com/arcade-cabinet/kings-road/issues/13)) ([526bd80](https://github.com/arcade-cabinet/kings-road/commit/526bd80a33bc4d1d3511aa1702a72186e51964ae))
* install koota, create ECS game world ([fca2328](https://github.com/arcade-cabinet/kings-road/commit/fca2328bc1b6526d70ae4a1cf1b0fd52870b4563))
* King's Road — complete game engine with pastoral medieval redesign ([d15b2d2](https://github.com/arcade-cabinet/kings-road/commit/d15b2d26d8acb509078550341370d2ecb46080c1))
* landing polish, diegetic gameplay frame, app/ reorganization, self-hosted fonts ([#36](https://github.com/arcade-cabinet/kings-road/issues/36)) ([3fa3b85](https://github.com/arcade-cabinet/kings-road/commit/3fa3b852a36b5e3d20be57eec1519e111734fb3c))
* migrate web build from Vite to Expo/Metro ([#11](https://github.com/arcade-cabinet/kings-road/issues/11)) ([c85ec85](https://github.com/arcade-cabinet/kings-road/commit/c85ec8596723664d3aca4d5775646318902bda9c))
* refactor worldGen to be road-aware with optional roadSpine (E3) ([cfdcb2c](https://github.com/arcade-cabinet/kings-road/commit/cfdcb2c04754f3e2d8974713cdd7c0a88f8102d8))
* wire Koota WorldProvider into React app ([c2da24e](https://github.com/arcade-cabinet/kings-road/commit/c2da24e25d2fa01a85eae239e4bc4f713dacdcfb))


### Fixed

* ensure content JSON loads on GitHub Pages ([#12](https://github.com/arcade-cabinet/kings-road/issues/12)) ([b38907f](https://github.com/arcade-cabinet/kings-road/commit/b38907f04f55dc798c7327d5293f33d949a3462c))
* pin @types/node to v22 matching CI Node version ([#4](https://github.com/arcade-cabinet/kings-road/issues/4)) ([b523250](https://github.com/arcade-cabinet/kings-road/commit/b52325077a98f4ff22525bd8521efda74304d7a5))
* resolve all Biome lint errors in game components ([3fb7213](https://github.com/arcade-cabinet/kings-road/commit/3fb72135191dd858c59fd688dbb32d20f1153234))
* resolve CI TypeScript check failures ([#3](https://github.com/arcade-cabinet/kings-road/issues/3)) ([11c8596](https://github.com/arcade-cabinet/kings-road/commit/11c8596a174ddde17dc47f81690977a453fe9030))
* **tsc:** remove vite.config.ts from main tsconfig include (double-include caused TS6305) ([#35](https://github.com/arcade-cabinet/kings-road/issues/35)) ([f70341f](https://github.com/arcade-cabinet/kings-road/commit/f70341f5fc211b53e98639e3f39a5983fb852b80))


### Documentation

* add CLAUDE.md for Claude Code sessions ([2d7ac5b](https://github.com/arcade-cabinet/kings-road/commit/2d7ac5b9b5135201fc94694573b884daae577a1b))
* add Ralph-TUI PRD for overnight content generation ([fefbcc8](https://github.com/arcade-cabinet/kings-road/commit/fefbcc8b5f2af08b67422c67247757e1f77a6a66))
* rewrite all documentation for King's Road redesign ([c4f97fb](https://github.com/arcade-cabinet/kings-road/commit/c4f97fb76e7a5bea64426ec57dc380122d3cd9eb))

## [Unreleased]

### Added

- `docs/TESTING.md`, `docs/STATE.md`, `docs/LORE.md` -- standardized documentation
- YAML frontmatter on all root and docs markdown files

### Changed

- Updated CLAUDE.md, AGENTS.md, README.md for current codebase state (Expo/Metro build, full factory systems, SQLite save layer)
- Removed stale plan/implementation documents from `docs/plans/`

---

## [1.3.0] - 2026-04-09

### Added (feat: Fix web build and integrate 3DPSX Chibi NPCs -- #13)

- 3DPSX chibi NPC character system via `chibi-generator.ts`
- Face texture generation for NPC caricature portraits (`face-texture.ts`)
- NPC pool integration tests

### Fixed

- Web build compatibility for GitHub Pages

---

## [1.2.0] - 2026-03-14

### Added (feat: migrate web build from Vite to Expo/Metro -- #11)

- Expo SDK 55 as build platform, replacing standalone Vite
- `expo-sqlite` for save state and content DB
- Drizzle ORM (`drizzle-orm`, `drizzle-kit`) for type-safe SQLite access
- `src/db/schema.ts` -- content tables (monsters, items, quests, towns, etc.) and save state tables (save slots, player state, quest progress, inventory, chunk deltas, unlocked perks)
- `scripts/compile-content-db.ts` -- build-time content compilation to SQLite
- `src/db/save-service.ts` -- save slot management
- Tone.js audio system (`src/game/audio/`)
- Weather system (`src/game/systems/WeatherSystem.tsx`, `src/schemas/weather.schema.ts`)
- Skill tree system (`src/schemas/skill-tree.schema.ts`)
- Crafting schema (`src/schemas/crafting.schema.ts`)
- Kingdom-level world generation (`src/game/world/kingdom-gen.ts`)
- Dungeon generator (`src/game/world/dungeon-generator.ts`)
- Town layout system (`src/game/world/town-layout.ts`)
- Road network system (`src/game/world/road-network.ts`)

---

## [1.1.0] - 2026-03-09

### Added (feat: dungeon persistence, combat fixes, kingdom map gen -- #9)

- `DungeonEntrySystem.tsx` -- dungeon transitions
- `EncounterSystem.tsx` -- combat trigger system
- `combat-resolver.ts` + tests -- deterministic combat resolution
- `quest-step-executor.ts` + tests -- quest step state machine
- `QuestSystem.tsx` -- quest progression
- `inventoryStore.ts`, `combatStore.ts`, `questStore.ts`, `worldStore.ts`, `settingsStore.ts`
- Monster factory (`src/game/factories/monster-factory.ts`)
- Building factory (`src/game/factories/building-factory.ts`)
- NPC factory (`src/game/factories/npc-factory.ts`)
- Loot resolver (`src/game/world/loot-resolver.ts`)
- `InventoryScreen.tsx`, `Minimap.tsx`, `DeathOverlay.tsx`, `CombatHUD.tsx`, `PauseMenu.tsx`, `SettingsPanel.tsx`
- `Portrait3D.tsx` for NPC portraits
- Dungeon renderer and dungeon props

---

## [1.0.0] - 2026-03-03

### Added (feat: Engine v2 -- config-driven blueprint architecture -- #5)

- Building, NPC, and monster schema layer (`src/schemas/building.schema.ts`, `npc-blueprint.schema.ts`, `monster.schema.ts`, `town.schema.ts`, `kingdom.schema.ts`, `encounter-table.schema.ts`)
- Factory pattern for all entity types
- Content trove with NPC archetypes, features, and quests (`content/`)
- Pacing engine for deterministic feature placement (`src/game/world/pacing-engine.ts`)
- Road spine loader with Zod validation (`src/game/world/road-spine.ts`)
- Terrain and simplex noise generation (`src/game/world/terrain-gen.ts`, `simplex.ts`)
- `validate-trove.ts` content validation script

### Changed (feat: King's Road -- pastoral redesign -- d15b2d2)

- Rebranded from generic Vite/Aetheria scaffold to King's Road
- Warm cream color palette replacing dark fantasy aesthetic
- Typography: Lora (display) + Crimson Text (body), replacing Cinzel
- Scene: sky blue (`#87CEEB`) replacing black void
- Lighting: warm golden sunlight replacing cold blue ambient
- Post-processing: reduced vignette intensity (0.6 to 0.3)
- Seed vocabulary: pastoral words replacing grimdark
- NPC dialogue: pastoral pilgrimage theme replacing dark fantasy
- HUD: warm parchment palette
- Removed 40+ unused npm dependencies (radix-ui, cmdk, sonner, recharts, etc.)
- Fixed THREE.js shadow map deprecation warning

### Added (initial engine -- 60157af to d15b2d2)

- Koota ECS world, traits, and actions (`src/ecs/`)
- Zod schemas: world, quest, NPC, feature, item, encounter, pacing (`src/schemas/`)
- Content validation pipeline (`scripts/validate-trove.ts`)
- Road spine JSON with 6 anchor points (`content/world/road-spine.json`)
- Game Store (Zustand) for centralized state
- Player Controller: first-person movement with AABB collision, head bob, sprint/walk
- Chunk Manager: dynamic chunk loading/unloading, NPC spawning
- Environment System: day/night cycle, sun/moon, player lantern, fog
- Interaction System: raycasting-based NPC detection
- Seed-based procedural world generation (mulberry32 PRNG, cyrb128 hash)
- Instanced mesh rendering for static geometry
- NPC component with idle animation
- Collectible (Relic) with floating animation
- Main menu, HUD, dialogue box, mobile controls
- SMAA, bloom, vignette post-processing
- Keyboard, mouse drag, touch joystick input
