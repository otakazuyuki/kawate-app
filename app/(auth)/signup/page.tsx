"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import { KeyRound, Mail, UserPlus } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. パスワードの2回入力チェック（これはフロント側でやってOK）
    if (password !== confirmPassword) {
      alert("エラー: 入力された2つのパスワードが一致しません。");
      setLoading(false);
      return;
    }

    try {
      // 2. 🔥【超シンプル化】ただSupabaseにアカウント作成を要請するだけ！
      // 役員か部員かの照合、および名簿にない場合の登録拒否は、すべてSupabase（トリガー）が裏側で自動かつ安全に行います。
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      // 名簿にない場合や、その他のエラー時はSupabaseが弾いてここにメッセージが入ります
      if (authError) {
        alert(`アカウント作成失敗: ${authError.message}`);
        return;
      }

      alert("🎉 アカウント登録が完了しました！自動的にログインします。");
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6">
        
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">川内テニスクラブ</h1>
          <p className="text-xs text-slate-400 mt-1">新規アカウント作成</p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSignUp} className="space-y-4">
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

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 px-1 flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-slate-500" /> パスワード (確認用でもう一度)
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            <UserPlus className="w-3.5 h-3.5" />
            {loading ? "登録処理中..." : "新規アカウント登録"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            既にアカウントをお持ちの方（ログイン画面へ）
          </button>
        </div>

      </div>
    </div>
  );
}