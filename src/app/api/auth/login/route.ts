import { NextRequest, NextResponse } from "next/server";
import { sha256, createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { getCredentials, saveCredentials } from "@/lib/credentials-store";
import { generateOtpCode, hashOtp, sendOtpEmail, otpTtlMs } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const { id, password } = await req.json();
  if (!id || !password) {
    return NextResponse.json({ error: "IDとパスワードを入力してください" }, { status: 400 });
  }

  const creds = getCredentials();
  const user = creds.users.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "IDまたはパスワードが違います" }, { status: 401 });
  }

  const hash = await sha256(password);
  if (hash !== user.password_hash) {
    return NextResponse.json({ error: "IDまたはパスワードが違います" }, { status: 401 });
  }

  const INITIAL_HASH = "5d0a1ea004df018bee898ddd4ad8c3e72cc667fd047159a21279d02c1637ccf1";
  const mustChange = (user.must_change ?? false) || hash === INITIAL_HASH;

  // メールアドレス未登録のユーザーはOTPをスキップして従来どおりログイン
  if (!user.email) {
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

  // ワンタイムパスワードを発行してメール送信
  const code = generateOtpCode();
  const userIdx = creds.users.findIndex((u) => u.id === id);
  creds.users[userIdx].otp_hash = await hashOtp(code);
  creds.users[userIdx].otp_expires = Date.now() + otpTtlMs();
  saveCredentials(creds);

  try {
    await sendOtpEmail(user.email, code);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "メール送信に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ otp_required: true, must_change: mustChange });
}
