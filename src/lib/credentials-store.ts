import initialCredentials from "./data/credentials.json";
import fs from "fs";
import path from "path";

type User = { id: string; password_hash: string; must_change?: boolean };
type Creds = { users: User[] };

const IS_VERCEL = !!process.env.VERCEL;
const CREDS_PATH = path.join(process.cwd(), "src/lib/data/credentials.json");
const KV_KEY = "tms:credentials";

export async function getCredentials(): Promise<Creds> {
  if (IS_VERCEL) {
    const { kv } = await import("@vercel/kv");
    const data = await kv.get<Creds>(KV_KEY);
    if (!data) {
      // 初回: static JSONからKVにシード
      const initial = initialCredentials as Creds;
      await kv.set(KV_KEY, initial);
      return initial;
    }
    return data;
  }
  return JSON.parse(fs.readFileSync(CREDS_PATH, "utf-8"));
}

export async function saveCredentials(creds: Creds): Promise<void> {
  if (IS_VERCEL) {
    const { kv } = await import("@vercel/kv");
    await kv.set(KV_KEY, creds);
    return;
  }
  fs.writeFileSync(CREDS_PATH, JSON.stringify(creds, null, 2), "utf-8");
}
