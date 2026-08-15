import { sha256 } from "./auth";

const OTP_TTL_MS = 5 * 60 * 1000; // 5分

export function generateOtpCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4桁
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY が未設定です");
  }
  const from = process.env.RESEND_FROM_EMAIL || "TMS <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "【中温TMS】ログイン認証コード",
      html: `<p>ログイン認証コードは <strong style="font-size:20px;">${code}</strong> です。</p><p>このコードは5分間有効です。</p>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`メール送信に失敗しました: ${text}`);
  }
}

export async function hashOtp(code: string): Promise<string> {
  return sha256(code);
}

export function otpTtlMs(): number {
  return OTP_TTL_MS;
}
