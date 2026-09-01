export const SESSION_COOKIE_NAME = "deployr_token";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function looksHashedPassword(value: string): boolean {
  const [salt, hash] = value.split(":");
  return !!salt && !!hash && salt.length === 32 && hash.length === 128;
}
