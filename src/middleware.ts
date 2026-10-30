import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/verify-otp"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // APIへのPOSTを/loginへ転送するとページ側が非JSONを返し、画面でJSON解析エラーになるため401で返す
  const isApi = pathname.startsWith("/api/");
  const unauthorized = () =>
    isApi
      ? NextResponse.json({ error: "ログインの有効期限が切れました。再ログインしてください" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return unauthorized();
  }

  const userId = await verifySessionToken(token);
  if (!userId) {
    const res = unauthorized();
    res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
