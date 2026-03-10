import { j as jsxRuntimeExports } from './jsx-runtime-CLliEFxU.js';
import { r as reactExports } from './index-BAe1oPKr.js';
import { u as useGameStore, c as cn } from './utils-Ds8l1iD7.js';
import './three.module-DXn-rEMf.js';

function MobileControls() {
  const gameActive = useGameStore((state) => state.gameActive);
  const inDialogue = useGameStore((state) => state.inDialogue);
  const currentInteractable = useGameStore(
    (state) => state.currentInteractable
  );
  const stamina = useGameStore((state) => state.stamina);
  const setJoystick = useGameStore((state) => state.setJoystick);
  const setKey = useGameStore((state) => state.setKey);
  const openDialogue = useGameStore((state) => state.openDialogue);
  const [joystickActive, setJoystickActive] = reactExports.useState(false);
  const [joystickPos, setJoystickPos] = reactExports.useState({ x: 0, y: 0 });
  const [stickOffset, setStickOffset] = reactExports.useState({ x: 0, y: 0 });
  const [jumpPressed, setJumpPressed] = reactExports.useState(false);
  const [interactPressed, setInteractPressed] = reactExports.useState(false);
  const touchIdRef = reactExports.useRef(null);
  const joystickBaseRef = reactExports.useRef({ x: 0, y: 0 });
  const isSprinting = reactExports.useMemo(() => {
    const dist = Math.sqrt(stickOffset.x ** 2 + stickOffset.y ** 2);
    return dist > 50 && stamina > 10;
  }, [stickOffset, stamina]);
  const handleTouchStart = reactExports.useCallback(
    (e) => {
      if (inDialogue) return;
      const touch = e.changedTouches[0];
      touchIdRef.current = touch.identifier;
      joystickBaseRef.current = { x: touch.clientX, y: touch.clientY };
      setJoystickActive(true);
      setJoystickPos({ x: touch.clientX - 75, y: touch.clientY - 75 });
      setStickOffset({ x: 0, y: 0 });
      setJoystick({ x: 0, y: 0 }, 0);
    },
    [inDialogue, setJoystick]
  );
  const handleTouchMove = reactExports.useCallback(
    (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchIdRef.current) {
          let dx = touch.clientX - joystickBaseRef.current.x;
          let dy = touch.clientY - joystickBaseRef.current.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 70;
          if (dist > maxDist) {
            dx = dx / dist * maxDist;
            dy = dy / dist * maxDist;
            dist = maxDist;
          }
          setStickOffset({ x: dx, y: dy });
          setJoystick({ x: dx / maxDist, y: dy / maxDist }, dist);
        }
      }
    },
    [setJoystick]
  );
  const handleTouchEnd = reactExports.useCallback(
    (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null;
          setJoystickActive(false);
          setStickOffset({ x: 0, y: 0 });
          setJoystick({ x: 0, y: 0 }, 0);
        }
      }
    },
    [setJoystick]
  );
  const handleJump = reactExports.useCallback(
    (e) => {
      e.stopPropagation();
      if (!inDialogue) {
        setJumpPressed(true);
        setKey("space", true);
        setTimeout(() => {
          setKey("space", false);
          setJumpPressed(false);
        }, 150);
      }
    },
    [inDialogue, setKey]
  );
  const handleInteract = reactExports.useCallback(
    (e) => {
      e.stopPropagation();
      if (currentInteractable && !inDialogue) {
        setInteractPressed(true);
        setTimeout(() => setInteractPressed(false), 150);
        openDialogue(
          currentInteractable.name,
          currentInteractable.dialogueText
        );
      }
    },
    [currentInteractable, inDialogue, openDialogue]
  );
  if (!gameActive) return null;
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 pointer-events-none z-10 md:hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "absolute left-0 top-0 w-1/2 h-full pointer-events-auto",
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchEnd
      }
    ),
    joystickActive && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: cn(
          "absolute w-[150px] h-[150px] rounded-full pointer-events-none",
          "border-2 transition-colors duration-200",
          isSprinting ? "bg-yellow-900/30 border-yellow-600/60" : "bg-yellow-900/40 border-yellow-700/50"
        ),
        style: { left: joystickPos.x, top: joystickPos.y },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-yellow-700/40" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-yellow-700/40" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-t-transparent border-b-transparent border-r-yellow-700/40" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-t-transparent border-b-transparent border-l-yellow-700/40" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-4 rounded-full border border-yellow-700/30" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: cn(
                "absolute top-1/2 left-1/2 w-14 h-14 rounded-full",
                "border-2 transition-all duration-100",
                isSprinting ? "bg-gradient-to-b from-yellow-600/70 to-yellow-700/70 border-yellow-500/80 shadow-[0_0_15px_rgba(202,138,0,0.4)]" : "bg-gradient-to-b from-yellow-700/60 to-yellow-800/60 border-yellow-700/60"
              ),
              style: {
                transform: `translate(calc(-50% + ${stickOffset.x}px), calc(-50% + ${stickOffset.y}px))`
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-1 rounded-full bg-gradient-to-b from-white/20 to-transparent" })
            }
          ),
          isSprinting && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-yellow-700 font-bold tracking-wider", children: "SPRINT" })
        ]
      }
    ),
    !joystickActive && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-24 left-8 text-xs text-yellow-900 opacity-50", children: "Touch to move" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-16 right-6 flex flex-col gap-4 pointer-events-auto", children: [
      currentInteractable && !inDialogue && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onTouchStart: handleInteract,
          className: cn(
            "relative w-[72px] h-[72px] rounded-full overflow-hidden",
            "bg-gradient-to-b from-amber-600/90 to-amber-700/90",
            "border-2 border-yellow-700/70",
            "flex items-center justify-center flex-col gap-0.5",
            "shadow-lg shadow-amber-900/30",
            "transition-all duration-100",
            interactPressed && "scale-90 brightness-125"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-transparent to-yellow-500/20" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "absolute inset-0 rounded-full border-2 border-yellow-600/50 animate-ping",
                style: { animationDuration: "1.5s" }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "relative text-yellow-700 font-lora text-[10px] font-bold tracking-wider", children: currentInteractable.actionVerb }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "relative text-yellow-900 font-lora text-[8px] truncate max-w-[60px]", children: currentInteractable.name })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onTouchStart: handleJump,
          className: cn(
            "relative w-[72px] h-[72px] rounded-full overflow-hidden",
            "bg-gradient-to-b from-yellow-800/80 to-yellow-900/80",
            "border-2 border-yellow-700/50",
            "flex items-center justify-center",
            "shadow-lg",
            "transition-all duration-100",
            jumpPressed && "scale-90 bg-gradient-to-b from-yellow-700/80 to-yellow-800/80 border-yellow-600/60"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-transparent to-white/10" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex flex-col items-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "svg",
                {
                  viewBox: "0 0 24 24",
                  className: cn(
                    "w-6 h-6 transition-transform",
                    jumpPressed && "-translate-y-1"
                  ),
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2.5",
                  "aria-hidden": "true",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 19V5M5 12l7-7 7 7", className: "text-yellow-700" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-800 font-lora text-[9px] font-bold tracking-wider mt-0.5", children: "JUMP" })
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-4 left-6 right-6 h-1 bg-yellow-900/60 rounded-full overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "h-full bg-gradient-to-r from-sage-500 to-sage-400 transition-all duration-200",
        style: { width: `${stamina}%` }
      }
    ) })
  ] });
}

function MobileControlsDefault() {
  const [ready, setReady] = reactExports.useState(false);
  reactExports.useEffect(() => {
    Object.defineProperty(window, "ontouchstart", {
      value: null,
      writable: true,
      configurable: true
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      value: 5,
      writable: true,
      configurable: true
    });
    useGameStore.setState({
      gameActive: true,
      inDialogue: false,
      currentInteractable: null,
      stamina: 80
    });
    setReady(true);
  }, []);
  if (!ready) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MobileControls, {});
}
function MobileControlsWithInteraction() {
  const [ready, setReady] = reactExports.useState(false);
  reactExports.useEffect(() => {
    Object.defineProperty(window, "ontouchstart", {
      value: null,
      writable: true,
      configurable: true
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      value: 5,
      writable: true,
      configurable: true
    });
    useGameStore.setState({
      gameActive: true,
      inDialogue: false,
      currentInteractable: {
        id: "npc-test",
        position: { x: 0, y: 0, z: 0, isVector3: true },
        radius: 3,
        type: "merchant",
        name: "Peddler",
        dialogueText: "Fine wares!",
        actionVerb: "Trade with"
      },
      stamina: 60
    });
    setReady(true);
  }, []);
  if (!ready) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MobileControls, {});
}
function MobileControlsHidden() {
  reactExports.useEffect(() => {
    useGameStore.setState({ gameActive: false });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-testid": "mobile-hidden-wrapper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MobileControls, {}) });
}

export { MobileControlsDefault, MobileControlsHidden, MobileControlsWithInteraction };
//# sourceMappingURL=MobileControls.story-B6dS8giX.js.map
