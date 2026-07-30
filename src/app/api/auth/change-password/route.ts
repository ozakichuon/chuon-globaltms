import { NextRequest, NextResponse } from "next/server";
import { sha256, getSessionUserId } from "@/lib/auth";
import { getCredentials, saveCredentials, getRole, canManageUsers, type Role } from "@/lib/credentials-store";

export async function GET() {
  const userId = await getSessionUserId();
  const creds = getCredentials();
  if (!canManageUsers(getRole(userId, creds))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  const users = creds.users.map(({ id, must_change, role }) => ({ id, must_change: must_change ?? false, role: role ?? "viewer" }));
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { current_password, new_password, target_id } = await req.json();

  const targetId = target_id ?? userId;
  const creds = getCredentials();
  const canManage = canManageUsers(getRole(userId, creds));

  const userIdx = creds.users.findIndex((u) => u.id === targetId);
  if (userIdx === -1) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  if (targetId === userId || !canManage) {
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

  saveCredentials(creds);
  return NextResponse.json({ ok: true });
}

const VALID_ROLES: Role[] = ["admin", "data_manager", "user_manager", "viewer"];

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  const creds = getCredentials();
  if (!canManageUsers(getRole(userId, creds))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { id, password, role } = await req.json();
  if (!id || !password) {
    return NextResponse.json({ error: "IDとパスワードを入力してください" }, { status: 400 });
  }
  const newRole: Role = VALID_ROLES.includes(role) ? role : "viewer";

  if (creds.users.find((u) => u.id === id)) {
    return NextResponse.json({ error: "そのIDは既に存在します" }, { status: 409 });
  }

  creds.users.push({ id, password_hash: await sha256(password), must_change: true, role: newRole });
  saveCredentials(creds);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  const creds = getCredentials();
  if (!canManageUsers(getRole(userId, creds))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { id, role } = await req.json();
  if (id === "admin") {
    return NextResponse.json({ error: "adminの権限は変更できません" }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "不正な権限です" }, { status: 400 });
  }

  const userIdx = creds.users.findIndex((u) => u.id === id);
  if (userIdx === -1) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  creds.users[userIdx].role = role;
  saveCredentials(creds);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  const creds = getCredentials();
  if (!canManageUsers(getRole(userId, creds))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { id } = await req.json();
  if (id === "admin") {
    return NextResponse.json({ error: "adminは削除できません" }, { status: 400 });
  }

  creds.users = creds.users.filter((u) => u.id !== id);
  saveCredentials(creds);
  return NextResponse.json({ ok: true });
}
