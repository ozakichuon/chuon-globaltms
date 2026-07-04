import { NextRequest, NextResponse } from "next/server";
import { sha256, getSessionUserId } from "@/lib/auth";
import fs from "fs";
import path from "path";

const CREDS_PATH = path.join(process.cwd(), "src/lib/data/credentials.json");

export async function GET() {
  const userId = await getSessionUserId();
  if (userId !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  const creds = JSON.parse(fs.readFileSync(CREDS_PATH, "utf-8"));
  const users = (creds.users as any[]).map(({ id, must_change }) => ({ id, must_change: must_change ?? false }));
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { current_password, new_password, target_id } = await req.json();

  // 管理者が別ユーザーのパスワードを変更する場合は current_password 不要
  const targetId = target_id ?? userId;
  const isAdmin = userId === "admin";

  let creds: any;
  try {
    creds = JSON.parse(fs.readFileSync(CREDS_PATH, "utf-8"));
  } catch {
    return NextResponse.json({ error: "認証データを読み込めません" }, { status: 500 });
  }

  const userIdx = creds.users.findIndex((u: any) => u.id === targetId);
  if (userIdx === -1) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  // 自分のパスワード変更 or 初回変更の場合は現在パスワード確認
  if (targetId === userId || !isAdmin) {
    if (!current_password) {
      return NextResponse.json({ error: "現在のパスワードを入力してください" }, { status: 400 });
    }
    const currentHash = await sha256(current_password);
    if (currentHash !== creds.users[userIdx].password_hash) {
      return NextResponse.json({ error: "現在のパスワードが違います" }, { status: 401 });
    }
  }

  if (!new_password || new_password.length < 4) {
    return NextResponse.json({ error: "新パスワードは4文字以上にしてください" }, { status: 400 });
  }

  creds.users[userIdx].password_hash = await sha256(new_password);
  creds.users[userIdx].must_change = false;

  try {
    fs.writeFileSync(CREDS_PATH, JSON.stringify(creds, null, 2), "utf-8");
  } catch {
    return NextResponse.json({ error: "パスワードを保存できません（Vercel環境では非対応）" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// 管理者用：ユーザー追加
export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (userId !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { id, password } = await req.json();
  if (!id || !password) {
    return NextResponse.json({ error: "IDとパスワードを入力してください" }, { status: 400 });
  }

  let creds: any;
  try {
    creds = JSON.parse(fs.readFileSync(CREDS_PATH, "utf-8"));
  } catch {
    return NextResponse.json({ error: "認証データを読み込めません" }, { status: 500 });
  }

  if (creds.users.find((u: any) => u.id === id)) {
    return NextResponse.json({ error: "そのIDは既に存在します" }, { status: 409 });
  }

  creds.users.push({ id, password_hash: await sha256(password), must_change: true });
  fs.writeFileSync(CREDS_PATH, JSON.stringify(creds, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}

// 管理者用：ユーザー削除
export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (userId !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { id } = await req.json();
  if (id === "admin") {
    return NextResponse.json({ error: "adminは削除できません" }, { status: 400 });
  }

  let creds: any;
  try {
    creds = JSON.parse(fs.readFileSync(CREDS_PATH, "utf-8"));
  } catch {
    return NextResponse.json({ error: "認証データを読み込めません" }, { status: 500 });
  }

  creds.users = creds.users.filter((u: any) => u.id !== id);
  fs.writeFileSync(CREDS_PATH, JSON.stringify(creds, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}
