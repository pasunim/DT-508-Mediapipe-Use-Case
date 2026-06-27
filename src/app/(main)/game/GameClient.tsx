"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import GameResult from "@/components/GameResult";

const GestureGame = dynamic(() => import("@/components/GestureGame"), { ssr: false });

type Round = { gestureId: number; gestureName: string; correct: boolean; elapsedSec: number | null };
type Screen = "lobby" | "playing" | "result";

const GESTURE_PREVIEWS = [
  { file: "/images/1.png", name: "Thumbs Up" },
  { file: "/images/2.png", name: "Peace ✌️" },
  { file: "/images/3.png", name: "Ok 👌" },
  { file: "/images/4.png", name: "สี่นิ้ว" },
  { file: "/images/5.png", name: "Two Thumbs" },
  { file: "/images/6.png", name: "กำหมัด" },
];

function useMediaPipeReady() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const GLOBALS = ["Hands", "Camera", "drawConnectors", "drawLandmarks"];
    let cancelled = false;
    const MAX_RETRIES = 60; // 60 × 300ms = 18s
    let attempts = 0;

    function check() {
      if (cancelled) return;
      if (GLOBALS.every(g => !!w[g])) { setReady(true); return; }
      attempts++;
      if (attempts >= MAX_RETRIES) { setError(true); return; }
      setTimeout(check, 300);
    }
    check();
    return () => { cancelled = true; };
  }, []);

  return { ready, error };
}

export default function GameClient({ username }: { username: string }) {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [result, setResult] = useState<{ score: number; rounds: Round[] } | null>(null);
  const [key, setKey] = useState(0);
  const { ready: mediapipeReady, error: mediapipeError } = useMediaPipeReady();

  if (screen === "playing") {
    return (
      <GestureGame
        key={key}
        username={username}
        mediapipeReady={mediapipeReady}
        onGameEnd={(r) => { setResult(r); setScreen("result"); }}
      />
    );
  }

  if (screen === "result" && result) {
    return (
      <GameResult
        score={result.score}
        rounds={result.rounds}
        onRestart={() => { setResult(null); setKey(k => k + 1); setScreen("lobby"); }}
      />
    );
  }

  // Lobby screen
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 pb-20 sm:pb-6">
      <div className="w-full max-w-lg flex flex-col items-center gap-5 text-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Hand Gesture Game
          </h1>
          <p className="text-slate-400">สวัสดี <span className="text-white font-semibold">{username}</span> พร้อมเล่นหรือยัง?</p>
        </div>

        {/* Rules */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 w-full text-left flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">กติกา</h2>
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-violet-400 mt-0.5">●</span>
            <span>ซ้อมมือ <b className="text-white">3 รอบ</b> ก่อน (ไม่นับคะแนน)</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-violet-400 mt-0.5">●</span>
            <span>เล่นจริง <b className="text-white">20 รอบ</b> รอบละ <b className="text-white">5 วินาที</b></span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-violet-400 mt-0.5">●</span>
            <span>ทำท่ามือให้ตรงกับภาพที่แสดง ได้คะแนน <b className="text-white">1 คะแนน/รอบ</b></span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-violet-400 mt-0.5">●</span>
            <span>กด <b className="text-white">🏳️ ยอมแพ้</b> ได้ทุกเมื่อ ผลจะถูกบันทึกทันที</span>
          </div>
        </div>

        {/* Gesture preview */}
        <div className="w-full">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">ท่ามือทั้งหมด</h2>
          <div className="flex justify-center gap-3 flex-wrap">
            {GESTURE_PREVIEWS.map(g => (
              <div key={g.file} className="bg-[#1e293b] border border-slate-700 rounded-xl p-3 flex flex-col items-center gap-1 w-20">
                <img src={g.file} alt={g.name} className="w-12 h-12 object-contain invert" />
                <span className="text-xs text-slate-400 text-center leading-tight">{g.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MediaPipe status + Start button */}
        {mediapipeError ? (
          <div className="w-full max-w-xs py-3 rounded-full bg-red-900/60 border border-red-700 text-red-300 text-sm font-semibold text-center">
            โหลด MediaPipe ไม่สำเร็จ — ลอง refresh หน้า
          </div>
        ) : !mediapipeReady ? (
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 animate-pulse" />
            </div>
            <p className="text-sm text-slate-400">กำลังโหลด MediaPipe...</p>
          </div>
        ) : (
          <button
            onClick={() => setScreen("playing")}
            className="w-full max-w-xs py-3 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 font-bold text-lg hover:opacity-90 active:scale-95 transition-all"
          >
            🎮 เริ่มเล่นเกม
          </button>
        )}
      </div>
    </div>
  );
}
