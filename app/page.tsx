import Link from "next/link";

export default function LoginPage(){
  return(
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">川内テニスクラブ</h1>
        <p className="text-sm text-slate-400 mb-6">役員専用ログイン</p>
        <div className="space-y-4 mb-6">
          <div className="h-10 bg-slate-800 border border-slate-700 rounded-md flex items-center px-3 text-slate-500 text-sm">大学メールアドレス</div>
          <div className="h-10 bg-slate-800 border border-slate-700 rounded-md flex items-center px-3 text-slate-500 text-sm">パスワード</div>
        </div>
        <Link href="/calendar" className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 rounded-md transition-colors">ログインする(テスト)</Link>
      </div>
    </div>
  );
};