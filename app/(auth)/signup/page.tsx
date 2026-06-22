"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import { ShieldAlert, Users, KeyRound, Mail, UserPlus } from "lucide-react";

export default function SignInPage() {
  const [userType, setUserType] = useState<"officer" | "member">("member"); // デフォルトは一般部員
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. パスワードの2回入力チェック
    if (password !== confirmPassword) {
      alert("エラー: 入力された2つのパスワードが一致しません。");
      setLoading(false);
      return;
    }

    try {
      // 2. 事前登録された名簿（メールアドレス）との照合
      if (userType === "officer") {
        // 役員：officers テーブルをチェック
        const { data, error } = await supabase
          .from("officers")
          .select("email")
          .eq("email", email.trim());
        
        if (error || !data || data.length === 0) {
          alert("❌ 役員名簿にこのメールアドレスが見つかりません。管理者に登録を依頼してください。");
          setLoading(false);
          return;
        }
      } else {
        // 一般部員：profiles テーブルをチェック
        const { data, error } = await supabase
          .from("profiles")
          .select("email")
          .eq("email", email.trim());
        
        if (error || !data || data.length === 0) {
          alert("❌ 部員名簿にこのメールアドレスが見つかりません。設定画面から名簿登録を先に行ってください。");
          setLoading(false);
          return;
        }
      }

      // 3. 照合を通過したら Supabase Auth でアカウント作成
      // メタデータ（user_metadata）に役職情報を焼き付ける
      const { data, error: authError } = await supabase.auth.signUp({
  email: email.trim(),
  password: password,
  options: {
    // 🔥 ここを追加！
    data: {
      requested_role: userType
    }
  }
});

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
          <p className="text-xs text-slate-400 mt-1">新規アカウント作成 (部員照合システム)</p>
        </div>

        {/* 役員か部員かの切り替えトグルタブ */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setUserType("member")}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              userType === "member" ? "bg-slate-800 text-emerald-400 shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            一般部員として登録
          </button>
          <button
            type="button"
            onClick={() => setUserType("officer")}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              userType === "officer" ? "bg-slate-800 text-purple-400 shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            役員として登録
          </button>
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
            className={`w-full font-bold py-2.5 rounded-lg transition-all mt-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer text-white ${
              userType === "officer" 
                ? "bg-purple-600 hover:bg-purple-500 shadow-purple-500/10" 
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {loading ? "照合＆アカウント作成中..." : `${userType === "officer" ? "役員" : "一般部員"}として新規登録`}
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