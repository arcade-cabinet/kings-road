import { j as jsxRuntimeExports } from './jsx-runtime-CLliEFxU.js';
import { r as reactExports } from './index-BAe1oPKr.js';
import { c as cn, u as useGameStore } from './utils-Ds8l1iD7.js';
import './three.module-DXn-rEMf.js';

function StatBar({
  value,
  maxValue = 100,
  color,
  glowColor,
  showLabel = false,
  icon
}) {
  const percentage = Math.max(0, Math.min(100, value / maxValue * 100));
  const isLow = percentage < 25;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
    icon && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: cn("text-xs", isLow && "animate-pulse"),
        style: { color },
        children: icon
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-44 md:w-52 h-2.5 bg-stone-800/70 border border-stone-600/50 rounded-sm overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: cn(
            "h-full transition-all duration-200 relative",
            isLow && "animate-pulse"
          ),
          style: {
            width: `${percentage}%`,
            background: `linear-gradient(to right, ${color}88, ${color})`
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/2" })
        }
      ),
      isLow && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "absolute inset-0 animate-pulse",
          style: { boxShadow: `inset 0 0 10px ${glowColor}` }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex", children: ["q1", "q2", "q3", "q4"].map((id) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "flex-1 border-r border-stone-700/30 last:border-r-0"
        },
        id
      )) })
    ] }),
    showLabel && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-yellow-900 font-bold min-w-[32px]", children: Math.round(value) })
  ] });
}
function Compass({ yaw }) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const compassItems = ["a", "b", "c"].flatMap(
    (group) => directions.map((dir) => ({ key: `${group}-${dir}`, dir }))
  );
  const normalizedYaw = (-yaw * 180 / Math.PI % 360 + 360) % 360;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-20 h-6 bg-yellow-100/80 border border-yellow-700/50 rounded overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "absolute whitespace-nowrap text-xs font-bold tracking-wider flex items-center h-full transition-transform duration-100",
        style: {
          transform: `translateX(${-normalizedYaw * 0.55 + 40}px)`
        },
        children: compassItems.map(({ key, dir }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn(
              "w-10 text-center",
              dir === "N" ? "text-red-400" : dir === "S" ? "text-yellow-700" : "text-yellow-900"
            ),
            children: dir
          },
          key
        ))
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-1/2 top-0 w-px h-full bg-amber-400/80 -translate-x-1/2" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-1/2 top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-amber-400 -translate-x-1/2" })
  ] });
}
function DayNightIndicator({ timeOfDay }) {
  const isDay = timeOfDay > 0.25 && timeOfDay < 0.75;
  const sunMoonY = Math.sin((timeOfDay - 0.25) * Math.PI * 2);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-8 h-8 bg-stone-950/60 border border-stone-700/40 rounded-full overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "absolute inset-0",
        style: {
          background: isDay ? "linear-gradient(to bottom, #4488cc, #88aacc)" : "linear-gradient(to bottom, #0a0a1a, #1a1a2a)"
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: cn(
          "absolute left-1/2 w-3 h-3 rounded-full -translate-x-1/2 transition-all duration-1000",
          isDay ? "bg-amber-300 shadow-[0_0_8px_#fcd34d]" : "bg-stone-300 shadow-[0_0_6px_#e5e5e5]"
        ),
        style: {
          top: `${50 - sunMoonY * 30}%`,
          transform: "translate(-50%, -50%)"
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-1/3 left-0 right-0 h-px bg-yellow-700/50" })
  ] });
}
function GameHUD() {
  const gameActive = useGameStore((state) => state.gameActive);
  const health = useGameStore((state) => state.health);
  const stamina = useGameStore((state) => state.stamina);
  const isSprinting = useGameStore((state) => state.isSprinting);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const currentChunkName = useGameStore((state) => state.currentChunkName);
  const currentChunkType = useGameStore((state) => state.currentChunkType);
  const currentInteractable = useGameStore(
    (state) => state.currentInteractable
  );
  const inDialogue = useGameStore((state) => state.inDialogue);
  const cameraYaw = useGameStore((state) => state.cameraYaw);
  const [bannerVisible, setBannerVisible] = reactExports.useState(false);
  const [bannerAnimating, setBannerAnimating] = reactExports.useState(false);
  const bannerTimeoutRef = reactExports.useRef(null);
  const prevChunkName = reactExports.useRef(currentChunkName);
  reactExports.useEffect(() => {
    if (currentChunkName !== prevChunkName.current && gameActive) {
      prevChunkName.current = currentChunkName;
      setBannerAnimating(true);
      setBannerVisible(true);
      setTimeout(() => setBannerAnimating(false), 100);
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
      bannerTimeoutRef.current = setTimeout(() => {
        setBannerVisible(false);
      }, 5e3);
    }
  }, [currentChunkName, gameActive]);
  const formatTime = () => {
    const tHours = timeOfDay * 24;
    let hours = Math.floor(tHours);
    const mins = Math.floor(tHours % 1 * 60);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${ampm}`;
  };
  const getChunkTypeInfo = () => {
    switch (currentChunkType) {
      case "TOWN":
        return { name: "Settlement", icon: "⌂" };
      case "DUNGEON":
        return { name: "Ancient Ruins", icon: "◈" };
      case "ROAD":
        return { name: "The King's Road", icon: "═" };
      default:
        return { name: "Wilderness", icon: "♣" };
    }
  };
  const chunkInfo = getChunkTypeInfo();
  if (!gameActive) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 pointer-events-none z-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-6 h-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 border border-white/20 rounded-full" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-1/2 left-1/2 w-1 h-1 bg-white/80 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_4px_rgba(0,0,0,0.8)]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 left-1/2 w-px h-1.5 bg-white/40 -translate-x-1/2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-0 left-1/2 w-px h-1.5 bg-white/40 -translate-x-1/2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-0 top-1/2 w-1.5 h-px bg-white/40 -translate-y-1/2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-0 top-1/2 w-1.5 h-px bg-white/40 -translate-y-1/2" })
    ] }) }),
    currentInteractable && !inDialogue && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-[calc(50%+35px)] left-1/2 -translate-x-1/2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-yellow-100/80 border border-yellow-700/30 px-4 py-2 rounded", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -top-px -left-px w-2 h-2 border-t border-l border-yellow-700" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -top-px -right-px w-2 h-2 border-t border-r border-yellow-700" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -bottom-px -left-px w-2 h-2 border-b border-l border-yellow-700" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -bottom-px -right-px w-2 h-2 border-b border-r border-yellow-700" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-lora text-sm font-bold text-yellow-900 uppercase tracking-wider flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-700 text-xs bg-yellow-200/50 px-1.5 py-0.5 rounded", children: "[E]" }),
        currentInteractable.actionVerb,
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-900", children: currentInteractable.name })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-6 left-6 flex flex-col gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatBar,
        {
          value: health,
          color: "#c4695a",
          glowColor: "#d9796366",
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "❤" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatBar,
        {
          value: stamina,
          color: "#6b8f5e",
          glowColor: "#6b8f5e66",
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(isSprinting && "animate-bounce"), children: "⚡" })
        }
      ),
      isSprinting && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-yellow-700 font-bold tracking-wider animate-pulse ml-6", children: "SPRINTING" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: cn(
          "absolute top-6 left-1/2 -translate-x-1/2 text-center transition-all duration-500",
          bannerVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
          bannerAnimating && "scale-110"
        ),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-yellow-100/60 border border-yellow-700/30 px-8 py-4 backdrop-blur-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-yellow-700/50 to-transparent" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -bottom-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-yellow-700/50 to-transparent" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "font-lora text-2xl md:text-3xl font-black text-yellow-900 tracking-[0.15em] uppercase",
              style: { textShadow: "0 2px 10px rgba(0,0,0,0.8)" },
              children: currentChunkName
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-2 mt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-800/80", children: chunkInfo.icon }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-yellow-900 tracking-[0.3em] uppercase font-bold", children: chunkInfo.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-800/80", children: chunkInfo.icon })
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-6 right-6 flex flex-col items-end gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "font-lora text-lg text-yellow-700/90 tracking-wider",
            style: { textShadow: "0 0 10px rgba(212, 175, 55, 0.3)" },
            children: formatTime()
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DayNightIndicator, { timeOfDay })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Compass, { yaw: cameraYaw })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:block", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-yellow-100/40 border border-yellow-700/30 px-4 py-2 rounded backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-yellow-900 tracking-wider font-medium flex items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-900 font-bold", children: "WASD" }),
        " Move"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-800", children: "|" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-900 font-bold", children: "Mouse" }),
        " Look"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-800", children: "|" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-900 font-bold", children: "E" }),
        " Interact"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-800", children: "|" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-900 font-bold", children: "SPACE" }),
        " Jump"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-800", children: "|" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-900 font-bold", children: "SHIFT" }),
        " Walk"
      ] })
    ] }) }) })
  ] });
}

function GameHUDDefault() {
  reactExports.useEffect(() => {
    useGameStore.setState({
      gameActive: true,
      health: 85,
      stamina: 70,
      isSprinting: false,
      timeOfDay: 10 / 24,
      // 10 AM
      currentChunkName: "Ashford Village",
      currentChunkType: "TOWN",
      currentInteractable: null,
      inDialogue: false,
      cameraYaw: 0
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(GameHUD, {});
}
function GameHUDLowHealth() {
  reactExports.useEffect(() => {
    useGameStore.setState({
      gameActive: true,
      health: 15,
      stamina: 40,
      isSprinting: false,
      timeOfDay: 20 / 24,
      // 8 PM — nighttime
      currentChunkName: "Dark Hollow",
      currentChunkType: "DUNGEON",
      currentInteractable: null,
      inDialogue: false,
      cameraYaw: Math.PI / 4
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(GameHUD, {});
}
function GameHUDSprinting() {
  reactExports.useEffect(() => {
    useGameStore.setState({
      gameActive: true,
      health: 100,
      stamina: 55,
      isSprinting: true,
      timeOfDay: 14 / 24,
      // 2 PM
      currentChunkName: "The King's Road",
      currentChunkType: "ROAD",
      currentInteractable: null,
      inDialogue: false,
      cameraYaw: Math.PI / 2
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(GameHUD, {});
}
function GameHUDWithInteraction() {
  reactExports.useEffect(() => {
    useGameStore.setState({
      gameActive: true,
      health: 90,
      stamina: 100,
      isSprinting: false,
      timeOfDay: 12 / 24,
      // noon
      currentChunkName: "Millbrook",
      currentChunkType: "TOWN",
      currentInteractable: {
        id: "npc-martha",
        position: { x: 0, y: 0, z: 0, isVector3: true },
        radius: 3,
        type: "innkeeper",
        name: "Martha",
        dialogueText: "Welcome to the inn!",
        actionVerb: "Talk to"
      },
      inDialogue: false,
      cameraYaw: 0
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(GameHUD, {});
}
function GameHUDHidden() {
  reactExports.useEffect(() => {
    useGameStore.setState({ gameActive: false });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-testid": "hud-hidden-wrapper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(GameHUD, {}) });
}

export { GameHUDDefault, GameHUDHidden, GameHUDLowHealth, GameHUDSprinting, GameHUDWithInteraction };
//# sourceMappingURL=GameHUD.story-BPgK9a1d.js.map
