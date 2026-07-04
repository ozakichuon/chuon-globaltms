import initialCredentials from "./data/credentials.json";
import fs from "fs";
import path from "path";

type User = { id: string; password_hash: string; must_change?: boolean };
type Creds = { users: User[] };

// Vercel本番は /tmp に書き込み、ローカルは src/lib/data に書き込む
const CREDS_PATH = process.env.VERCEL
  ? "/tmp/credentials.json"
  : path.join(process.cwd(), "src/lib/data/credentials.json");

export function getCredentials(): Creds {
  // Vercel: /tmp にファイルがなければ初期値をコピー
  if (process.env.VERCEL && !fs.existsSync(CREDS_PATH)) {
    fs.writeFileSync(CREDS_PATH, JSON.stringify(initialCredentials, null, 2), "utf-8");
    return initialCredentials as Creds;
  }
  try {
    return JSON.parse(fs.readFileSync(CREDS_PATH, "utf-8"));
  } catch {
    return initialCredentials as Creds;
  }
}

export function saveCredentials(creds: Creds): void {
  fs.writeFileSync(CREDS_PATH, JSON.stringify(creds, null, 2), "utf-8");
}
