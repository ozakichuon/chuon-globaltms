import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { getCredentials, saveCredentials } from "@/lib/credentials-store";
import { hashOtp } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const { id, code } = await req.json();
  if (!id || !code) {
    return NextResponse.json({ error: "認証コードを入力してください" }, { status: 400 });
  }

  const creds = getCredentials();
  const userIdx = creds.users.findIndex((u) => u.id === id);
  if (userIdx === -1) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }
  const user = creds.users[userIdx];

  if (!user.otp_hash || !user.otp_expires) {
    return NextResponse.json({ error: "認証コードを再発行してください" }, { status: 400 });
  }
  if (Date.now() > user.otp_expires) {
    return NextResponse.json({ error: "認証コードの有効期限が切れました。もう一度ログインしてください" }, { status: 401 });
  }

  const codeHash = await hashOtp(code);
  if (codeHash !== user.otp_hash) {
    return NextResponse.json({ error: "認証コードが違います" }, { status: 401 });
  }

  // OTPを使い切ったらクリア
  delete creds.users[userIdx].otp_hash;
  delete creds.users[userIdx].otp_expires;
  saveCredentials(creds);

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
