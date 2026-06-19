/**
 * Simple password-gate authentication utilities.
 *
 * Strategy: middleware checks every request for a signed session cookie.
 * The cookie value is an HMAC of a known payload using AUTH_SECRET,
 * so it can't be forged without the secret.
 *
 * To upgrade to OAuth later, replace the cookie contents with a JWT
 * and swap the middleware check — the rest of the app stays untouched.
 */

const COOKIE_NAME = "fflp_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Creates an HMAC-SHA256 hex digest.
 * Uses the Web Crypto API (available in Edge Runtime / middleware).
 */
async function hmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build the signed cookie value */
export async function createSessionToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  // The payload is just a fixed string — we only care that it's signed
  return hmac(secret, "authenticated");
}

/** Verify a cookie value is a valid signed token */
export async function verifySessionToken(token: string): Promise<boolean> {
  const expected = await createSessionToken();
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Check the password against the env var */
export function validatePassword(password: string): boolean {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) throw new Error("AUTH_PASSWORD is not configured");
  return password === expected;
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
