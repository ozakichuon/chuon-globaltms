import { NextRequest, NextResponse } from "next/server";
import { sha256, getSessionUserId } from "@/lib/auth";
import { getCredentials, saveCredentials } from "@/lib/credentials-store";

export async function GET() {
  const userId = await getSessionUserId();
  if (userId !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  const creds = await getCredentials();
  const users = creds.users.map(({ id, must_change }) => ({ id, must_change: must_change ?? false }));
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { current_password, new_password, target_id } = await req.json();

  const targetId = target_id ?? userId;
  const isAdmin = userId === "admin";

  const creds = await getCredentials();

  const userIdx = creds.users.findIndex((u) => u.id === targetId);
  if (userIdx === -1) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

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

  await saveCredentials(creds);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (userId !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { id, password } = await req.json();
  if (!id || !password) {
    return NextResponse.json({ error: "IDとパスワードを入力してください" }, { status: 400 });
  }

  const creds = await getCredentials();

  if (creds.users.find((u) => u.id === id)) {
    return NextResponse.json({ error: "そのIDは既に存在します" }, { status: 409 });
  }

  creds.users.push({ id, password_hash: await sha256(password), must_change: true });
  await saveCredentials(creds);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (userId !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { id } = await req.json();
  if (id === "admin") {
    return NextResponse.json({ error: "adminは削除できません" }, { status: 400 });
  }

  const creds = await getCredentials();
  creds.users = creds.users.filter((u) => u.id !== id);
  await saveCredentials(creds);
  return NextResponse.json({ ok: true });
}
