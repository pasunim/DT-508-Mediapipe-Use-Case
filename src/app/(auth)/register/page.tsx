"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("รหัสผ่านไม่ตรงกัน"); return; }
    if (form.password.length < 6) { setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, username: form.username, password: form.password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          สมัครสมาชิก
        </h1>
        <p className="text-slate-400 text-center mb-8">สร้างบัญชีเพื่อเก็บสถิติการเล่น</p>

        <form onSubmit={handleSubmit} className="bg-[#1e293b] rounded-2xl p-6 flex flex-col gap-4 border border-slate-700">
          {[
            { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { key: "username", label: "Username", type: "text", placeholder: "ชื่อที่แสดงในเกม" },
            { key: "password", label: "รหัสผ่าน", type: "password", placeholder: "อย่างน้อย 6 ตัวอักษร" },
            { key: "confirm", label: "ยืนยันรหัสผ่าน", type: "password", placeholder: "••••••••" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm text-slate-400 mb-1 block">{f.label}</label>
              <input
                type={f.type} required
                value={form[f.key as keyof typeof form]}
                onChange={e => set(f.key, e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-violet-500 transition"
                placeholder={f.placeholder}
              />
            </div>
          ))}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
          <p className="text-center text-sm text-slate-400">
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="text-violet-400 hover:underline">เข้าสู่ระบบ</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
