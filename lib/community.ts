// Shared by the /community page, the lobby and (by hand) database.rules.json.

/**
 * The site owner's name in the lobby. Only a signed-in admin can use it: the
 * database rules reject it from anyone else (keep the regex there in sync).
 */
export const ADMIN_NAME = "ankurisu";

export const isReservedName = (name: string) => name.toLowerCase() === ADMIN_NAME.toLowerCase();
