import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

export async function POST() {
  const userId = await getSessionUserId();
  if (userId !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hookUrl) {
    return NextResponse.json({ error: "VERCEL_DEPLOY_HOOK_URL が設定されていません" }, { status: 500 });
  }

  const res = await fetch(hookUrl, { method: "POST" });
  if (!res.ok) {
    return NextResponse.json({ error: `デプロイ失敗: ${res.status}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
