import { j as jsxRuntimeExports } from './jsx-runtime-CLliEFxU.js';
import { r as reactExports } from './index-BAe1oPKr.js';
import { u as useGameStore, c as cn } from './utils-Ds8l1iD7.js';
import './three.module-DXn-rEMf.js';

const LOADING_STAGES = [
  "Awakening the physics engine...",
  "Charting the realm...",
  "Summoning inhabitants...",
  "Opening the gates..."
];
const MIN_DISPLAY_MS = 2e3;
function LoadingOverlay() {
  const gameActive = useGameStore((state) => state.gameActive);
  const activeChunks = useGameStore((state) => state.activeChunks);
  const [visible, setVisible] = reactExports.useState(false);
  const [fadeOut, setFadeOut] = reactExports.useState(false);
  const [stageIndex, setStageIndex] = reactExports.useState(0);
  const [startTime, setStartTime] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (gameActive && !visible && !fadeOut) {
      setVisible(true);
      setFadeOut(false);
      setStageIndex(0);
      setStartTime(Date.now());
    }
  }, [gameActive, visible, fadeOut]);
  reactExports.useEffect(() => {
    if (!visible || fadeOut) return;
    const interval = setInterval(() => {
      setStageIndex(
        (prev) => prev < LOADING_STAGES.length - 1 ? prev + 1 : prev
      );
    }, 500);
    return () => clearInterval(interval);
  }, [visible, fadeOut]);
  reactExports.useEffect(() => {
    if (!visible || fadeOut) return;
    if (activeChunks.size === 0) return;
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const timeout = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setVisible(false);
        setFadeOut(false);
      }, 800);
    }, remaining);
    return () => clearTimeout(timeout);
  }, [visible, fadeOut, activeChunks.size, startTime]);
  if (!visible) return null;
  const progress = Math.min(
    100,
    (stageIndex + 1) / LOADING_STAGES.length * 100
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "absolute inset-0 z-[60] flex flex-col items-center justify-center transition-opacity duration-700",
        fadeOut ? "opacity-0" : "opacity-100"
      ),
      style: {
        background: "radial-gradient(ellipse at center, #f5f1e8 0%, #ede8dc 50%, #e8d7c3 100%)"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-[0.04] pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "svg",
          {
            viewBox: "0 0 200 200",
            className: "w-full h-full animate-spin",
            style: { animationDuration: "60s" },
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
                  strokeWidth: "0.8"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "circle",
                {
                  cx: "100",
                  cy: "100",
                  r: "80",
                  fill: "none",
                  stroke: "#c4a747",
                  strokeWidth: "0.4",
                  strokeDasharray: "6 3"
                }
              )
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 flex flex-col items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "h2",
            {
              className: "font-lora text-3xl font-bold tracking-[0.05em] mb-8",
              style: {
                color: "#8b6f47",
                textShadow: "0 0 20px rgba(196, 167, 71, 0.15)"
              },
              children: "Preparing the Realm"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-64 md:w-80", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1 bg-yellow-900/10 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "h-full bg-gradient-to-r from-yellow-600/60 to-yellow-500/80 transition-all duration-500 ease-out",
                style: { width: `${progress}%` }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-yellow-800/60 text-xs tracking-wider mt-4 text-center font-light italic", children: LOADING_STAGES[stageIndex] })
          ] })
        ] })
      ]
    }
  );
}

function LoadingOverlayVisible() {
  reactExports.useEffect(() => {
    useGameStore.setState({
      gameActive: true,
      activeChunks: /* @__PURE__ */ new Map()
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingOverlay, {});
}
function LoadingOverlayHidden() {
  reactExports.useEffect(() => {
    useGameStore.setState({
      gameActive: false,
      activeChunks: /* @__PURE__ */ new Map()
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-testid": "loading-hidden-wrapper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingOverlay, {}) });
}

export { LoadingOverlayHidden, LoadingOverlayVisible };
//# sourceMappingURL=LoadingOverlay.story-BCwjfHwd.js.map
