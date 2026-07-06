import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ⬇️ 【超重要】Supabaseがセッションローリング（クッキー自動更新）を行うためのベースレスポンス
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Supabaseサーバークライアントの初期化（公式ボイラープレート）
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 🔥 この getUser() が呼ばれた瞬間、必要に応じてSupabaseがクッキー（セッション）を自動でローリング（更新）してくれます！
  const { data: { user } } = await supabase.auth.getUser();

  // ----------------------------------------------------
  // 🔐 ページ制御ロジック（ここからがご要件の処理です）
  // ----------------------------------------------------

  // 【要件1】ログインしていない（userが存在しない）場合
  if (!user) {
    // かつ、現在のページが「/login」でも「/signup」でもない場合だけ、/login に強制送還
    // 💡（防壁：現在のパスが /login の時は絶対にリダイレクトさせないことでループを防ぐ）
    if (pathname !== "/login" && pathname !== "/signup") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // /login や /signup へのアクセスならそのまま通す
    return response;
  }

  // --- 💡 ここから下は「ログイン済み」のユーザーの処理 ---

  // 【要件2】ログインしている かつ 「/login」や「/signup」を開こうとしている場合
  if (pathname === "/login" || pathname === "/signup") {
    // /calendar に強制移動（自動更新されたクッキーを引き継ぐ）
    return createRedirectResponse("/calendar", request, response);
  }

  // 【要件3】ログインしている かつ 役職が "member"（一般部員）の場合
  const role = user.app_metadata?.role;
  if (role === "member") {
    // 一般部員がアクセスして良いページの一覧（これ以外はすべて弾く）
    const isAllowedPath =
      pathname === "/calendar" ||
      pathname === "/kakomon" ||
      pathname === "/account";

    if (!isAllowedPath) {
      // 役員限定ページ（/document, /email, /hikitugi, /setting, /task）や
      // その他の未許可ページにアクセスしようとしたら /calendar へ強制送還
      return createRedirectResponse("/calendar", request, response);
    }
  }

  // 【要件4】上記のどれにも引っかからなかった場合（例：役員が役員限定ページを開くなど）
  // 自動更新されたクッキー情報が含まれる response をそのまま返してアクセスを許可
  return response;
}

/**
 * 💡【リダイレクト時に関数を安全に抜けるためのヘルパー関数】
 * SupabaseがMiddleware内で自動更新してくれたクッキー（セッションローリング）を、
 * リダイレクト先のレスポンス（ブラウザ）へ確実に引き継ぐための処理です。
 */
function createRedirectResponse(targetPath: string, request: NextRequest, baseResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(new URL(targetPath, request.url));
  // 更新されたクッキーがあれば、リダイレクト用のレスポンスにすべてコピーする
  baseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

// ⬇️ 🔥【ループを防ぐ最強の防壁】
// Next.jsの静的ファイル（画像・CSS・JSなど）や、APIルートにはこのMiddlewareを「絶対に適用させない」設定です。
// これがないと、画面のスタイルシートを読み込むたびにリダイレクトが走り、トラウマが再発します。
export const config = {
  matcher: [
    /*
     * 以下のパスを除くすべてのリクエストパスにマッチさせます:
     * - api (APIルート)
     * - _next/static (静的ファイル/CSS/JSなど)
     * - _next/image (Next.jsの画像最適化)
     * - favicon.ico (ファビコン)
     * - 各種画像ファイル (.svg, .png, .jpg, 等)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};