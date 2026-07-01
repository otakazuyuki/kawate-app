// middleware.ts
import { createServerClient } from "@supabase/ssr"; // 👈 追加
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;

  // 1. ログイン画面（/login）は誰でも入れるようにスルー
  if (currentPath === "/login") {
    return NextResponse.next();
  }

  // --- 💡 [ここから追加] Supabaseのログインクッキーを安全にサーバーへ転送する処理 ---
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 重要: これを呼ぶことで、ブラウザのログイン状態がServer Actionsに100%届くようになります
  await supabase.auth.getUser();
  // --- 💡 [ここまで追加] ---


  // 2. 役員専用のタブ（パス）のリスト
  const officerOnlyPaths = ["/document", "/email", "/hikitugi", "/setting", "/task"];
  const isOfficerPath = officerOnlyPaths.some((path) => currentPath.startsWith(path));

  // 3. 役員専用のタブを開こうとした時だけチェック
  if (isOfficerPath) {
    const key = request.cookies.get("current_key")?.value;
    console.log(`[Middlewareチェック] パス: ${currentPath} | 届いた鍵: ${key}`);

    if (key !== "officer") {
      // 💡 リダイレクト時もSupabaseのクッキー情報（response）を引き継ぐように修正
      const redirectResponse = NextResponse.redirect(new URL("/calendar", request.url));
      response.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie.name, cookie.value));
      return redirectResponse;
    }
  }

  return response; // 💡 最後にSupabaseの情報が入ったresponseを返す
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};