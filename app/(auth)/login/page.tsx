'use client';

import {useState,FormEvent} from "react";

export default function LoginPage(){
    const[email,setEmail]=useState('');
    const[password,setPassword]=useState('');

    const handleLogin=(e:FormEvent)=>{
        e.preventDefault();

        alert('ログインを試みます：${email}');
    };

    return(
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <form onSubmit={handleLogin} className="p-6 bg-white rounded shadow-md w-80">
                <h1 className="text-2xl font-bold mb-4 text-center">川テ アプリ ログイン</h1>
        
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">メールアドレス</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium mb-1">パスワード</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>

                <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600">
                    ログイン
                </button>
            </form>
        </div>
    );
}