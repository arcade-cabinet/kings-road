import { j as jsxRuntimeExports } from './jsx-runtime-CLliEFxU.js';
import { r as reactExports } from './index-BAe1oPKr.js';
import { m as mulberry32, a as cyrb128, c as cn, u as useGameStore, g as generateSeedPhrase } from './utils-Ds8l1iD7.js';
import { V as Vector3 } from './three.module-DXn-rEMf.js';

const CHUNK_SIZE = 120;
const BLOCK_SIZE = 5;
const VIEW_DISTANCE = 1;
const PLAYER_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.6;
const TOWN_PRE = [
  "Oak",
  "River",
  "Stone",
  "Iron",
  "Winter",
  "Summer",
  "High",
  "Low",
  "Kings",
  "Queens",
  "Ash",
  "Pine",
  "Silver",
  "Golden",
  "Black",
  "White"
];
const TOWN_SUF = [
  "haven",
  "ford",
  "gate",
  "helm",
  "watch",
  "wood",
  "bury",
  "ton",
  "ville",
  "bridge",
  "keep",
  "hold",
  "stead",
  "mere"
];
const COUNTRYSIDE_TYPES = ["WILD", "WILD", "WILD", "WILD"];
function anchorTypeToChunkType(anchorType) {
  switch (anchorType) {
    case "VILLAGE_FRIENDLY":
    case "VILLAGE_HOSTILE":
      return "TOWN";
    case "DUNGEON":
      return "DUNGEON";
    case "WAYPOINT":
      return "TOWN";
    default:
      return "ROAD";
  }
}
function chunkZToRoadDistance(cz) {
  return cz * CHUNK_SIZE;
}
function getChunkType(cx, cz, seedPhrase, roadSpine) {
  if (!roadSpine) {
    if (cx === 0) {
      if (Math.abs(cz) % 3 === 0) return "TOWN";
      return "ROAD";
    }
    const rng2 = mulberry32(cyrb128(`${seedPhrase}${cx},${cz}`));
    if (rng2() < 0.2) return "DUNGEON";
    return "WILD";
  }
  const distance = chunkZToRoadDistance(cz);
  if (cx === 0) {
    if (distance < 0 || distance > roadSpine.totalDistance) {
      return "WILD";
    }
    const anchorThreshold = CHUNK_SIZE;
    for (const anchor of roadSpine.anchors) {
      if (Math.abs(anchor.distanceFromStart - distance) < anchorThreshold) {
        return anchorTypeToChunkType(anchor.type);
      }
    }
    return "ROAD";
  }
  if (Math.abs(cx) === 1 && distance >= 0 && distance <= roadSpine.totalDistance) {
    return "ROAD";
  }
  const rng = mulberry32(cyrb128(`${seedPhrase}${cx},${cz}`));
  return COUNTRYSIDE_TYPES[Math.floor(rng() * COUNTRYSIDE_TYPES.length)];
}
function getChunkName(cx, cz, type, seedPhrase) {
  const rng = mulberry32(cyrb128(`${seedPhrase}${cx},${cz}`));
  if (type === "WILD") return "The Wilderness";
  if (type === "ROAD") return "The King's Road";
  if (type === "TOWN") {
    const pre = TOWN_PRE[Math.floor(rng() * TOWN_PRE.length)];
    const suf = TOWN_SUF[Math.floor(rng() * TOWN_SUF.length)];
    return pre + suf;
  }
  if (type === "DUNGEON") {
    const pre = TOWN_PRE[Math.floor(rng() * TOWN_PRE.length)];
    return `Ruins of ${pre}keep`;
  }
  return "Unknown Lands";
}
const BLACKSMITH_DIALOGUE = [
  "Weapons and armor. No haggling.",
  "Steel forged in dragon fire. Interested?",
  "Another adventurer seeking glory? I have just the blade.",
  "The best steel in the realm, or your gold back.",
  "War is coming. Best arm yourself well.",
  "I've been smithing since before your father was born. Trust my work.",
  "See this blade? Took three moons to perfect. Worth every day.",
  "The ore from the northern mines is finest. That's what I use.",
  "Lost my apprentice to the dungeons. Don't make the same mistake unprepared.",
  "A good sword is worth more than gold when danger comes."
];
const INNKEEPER_DIALOGUE = [
  "Warm beds and cold ale. Welcome to the inn.",
  "You look weary, traveler. Rest here tonight.",
  "The stew is fresh. The company... varies.",
  "Heard strange tales from the eastern ruins lately.",
  "Coin for a room? The rats are mostly gone.",
  "A bard passed through last night. Sang of heroes and fallen kingdoms.",
  "The road's been quiet lately. Too quiet for my liking.",
  "Mind the third step on the stairs. Been meaning to fix it.",
  "Had a strange fellow asking about ancient artifacts yesterday. Collector, I suspect.",
  "Best ale in three settlements. My own recipe.",
  "The fire's warm and the shadows are friendly here. Rest easy."
];
const WANDERER_DIALOGUE = [
  "The Emperor has decreed new taxes. Times are hard.",
  "Have you seen the lights in the sky at night?",
  "Beware the dungeons to the east. Many enter, few return.",
  "I once was an adventurer like you...",
  "The old gods stir. Can you not feel it?",
  "Trade caravans stopped coming. Wonder why.",
  "My grandmother spoke of dragons. I thought them myth.",
  "The harvest was poor this year. Dark omens.",
  "I seek the ruins where my brother disappeared. Have you seen them?",
  "The ancient relics... they whisper if you listen. Best not to.",
  "These roads were safer in my youth. Now shadows lurk at every turn.",
  "I've walked every path in this realm. Still find new wonders.",
  "The wind carries stories from distant lands. Listen carefully.",
  "Met a wise sage once. Said the world is older than we know.",
  "There's a chill in the air tonight. Feels like change is coming.",
  "I'm searching for a flower that blooms only at midnight. Seen one?"
];
const MERCHANT_DIALOGUE = [
  "Rare wares from distant lands! Take a look.",
  "Potions, scrolls, oddities... What catches your eye?",
  "I have something special, for the right price.",
  "The roads grow dangerous. My prices reflect the risk.",
  "From the sunken cities of the south, I bring treasures unknown.",
  "This amulet? Belonged to a king. Which one? I cannot say.",
  "I trade in secrets as much as goods. Both are valuable.",
  "The eastern markets are closed. Supply is limited. Buy now.",
  "I've seen you eyeing that... Ah, you have fine taste.",
  "Not everything I sell is... strictly permitted. But all is valuable."
];
function getRandomDialogue(type, rng) {
  let pool;
  switch (type) {
    case "blacksmith":
      pool = BLACKSMITH_DIALOGUE;
      break;
    case "innkeeper":
      pool = INNKEEPER_DIALOGUE;
      break;
    case "merchant":
      pool = MERCHANT_DIALOGUE;
      break;
    default:
      pool = WANDERER_DIALOGUE;
  }
  return pool[Math.floor(rng() * pool.length)];
}
const FIRST_NAMES_M = [
  "Bjorn",
  "Erik",
  "Magnus",
  "Aldric",
  "Cedric",
  "Gareth",
  "Roland",
  "Theron",
  "Viktor",
  "Wolfram"
];
const FIRST_NAMES_F = [
  "Hilda",
  "Freya",
  "Ingrid",
  "Astrid",
  "Elara",
  "Lyra",
  "Rowena",
  "Sigrid",
  "Thora",
  "Ysabel"
];
const SURNAMES = [
  "Iron-Arm",
  "Stonehand",
  "Swiftfoot",
  "Darkhollow",
  "Brightblade",
  "Thornwood",
  "Grimshaw",
  "Fairweather"
];
function getRandomNPCName(rng) {
  const isFemale = rng() > 0.5;
  const firstName = isFemale ? FIRST_NAMES_F[Math.floor(rng() * FIRST_NAMES_F.length)] : FIRST_NAMES_M[Math.floor(rng() * FIRST_NAMES_M.length)];
  if (rng() > 0.6) {
    const surname = SURNAMES[Math.floor(rng() * SURNAMES.length)];
    return `${firstName} ${surname}`;
  }
  return firstName;
}

function FloatingEmbers() {
  const [particles, setParticles] = reactExports.useState([]);
  const particleId = reactExports.useRef(0);
  reactExports.useEffect(() => {
    const initialParticles = [];
    for (let i = 0; i < 40; i++) {
      initialParticles.push({
        id: particleId.current++,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.8,
        speed: Math.random() * 0.2 + 0.05,
        opacity: Math.random() * 0.4 + 0.15,
        hue: Math.random() * 15 + 45
        // warm golden yellow range
      });
    }
    setParticles(initialParticles);
    const interval = setInterval(() => {
      setParticles(
        (prev) => prev.map((p) => ({
          ...p,
          y: p.y - p.speed,
          x: p.x + Math.sin(Date.now() / 1e3 + p.id) * 0.1,
          opacity: p.y < 10 ? p.opacity * 0.95 : p.opacity
        })).map(
          (p) => p.y < -5 ? {
            ...p,
            y: 105,
            x: Math.random() * 100,
            opacity: Math.random() * 0.6 + 0.2
          } : p
        )
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: particles.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "absolute rounded-full",
      style: {
        left: `${p.x}%`,
        top: `${p.y}%`,
        width: `${p.size}px`,
        height: `${p.size}px`,
        backgroundColor: `hsla(${p.hue}, 100%, 60%, ${p.opacity})`,
        boxShadow: `0 0 ${p.size * 2}px hsla(${p.hue}, 100%, 50%, ${p.opacity * 0.8})`,
        transform: "translate(-50%, -50%)"
      }
    },
    p.id
  )) });
}
function CornerOrnament({ position }) {
  const transforms = {
    tl: "",
    tr: "scaleX(-1)",
    bl: "scaleY(-1)",
    br: "scale(-1)"
  };
  const positions = {
    tl: "top-0 left-0",
    tr: "top-0 right-0",
    bl: "bottom-0 left-0",
    br: "bottom-0 right-0"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "absolute w-8 h-8 pointer-events-none",
        positions[position]
      ),
      style: { transform: transforms[position] },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "svg",
        {
          viewBox: "0 0 32 32",
          className: "w-full h-full text-yellow-700/40",
          "aria-hidden": "true",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M0 0 L12 0 L12 2 L2 2 L2 12 L0 12 Z", fill: "currentColor" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "M0 0 L8 0 L8 1 L1 1 L1 8 L0 8 Z",
                fill: "currentColor",
                className: "text-yellow-600/50"
              }
            )
          ]
        }
      )
    }
  );
}
function MainMenu() {
  const gameActive = useGameStore((state) => state.gameActive);
  const seedPhrase = useGameStore((state) => state.seedPhrase);
  const setSeedPhrase = useGameStore((state) => state.setSeedPhrase);
  const startGame = useGameStore((state) => state.startGame);
  const [isHovering, setIsHovering] = reactExports.useState(null);
  const [fadeOut, setFadeOut] = reactExports.useState(false);
  const handleReseed = () => {
    const newSeed = generateSeedPhrase();
    setSeedPhrase(newSeed);
  };
  const handleStart = () => {
    let currentSeed = seedPhrase;
    if (!currentSeed) {
      currentSeed = generateSeedPhrase();
      setSeedPhrase(currentSeed);
    }
    setFadeOut(true);
    setTimeout(() => {
      startGame(
        currentSeed,
        new Vector3(CHUNK_SIZE / 2, PLAYER_HEIGHT, CHUNK_SIZE / 2),
        Math.PI
      );
    }, 600);
  };
  reactExports.useEffect(() => {
    if (!seedPhrase && !gameActive) {
      const newSeed = generateSeedPhrase();
      setSeedPhrase(newSeed);
    }
  }, [seedPhrase, gameActive, setSeedPhrase]);
  if (gameActive) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center transition-all duration-700",
        fadeOut ? "opacity-0 scale-105" : "opacity-100 scale-100"
      ),
      style: {
        background: "radial-gradient(ellipse at center bottom, #f5f1e8 0%, #ede8dc 50%, #e8d7c3 100%)"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FloatingEmbers, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "absolute inset-0 pointer-events-none",
            style: {
              background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.08) 100%)"
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.03] pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "svg",
          {
            viewBox: "0 0 200 200",
            className: "w-full h-full animate-spin",
            style: { animationDuration: "120s" },
            "aria-hidden": "true",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "circle",
                {
                  cx: "100",
                  cy: "100",
                  r: "95",
                  fill: "none",
                  stroke: "#c4a747",
                  strokeWidth: "0.5"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "circle",
                {
                  cx: "100",
                  cy: "100",
                  r: "85",
                  fill: "none",
                  stroke: "#c4a747",
                  strokeWidth: "0.3",
                  strokeDasharray: "8 4"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "circle",
                {
                  cx: "100",
                  cy: "100",
                  r: "75",
                  fill: "none",
                  stroke: "#c4a747",
                  strokeWidth: "0.5"
                }
              ),
              [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
                (angle) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "line",
                  {
                    x1: "100",
                    y1: "5",
                    x2: "100",
                    y2: "25",
                    stroke: "#c4a747",
                    strokeWidth: "0.5",
                    transform: `rotate(${angle} 100 100)`
                  },
                  `line-${angle}`
                )
              )
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 flex flex-col items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h1",
              {
                className: "font-lora text-6xl md:text-8xl font-bold tracking-[0.05em] mb-0",
                style: {
                  color: "#8b6f47",
                  textShadow: "0 0 20px rgba(196, 167, 71, 0.15), 0 2px 4px rgba(0,0,0,0.1)"
                },
                children: "King's Road"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-yellow-700/70 text-sm md:text-base tracking-[0.3em] font-light uppercase mt-3 text-center", children: "Seek the Holy Grail" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-48 h-px bg-gradient-to-r from-transparent via-yellow-600/30 to-transparent mx-auto mt-4" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-yellow-50/90 p-8 px-12 md:px-16 border border-yellow-900/20 mt-10 backdrop-blur-sm shadow-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CornerOrnament, { position: "tl" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CornerOrnament, { position: "tr" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CornerOrnament, { position: "bl" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CornerOrnament, { position: "br" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-yellow-600/30 to-transparent" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -bottom-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-yellow-600/30 to-transparent" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-yellow-100/40 to-transparent pointer-events-none" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-yellow-700/70 uppercase tracking-[0.3em] mb-4 text-center font-light flex items-center justify-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-8 h-px bg-gradient-to-r from-transparent to-yellow-600/40" }),
              "Realm Seed",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-8 h-px bg-gradient-to-l from-transparent to-yellow-600/40" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "font-lora text-2xl md:text-3xl font-semibold text-yellow-900 tracking-wider text-center min-w-[280px]",
                style: { textShadow: "0 1px 2px rgba(0,0,0,0.05)" },
                children: seedPhrase || "Generating..."
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-4 justify-center mt-8", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleReseed,
                  onMouseEnter: () => setIsHovering("reseed"),
                  onMouseLeave: () => setIsHovering(null),
                  className: cn(
                    "relative border border-yellow-700/40 bg-yellow-100/60",
                    "text-yellow-800 px-6 md:px-8 py-3",
                    "font-lora text-sm font-semibold tracking-wider uppercase",
                    "transition-all duration-300 cursor-pointer overflow-hidden",
                    isHovering === "reseed" && "border-yellow-600/70 text-yellow-900 bg-yellow-200/70"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: cn(
                          "absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-500",
                          isHovering === "reseed" && "translate-x-full"
                        )
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "relative", children: "Reseed" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleStart,
                  onMouseEnter: () => setIsHovering("enter"),
                  onMouseLeave: () => setIsHovering(null),
                  className: cn(
                    "relative border border-rose-700/40 bg-gradient-to-b from-rose-100/70 to-rose-50/70",
                    "text-rose-900 px-6 md:px-10 py-3",
                    "font-lora text-sm font-semibold tracking-wider uppercase",
                    "transition-all duration-300 cursor-pointer overflow-hidden",
                    isHovering === "enter" && "border-rose-600/70 text-rose-900 shadow-lg shadow-rose-200/40 scale-105"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: cn(
                          "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-500",
                          isHovering === "enter" && "translate-x-full"
                        )
                      }
                    ),
                    isHovering === "enter" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-rose-300/15 animate-pulse" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "relative", children: "Enter Realm" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-12 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-yellow-700/60 text-xs tracking-[0.2em] mb-4 uppercase font-light", children: "Features" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-3 justify-center max-w-lg", children: [
              { name: "Procedural Worlds", icon: "◇" },
              { name: "Day/Night Cycle", icon: "☀" },
              { name: "NPCs & Dialogue", icon: "◈" },
              { name: "Dungeon Exploration", icon: "▣" }
            ].map((feature, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "span",
              {
                className: "px-4 py-2 bg-yellow-100/40 border border-yellow-600/20 text-yellow-800 text-xs tracking-wider uppercase flex items-center gap-2 hover:text-yellow-900 hover:bg-yellow-100/60 hover:border-yellow-600/40 transition-colors",
                style: { animationDelay: `${i * 100}ms` },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-700/70", children: feature.icon }),
                  feature.name
                ]
              },
              feature.name
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-10 text-yellow-800/70 text-xs tracking-wider text-center hidden md:block", children: [
            "Press ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-900 font-semibold", children: "WASD" }),
            " to move | ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-900 font-semibold", children: "E" }),
            " to interact |",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-900 font-semibold", children: "SPACE" }),
            " to jump"
          ] })
        ] })
      ]
    }
  );
}

function MainMenuDefault() {
  reactExports.useEffect(() => {
    useGameStore.setState({
      gameActive: false,
      seedPhrase: "Golden Verdant Meadow"
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainMenu, {});
}
function MainMenuHidden() {
  reactExports.useEffect(() => {
    useGameStore.setState({ gameActive: true });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-testid": "main-menu-hidden-wrapper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MainMenu, {}) });
}

export { MainMenuDefault, MainMenuHidden };
//# sourceMappingURL=MainMenu.story-BczIrziy.js.map
