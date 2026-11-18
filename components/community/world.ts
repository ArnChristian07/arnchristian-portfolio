// The lobby room (a pixel laboratory): layout, collision and hand-drawn pixel
// art. Everything is drawn with fillRect in "world pixels" (one tile = 16px),
// onto a small offscreen canvas that the lobby scales up with nearest-neighbour
// filtering.

import type { Dir, Gender, Look } from "./avatar";

export { SHIRTS, looks, defaultGender, type Dir, type Gender, type Look } from "./avatar";

export const TILE = 16;
export const COLS = 24;
export const ROWS = 15;
export const WORLD_W = COLS * TILE; // 384
export const WORLD_H = ROWS * TILE; // 240
/**
 * Real pixels per world pixel on the offscreen canvases. The room's art is 1×
 * pixel art blown up crisply; the extra resolution keeps the admin's detailed
 * sprite sharp when it's shrunk to room size.
 */
export const RES = 4;

/** Walkable floor, in world pixels (inside the walls). */
const FLOOR = { x0: TILE, y0: 3 * TILE, x1: (COLS - 1) * TILE, y1: (ROWS - 1) * TILE };

/** A player's collision box: 8px wide and 4px tall, sitting on the feet point. */
const HALF_W = 4;
const FOOT_H = 4;


type Kind =
  | "whiteboard"
  | "hazardSign"
  | "clock"
  | "periodic"
  | "hazardZone"
  | "door"
  | "hood"
  | "chemShelf"
  | "freezer"
  | "server"
  | "bench"
  | "terminals"
  | "reactor"
  | "tank"
  | "cylinders"
  | "bin"
  | "extinguisher"
  | "plant";

type Obj = { kind: Kind; x: number; y: number; w: number; h: number; hue?: string };

// Positions and sizes in tiles. Rows 1–2 are the back wall; the floor starts at row 3.
const WALL_DECOR: Obj[] = [
  { kind: "whiteboard", x: 5, y: 1, w: 4, h: 1 },
  { kind: "hazardSign", x: 12, y: 1, w: 1, h: 1 },
  { kind: "clock", x: 13, y: 1, w: 1, h: 1 },
  { kind: "periodic", x: 14, y: 1, w: 3, h: 1 },
];
const FLAT: Obj[] = [
  { kind: "hazardZone", x: 10, y: 7, w: 4, h: 4 },
  { kind: "door", x: 11, y: 14, w: 2, h: 1 },
];
/** Equipment you bump into, drawn depth-sorted with the players. */
const SOLID: Obj[] = [
  { kind: "hood", x: 1, y: 1, w: 3, h: 3 },
  { kind: "chemShelf", x: 10, y: 1, w: 2, h: 3 },
  { kind: "freezer", x: 17, y: 1, w: 2, h: 3 },
  { kind: "server", x: 20, y: 1, w: 1, h: 3 },
  { kind: "server", x: 21, y: 1, w: 1, h: 3 },
  { kind: "plant", x: 22, y: 3, w: 1, h: 1 },
  { kind: "bench", x: 3, y: 6, w: 5, h: 1 },
  { kind: "terminals", x: 3, y: 10, w: 5, h: 1 },
  { kind: "reactor", x: 11, y: 8, w: 2, h: 2 },
  { kind: "tank", x: 16, y: 6, w: 1, h: 2, hue: "#5cf2a0" },
  { kind: "tank", x: 18, y: 6, w: 1, h: 2, hue: "#5cc8ff" },
  { kind: "tank", x: 20, y: 6, w: 1, h: 2, hue: "#c38bff" },
  { kind: "terminals", x: 16, y: 11, w: 4, h: 1 },
  { kind: "cylinders", x: 22, y: 11, w: 1, h: 2 },
  { kind: "bin", x: 1, y: 13, w: 1, h: 1 },
  { kind: "extinguisher", x: 1, y: 8, w: 1, h: 1 },
];

/* ---------- Collision ---------- */

function hits(x: number, y: number) {
  const l = x - HALF_W;
  const r = x + HALF_W;
  const t = y - FOOT_H;
  if (l < FLOOR.x0 || r > FLOOR.x1 || t < FLOOR.y0 || y > FLOOR.y1) return true;
  return SOLID.some((o) => {
    // The top 2px are left open so feet can tuck in just behind an object.
    const ox = o.x * TILE;
    const oy = o.y * TILE;
    return r > ox + 1 && l < ox + o.w * TILE - 1 && y > oy + 2 && t < oy + o.h * TILE - 1;
  });
}

/** Moves along each axis separately so players slide along walls. */
export function step(x: number, y: number, dx: number, dy: number) {
  if (dx && !hits(x + dx, y)) x += dx;
  if (dy && !hits(x, y + dy)) y += dy;
  return { x, y };
}

export function spawnPoint() {
  for (let i = 0; i < 50; i++) {
    const x = 160 + Math.random() * 64;
    const y = 196 + Math.random() * 24;
    if (!hits(x, y)) return { x: Math.round(x), y: Math.round(y) };
  }
  return { x: 192, y: 208 };
}

export function clampToWorld(x: number, y: number) {
  return {
    x: Math.min(FLOOR.x1 - HALF_W, Math.max(FLOOR.x0 + HALF_W, x)),
    y: Math.min(FLOOR.y1, Math.max(FLOOR.y0 + FOOT_H, y)),
  };
}

/* ---------- Drawing helpers ---------- */

type Ctx = CanvasRenderingContext2D;

function px(c: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}

/** Small deterministic PRNG so the shelves look the same on every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

/** Seconds since load, for animated equipment (bubbles, LEDs, the reactor). */
const time = () => performance.now() / 1000;

const METAL = "#8c97a3";
const METAL_DARK = "#5b6675";
const METAL_LIGHT = "#b8c2cc";
const INK = "#1d2430";
const GLASS = "rgba(220,240,250,0.85)";

function drawFloor(c: Ctx) {
  const { x0, y0, x1, y1 } = FLOOR;
  px(c, "#dfe5ea", x0, y0, x1 - x0, y1 - y0);
  for (let y = y0; y < y1; y += TILE) {
    for (let x = x0; x < x1; x += TILE) {
      // A few off-tone tiles so the floor doesn't look printed.
      if (((x / TILE) * 7 + (y / TILE) * 13) % 11 === 0) px(c, "#d5dce3", x, y, TILE, TILE);
      px(c, "#eef2f5", x, y, TILE - 1, 1);
      px(c, "#c5cdd5", x + TILE - 1, y, 1, TILE);
      px(c, "#c5cdd5", x, y + TILE - 1, TILE, 1);
    }
  }
  // Teal guide lines from the door into the room.
  px(c, "#7fd1c7", 12 * TILE - 1, 12 * TILE + 7, 2, y1 - 12 * TILE - 7);
  px(c, "#7fd1c7", 7 * TILE, 12 * TILE + 7, 11 * TILE, 2);
  // Shadow under the back wall.
  px(c, "rgba(20,30,45,0.16)", x0, y0, x1 - x0, 3);
}

function drawWalls(c: Ctx) {
  const trim = "#252c37";
  const edge = "#343d4b";
  // Back wall: metal-look panels with rivets and a dark baseboard.
  px(c, "#c9d3dc", TILE, TILE, (COLS - 2) * TILE, 2 * TILE);
  px(c, "#dbe3ea", TILE, TILE, (COLS - 2) * TILE, 3);
  for (let x = TILE + 31; x < (COLS - 1) * TILE; x += 32) px(c, "#b4bfca", x, TILE, 1, 2 * TILE);
  for (let x = TILE + 4; x < (COLS - 1) * TILE; x += 32) {
    px(c, "#b4bfca", x, TILE + 6, 1, 1);
    px(c, "#b4bfca", x + 23, TILE + 6, 1, 1);
  }
  px(c, METAL_DARK, TILE, 3 * TILE - 4, (COLS - 2) * TILE, 4);
  px(c, METAL, TILE, 3 * TILE - 4, (COLS - 2) * TILE, 1);
  // Outer walls.
  px(c, trim, 0, 0, WORLD_W, TILE);
  px(c, edge, 0, TILE - 3, WORLD_W, 3);
  px(c, trim, 0, 0, TILE, WORLD_H);
  px(c, trim, WORLD_W - TILE, 0, TILE, WORLD_H);
  px(c, trim, 0, WORLD_H - TILE, WORLD_W, TILE);
  px(c, edge, TILE - 3, TILE, 3, WORLD_H - 2 * TILE);
  px(c, edge, WORLD_W - TILE, TILE, 3, WORLD_H - 2 * TILE);
  px(c, edge, 0, WORLD_H - TILE, WORLD_W, 3);
  // Warning lights along the top trim.
  for (let x = 40; x < WORLD_W - 24; x += 96) {
    px(c, "rgba(255,176,46,0.25)", x - 2, 3, 8, 7);
    px(c, "#ffb02e", x, 5, 4, 3);
  }
}

/** Yellow/black diagonal hazard stripes filling a rectangle. */
function stripes(c: Ctx, x: number, y: number, w: number, h: number) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) px(c, ((x + i + y + j) >> 2) % 2 ? "#ffcb2e" : "#2a2f38", x + i, y + j);
}

/** A small Erlenmeyer flask standing at (x, bottom). */
function flask(c: Ctx, x: number, bottom: number, liquid: string) {
  px(c, GLASS, x + 2, bottom - 9, 2, 3);
  px(c, GLASS, x + 1, bottom - 6, 4, 2);
  px(c, GLASS, x, bottom - 4, 6, 4);
  px(c, liquid, x, bottom - 3, 6, 3);
  px(c, "#ffffff", x + 1, bottom - 4, 1, 1);
}

function drawObj(c: Ctx, o: Obj) {
  const x = o.x * TILE;
  const y = o.y * TILE;
  const w = o.w * TILE;
  const h = o.h * TILE;
  const t = time();
  switch (o.kind) {
    case "whiteboard": {
      px(c, METAL, x + 1, y + 1, w - 2, h - 1);
      px(c, "#f7f9fb", x + 2, y + 2, w - 4, h - 4);
      px(c, METAL_DARK, x + 4, y + h - 2, w - 8, 2);
      // Scribbles: an equation, a circled note and a wavy graph.
      px(c, "#2563eb", x + 5, y + 5, 2, 1);
      px(c, "#2563eb", x + 8, y + 4, 1, 3);
      px(c, "#2563eb", x + 10, y + 5, 4, 1);
      px(c, "#2563eb", x + 15, y + 4, 3, 1);
      px(c, "#2563eb", x + 15, y + 6, 3, 1);
      px(c, INK, x + 5, y + 9, 12, 1);
      px(c, "#e5484d", x + 22, y + 4, 4, 1);
      px(c, "#e5484d", x + 22, y + 9, 4, 1);
      px(c, "#e5484d", x + 21, y + 5, 1, 4);
      px(c, "#e5484d", x + 26, y + 5, 1, 4);
      px(c, INK, x + 32, y + 4, 1, 8);
      px(c, INK, x + 32, y + 11, 26, 1);
      for (let i = 0; i < 24; i += 2) px(c, "#46a758", x + 34 + i, y + 10 - Math.round(Math.sin(i / 3) * 3 + 3), 2, 1);
      break;
    }
    case "hazardSign": {
      px(c, INK, x + 4, y + 3, 9, 10);
      px(c, "#ffcb2e", x + 5, y + 4, 7, 8);
      px(c, INK, x + 8, y + 5, 1, 4);
      px(c, INK, x + 8, y + 10, 1, 1);
      break;
    }
    case "clock": {
      px(c, INK, x + 4, y + 2, 9, 11);
      px(c, INK, x + 3, y + 3, 11, 9);
      px(c, "#f7f9fb", x + 4, y + 3, 9, 9);
      px(c, INK, x + 8, y + 4, 1, 4);
      px(c, INK, x + 8, y + 7, 3, 1);
      break;
    }
    case "periodic": {
      px(c, METAL_DARK, x + 1, y + 2, w - 2, h - 3);
      px(c, "#f2f4f7", x + 2, y + 3, w - 4, h - 5);
      const cols = ["#ff8a8a", "#ffc46b", "#ffe56b", "#8be0a0", "#7cc8ff", "#c3a6ff"];
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 14; col++) {
          if (row === 0 && col > 0 && col < 13) continue;
          px(c, cols[(col + row) % cols.length], x + 3 + col * 3, y + 4 + row * 3, 2, 2);
        }
      break;
    }
    case "hazardZone": {
      px(c, "#d3dae1", x, y, w, h);
      stripes(c, x, y, w, 3);
      stripes(c, x, y + h - 3, w, 3);
      stripes(c, x, y + 3, 3, h - 6);
      stripes(c, x + w - 3, y + 3, 3, h - 6);
      break;
    }
    case "door": {
      px(c, METAL_DARK, x, y, w, h);
      px(c, METAL, x + 1, y + 3, w / 2 - 2, h - 3);
      px(c, METAL, x + w / 2 + 1, y + 3, w / 2 - 2, h - 3);
      px(c, METAL_LIGHT, x + 1, y + 3, w / 2 - 2, 1);
      px(c, METAL_LIGHT, x + w / 2 + 1, y + 3, w / 2 - 2, 1);
      px(c, "#46e08a", x + w / 2 - 1, y + 7, 2, 2);
      stripes(c, x, y, w, 2);
      break;
    }
    case "hood": {
      // Fume hood: a tall cabinet with a lit glass sash and two flasks inside.
      px(c, "rgba(0,0,0,0.2)", x + 1, y + h - 1, w - 2, 2);
      px(c, "#e6ebef", x + 1, y, w - 2, h);
      px(c, "#cfd8e0", x + 1, y, w - 2, 6);
      px(c, METAL_DARK, x + 6, y + 2, w - 12, 2);
      px(c, "#fff6c9", x + 4, y + 8, w - 8, 20);
      px(c, "rgba(140,200,225,0.45)", x + 4, y + 8, w - 8, 20);
      px(c, "#ffffff", x + 6, y + 10, 8, 1);
      flask(c, x + 9, y + 27, "#ff7ab8");
      flask(c, x + 22, y + 27, "#7cf0c8");
      px(c, METAL_LIGHT, x + 3, y + 28, w - 6, 2);
      px(c, "#b9c4ce", x + 2, y + 30, w - 4, h - 31);
      px(c, METAL_DARK, x + w / 2, y + 32, 1, h - 34);
      px(c, METAL_DARK, x + 14, y + 36, 4, 1);
      px(c, METAL_DARK, x + w - 18, y + 36, 4, 1);
      break;
    }
    case "chemShelf": {
      px(c, "rgba(0,0,0,0.2)", x + 1, y + h - 1, w - 2, 2);
      px(c, "#3a4452", x + 1, y, w - 2, h);
      px(c, METAL, x + 1, y, 2, h);
      px(c, METAL, x + w - 3, y, 2, h);
      px(c, METAL, x + 1, y, w - 2, 2);
      const rand = rng(o.x * 31 + o.y);
      const liquids = ["#ff7ab8", "#7cf0c8", "#ffd36b", "#7cc8ff", "#c38bff", "#ff9a5c"];
      for (let s = 0; s < 3; s++) {
        const sy = y + 2 + s * 15;
        px(c, METAL, x + 1, sy + 12, w - 2, 2);
        let bx = x + 4;
        while (bx < x + w - 8) {
          const col = liquids[Math.floor(rand() * liquids.length)];
          if (rand() < 0.5) {
            // Tall bottle with a cap.
            px(c, GLASS, bx, sy + 4, 3, 8);
            px(c, col, bx, sy + 7, 3, 5);
            px(c, "#2a2f38", bx, sy + 3, 3, 1);
            bx += 4;
          } else {
            // Round-bottom flask.
            px(c, GLASS, bx + 1, sy + 5, 2, 3);
            px(c, col, bx, sy + 8, 4, 4);
            bx += 5;
          }
        }
      }
      break;
    }
    case "freezer": {
      // −80° freezer with a readout and a blinking status light.
      px(c, "rgba(0,0,0,0.2)", x + 1, y + h - 1, w - 2, 2);
      px(c, "#eef3f6", x + 1, y, w - 2, h);
      px(c, "#d8e1e8", x + w - 4, y, 3, h);
      px(c, "#c5cfd8", x + 1, y + 20, w - 2, 1);
      px(c, METAL_DARK, x + w - 8, y + 8, 2, 8);
      px(c, METAL_DARK, x + w - 8, y + 24, 2, 12);
      px(c, INK, x + 4, y + 4, 13, 7);
      px(c, "#5cc8ff", x + 5, y + 7, 2, 1);
      px(c, "#5cc8ff", x + 8, y + 5, 3, 4);
      px(c, INK, x + 9, y + 6, 1, 2);
      px(c, "#5cc8ff", x + 12, y + 5, 3, 4);
      px(c, INK, x + 13, y + 6, 1, 2);
      px(c, "#bfe8ff", x + 4, y + 26, 9, 6);
      px(c, "#7cc8ff", x + 6, y + 28, 5, 2);
      px(c, Math.floor(t * 1.5) % 2 ? "#46e08a" : "#2c8a57", x + 19, y + 5, 2, 2);
      break;
    }
    case "server": {
      px(c, "rgba(0,0,0,0.25)", x + 1, y + h - 1, w - 2, 2);
      px(c, "#20262f", x + 1, y, w - 2, h);
      px(c, "#2c3440", x + 2, y + 2, w - 4, h - 4);
      for (let i = 0; i < 9; i++) {
        const ry = y + 4 + i * 5;
        px(c, "#3a4452", x + 3, ry, w - 6, 3);
        // Each LED blinks on its own rhythm.
        const on = Math.sin(t * (2 + ((i * 7 + o.x) % 5)) + i * 1.7 + o.x) > 0.2;
        px(c, on ? (i % 3 === 0 ? "#ffb02e" : "#46e08a") : "#253028", x + 4, ry + 1, 1, 1);
        px(c, on && i % 2 ? "#5cc8ff" : "#253038", x + 6, ry + 1, 1, 1);
      }
      break;
    }
    case "bench":
    case "terminals": {
      // Lab bench: dark worktop, cabinet front, equipment standing on top.
      px(c, "rgba(0,0,0,0.2)", x + 1, y + h - 1, w - 2, 2);
      px(c, "#2f3743", x, y + 1, w, 8);
      px(c, "#3d4756", x, y + 1, w, 2);
      px(c, "#c5cdd5", x + 1, y + 9, w - 2, h - 9);
      for (let i = x + 16; i < x + w - 2; i += 16) px(c, "#a9b4bf", i, y + 10, 1, h - 11);
      for (let i = x + 6; i < x + w - 2; i += 16) px(c, METAL_DARK, i, y + 11, 4, 1);
      if (o.kind === "bench") {
        flask(c, x + 4, y + 6, "#7cf0c8");
        flask(c, x + 12, y + 6, "#ff7ab8");
        // Test tube rack.
        px(c, METAL_DARK, x + 22, y + 3, 14, 3);
        ["#ffd36b", "#7cc8ff", "#c38bff", "#ff9a5c"].forEach((col, i) => {
          px(c, GLASS, x + 23 + i * 3, y - 3, 2, 7);
          px(c, col, x + 23 + i * 3, y + 1, 2, 3);
        });
        // Microscope.
        px(c, INK, x + 44, y + 4, 10, 2);
        px(c, "#e6ebef", x + 47, y - 6, 3, 10);
        px(c, INK, x + 46, y - 7, 5, 2);
        px(c, "#e6ebef", x + 50, y - 1, 3, 2);
        // Bunsen burner with a flickering flame.
        px(c, METAL, x + 62, y + 3, 6, 3);
        px(c, METAL, x + 64, y - 2, 2, 5);
        const lift = Math.floor(t * 8) % 3 === 1 ? 1 : 0;
        px(c, "#5cc8ff", x + 64, y - 5 - lift, 2, 3 + lift);
        px(c, "#d9f4ff", x + 64, y - 3, 1, 1);
      } else {
        // Computer terminals with scrolling readouts.
        const screens = Math.floor((w - 4) / 26);
        for (let s = 0; s < screens; s++) {
          const sx = x + 4 + s * 26;
          px(c, INK, sx, y - 10, 18, 12);
          px(c, "#0d2a24", sx + 1, y - 9, 16, 9);
          for (let line = 0; line < 4; line++) {
            const len = 3 + ((Math.floor(t * 3) + line * 5 + s * 3) % 11);
            px(c, s % 2 ? "#5cc8ff" : "#46e08a", sx + 2, y - 8 + line * 2, len, 1);
          }
          px(c, METAL_DARK, sx + 8, y + 2, 2, 2);
          px(c, "#e6ebef", sx + 2, y + 5, 14, 2);
        }
      }
      break;
    }
    case "reactor": {
      // A pulsing energy core on a round platform.
      const pulse = (Math.sin(t * 2.4) + 1) / 2;
      px(c, `rgba(92,200,255,${0.1 + pulse * 0.15})`, x - 3, y - 8, w + 6, h + 6);
      px(c, "rgba(0,0,0,0.22)", x + 3, y + h - 4, w - 6, 4);
      px(c, "#2f3743", x + 4, y + 14, w - 8, 14);
      px(c, "#2f3743", x + 2, y + 17, w - 4, 8);
      px(c, "#3d4756", x + 4, y + 14, w - 8, 2);
      px(c, METAL, x + 6, y + 18, w - 12, 2);
      for (let i = 0; i < 4; i++) {
        const lit = (Math.floor(t * 4) + i) % 4 === 0;
        px(c, lit ? "#5cc8ff" : "#1f4a63", x + 7 + i * 5, y + 22, 3, 2);
      }
      // Glass column with the core inside.
      px(c, "rgba(190,235,255,0.45)", x + 10, y - 4, 12, 17);
      px(c, METAL_LIGHT, x + 9, y - 6, 14, 3);
      const coreH = 8 + Math.round(pulse * 3);
      px(c, "#5cc8ff", x + 13, y + 11 - coreH, 6, coreH);
      px(c, "#d9f4ff", x + 15, y + 12 - coreH, 2, coreH - 2);
      px(c, METAL_LIGHT, x + 9, y + 12, 14, 3);
      break;
    }
    case "tank": {
      // Specimen tank: glowing liquid, rising bubbles, and something floating inside.
      const hue = o.hue ?? "#5cf2a0";
      px(c, "rgba(0,0,0,0.22)", x + 1, y + h - 2, w - 2, 2);
      c.globalAlpha = 0.22;
      px(c, hue, x - 2, y - 6, w + 4, h + 2);
      c.globalAlpha = 1;
      px(c, hue, x + 1, y - 2, w - 2, h - 6);
      px(c, "rgba(255,255,255,0.3)", x + 3, y, 1, h - 10);
      px(c, "rgba(20,40,40,0.45)", x + 5, y + 8, 6, 9);
      px(c, "rgba(20,40,40,0.45)", x + 6, y + 4, 4, 4);
      for (let i = 0; i < 3; i++) {
        const by = y + h - 10 - ((t * 14 + i * 9 + o.x * 5) % (h - 12));
        px(c, "rgba(255,255,255,0.8)", x + 4 + ((i * 5 + o.x) % 8), Math.round(by), 2, 2);
      }
      px(c, METAL_DARK, x, y - 6, w, 5);
      px(c, METAL_LIGHT, x, y - 6, w, 1);
      px(c, METAL_DARK, x, y + h - 8, w, 7);
      px(c, METAL, x, y + h - 8, w, 1);
      px(c, "#46e08a", x + 3, y + h - 5, 2, 1);
      break;
    }
    case "cylinders": {
      px(c, "rgba(0,0,0,0.2)", x + 1, y + h - 2, w - 2, 2);
      px(c, "#2e86de", x + 1, y + 6, 6, h - 7);
      px(c, "#5aa2ea", x + 2, y + 6, 1, h - 8);
      px(c, METAL, x + 3, y + 3, 2, 3);
      px(c, "#d64545", x + 8, y + 9, 6, h - 10);
      px(c, "#ec6b6b", x + 9, y + 9, 1, h - 11);
      px(c, METAL, x + 10, y + 6, 2, 3);
      px(c, METAL_DARK, x, y + 16, w, 2);
      break;
    }
    case "bin": {
      // Biohazard bin.
      px(c, "rgba(0,0,0,0.2)", x + 2, y + 14, 12, 2);
      px(c, "#ffcb2e", x + 3, y + 4, 10, 11);
      px(c, "#e0a800", x + 2, y + 2, 12, 3);
      px(c, INK, x + 7, y + 7, 2, 2);
      px(c, INK, x + 5, y + 10, 2, 2);
      px(c, INK, x + 9, y + 10, 2, 2);
      break;
    }
    case "extinguisher": {
      px(c, "rgba(0,0,0,0.2)", x + 4, y + 14, 8, 2);
      px(c, "#d64545", x + 5, y + 2, 6, 13);
      px(c, "#ec6b6b", x + 6, y + 3, 1, 10);
      px(c, INK, x + 6, y, 4, 2);
      px(c, INK, x + 10, y + 1, 3, 1);
      px(c, "#f7f9fb", x + 6, y + 7, 4, 3);
      break;
    }
    case "plant": {
      px(c, "rgba(0,0,0,0.18)", x + 3, y + 14, 10, 2);
      px(c, "#e6ebef", x + 4, y + 9, 8, 6);
      px(c, METAL_LIGHT, x + 3, y + 8, 10, 2);
      px(c, "#3f9a5a", x + 3, y + 1, 4, 7);
      px(c, "#3f9a5a", x + 9, y + 1, 4, 7);
      px(c, "#5cc275", x + 6, y - 2, 4, 10);
      px(c, "#8be0a0", x + 7, y - 1, 1, 4);
      break;
    }
  }
}

/** The static parts of the room (floor, walls, floor markings), drawn once. */
export function drawBackground(c: Ctx) {
  px(c, "#12161d", 0, 0, WORLD_W, WORLD_H);
  drawFloor(c);
  drawWalls(c);
  WALL_DECOR.forEach((o) => drawObj(c, o));
  FLAT.forEach((o) => drawObj(c, o));
}

/** Equipment as depth-sortable drawables (sorted by their bottom edge). Some of it animates. */
export const props = SOLID.map((o) => ({ y: (o.y + o.h) * TILE, draw: (c: Ctx) => drawObj(c, o) }));

/* ---------- Guests (public/assets/guest-*-sprite.png) ---------- */

/** How tall a guest stands, in world px (the admin is 28). */
export const GUEST_H = 26;
/** Distance from the feet to just above a guest's head, in world px (for name labels). */
export const CHAR_HEAD = GUEST_H + 2;

// Both sheets are a 3×3 grid: rows are front, back and left-facing side views;
// columns are standing, step A and step B. Boxes are tight [x0, y0, x1, y1]
// bounds, and every frame stands on its bottom edge. `ax` is each frame's
// anchor: the x (sheet px from the box's left edge) that sits over the feet
// point. They line every frame's head up with the standing frame's, so the
// body doesn't slide sideways as the box width changes from step to step.
type GuestRows = { d: Box[]; u: Box[]; l: Box[] };
type GuestAnchors = { d: number[]; u: number[]; l: number[] };
const GUEST_SHEETS: Record<Gender, { url: string; frameH: number; rows: GuestRows; ax: GuestAnchors }> = {
  f: {
    url: "/assets/guest-female-sprite.png",
    frameH: 172,
    rows: {
      d: [[60, 15, 155, 186], [237, 15, 332, 186], [416, 15, 510, 182]],
      u: [[63, 210, 152, 373], [240, 210, 328, 374], [417, 210, 505, 373]],
      l: [[67, 394, 155, 556], [244, 394, 331, 556], [421, 394, 508, 556]],
    },
    ax: { d: [48, 47, 47], u: [45, 44, 45], l: [44.5, 44.5, 44.5] },
  },
  m: {
    url: "/assets/guest-male-sprite.png",
    frameH: 243,
    rows: {
      d: [[91, 23, 216, 265], [387, 23, 514, 265], [684, 23, 812, 265]],
      u: [[85, 293, 205, 530], [382, 293, 504, 530], [682, 293, 805, 530]],
      l: [[94, 558, 212, 795], [388, 558, 507, 792], [687, 558, 806, 793]],
    },
    ax: { d: [63, 65, 67], u: [60.5, 61.5, 61.5], l: [59.5, 60.5, 60.5] },
  },
};

/** A cut frame plus the x (in its own pixels) to line up with the feet point. */
type GuestFrame = { cv: HTMLCanvasElement; ax: number };
type GuestFrames = Record<Dir, GuestFrame[]>;
const guestFrames: Partial<Record<Gender, GuestFrames>> = {};
const guestLoading = new Set<Gender>();

/**
 * Cuts a frame (see `cut`) and scales its anchor `ax`, given in sheet px from
 * the box's left edge in the sheet's own orientation, to match.
 */
function sheetFrame(
  img: HTMLImageElement,
  box: Box,
  k: number,
  ax: number,
  mirror = false,
  paint?: (c: Ctx) => void,
): GuestFrame {
  const cv = cut(img, box, k, mirror, paint);
  const w = box[2] - box[0] + 1;
  return { cv, ax: ((mirror ? w - ax : ax) * cv.width) / w };
}

/**
 * The female sheet's side frames never move their legs, so paint a stride:
 * the bare legs under the coat (sheet rows 537–556 of the standing frame) are
 * split into a front leg stepping forward and a shaded back leg behind.
 */
function femaleStride(c: Ctx, img: HTMLImageElement) {
  const [x, y, w, h] = [91, 537, 29, 20];
  c.clearRect(x, y, w, h);
  c.save();
  c.filter = "brightness(0.78)";
  c.drawImage(img, x, y, w, h, x + 7, y - 1, w, h); // back leg, pushing off
  c.restore();
  c.drawImage(img, x, y, w, h, x - 7, y, w, h); // front leg (the sheet faces left)
}

function loadGuest(gender: Gender) {
  if (guestFrames[gender] || guestLoading.has(gender) || typeof window === "undefined") return;
  guestLoading.add(gender);
  const { url, frameH, rows, ax } = GUEST_SHEETS[gender];
  const img = new Image();
  img.onload = () => {
    const k = (GUEST_H * RES) / frameH;
    // Side walk cycle: standing, stride. The male sheet draws the stride; the
    // female one is painted from her standing frame.
    const side: [Box, number, ((c: Ctx) => void) | undefined][] =
      gender === "f"
        ? [
            [rows.l[0], ax.l[0], undefined],
            [rows.l[0], ax.l[0], (c) => femaleStride(c, img)],
          ]
        : [
            [rows.l[0], ax.l[0], undefined],
            [rows.l[1], ax.l[1], undefined],
          ];
    guestFrames[gender] = {
      d: rows.d.map((b, i) => sheetFrame(img, b, k, ax.d[i])),
      u: rows.u.map((b, i) => sheetFrame(img, b, k, ax.u[i])),
      l: side.map(([b, a, paint]) => sheetFrame(img, b, k, a, false, paint)),
      // The sheets only face left from the side, so mirror those for right.
      r: side.map(([b, a, paint]) => sheetFrame(img, b, k, a, true, paint)),
    };
  };
  img.onerror = () => guestLoading.delete(gender);
  img.src = url;
}

/** Starts loading both guest sheets (once). */
export function loadGuestSprites() {
  loadGuest("f");
  loadGuest("m");
}

/**
 * A guest frame at RES scale, or null while that sheet is still loading.
 * Front/back: 0 standing, 1 or 2 mid-step. Sides: 0 standing, 1 mid-stride.
 */
export function sprite(look: Look, dir: Dir, frame: number) {
  loadGuest(look.gender);
  const frames = guestFrames[look.gender]?.[dir];
  return frames ? frames[Math.min(frame, frames.length - 1)] : null;
}

/** Draws a guest with their feet at (x, y). `walk` is a running step counter. Expects the context scaled by RES. */
export function drawCharacter(c: Ctx, look: Look, x: number, y: number, dir: Dir, moving: boolean, walk: number) {
  const side = dir === "l" || dir === "r";
  const step = Math.floor(walk) % 2;
  const index = !moving ? 0 : side ? step : 1 + step;
  const frame = sprite(look, dir, index);
  px(c, "rgba(0,0,0,0.22)", Math.round(x) - 6, Math.round(y) - 1, 12, 2);
  if (!frame) return;
  // A small bob on the passing (standing) frame of a side walk.
  const bob = moving && side && !step ? RES / 2 : 0;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(frame.cv, Math.round(x * RES - frame.ax), Math.round(y * RES - frame.cv.height - bob));
  c.restore();
}

/* ---------- Admin sprite (public/assets/ankurisu-sprite.png + -v2.png) ---------- */

const SHEET_URL = "/assets/ankurisu-sprite.png";
/** The front views (standing, blinking, stepping) come from this newer sheet. */
const FRONT_SHEET_URL = "/assets/ankurisu-sprite-v2.png";
/** How tall the admin stands, in world px (guests are 26). */
export const ADMIN_H = 28;
/** Distance from the feet to just above the admin's head, in world px (for name labels). */
export const ADMIN_HEAD = ADMIN_H + 2;

// Tight bounding boxes [x0, y0, x1, y1] of the frames on the sheet. Every frame
// stands on its bottom edge, so all of them are anchored at the feet.
type Box = [number, number, number, number];
// Sheet layout: row 1 front idle / two three-quarter turns (all unused), row 2 back
// idle / back walk / back turn (unused), row 3 left idle / left step / right step.
// Only the back and side frames are used; the front comes from FRONT_FRAMES.
const FRAMES = {
  backIdle: [89, 194, 190, 362],
  backStep: [333, 194, 435, 360],
  leftIdle: [97, 373, 197, 541],
  leftStep: [342, 374, 441, 541],
  rightStep: [572, 374, 671, 541],
} satisfies Record<string, Box>;
// The v2 sheet (316×262): row 1 blink / three-quarter turns, row 2 standing /
// front step / walking right, row 3 side views. Only the front views are used.
const FRONT_FRAMES = {
  stand: [19, 92, 69, 169],
  blink: [20, 10, 69, 85],
  step: [135, 91, 187, 171],
} satisfies Record<string, Box>;
/** Anchors for FRONT_FRAMES, in v2 sheet px (heads lined up with the standing frame). */
const FRONT_AX = new Map<Box, number>([
  [FRONT_FRAMES.stand, 25],
  [FRONT_FRAMES.blink, 24],
  [FRONT_FRAMES.step, 26],
]);
/** Admin side-walk frames in order: step, stand, other step, stand. */
const SIDE_CYCLE = [1, 0, 2, 0];
/** Each frame's anchor in sheet px from its box's left edge (see GUEST_SHEETS). */
const ADMIN_AX = new Map<Box, number>([
  [FRAMES.backIdle, 51],
  [FRAMES.backStep, 51],
  [FRAMES.leftIdle, 50.5],
  [FRAMES.leftStep, 50.5],
  [FRAMES.rightStep, 49.5],
]);
const SPARKLES: Box[] = [
  [577, 628, 673, 720],
  [577, 808, 683, 901],
  [567, 996, 683, 1074],
  [577, 1167, 673, 1261],
];
/** The frames are about 165px tall on the sheet. */
const SHEET_FRAME_H = 165;

type AdminSheet = {
  front: GuestFrame;
  blink: GuestFrame;
  frontStep: GuestFrame;
  back: GuestFrame[];
  /** Standing, step A, step B. */
  left: GuestFrame[];
  right: GuestFrame[];
  sparkles: HTMLCanvasElement[];
};
let adminSheet: AdminSheet | null = null;
let adminLoading = false;

/** Cuts a frame out of the sheet and shrinks it once, smoothly, to its in-room size. */
function cut(
  img: HTMLImageElement,
  [x0, y0, x1, y1]: Box,
  k: number,
  mirror = false,
  /** Optional touch-up painted at sheet resolution (in sheet coordinates) before shrinking. */
  paint?: (c: Ctx) => void,
) {
  const sw = x1 - x0 + 1;
  const sh = y1 - y0 + 1;
  let src: CanvasImageSource = img;
  let sx = x0;
  let sy = y0;
  if (paint) {
    const full = document.createElement("canvas");
    full.width = sw;
    full.height = sh;
    const fc = full.getContext("2d")!;
    fc.drawImage(img, x0, y0, sw, sh, 0, 0, sw, sh);
    fc.translate(-x0, -y0);
    paint(fc);
    src = full;
    sx = 0;
    sy = 0;
  }
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(sw * k));
  cv.height = Math.max(1, Math.round(sh * k));
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  if (mirror) {
    c.translate(cv.width, 0);
    c.scale(-1, 1);
  }
  c.drawImage(src, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  return cv;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Starts loading the admin sprite sheets (once). Until they're ready the admin uses a regular sprite. */
export function loadAdminSprite() {
  if (adminSheet || adminLoading || typeof window === "undefined") return;
  adminLoading = true;
  Promise.all([loadImage(SHEET_URL), loadImage(FRONT_SHEET_URL)]).then(
    ([img, frontImg]) => {
      const k = (ADMIN_H * RES) / SHEET_FRAME_H;
      // Scale the v2 front so she stands as tall as her back and side views.
      const backH = FRAMES.backIdle[3] - FRAMES.backIdle[1] + 1;
      const kFront = (k * backH) / (FRONT_FRAMES.stand[3] - FRONT_FRAMES.stand[1] + 1);
      const frame = (box: Box, mirror = false) => sheetFrame(img, box, k, ADMIN_AX.get(box)!, mirror);
      const front = (box: Box) => sheetFrame(frontImg, box, kFront, FRONT_AX.get(box)!);
      // Side walk: standing, then a step with each foot. The sheet has one step
      // each way (left foot facing left, other foot facing right), so each
      // direction uses one as drawn and the other mirrored.
      const side: [Box, boolean][] = [
        [FRAMES.leftIdle, false],
        [FRAMES.leftStep, false],
        [FRAMES.rightStep, true],
      ];
      adminSheet = {
        front: front(FRONT_FRAMES.stand),
        blink: front(FRONT_FRAMES.blink),
        frontStep: front(FRONT_FRAMES.step),
        back: [frame(FRAMES.backIdle), frame(FRAMES.backStep)],
        left: side.map(([b, m]) => frame(b, m)),
        right: side.map(([b, m]) => frame(b, !m)),
        sparkles: SPARKLES.map((b) => cut(img, b, (11 * RES) / 95)),
      };
    },
    () => {
      adminLoading = false;
    },
  );
}

/**
 * Draws the admin with feet at (x, y), plus a couple of twinkling sparkles.
 * Expects the context to be scaled by RES. Returns false while the sheet is
 * still loading, so the caller can draw a regular sprite instead.
 */
export function drawAdmin(c: Ctx, x: number, y: number, dir: Dir, moving: boolean, walk: number) {
  const sheet = adminSheet;
  if (!sheet) return false;
  const t = time();
  const alt = Math.floor(walk) % 2 === 1;
  let frame: GuestFrame;
  // Side walk: the sheet's two steps are nearly the same pose, so swapping
  // straight between them looks frozen. Pass through standing between steps
  // (step, stand, step, stand) so the feet visibly close and open.
  if (dir === "l" || dir === "r") {
    frame = sheet[dir === "l" ? "left" : "right"][moving ? SIDE_CYCLE[Math.floor(walk) % 4] : 0];
  } else if (dir === "u") frame = sheet.back[moving && alt ? 1 : 0];
  else if (moving) frame = alt ? sheet.frontStep : sheet.front;
  // Standing still facing the camera, she blinks now and then.
  else frame = t % 4 < 0.15 ? sheet.blink : sheet.front;

  px(c, "rgba(0,0,0,0.22)", Math.round(x) - 7, Math.round(y) - 1, 14, 3);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  const bob = moving && dir === "u" && alt ? RES : 0;
  c.drawImage(frame.cv, Math.round(x * RES - frame.ax), Math.round(y * RES - frame.cv.height - bob));
  // Two sparkles take turns twinkling beside the head.
  for (let i = 0; i < 2; i++) {
    const phase = (t * 0.8 + i * 0.5) % 1;
    const sp = sheet.sparkles[Math.floor(t * 6 + i * 2) % sheet.sparkles.length];
    c.globalAlpha = Math.sin(phase * Math.PI);
    const sx = (x + (i ? 9 : -10)) * RES;
    const sy = (y - ADMIN_H + 4 + (i ? 8 : 0) - phase * 4) * RES;
    c.drawImage(sp, Math.round(sx - sp.width / 2), Math.round(sy - sp.height / 2));
  }
  c.restore();
  return true;
}
