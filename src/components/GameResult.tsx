"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Round = { gestureId: number; gestureName: string; correct: boolean; elapsedSec: number | null };

interface Props {
  score: number;
  rounds: Round[];
  onRestart: () => void;
}

export default function GameResult({ score, rounds, onRestart }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(true);
  const savedRef = useRef(false);

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    async function save() {
      try {
        await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score, totalRounds: rounds.length, rounds }),
        });
      } finally {
        setSaving(false);
      }
    }
    save();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = score / rounds.length;
  const msg = pct === 1 ? "Perfect Score! 🎉" : pct >= 0.8 ? "สุดยอด! 👍" : pct >= 0.6 ? "ดีมาก! 💪" : pct >= 0.4 ? "พอใช้ได้!" : "ลองใหม่อีกครั้ง 😅";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4 pb-20 sm:pb-6 gap-5">
      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">สรุปผล</h1>
      <div className="text-6xl sm:text-7xl font-bold">{score}<span className="text-2xl sm:text-3xl text-slate-400">/{rounds.length}</span></div>
      <p className="text-slate-400 text-base sm:text-lg">{msg}</p>
      {saving && <p className="text-xs text-slate-500">กำลังบันทึกผล...</p>}

      {/* Round history grid — 5 cols on mobile, stays 5 */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-sm sm:max-w-lg">
        {rounds.map((r, i) => (
          <div
            key={i}
            className={`bg-[#1e293b] rounded-xl p-1.5 sm:p-2 text-center border-2 ${r.correct ? "border-emerald-500" : "border-red-500"}`}
          >
            <img src={`/images/${r.gestureId}.png`} alt={r.gestureName} className="w-8 h-8 sm:w-10 sm:h-10 object-contain invert mx-auto" />
            <div className="text-[10px] sm:text-xs mt-1">{i + 1}. {r.correct ? "✓" : "✗"}</div>
            <div className={`text-[10px] sm:text-xs font-semibold ${r.correct ? "text-emerald-400" : "text-red-400"}`}>
              {r.correct && r.elapsedSec !== null ? `${r.elapsedSec.toFixed(1)}s` : "หมด"}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onRestart}
          className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 font-semibold hover:opacity-90 active:scale-95 transition-all text-sm"
        >
          เล่นอีกครั้ง
        </button>
        <button
          onClick={() => router.push("/profile")}
          className="flex-1 py-2.5 rounded-full bg-slate-700 font-semibold hover:bg-slate-600 active:scale-95 transition-all text-sm"
        >
          ดูสถิติ
        </button>
      </div>
    </div>
  );
}
