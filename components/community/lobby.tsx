"use client";

import { getAuth, signInAnonymously, signInWithCustomToken, type UserCredential } from "firebase/auth";
import {
  endAt,
  get,
  getDatabase,
  limitToFirst,
  limitToLast,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
  type Database,
  type DatabaseReference,
} from "firebase/database";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LogOut, Send, Sparkles, Users } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { getLobbyToken } from "@/app/community/actions";
import { ADMIN_NAME, isReservedName } from "@/lib/community";
import { firebaseApp, lobbyConfigured } from "@/lib/firebase-client";
import {
  ADMIN_HEAD,
  CHAR_HEAD,
  clampToWorld,
  drawAdmin,
  drawBackground,
  drawCharacter,
  loadAdminSprite,
  loadGuestSprites,
  looks,
  props,
  RES,
  SHIRTS,
  sprite,
  spawnPoint,
  step,
  WORLD_H,
  WORLD_W,
  type Dir,
  type Gender,
} from "./world";

/* ---------- Types and limits (keep in sync with database.rules.json) ---------- */

const NAME_RE = /^[A-Za-z0-9_]{2,16}$/;
const MAX_TEXT = 140;
const SEND_COOLDOWN = 1500; // ms; the rules enforce the same gap server-side
const CHAT_HISTORY = 50;
const CHAT_TTL = 60 * 60 * 1000; // messages older than an hour get cleaned up
const BUBBLE_MS = 6000;
const SPEED = 64; // world px per second
const SYNC_MS = 90; // how often a moving player publishes its position
const ADMIN_COLOR = 4; // teal, used for the admin's name in the chat log

type Player = {
  name: string;
  color: number;
  /** Absent for players from before the choice existed; their look falls back to one picked from their id. */
  gender?: Gender;
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
  /** The site owner: drawn with their own sprite. Only settable with the admin token. */
  admin?: boolean;
};
type Remote = Player & { rx: number; ry: number; walk: number; look: ReturnType<typeof looks> };
type Msg = { id: string; uid: string; name: string; color: number; text: string; t: number; admin?: boolean };
type Phase = "connecting" | "spectating" | "joining" | "in" | "error";

/* ---------- Offline preview ---------- */
// Without the NEXT_PUBLIC_FIREBASE_* variables the lobby still runs, alone in
// the browser with two wandering bots, so the room can be tried out locally.

const OFFLINE = !lobbyConfigured;
const BOTS = [
  { id: "bot-pixel", name: "dr_pixel", color: 3, gender: "m" as Gender, x: 150, y: 90 },
  { id: "bot-byte", name: "lab_byte", color: 6, gender: "f" as Gender, x: 236, y: 150 },
];
const BOT_LINES = [
  "hi there! 👋",
  "don't touch the purple tank",
  "the reactor is perfectly safe. probably.",
  "anyone seen my goggles?",
  "experiment #42 is going great",
  "beep boop, running diagnostics",
  "the servers are humming nicely today",
  "welcome to the lab :)",
];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/* ---------- Small helpers ---------- */

const BAD = ["fuck", "shit", "bitch", "cunt", "nigger", "nigga", "faggot", "retard", "whore", "slut"];
const BAD_RE = new RegExp(BAD.join("|"), "gi");
/** A light, client-side word mask. The rules cap length and rate; this keeps the room friendly. */
const clean = (s: string) => s.replace(BAD_RE, (w) => w[0] + "*".repeat(w.length - 1));

const sanitizeName = (s: string) => s.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").slice(0, 16);

const isDir = (d: unknown): d is Dir => d === "u" || d === "d" || d === "l" || d === "r";
const isGender = (g: unknown): g is Gender => g === "m" || g === "f";

function readPlayer(v: unknown): Player | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  if (typeof p.name !== "string" || typeof p.x !== "number" || typeof p.y !== "number") return null;
  return {
    name: p.name,
    color: typeof p.color === "number" ? p.color : 0,
    gender: isGender(p.gender) ? p.gender : undefined,
    x: p.x,
    y: p.y,
    dir: isDir(p.dir) ? p.dir : "d",
    moving: p.moving === true,
    admin: p.admin === true,
  };
}

function readMsg(id: string, v: unknown): Msg | null {
  if (!v || typeof v !== "object") return null;
  const m = v as Record<string, unknown>;
  if (typeof m.text !== "string" || typeof m.name !== "string" || typeof m.uid !== "string") return null;
  return {
    id,
    uid: m.uid,
    name: m.name,
    color: typeof m.color === "number" ? m.color : 0,
    text: clean(m.text),
    t: typeof m.t === "number" ? m.t : Date.now(),
    admin: m.admin === true,
  };
}

function load(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: "u",
  KeyW: "u",
  ArrowDown: "d",
  KeyS: "d",
  ArrowLeft: "l",
  KeyA: "l",
  ArrowRight: "r",
  KeyD: "r",
};

/** Splits text into lines that fit `max` pixels wide (long words are broken). */
function wrap(c: CanvasRenderingContext2D, text: string, max: number, maxLines: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    let w = word;
    while (c.measureText(w).width > max) {
      let i = w.length - 1;
      while (i > 1 && c.measureText(w.slice(0, i)).width > max) i--;
      if (line) lines.push(line);
      lines.push(w.slice(0, i));
      line = "";
      w = w.slice(i);
    }
    const next = line ? `${line} ${w}` : w;
    if (c.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.?.?$/, "…");
  }
  return lines;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

/** The join form's character preview: the chosen look, turning on the spot. */
function AvatarPreview({ uid, color, gender }: { uid: string; color: number; gender: Gender }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext("2d");
    if (!cv || !c) return;
    const look = looks(uid, color, gender);
    const turn: Dir[] = ["d", "r", "u", "l"];
    let i = 0;
    const draw = () => {
      const frame = sprite(look, turn[i % turn.length], 0);
      c.clearRect(0, 0, cv.width, cv.height);
      if (frame) c.drawImage(frame.cv, Math.round(cv.width / 2 - frame.ax), cv.height - frame.cv.height);
    };
    draw();
    // Redraw quickly until the sheet has loaded, then turn every 900ms.
    let ticks = 0;
    const id = setInterval(() => {
      if (++ticks % 9 === 0) i++;
      draw();
    }, 100);
    return () => clearInterval(id);
  }, [uid, color, gender]);
  return (
    <div className="grid h-[116px] w-[80px] shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30">
      <canvas ref={ref} width={72} height={104} aria-hidden className="h-[104px] w-[72px]" />
    </div>
  );
}

/* ---------- Component ---------- */

/**
 * A visitor signed in to /admin gets an admin token from the server and enters
 * with the ankurisu sprite and reserved name instead of picking their own.
 */
export function Lobby({ fontFamily }: { fontFamily: string }) {
  const [phase, setPhase] = useState<Phase>(OFFLINE ? "spectating" : "connecting");
  // Set once Firebase accepts the admin token; everyone else is a guest.
  const [asAdmin, setAsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState(5);
  const [gender, setGender] = useState<Gender>("f");
  // Hair, skin and eyes come from the player id, so the join form's preview needs it too.
  const [previewId, setPreviewId] = useState("you");
  const [online, setOnline] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mutable game state lives in refs so the render loop never re-renders React.
  const db = useRef<Database | null>(null);
  const uid = useRef<string | null>(null);
  const me = useRef<(Player & { walk: number }) | null>(null);
  const meRef = useRef<DatabaseReference | null>(null);
  const players = useRef(new Map<string, Remote>());
  const bubbles = useRef(new Map<string, { text: string; until: number }>());
  const keys = useRef<Dir[]>([]);
  /** Direction held on the on-screen D-pad (touch screens). Kept apart from `keys` so a stage blur doesn't drop it. */
  const pad = useRef<Dir | null>(null);
  const target = useRef<{ x: number; y: number } | null>(null);
  const lastSent = useRef({ at: 0, x: 0, y: 0, dir: "d" as Dir, moving: false });
  const lastChat = useRef(0);
  const view = useRef({ camX: 0, camY: 0, scale: 1 });

  const inRoom = phase === "in" || phase === "joining";

  // Restore the name and colour from the last visit.
  useEffect(() => {
    const n = load("lobby:name");
    const c = Number(load("lobby:color"));
    const g = load("lobby:gender");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
    if (n) setName(sanitizeName(n));
    if (Number.isInteger(c) && c >= 0 && c < SHIRTS.length) setColor(c);
    if (isGender(g)) setGender(g);
  }, []);

  /* ----- Connect: sign in anonymously and watch the room (before joining, too) ----- */
  useEffect(() => {
    const roster = players.current;
    const app = firebaseApp();
    if (!app) {
      uid.current = "you";
      for (const b of BOTS) {
        roster.set(b.id, { ...b, dir: "d", moving: false, rx: b.x, ry: b.y, walk: 0, look: looks(b.id, b.color, b.gender) });
      }
      setOnline(roster.size);
      return () => roster.clear();
    }
    let cancelled = false;
    const unsubs: (() => void)[] = [];

    (async () => {
      try {
        const auth = getAuth(app);
        // Returns null unless the visitor is signed in to /admin.
        const token = await getLobbyToken().catch(() => null);
        let cred: UserCredential | null = token ? await signInWithCustomToken(auth, token).catch(() => null) : null;
        if (cancelled) return;
        if (cred) setAsAdmin(true);
        else if (token) setError("Couldn't verify your admin session for the lobby, so you're a guest this time.");
        cred ??= await signInAnonymously(auth);
        if (cancelled) return;
        uid.current = cred.user.uid;
        setPreviewId(cred.user.uid);
        const database = getDatabase(app);
        db.current = database;

        const playersRef = ref(database, "lobby/players");
        const upsert = (id: string | null, v: unknown) => {
          const p = id && readPlayer(v);
          if (!id || !p) return;
          const prev = players.current.get(id);
          if (prev) {
            // Snap if they teleported (rejoin); otherwise glide towards the new spot.
            if (Math.hypot(prev.rx - p.x, prev.ry - p.y) > 48) {
              prev.rx = p.x;
              prev.ry = p.y;
            }
            Object.assign(prev, p, { look: looks(id, p.color, p.gender) });
          } else {
            players.current.set(id, { ...p, rx: p.x, ry: p.y, walk: 0, look: looks(id, p.color, p.gender) });
          }
          setOnline(players.current.size);
        };
        unsubs.push(
          onChildAdded(playersRef, (s) => upsert(s.key, s.val())),
          onChildChanged(playersRef, (s) => upsert(s.key, s.val())),
          onChildRemoved(playersRef, (s) => {
            if (s.key) players.current.delete(s.key);
            setOnline(players.current.size);
          }),
          onChildAdded(query(ref(database, "lobby/chat"), limitToLast(CHAT_HISTORY)), (s) => {
            const m = s.key && readMsg(s.key, s.val());
            if (!m) return;
            setMessages((list) => [...list, m].slice(-CHAT_HISTORY));
            if (Date.now() - m.t < BUBBLE_MS) bubbles.current.set(m.uid, { text: m.text, until: Date.now() + BUBBLE_MS });
          }),
          onChildRemoved(ref(database, "lobby/chat"), (s) => {
            setMessages((list) => list.filter((m) => m.id !== s.key));
          }),
        );

        // Housekeeping: anyone may delete messages older than an hour (the rules allow only that).
        const old = query(ref(database, "lobby/chat"), orderByChild("t"), endAt(Date.now() - CHAT_TTL), limitToFirst(25));
        get(old)
          .then((snap) => snap.forEach((c) => void remove(c.ref).catch(() => {})))
          .catch(() => {});

        setPhase((p) => (p === "connecting" ? "spectating" : p));
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        const code = (e as { code?: string }).code;
        setError(
          code === "auth/operation-not-allowed"
            ? "Anonymous sign-in isn't enabled for this Firebase project yet."
            : code === "auth/configuration-not-found"
              ? "Firebase Authentication isn't set up for this project yet."
              : "Couldn't connect to the lobby. Try refreshing the page.",
        );
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
      roster.clear();
    };
  }, []);

  /* ----- Join / leave ----- */
  useEffect(() => {
    if (!inRoom) return;
    const database = db.current;
    const id = uid.current;
    if (!database || !id) return;
    const playerRef = ref(database, `lobby/players/${id}`);
    meRef.current = playerRef;

    // Re-register on every (re)connect: onDisconnect handlers fire once and are gone.
    const unsub = onValue(ref(database, ".info/connected"), async (snap) => {
      if (snap.val() !== true || !me.current) return;
      try {
        await onDisconnect(playerRef).remove();
        const { name, color, gender, x, y, dir, admin } = me.current;
        await set(playerRef, {
          name,
          color,
          ...(gender ? { gender } : {}),
          x: Math.round(x),
          y: Math.round(y),
          dir,
          moving: false,
          ...(admin ? { admin: true } : {}),
        });
        setPhase("in");
      } catch (e) {
        console.error(e);
        setError("The lobby refused to let you in. Check the database rules.");
        setPhase("error");
      }
    });

    return () => {
      unsub();
      meRef.current = null;
      void onDisconnect(playerRef).cancel().catch(() => {});
      void remove(playerRef).catch(() => {});
    };
    // Runs on entering and leaving the room only (joining → in keeps inRoom true).
  }, [inRoom]);

  function join(e: FormEvent) {
    e.preventDefault();
    let n = ADMIN_NAME;
    let c = ADMIN_COLOR;
    if (!asAdmin) {
      n = sanitizeName(name);
      c = color;
      if (!NAME_RE.test(n) || isReservedName(n)) return;
      save("lobby:name", n);
      save("lobby:color", String(c));
      save("lobby:gender", gender);
    }
    const spawn = spawnPoint();
    me.current = {
      name: n,
      color: c,
      ...(asAdmin ? {} : { gender }),
      admin: asAdmin,
      ...spawn,
      dir: "u",
      moving: false,
      walk: 0,
    };
    lastSent.current = { at: 0, ...spawn, dir: "u", moving: false };
    setPhase(OFFLINE ? "in" : "joining");
    requestAnimationFrame(() => stageRef.current?.focus({ preventScroll: true }));
  }

  function leave() {
    me.current = null;
    keys.current = [];
    pad.current = null;
    target.current = null;
    setPhase("spectating");
  }

  /* ----- Chat ----- */
  /** Shows a message in the log and above the speaker (used directly in offline mode). */
  function addLocal(from: { uid: string; name: string; color: number; admin?: boolean }, text: string) {
    const m: Msg = { id: `${Date.now()}-${Math.random()}`, ...from, text: clean(text), t: Date.now() };
    setMessages((list) => [...list, m].slice(-CHAT_HISTORY));
    bubbles.current.set(m.uid, { text: m.text, until: Date.now() + BUBBLE_MS });
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const database = db.current;
    const id = uid.current;
    const text = draft.trim().slice(0, MAX_TEXT);
    if (OFFLINE && me.current && text) {
      setDraft("");
      addLocal({ uid: "you", name: me.current.name, color: me.current.color, admin: me.current.admin }, text);
      // One of the bots answers after a moment.
      const bot = pick(BOTS);
      setTimeout(() => addLocal({ uid: bot.id, name: bot.name, color: bot.color }, pick(BOT_LINES)), 900 + Math.random() * 1200);
      return;
    }
    if (!database || !id || !me.current || !text) return;
    const wait = lastChat.current + SEND_COOLDOWN - Date.now();
    if (wait > 0) return;
    lastChat.current = Date.now();
    setDraft("");
    const key = push(ref(database, "lobby/chat")).key;
    try {
      // Message and rate stamp in one atomic write, so the rules can enforce the cooldown.
      await update(ref(database, "lobby"), {
        [`chat/${key}`]: {
          uid: id,
          name: me.current.name,
          color: me.current.color,
          text,
          t: serverTimestamp(),
          ...(me.current.admin ? { admin: true } : {}),
        },
        [`rate/${id}`]: serverTimestamp(),
      });
    } catch {
      setDraft(text);
      setError("Message not sent: you're typing too fast.");
      setTimeout(() => setError(""), 2500);
    }
  }

  // Keep the log pinned to the newest message.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  /* ----- Input ----- */
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!me.current) return;
    const d = KEY_DIRS[e.code];
    if (d) {
      e.preventDefault();
      target.current = null;
      if (!keys.current.includes(d)) keys.current = [d, ...keys.current];
    } else if (e.key === "Enter" || e.key === "t" || e.key === "T") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }
  function onKeyUp(e: KeyboardEvent<HTMLDivElement>) {
    const d = KEY_DIRS[e.code];
    if (d) keys.current = keys.current.filter((k) => k !== d);
  }
  /** On-screen D-pad: walk while a button is held. */
  function padDown(d: Dir, e: PointerEvent<HTMLButtonElement>) {
    if (!me.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    target.current = null;
    pad.current = d;
  }
  function padUp(d: Dir) {
    if (pad.current === d) pad.current = null;
  }
  /** Click / tap to walk there. */
  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    const cv = canvasRef.current;
    if (!cv || !me.current) return;
    const rect = cv.getBoundingClientRect();
    const v = view.current;
    const wx = v.camX + (e.clientX - rect.left) / v.scale;
    const wy = v.camY + (e.clientY - rect.top) / v.scale;
    target.current = clampToWorld(wx, wy + 2);
  }

  /* ----- Render loop ----- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext("2d")!;

    // Both offscreen canvases are RES× the world size; the room is drawn in
    // world units through a scale transform.
    const bg = document.createElement("canvas");
    bg.width = WORLD_W * RES;
    bg.height = WORLD_H * RES;
    const bctx = bg.getContext("2d")!;
    bctx.scale(RES, RES);
    drawBackground(bctx);
    const off = document.createElement("canvas");
    off.width = WORLD_W * RES;
    off.height = WORLD_H * RES;
    const octx = off.getContext("2d")!;
    loadAdminSprite();
    loadGuestSprites();

    const drawPlayer = (
      c: CanvasRenderingContext2D,
      p: { admin?: boolean; dir: Dir },
      look: ReturnType<typeof looks>,
      x: number,
      y: number,
      moving: boolean,
      walk: number,
    ) => {
      if (p.admin && drawAdmin(c, x, y, p.dir, moving, walk)) return;
      drawCharacter(c, look, x, y, p.dir, moving, walk);
    };

    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    const ro = new ResizeObserver(() => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = stage.clientWidth;
      cssH = stage.clientHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    });
    ro.observe(stage);
    document.fonts?.load(`16px ${fontFamily}`).catch(() => {});

    let last = performance.now();
    let raf = 0;
    const botState: Record<string, { tx: number; ty: number; waitUntil: number; talkAt: number }> = {};

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!cssW || !cssH) return;

      /* Move the local player. */
      const self = me.current;
      if (self) {
        let dx = 0;
        let dy = 0;
        const held = pad.current ? [pad.current, ...keys.current.filter((k) => k !== pad.current)] : keys.current;
        if (held.length) {
          if (held.includes("l")) dx -= 1;
          if (held.includes("r")) dx += 1;
          if (held.includes("u")) dy -= 1;
          if (held.includes("d")) dy += 1;
          self.dir = held[0];
        } else if (target.current) {
          const tx = target.current.x - self.x;
          const ty = target.current.y - self.y;
          const dist = Math.hypot(tx, ty);
          if (dist < 1.5) target.current = null;
          else {
            dx = tx / dist;
            dy = ty / dist;
            self.dir = Math.abs(tx) > Math.abs(ty) ? (tx < 0 ? "l" : "r") : ty < 0 ? "u" : "d";
          }
        }
        const len = Math.hypot(dx, dy);
        let moved = false;
        if (len) {
          const next = step(self.x, self.y, (dx / len) * SPEED * dt, (dy / len) * SPEED * dt);
          moved = Math.abs(next.x - self.x) + Math.abs(next.y - self.y) > 0.01;
          // Walking into a wall towards a click target: give up on it.
          if (!moved && target.current) target.current = null;
          self.x = next.x;
          self.y = next.y;
        }
        self.moving = moved;
        if (moved) self.walk += dt * 8;

        /* Publish position: throttled while moving, once more when stopping. */
        const ls = lastSent.current;
        const changed =
          Math.round(self.x) !== ls.x || Math.round(self.y) !== ls.y || self.dir !== ls.dir || self.moving !== ls.moving;
        if (meRef.current && changed && (now - ls.at > SYNC_MS || !self.moving)) {
          const pos = { x: Math.round(self.x), y: Math.round(self.y), dir: self.dir, moving: self.moving };
          lastSent.current = { at: now, ...pos };
          void update(meRef.current, pos).catch(() => {});
        }
      }

      /* Offline preview: bots stroll to random spots, pause, and sometimes talk. */
      if (OFFLINE) {
        for (const b of BOTS) {
          const p = players.current.get(b.id);
          if (!p) continue;
          const ai = (botState[b.id] ??= { tx: p.x, ty: p.y, waitUntil: now + 1000, talkAt: now + 4000 + Math.random() * 8000 });
          if (now < ai.waitUntil) {
            p.moving = false;
          } else {
            const tx = ai.tx - p.x;
            const ty = ai.ty - p.y;
            const dist = Math.hypot(tx, ty);
            const next = dist > 1 ? step(p.x, p.y, (tx / dist) * SPEED * 0.6 * dt, (ty / dist) * SPEED * 0.6 * dt) : p;
            const stuck = Math.abs(next.x - p.x) + Math.abs(next.y - p.y) < 0.01;
            if (dist <= 1 || stuck) {
              const spot = clampToWorld(24 + Math.random() * (WORLD_W - 48), 56 + Math.random() * (WORLD_H - 80));
              ai.tx = spot.x;
              ai.ty = spot.y;
              ai.waitUntil = now + 800 + Math.random() * 2500;
              p.moving = false;
            } else {
              p.dir = Math.abs(tx) > Math.abs(ty) ? (tx < 0 ? "l" : "r") : ty < 0 ? "u" : "d";
              p.x = next.x;
              p.y = next.y;
              p.moving = true;
            }
          }
          if (now > ai.talkAt) {
            ai.talkAt = now + 12000 + Math.random() * 15000;
            bubbles.current.set(b.id, { text: pick(BOT_LINES), until: Date.now() + BUBBLE_MS });
          }
        }
      }

      /* Ease remote players towards their last known position. */
      const k = Math.min(1, dt * 12);
      for (const p of players.current.values()) {
        p.rx += (p.x - p.rx) * k;
        p.ry += (p.y - p.ry) * k;
        const gliding = Math.hypot(p.x - p.rx, p.y - p.ry) > 0.5;
        if (p.moving || gliding) p.walk += dt * 8;
      }

      /* World → offscreen canvas, depth-sorted by feet. */
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.imageSmoothingEnabled = false;
      octx.drawImage(bg, 0, 0);
      octx.setTransform(RES, 0, 0, RES, 0, 0);
      type Drawable = { y: number; draw: (c: CanvasRenderingContext2D) => void };
      const list: Drawable[] = [...props];
      const myId = uid.current;
      for (const [id, p] of players.current) {
        if (id === myId && self) continue;
        const moving = p.moving || Math.hypot(p.x - p.rx, p.y - p.ry) > 0.5;
        list.push({ y: p.ry, draw: (c) => drawPlayer(c, p, p.look, p.rx, p.ry, moving, p.walk) });
      }
      if (self && myId) {
        const look = looks(myId, self.color, self.gender);
        list.push({ y: self.y, draw: (c) => drawPlayer(c, self, look, self.x, self.y, self.moving, self.walk) });
      }
      list.sort((a, b) => a.y - b.y).forEach((d) => d.draw(octx));

      /* Camera: show the whole room when it fits, else follow the player. Never below 2× zoom. */
      const scaleCss = Math.max(Math.min(cssW / WORLD_W, cssH / WORLD_H), 2);
      const s = scaleCss * dpr;
      const viewW = canvas.width / s;
      const viewH = canvas.height / s;
      const focusX = self?.x ?? WORLD_W / 2;
      const focusY = self?.y ?? WORLD_H / 2;
      const camX = viewW >= WORLD_W ? (WORLD_W - viewW) / 2 : Math.min(Math.max(focusX - viewW / 2, 0), WORLD_W - viewW);
      const camY = viewH >= WORLD_H ? (WORLD_H - viewH) / 2 : Math.min(Math.max(focusY - viewH / 2, 0), WORLD_H - viewH);
      view.current = { camX, camY, scale: scaleCss };

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#1b1626";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, Math.round(-camX * s), Math.round(-camY * s), Math.round(WORLD_W * s), Math.round(WORLD_H * s));

      /* Names and speech bubbles, at screen resolution so text stays crisp. */
      const toX = (wx: number) => (wx - camX) * s;
      const toY = (wy: number) => (wy - camY) * s;
      const u = dpr; // one CSS pixel
      const t = Date.now();
      type Label = { id: string; name: string; x: number; y: number; mine: boolean; admin: boolean };
      const labels: Label[] = [];
      for (const [id, p] of players.current) {
        if (id === myId && self) continue;
        labels.push({ id, name: p.name, x: p.rx, y: p.ry, mine: false, admin: !!p.admin });
      }
      if (self && myId) labels.push({ id: myId, name: self.name, x: self.x, y: self.y, mine: true, admin: !!self.admin });

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const l of labels) {
        const sx = toX(l.x);
        const headY = toY(l.y - (l.admin ? ADMIN_HEAD : CHAR_HEAD));
        const text = l.admin ? `✦ ${l.name}` : l.name;
        ctx.font = `600 ${11 * u}px ${fontFamily}`;
        const w = ctx.measureText(text).width + 10 * u;
        ctx.fillStyle = l.admin ? "rgba(18,165,148,0.95)" : l.mine ? "rgba(37,99,235,0.92)" : "rgba(20,16,32,0.72)";
        roundRect(ctx, sx - w / 2, headY - 14 * u, w, 14 * u, 4 * u);
        ctx.fillStyle = "#fff";
        ctx.fillText(text, sx, headY - 7 * u);

        const b = bubbles.current.get(l.id);
        if (!b) continue;
        if (b.until < t) {
          bubbles.current.delete(l.id);
          continue;
        }
        ctx.font = `500 ${12 * u}px ${fontFamily}`;
        const lines = wrap(ctx, b.text, 150 * u, 3);
        const lh = 14 * u;
        const bw = Math.max(...lines.map((ln) => ctx.measureText(ln).width)) + 14 * u;
        const bh = lines.length * lh + 8 * u;
        const by = headY - 20 * u - bh;
        const fade = Math.min(1, (b.until - t) / 400);
        ctx.globalAlpha = fade;
        ctx.fillStyle = "rgba(20,16,32,0.25)";
        roundRect(ctx, sx - bw / 2, by + 2 * u, bw, bh, 6 * u);
        ctx.fillStyle = "#fff";
        roundRect(ctx, sx - bw / 2, by, bw, bh, 6 * u);
        ctx.beginPath();
        ctx.moveTo(sx - 5 * u, by + bh - 1);
        ctx.lineTo(sx + 5 * u, by + bh - 1);
        ctx.lineTo(sx, by + bh + 5 * u);
        ctx.fill();
        ctx.fillStyle = "#1b1626";
        lines.forEach((ln, i) => ctx.fillText(ln, sx, by + 4 * u + lh * i + lh / 2));
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [fontFamily]);

  /* ---------- Markup ---------- */

  const reserved = isReservedName(sanitizeName(name));
  const nameOk = NAME_RE.test(sanitizeName(name)) && !reserved;

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:grid-cols-[1fr_320px]">
      {/* Game stage */}
      <div
        ref={stageRef}
        tabIndex={inRoom ? 0 : -1}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          keys.current = [];
        }}
        aria-label="Lobby room. Use the arrow keys or WASD to walk, Enter to chat."
        className="relative h-[min(52dvh,520px)] min-h-[260px] w-full touch-none select-none bg-[#1b1626] outline-none focus-visible:outline-none lg:h-[min(560px,calc(100dvh-12rem))]"
      >
        <canvas ref={canvasRef} onPointerDown={onPointerDown} className="absolute inset-0 size-full [image-rendering:pixelated]" />

        {/* Top-left HUD */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">
            <span className={`size-1.5 rounded-full ${phase === "error" ? "bg-red-400" : "bg-emerald-400"}`} />
            <Users className="size-3" /> {OFFLINE && phase === "in" ? online + 1 : online} online
          </span>
          {OFFLINE && (
            <span className="rounded-full bg-amber-400/90 px-2.5 py-1 font-mono text-[11px] font-medium text-black">
              Offline preview
            </span>
          )}
        </div>
        {phase === "in" && (
          <button
            type="button"
            onClick={leave}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/75"
          >
            <LogOut className="size-3" /> Leave
          </button>
        )}
        {phase === "in" && !focused && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-black/55 px-3 py-1 text-[11px] text-white backdrop-blur">
            Click or tap the room to walk · <span className="hidden sm:inline">WASD / arrows · Enter to chat</span>
          </p>
        )}

        {/* Overlays: join form, connecting, errors */}
        {!inRoom && (
          <div className="absolute inset-0 grid place-items-center bg-[#1b1626]/55 p-4 backdrop-blur-[2px]">
            {phase === "spectating" ? (
              <form
                onSubmit={join}
                className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#241d33]/95 p-5 text-white shadow-2xl"
              >
                <p className="text-[15px] font-semibold" style={{ fontFamily }}>
                  Enter the lab
                </p>
                <p className="mt-1 text-[13px] text-white/65">
                  {OFFLINE
                    ? "Offline preview: Firebase isn't configured, so it's just you and two bots."
                    : asAdmin
                      ? "You're signed in as the admin."
                      : "Pick a name and a look. No account needed."}
                </p>
                {asAdmin ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-teal-500/20 text-teal-300">
                      <Sparkles className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ fontFamily }}>
                        {ADMIN_NAME}
                      </p>
                      <p className="text-[11px] text-white/55">Admin · your own sprite</p>
                    </div>
                  </div>
                ) : (
                <>
                <label className="mt-4 block text-[11px] font-medium uppercase tracking-wider text-white/60" htmlFor="lobby-name">
                  Username
                </label>
                <input
                  id="lobby-name"
                  value={name}
                  onChange={(e) => setName(sanitizeName(e.target.value))}
                  maxLength={16}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="pixel_pal"
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-accent"
                />
                <p className={`mt-1 text-[11px] ${reserved ? "text-red-300" : "text-white/45"}`}>
                  {reserved ? "That name is reserved." : "2–16 letters, numbers or underscores."}
                </p>
                <div className="mt-4 flex items-end gap-4">
                  <AvatarPreview uid={previewId} color={color} gender={gender} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">Character</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Character">
                      {(
                        [
                          ["f", "Female"],
                          ["m", "Male"],
                        ] as const
                      ).map(([g, label]) => (
                        <button
                          key={g}
                          type="button"
                          role="radio"
                          aria-checked={gender === g}
                          onClick={() => setGender(g)}
                          className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                            gender === g
                              ? "border-white/70 bg-white/15 text-white"
                              : "border-white/15 bg-black/25 text-white/65 hover:bg-white/10"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-white/60">Name colour</p>
                <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Name colour">
                  {SHIRTS.map((c, i) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={color === i}
                      aria-label={`Colour ${i + 1}`}
                      onClick={() => setColor(i)}
                      className={`size-7 rounded-md ring-offset-2 ring-offset-[#241d33] transition-transform hover:scale-110 ${
                        color === i ? "ring-2 ring-white" : ""
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                </>
                )}
                <button
                  type="submit"
                  disabled={!asAdmin && !nameOk}
                  className="mt-5 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Join · {online} {online === 1 ? "person" : "people"} inside
                </button>
              </form>
            ) : (
              <div className="max-w-sm rounded-2xl border border-white/10 bg-[#241d33]/95 p-5 text-center text-sm text-white/80">
                {phase === "connecting" && "Connecting to the lobby…"}
                {phase === "error" && error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat panel */}
      <aside className="flex h-72 flex-col border-t border-border lg:h-[min(560px,calc(100dvh-12rem))] lg:border-l lg:border-t-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-fg">Chat</p>
          <p className="ml-auto font-mono text-[11px] text-faint">last hour</p>
        </div>
        <div className="flex min-h-0 flex-1">
        <div ref={logRef} className="min-w-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3" aria-live="polite">
          {messages.length === 0 ? (
            <p className="pt-6 text-center text-[13px] text-muted">It&apos;s quiet in here. Say hi 👋</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="text-[13px] leading-snug">
                <span className="font-semibold" style={{ color: SHIRTS[m.color % SHIRTS.length] }}>
                  {m.name}
                </span>
                {m.admin && (
                  <span className="ml-1.5 rounded bg-teal-500/15 px-1 py-px font-mono text-[9px] font-medium uppercase tracking-wider text-teal-600 dark:text-teal-300">
                    admin
                  </span>
                )}
                <span className="ml-1.5 font-mono text-[10px] text-faint">
                  {new Date(m.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <p className="break-words text-fg-soft">{m.text}</p>
              </div>
            ))
          )}
        </div>
        {/* D-pad for touch screens, beside the chat log */}
        <div
          className="grid shrink-0 select-none grid-cols-3 grid-rows-3 gap-1 self-center border-l border-border p-2 touch-none lg:hidden"
          aria-label="Movement controls"
          onContextMenu={(e) => e.preventDefault()}
        >
          {(
            [
              ["u", ChevronUp, "col-start-2 row-start-1", "Walk up"],
              ["l", ChevronLeft, "col-start-1 row-start-2", "Walk left"],
              ["r", ChevronRight, "col-start-3 row-start-2", "Walk right"],
              ["d", ChevronDown, "col-start-2 row-start-3", "Walk down"],
            ] as const
          ).map(([d, Icon, pos, label]) => (
            <button
              key={d}
              type="button"
              tabIndex={-1}
              aria-label={label}
              disabled={phase !== "in"}
              onPointerDown={(e) => padDown(d, e)}
              onPointerUp={() => padUp(d)}
              onPointerCancel={() => padUp(d)}
              onLostPointerCapture={() => padUp(d)}
              className={`${pos} grid size-10 place-items-center rounded-lg border border-border bg-bg text-fg transition-colors active:bg-accent active:text-accent-fg disabled:opacity-40`}
            >
              <Icon className="size-5" />
            </button>
          ))}
          <span className="col-start-2 row-start-2 m-auto size-3 rounded-full bg-border" aria-hidden />
        </div>
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_TEXT))}
            onKeyDown={(e) => {
              if (e.key === "Escape") stageRef.current?.focus({ preventScroll: true });
            }}
            disabled={phase !== "in"}
            maxLength={MAX_TEXT}
            placeholder={phase === "in" ? "Say something…" : "Join the lobby to chat"}
            aria-label="Chat message"
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-fg outline-none placeholder:text-faint focus:border-accent disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={phase !== "in" || !draft.trim()}
            aria-label="Send"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
        {error && phase !== "error" && <p className="px-3 pb-2 text-[11px] text-red-500">{error}</p>}
      </aside>
    </div>
  );
}
