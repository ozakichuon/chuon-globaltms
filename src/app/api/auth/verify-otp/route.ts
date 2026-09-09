import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, verifyPayload, COOKIE_NAME } from "@/lib/auth";
import { getCredentials } from "@/lib/credentials-store";
import { hashOtp } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const { id, code, ticket } = await req.json();
  if (!id || !code || !ticket) {
    return NextResponse.json({ error: "認証コードを入力してください" }, { status: 400 });
  }

  const payload = await verifyPayload(ticket);
  if (!payload) {
    return NextResponse.json({ error: "認証コードを再発行してください" }, { status: 400 });
  }

  const [ticketId, otpHash, expiresStr] = payload.split(":");
  if (ticketId !== id) {
    return NextResponse.json({ error: "認証コードを再発行してください" }, { status: 400 });
  }
  if (Date.now() > Number(expiresStr)) {
    return NextResponse.json({ error: "認証コードの有効期限が切れました。もう一度ログインしてください" }, { status: 401 });
  }

  const codeHash = await hashOtp(code);
  if (codeHash !== otpHash) {
    return NextResponse.json({ error: "認証コードが違います" }, { status: 401 });
  }

  const creds = getCredentials();
  const user = creds.users.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  const INITIAL_HASH = "5d0a1ea004df018bee898ddd4ad8c3e72cc667fd047159a21279d02c1637ccf1";
  const mustChange = (user.must_change ?? false) || user.password_hash === INITIAL_HASH;

  const token = await createSessionToken(id);
  const res = NextResponse.json({ ok: true, must_change: mustChange });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
