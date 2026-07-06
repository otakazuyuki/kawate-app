"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import { ShieldAlert, Users, KeyRound, Mail, LogIn } from "lucide-react";

export default function LoginPage() {
  const [userType, setUserType] = useState<"officer" | "member">("member");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. 🔥【超シンプル化】純粋に認証（ログイン）を実行するだけ！
      // ログインに成功した時点で、Supabaseのトリガーが仕込んだ「本物のロール情報（JWT）」が
      // ブラウザのクッキー（@supabase/ssr管理）に自動かつ安全に保存されます。
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        alert(`ログイン失敗: ${authError.message}`);
        setLoading(false);
        return;
      }

      alert("ログインに成功しました！");
      
      // 2. ✨【脆弱性の完全排除】
      // フロント側での名簿照合、updateUser（メタデータ上書き）、refreshSession、手動クッキーはすべて削除。
      // セキュリティが担保されたので、window.location.href ではなく、Next.js本来の高速な遷移が使えます！
      router.push("/calendar");
      
    } catch (err) {
      alert("予期せぬエラーが発生しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl space-y-6">
      
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">川内テニスクラブ</h1>
        <p className="text-xs text-slate-400 mt-1">ポータルログイン</p>
      </div>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1 px-1 flex items-center gap-1">
            <Mail className="w-3 h-3" /> 大学メールアドレス
          </label>
          <input
            type="email"
            placeholder="example@university.ac.jp"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-all font-mono"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1 px-1 flex items-center gap-1">
            <KeyRound className="w-3 h-3" /> パスワード
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-all"
            required
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full font-bold py-2.5 rounded-lg transition-all mt-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer text-white bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10"
        >
          <LogIn className="w-3.5 h-3.5" />
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-slate-800/60">
        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
        >
          まだアカウントをお持ちでない方（新規登録へ）
        </button>
      </div>

    </div>
  </div>
);
}