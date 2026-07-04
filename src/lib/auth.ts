import { cookies } from "next/headers";

const COOKIE_NAME = "tms_session";
const SECRET = process.env.AUTH_SECRET ?? "tms-secret-key-chuon";

// SHA-256 ハッシュ（Web Crypto API）
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// HMAC-SHA256 署名
async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(sig).toString("base64url");
}

// HMAC-SHA256 検証
async function verify(payload: string, sig: string): Promise<boolean> {
  const expected = await sign(payload);
  return expected === sig;
}

export async function createSessionToken(userId: string): Promise<string> {
  const payload = `${userId}:${Date.now()}`;
  const sig = await sign(payload);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    if (!(await verify(payload, sig))) return null;
    const userId = payload.split(":")[0];
    return userId ?? null;
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export { COOKIE_NAME };
