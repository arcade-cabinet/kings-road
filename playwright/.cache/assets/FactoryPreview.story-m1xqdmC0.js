import { j as jsxRuntimeExports } from './jsx-runtime-CLliEFxU.js';
import { r as reactExports } from './index-BAe1oPKr.js';
import { C as CanvasTexture, S as SRGBColorSpace } from './three.module-DXn-rEMf.js';

function seededRng(seed) {
  let s = seed | 0;
  return () => {
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
const SLOTS = {
  race: ["human", "elf", "dwarf", "orc", "halfling"],
  job: ["mage", "cleric", "warrior", "ranger", "rogue"],
  expression: [
    "neutral",
    "happy",
    "angry",
    "sad",
    "surprised",
    "sleeping",
    "speaking"
  ],
  hairStyle: [
    "bald",
    "short",
    "long",
    "ponytail",
    "topknot",
    "braided",
    "wild",
    "hooded"
  ],
  facialHair: ["none", "stubble", "full_beard", "mustache"],
  weaponType: [
    "none",
    "staff",
    "sword",
    "mace",
    "bow",
    "dagger",
    "holy_book"
  ]
};
const SKIN_PALETTES = [
  "#fce4c7",
  "#f0c8a0",
  "#d4a574",
  "#b07843",
  "#8b5e3c",
  "#5c3a1e"
];
const HAIR_PALETTES = [
  "#1a1a1a",
  "#3b2a1a",
  "#6b4226",
  "#8b6914",
  "#c4a35a",
  "#d4d4d4",
  "#8b1a1a",
  "#f5deb3"
];
const EYE_PALETTES = [
  "#4a3728",
  "#2e5e3e",
  "#3a5f8a",
  "#6b6b6b",
  "#6a3d9a"
];
const PRIMARY_DYES = [
  "#8b1a1a",
  "#1a3a6b",
  "#2e5e3e",
  "#6b3a8b",
  "#8b7032",
  "#4a4a4a",
  "#c4a35a",
  "#5b2e2e"
];
const ACCENT_METALS = [
  "#d4af37",
  "#c0c0c0",
  "#cd7f32",
  "#b87333"
];
const FIRST_NAMES = [
  "Aldric",
  "Brenna",
  "Cedric",
  "Delia",
  "Eamon",
  "Faye",
  "Gareth",
  "Helena",
  "Ivar",
  "Jorin",
  "Kenna",
  "Leofric",
  "Mira",
  "Nolan",
  "Orla",
  "Perrin",
  "Quinn",
  "Roswen",
  "Silas",
  "Theron"
];
const LAST_NAMES = [
  "Ashford",
  "Briarwood",
  "Copperfield",
  "Dunmore",
  "Emberstone",
  "Fairweather",
  "Greenhollow",
  "Hawthorn",
  "Ironvale",
  "Kettleburn",
  "Longmere",
  "Marshwell",
  "Northcott",
  "Oakshade",
  "Pennywhistle",
  "Ravensdale",
  "Stonehelm",
  "Thornbury"
];
function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}
function generateChibiFromSeed(seed) {
  const numericSeed = typeof seed === "string" ? hashString(seed) : seed;
  const rng = seededRng(numericSeed);
  const race = pick(SLOTS.race, rng);
  const job = pick(SLOTS.job, rng);
  let headSize;
  let bodyPlumpness;
  switch (race) {
    case "dwarf":
      headSize = 1.35;
      bodyPlumpness = 1.2 + rng() * 0.1;
      break;
    case "elf":
      headSize = 0.95;
      bodyPlumpness = 0.85 + rng() * 0.1;
      break;
    case "halfling":
      headSize = 1.15;
      bodyPlumpness = 0.85;
      break;
    case "orc":
      headSize = 1.15;
      bodyPlumpness = 1.1 + rng() * 0.2;
      break;
    default:
      headSize = 1.15;
      bodyPlumpness = 0.95 + rng() * 0.2;
      break;
  }
  return {
    race,
    job,
    skinTone: pick(SKIN_PALETTES, rng),
    hairColor: pick(HAIR_PALETTES, rng),
    eyeColor: pick(EYE_PALETTES, rng),
    primaryColor: pick(PRIMARY_DYES, rng),
    secondaryColor: pick(PRIMARY_DYES, rng),
    accentColor: pick(ACCENT_METALS, rng),
    expression: pick(SLOTS.expression, rng),
    headSize,
    bodyPlumpness,
    hairStyle: pick(SLOTS.hairStyle, rng),
    facialHair: pick(SLOTS.facialHair, rng),
    hasCloak: rng() > 0.6,
    weaponType: pick(SLOTS.weaponType, rng)
  };
}
function generateTownNPC(townSeed, index, role) {
  const compoundSeed = `${townSeed}_npc_${index}_${role}`;
  const config = generateChibiFromSeed(compoundSeed);
  const nameRng = seededRng(hashString(`${compoundSeed}_name`));
  const firstName = pick(FIRST_NAMES, nameRng);
  const lastName = pick(LAST_NAMES, nameRng);
  switch (role) {
    case "guard":
      config.job = "warrior";
      config.primaryColor = "#4a4a4a";
      config.hasCloak = true;
      config.bodyPlumpness = 1.15;
      break;
    case "merchant":
      config.job = "ranger";
      config.primaryColor = "#6b4226";
      config.hairStyle = "ponytail";
      config.expression = "happy";
      break;
    case "priest":
      config.job = "cleric";
      config.primaryColor = "#f5f0e0";
      config.hairColor = "#d4d4d4";
      break;
    case "blacksmith":
      config.job = "warrior";
      config.skinTone = "#8b5e3c";
      config.primaryColor = "#5b2e2e";
      config.hairStyle = "topknot";
      break;
    case "bard":
      config.job = "mage";
      config.primaryColor = "#6b3a8b";
      config.hairStyle = "long";
      config.expression = "happy";
      break;
    case "villager":
      break;
  }
  return {
    ...config,
    name: `${firstName} ${lastName}`,
    role
  };
}

const SKIN_COLORS = ["#ffdbac", "#f1c27d", "#e0ac69", "#c68642", "#8d5524"];
const EYE_COLORS = {
  brown: "#5c3317",
  blue: "#4488cc",
  green: "#44aa66",
  gray: "#888899"
};
function generateFaceTexture(face) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(
      "Failed to get 2D canvas context for face texture generation"
    );
  }
  const skinHex = SKIN_COLORS[face.skinTone] ?? SKIN_COLORS[2];
  const eyeHex = EYE_COLORS[face.eyeColor] ?? EYE_COLORS.brown;
  ctx.fillStyle = skinHex;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = face.hairColor;
  if (face.hairStyle !== "bald") {
    ctx.fillRect(0, 0, size, 32);
    if (face.hairStyle === "long" || face.hairStyle === "hooded") {
      ctx.fillRect(0, 0, 24, size);
      ctx.fillRect(size - 24, 0, 24, size);
    }
    if (face.hairStyle === "short") {
      ctx.fillRect(0, 0, 16, 64);
      ctx.fillRect(size - 16, 0, 16, 64);
    }
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(36, 56, 16, 16);
  ctx.fillRect(76, 56, 16, 16);
  ctx.fillStyle = eyeHex;
  ctx.fillRect(40, 60, 10, 10);
  ctx.fillRect(80, 60, 10, 10);
  ctx.fillStyle = "#111111";
  ctx.fillRect(43, 63, 4, 4);
  ctx.fillRect(83, 63, 4, 4);
  ctx.fillStyle = "#aa4444";
  ctx.fillRect(48, 92, 32, 6);
  if (face.facialHair === "full_beard") {
    ctx.fillStyle = face.hairColor;
    ctx.fillRect(32, 88, 64, 32);
    ctx.fillRect(24, 76, 16, 40);
    ctx.fillRect(88, 76, 16, 40);
  } else if (face.facialHair === "mustache") {
    ctx.fillStyle = face.hairColor;
    ctx.fillRect(40, 84, 48, 8);
  } else if (face.facialHair === "stubble") {
    ctx.fillStyle = `${face.hairColor}44`;
    for (let i = 0; i < 60; i++) {
      const sx = 32 + i * 7 % 64;
      const sy = 80 + i * 11 % 40;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
  return new CanvasTexture(canvas);
}
function darkenHex(hex, amount) {
  const raw = hex.replace("#", "");
  const r = Math.max(
    0,
    Math.round(Number.parseInt(raw.slice(0, 2), 16) * (1 - amount))
  );
  const g = Math.max(
    0,
    Math.round(Number.parseInt(raw.slice(2, 4), 16) * (1 - amount))
  );
  const b = Math.max(
    0,
    Math.round(Number.parseInt(raw.slice(4, 6), 16) * (1 - amount))
  );
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = h * 31 + s.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}
function drawSkinBase(ctx, skinTone) {
  const cx = 256;
  const cy = 230;
  const radius = 220;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, skinTone);
  grad.addColorStop(1, darkenHex(skinTone, 0.15));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}
function drawEyebrows(ctx, expression, hairColor) {
  const thickness = expression === "angry" ? 11 : 7;
  ctx.strokeStyle = hairColor;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  const leftX = 175;
  const rightX = 337;
  let leftStartY = 195;
  let leftEndY = 195;
  let rightStartY = 195;
  let rightEndY = 195;
  let leftCpY = 190;
  let rightCpY = 190;
  switch (expression) {
    case "angry":
      leftStartY = 188;
      leftEndY = 200;
      leftCpY = 192;
      rightStartY = 200;
      rightEndY = 188;
      rightCpY = 192;
      break;
    case "surprised":
      leftStartY = 172;
      leftEndY = 172;
      leftCpY = 164;
      rightStartY = 172;
      rightEndY = 172;
      rightCpY = 164;
      break;
    case "happy":
      leftStartY = 185;
      leftEndY = 185;
      leftCpY = 179;
      rightStartY = 185;
      rightEndY = 185;
      rightCpY = 179;
      break;
    case "sad":
      leftStartY = 200;
      leftEndY = 186;
      leftCpY = 190;
      rightStartY = 186;
      rightEndY = 200;
      rightCpY = 190;
      break;
    default:
      break;
  }
  ctx.beginPath();
  ctx.moveTo(leftX - 30, leftStartY);
  ctx.quadraticCurveTo(leftX, leftCpY, leftX + 30, leftEndY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rightX - 30, rightStartY);
  ctx.quadraticCurveTo(rightX, rightCpY, rightX + 30, rightEndY);
  ctx.stroke();
}
function drawEyes(ctx, expression, eyeColor) {
  const leftCx = 190;
  const rightCx = 322;
  const eyeY = 240;
  if (expression === "sleeping") {
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (const cx of [leftCx, rightCx]) {
      ctx.beginPath();
      ctx.arc(cx, eyeY, 22, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    return;
  }
  const scleraH = expression === "surprised" ? 39 : 24;
  for (const cx of [leftCx, rightCx]) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx, eyeY, 31, scleraH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(cx, eyeY + 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(cx, eyeY + 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - 7, eyeY - 5, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawMouth(ctx, expression) {
  const mouthX = 256;
  const mouthY = 310;
  ctx.fillStyle = "#aa4444";
  ctx.strokeStyle = "#aa4444";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  switch (expression) {
    case "happy": {
      ctx.beginPath();
      ctx.arc(mouthX, mouthY - 8, 28, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      break;
    }
    case "angry": {
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(mouthX - 22, mouthY);
      ctx.quadraticCurveTo(mouthX, mouthY + 6, mouthX + 22, mouthY);
      ctx.stroke();
      break;
    }
    case "sad": {
      ctx.beginPath();
      ctx.arc(mouthX, mouthY + 12, 24, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      break;
    }
    case "surprised": {
      ctx.beginPath();
      ctx.arc(mouthX, mouthY, 14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "speaking": {
      ctx.beginPath();
      ctx.ellipse(mouthX, mouthY, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "sleeping": {
      ctx.fillStyle = "#555555";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("z", mouthX + 40, mouthY - 20);
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("z", mouthX + 60, mouthY - 45);
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("z", mouthX + 72, mouthY - 62);
      ctx.strokeStyle = "#aa4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mouthX - 10, mouthY);
      ctx.lineTo(mouthX + 10, mouthY);
      ctx.stroke();
      break;
    }
    default: {
      ctx.beginPath();
      ctx.moveTo(mouthX - 18, mouthY);
      ctx.lineTo(mouthX + 18, mouthY);
      ctx.stroke();
      break;
    }
  }
}
function drawFacialHair(ctx, facialHair, hairColor) {
  if (facialHair === "none") return;
  const cx = 256;
  if (facialHair === "full_beard") {
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(cx - 80, 290);
    ctx.quadraticCurveTo(cx - 95, 340, cx - 60, 390);
    ctx.quadraticCurveTo(cx, 430, cx + 60, 390);
    ctx.quadraticCurveTo(cx + 95, 340, cx + 80, 290);
    ctx.quadraticCurveTo(cx, 300, cx - 80, 290);
    ctx.fill();
  } else if (facialHair === "mustache") {
    ctx.strokeStyle = hairColor;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, 298);
    ctx.quadraticCurveTo(cx - 25, 292, cx - 50, 302);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, 298);
    ctx.quadraticCurveTo(cx + 25, 292, cx + 50, 302);
    ctx.stroke();
  } else if (facialHair === "stubble") {
    ctx.fillStyle = `${hairColor}55`;
    const seed = simpleHash(hairColor);
    for (let i = 0; i < 100; i++) {
      const angle = (seed + i * 137) % 360 * (Math.PI / 180);
      const dist = 30 + (seed + i * 73) % 80;
      const sx = cx + Math.cos(angle) * dist;
      const sy = 320 + Math.sin(angle) * dist * 0.5;
      if (sy > 285 && sy < 400 && sx > 160 && sx < 352) {
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
function drawHair(ctx, hairStyle, hairColor) {
  if (hairStyle === "bald") return;
  const cx = 256;
  ctx.fillStyle = hairColor;
  const drawCap = () => {
    ctx.beginPath();
    ctx.moveTo(cx - 190, 200);
    ctx.quadraticCurveTo(cx - 200, 80, cx, 40);
    ctx.quadraticCurveTo(cx + 200, 80, cx + 190, 200);
    ctx.lineTo(cx + 160, 170);
    ctx.quadraticCurveTo(cx, 130, cx - 160, 170);
    ctx.closePath();
    ctx.fill();
  };
  switch (hairStyle) {
    case "short": {
      drawCap();
      break;
    }
    case "long": {
      drawCap();
      ctx.beginPath();
      ctx.moveTo(cx - 190, 200);
      ctx.quadraticCurveTo(cx - 200, 320, cx - 160, 420);
      ctx.lineTo(cx - 130, 420);
      ctx.quadraticCurveTo(cx - 150, 300, cx - 160, 200);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 190, 200);
      ctx.quadraticCurveTo(cx + 200, 320, cx + 160, 420);
      ctx.lineTo(cx + 130, 420);
      ctx.quadraticCurveTo(cx + 150, 300, cx + 160, 200);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "ponytail": {
      drawCap();
      ctx.beginPath();
      ctx.arc(cx, 30, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, 10, 14, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "topknot": {
      drawCap();
      ctx.beginPath();
      ctx.moveTo(cx - 20, 50);
      ctx.quadraticCurveTo(cx - 24, -10, cx, -30);
      ctx.quadraticCurveTo(cx + 24, -10, cx + 20, 50);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "braided": {
      drawCap();
      for (const sign of [-1, 1]) {
        const bx = cx + sign * 170;
        ctx.beginPath();
        ctx.moveTo(bx, 190);
        ctx.quadraticCurveTo(bx + sign * 10, 280, bx - sign * 5, 370);
        ctx.quadraticCurveTo(bx - sign * 15, 380, bx - sign * 5, 390);
        ctx.arc(bx - sign * 5, 390, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx, 190);
        ctx.quadraticCurveTo(bx + sign * 10, 280, bx - sign * 5, 370);
        ctx.lineTo(bx - sign * 20, 370);
        ctx.quadraticCurveTo(bx - sign * 5, 280, bx - 15 * sign, 190);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "wild": {
      ctx.beginPath();
      ctx.moveTo(cx - 210, 220);
      ctx.lineTo(cx - 200, 120);
      ctx.lineTo(cx - 170, 80);
      ctx.lineTo(cx - 140, 100);
      ctx.lineTo(cx - 110, 30);
      ctx.lineTo(cx - 60, 60);
      ctx.lineTo(cx - 30, 10);
      ctx.lineTo(cx + 20, 50);
      ctx.lineTo(cx + 70, 5);
      ctx.lineTo(cx + 110, 55);
      ctx.lineTo(cx + 150, 25);
      ctx.lineTo(cx + 175, 90);
      ctx.lineTo(cx + 205, 110);
      ctx.lineTo(cx + 210, 220);
      ctx.quadraticCurveTo(cx + 170, 170, cx, 155);
      ctx.quadraticCurveTo(cx - 170, 170, cx - 210, 220);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "hooded": {
      ctx.beginPath();
      ctx.moveTo(cx - 220, 400);
      ctx.quadraticCurveTo(cx - 230, 200, cx - 210, 100);
      ctx.quadraticCurveTo(cx, 10, cx + 210, 100);
      ctx.quadraticCurveTo(cx + 230, 200, cx + 220, 400);
      ctx.lineTo(cx + 150, 380);
      ctx.quadraticCurveTo(cx + 170, 250, cx + 150, 170);
      ctx.quadraticCurveTo(cx, 120, cx - 150, 170);
      ctx.quadraticCurveTo(cx - 170, 250, cx - 150, 380);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}
function createChibiFaceTexture(config) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(
      "Failed to get 2D canvas context for chibi face texture generation"
    );
  }
  ctx.clearRect(0, 0, size, size);
  drawSkinBase(ctx, config.skinTone);
  drawEyebrows(ctx, config.expression, config.hairColor);
  drawEyes(ctx, config.expression, config.eyeColor);
  drawMouth(ctx, config.expression);
  drawFacialHair(ctx, config.facialHair, config.hairColor);
  drawHair(ctx, config.hairStyle, config.hairColor);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function FaceTexturePreview({
  skinTone,
  eyeColor,
  hairColor,
  hairStyle,
  facialHair,
  expression,
  race
}) {
  const imgRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const tex = createChibiFaceTexture({
      skinTone,
      eyeColor,
      hairColor,
      hairStyle,
      facialHair,
      expression,
      race
    });
    const canvas = tex.image;
    if (imgRef.current) {
      imgRef.current.src = canvas.toDataURL("image/png");
    }
    tex.dispose();
  }, [skinTone, eyeColor, hairColor, hairStyle, facialHair, expression, race]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": "face-preview",
      style: {
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 12,
        background: "#f5f0e8"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            ref: imgRef,
            "data-testid": "face-image",
            alt: `${expression} face`,
            width: 256,
            height: 256,
            style: { imageRendering: "pixelated", border: "2px solid #d4c9b0" }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            style: {
              marginTop: 6,
              fontFamily: "monospace",
              fontSize: 12,
              color: "#5c3a1e"
            },
            children: [
              expression,
              " / ",
              hairStyle,
              " / ",
              facialHair
            ]
          }
        )
      ]
    }
  );
}
function FaceTextureGrid({
  faces,
  columns = 4
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-testid": "face-grid",
      style: {
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 8,
        padding: 16,
        background: "#f5f0e8"
      },
      children: faces.map((face) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        FaceTexturePreview,
        {
          ...face
        },
        `${face.expression}-${face.hairStyle}-${face.facialHair}-${face.skinTone}`
      ))
    }
  );
}
function ColorSwatch({ color, label }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 2
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              width: 20,
              height: 20,
              borderRadius: 4,
              background: color,
              border: "1px solid #888",
              flexShrink: 0
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontFamily: "monospace", fontSize: 11, color: "#333" }, children: [
          label,
          ": ",
          color
        ] })
      ]
    }
  );
}
function ChibiConfigCard({ seed }) {
  const config = generateChibiFromSeed(seed);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": "chibi-card",
      style: {
        border: "2px solid #d4c9b0",
        borderRadius: 8,
        padding: 12,
        background: "#faf8f3",
        fontFamily: "monospace",
        fontSize: 12,
        width: 240
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              fontWeight: "bold",
              fontSize: 14,
              marginBottom: 8,
              color: "#5c3a1e",
              borderBottom: "1px solid #d4c9b0",
              paddingBottom: 4
            },
            children: [
              'seed: "',
              seed,
              '"'
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Race:" }),
          " ",
          config.race,
          "  |  ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Job:" }),
          " ",
          config.job
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Expression:" }),
          " ",
          config.expression
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Hair:" }),
          " ",
          config.hairStyle,
          "  | ",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Facial:" }),
          " ",
          config.facialHair
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Weapon:" }),
          " ",
          config.weaponType,
          "  | ",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Cloak:" }),
          " ",
          config.hasCloak ? "yes" : "no"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Head:" }),
          " ",
          config.headSize.toFixed(2),
          "  | ",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Body:" }),
          " ",
          config.bodyPlumpness.toFixed(2)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ColorSwatch, { color: config.skinTone, label: "skin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ColorSwatch, { color: config.hairColor, label: "hair" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ColorSwatch, { color: config.eyeColor, label: "eyes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ColorSwatch, { color: config.primaryColor, label: "primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ColorSwatch, { color: config.secondaryColor, label: "secondary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ColorSwatch, { color: config.accentColor, label: "accent" })
        ] })
      ]
    }
  );
}
function ChibiConfigGrid({
  seeds,
  columns = 4
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-testid": "chibi-grid",
      style: {
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
        padding: 16,
        background: "#f5f0e8"
      },
      children: seeds.map((seed) => /* @__PURE__ */ jsxRuntimeExports.jsx(ChibiConfigCard, { seed }, seed))
    }
  );
}

export { ChibiConfigCard, ChibiConfigGrid, FaceTextureGrid, FaceTexturePreview };
//# sourceMappingURL=FactoryPreview.story-m1xqdmC0.js.map
