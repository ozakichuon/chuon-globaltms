import initialCredentials from "./data/credentials.json";
import fs from "fs";
import path from "path";

export type Role = "admin" | "data_manager" | "user_manager" | "viewer";
export const ROLE_LABELS: Record<Role, string> = {
  admin: "管理者",
  data_manager: "情報管理者",
  user_manager: "ユーザー管理者",
  viewer: "閲覧",
};

export type User = {
  id: string;
  password_hash: string;
  must_change?: boolean;
  role?: Role;
  email?: string;
  otp_hash?: string;
  otp_expires?: number;
};
export type Creds = { users: User[] };

export function getRole(id: string | null | undefined, creds: Creds): Role {
  if (!id) return "viewer";
  if (id === "admin") return "admin";
  const u = creds.users.find((x) => x.id === id);
  return u?.role ?? "viewer";
}

export function canUpdateData(role: Role): boolean {
  return role === "admin" || role === "data_manager";
}

export function canManageUsers(role: Role): boolean {
  return role === "admin" || role === "user_manager";
}

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
