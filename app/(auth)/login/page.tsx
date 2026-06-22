"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import { ShieldAlert, Users, KeyRound, Mail, LogIn } from "lucide-react";

export default function LoginPage() {
  const [userType, setUserType] = useState<"officer" | "member">("member");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Supabase Authでメール・パスワードの認証
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        alert(`ログイン失敗: ${authError.message}`);
        setLoading(false);
        return;
      }

      // 2. 🔥 【名簿の情報を丸ごと取得 ＆ ログイン情報に焼き付ける】
      if (userType === "officer") {
        // 役員としてログイン：ID、名前、役職（role）に加えて「generation」も取得！
        const { data: officerData, error: dbError } = await supabase
          .from("officers")
          .select("id, name, role, generation") // 🎁 ここに generation を追加！
          .eq("email", email.trim())
          .maybeSingle();

        if (dbError || !officerData) {
          await supabase.auth.signOut();
          alert("❌ アクセス拒否: 役員名簿にこのメールアドレスの登録がありません。");
          setLoading(false);
          return;
        }

        // ✨ 役員情報をメタデータに丸ごと焼き付ける！
        await supabase.auth.updateUser({
          data: { 
            role: "officer",
            db_id: officerData.id,
            name: officerData.name,
            title: officerData.role,
            generation: officerData.generation // 🎁 ここにも generation を追加！
          }
        });

      } else {
        // 一般部員としてログイン：ID、名前、期（generation）などを取得
        const { data: memberData, error: dbError } = await supabase
          .from("profiles")
          .select("id, name, generation") // 🎁 必要情報をまとめて取得
          .eq("email", email.trim())
          .maybeSingle();

        if (dbError || !memberData) {
          await supabase.auth.signOut();
          alert("❌ アクセス拒否: 部員名簿にこのメールアドレスの登録がありません。");
          setLoading(false);
          return;
        }

        // ✨ 部員情報をメタデータに丸ごと焼き付ける！
        await supabase.auth.updateUser({
          data: { 
            role: "member",
            db_id: memberData.id,            // 名簿のID
            name: memberData.name,           // 名前
            generation: memberData.generation // 期（例: 21）
          }
        });
      }

      alert(`${userType === "officer" ? "役員" : "一般部員"}としてログインしました！`);
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
            一般部員
          </button>
          <button
            type="button"
            onClick={() => setUserType("officer")}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              userType === "officer" ? "bg-slate-800 text-purple-400 shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            役員専用
          </button>
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
            className={`w-full font-bold py-2.5 rounded-lg transition-all mt-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer text-white ${
              userType === "officer" 
                ? "bg-purple-600 hover:bg-purple-500 shadow-purple-500/10" 
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            {loading ? "ログイン中..." : `${userType === "officer" ? "役員" : "一般部員"}としてログイン`}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => router.push("/signup")} // 🎁 フォルダ名に合わせて /signup に修正
            className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            まだアカウントをお持ちでない方（新規登録へ）
          </button>
        </div>

      </div>
    </div>
  );
}