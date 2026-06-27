"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Email หรือรหัสผ่านไม่ถูกต้อง");
    } else {
      router.push("/game");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          Hand Gesture Game
        </h1>
        <p className="text-slate-400 text-center mb-8">เข้าสู่ระบบเพื่อเล่น</p>

        <form onSubmit={handleSubmit} className="bg-[#1e293b] rounded-2xl p-6 flex flex-col gap-4 border border-slate-700">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Email</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-violet-500 transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">รหัสผ่าน</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-violet-500 transition"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          <p className="text-center text-sm text-slate-400">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="text-violet-400 hover:underline">สมัครสมาชิก</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
