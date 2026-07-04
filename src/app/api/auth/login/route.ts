import { NextRequest, NextResponse } from "next/server";
import { sha256, createSessionToken, COOKIE_NAME } from "@/lib/auth";
import credentialsJson from "@/lib/data/credentials.json";

export async function POST(req: NextRequest) {
  const { id, password } = await req.json();
  if (!id || !password) {
    return NextResponse.json({ error: "IDとパスワードを入力してください" }, { status: 400 });
  }

  const user = (credentialsJson.users as any[]).find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "IDまたはパスワードが違います" }, { status: 401 });
  }

  const hash = await sha256(password);
  if (hash !== user.password_hash) {
    return NextResponse.json({ error: "IDまたはパスワードが違います" }, { status: 401 });
  }

  const INITIAL_HASH = "5d0a1ea004df018bee898ddd4ad8c3e72cc667fd047159a21279d02c1637ccf1";
  const mustChange = (user.must_change ?? false) || hash === INITIAL_HASH;

  const token = await createSessionToken(id);
  const res = NextResponse.json({ ok: true, must_change: mustChange });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
