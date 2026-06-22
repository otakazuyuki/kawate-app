import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;

  // 1. ログイン画面（/login）は誰でも入れるようにスルー
  if (currentPath === "/login") {
    return NextResponse.next();
  }

  // 2. 役員専用のタブ（パス）のリスト
  const officerOnlyPaths = ["/document", "/email", "/hikitugi", "/setting", "/task"];
  const isOfficerPath = officerOnlyPaths.some((path) => currentPath.startsWith(path));

  // 3. 役員専用のタブを開こうとした時だけチェック
  if (isOfficerPath) {
    // ログイン画面から送られてきた「鍵の文字（officer または member）」を読み取る
    const key = request.cookies.get("current_key")?.value;

    console.log(`[Middlewareチェック] パス: ${currentPath} | 届いた鍵: ${key}`);

    // 💡 あなたの言った通りのシンプルな if 文！
    // 鍵が役員（officer）じゃなければ、カレンダーに強制送還する
    if (key !== "officer") {
      return NextResponse.redirect(new URL("/calendar", request.url));
    }
  }

  return NextResponse.next();
}

// 適用するURLの設定
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};