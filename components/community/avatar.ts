// Guest avatars. Guests pick one of two lab-coat characters, drawn from the
// sprite sheets in public/assets (guest-female-sprite.png / guest-male-sprite.png);
// world.ts cuts and draws the frames. The colour a guest picks tints their name.

export const SHIRTS = ["#e5484d", "#f76b15", "#ffc53d", "#46a758", "#12a594", "#0090ff", "#8e4ec6", "#d6409f"];

export type Gender = "m" | "f";
export type Dir = "u" | "d" | "l" | "r";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Players who never chose (older clients) get a stable character from their id. */
export const defaultGender = (uid: string): Gender => ((hash(uid) >>> 20) % 2 ? "m" : "f");

/** What a guest looks like in the room. */
export function looks(uid: string, color: number, gender: Gender = defaultGender(uid)) {
  const b = SHIRTS[((color % SHIRTS.length) + SHIRTS.length) % SHIRTS.length];
  return { gender, color: b, key: gender };
}
export type Look = ReturnType<typeof looks>;
