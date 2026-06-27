"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const GESTURES = [
  { id: 1, file: "/images/1.png", name: "Thumbs Up" },
  { id: 2, file: "/images/2.png", name: "Peace ✌️" },
  { id: 3, file: "/images/3.png", name: "Ok 👌" },
  { id: 4, file: "/images/4.png", name: "สี่นิ้ว" },
  { id: 5, file: "/images/5.png", name: "Two Thumbs Up" },
  { id: 6, file: "/images/6.png", name: "กำหมัด" },
];

const TOTAL_ROUNDS = 20;
const PRACTICE_ROUNDS = 3;
const ROUND_TIME = 5000;

type Lm = { x: number; y: number; z: number };
type HandResult = { multiHandLandmarks?: Lm[][]; multiHandedness?: { label: string }[] } | null;

function isThumbPointing(lm: Lm[]) { return lm[4].y < lm[3].y && lm[4].y < lm[2].y; }
function isThumbFolded(lm: Lm[]) { return lm[4].y >= lm[2].y; }
function fingerUp(lm: Lm[], tip: number, mcp: number) { return lm[tip].y < lm[mcp].y; }
function getUp(lm: Lm[]) { return [fingerUp(lm,8,5), fingerUp(lm,12,9), fingerUp(lm,16,13), fingerUp(lm,20,17)]; }
function getClosed(lm: Lm[]) { return [lm[8].y>lm[5].y, lm[12].y>lm[9].y, lm[16].y>lm[13].y, lm[20].y>lm[17].y]; }

// id=3: OK gesture — thumb tip touches index tip (tip distance < threshold), other fingers up
function isOkGesture(lm: Lm[]) {
  const thumbTip = lm[4]; const indexTip = lm[8];
  const dx = thumbTip.x - indexTip.x; const dy = thumbTip.y - indexTip.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const u = getUp(lm);
  return dist < 0.07 && u[1] && u[2] && u[3]; // middle/ring/pinky up, thumb+index circle
}

function checkGestureId(id: number, r: HandResult): boolean {
  if (!r?.multiHandLandmarks?.length) return false;
  const lms = r.multiHandLandmarks;
  if (id === 1) {
    return lms.some(lm => { const c=getClosed(lm); return c[0]&&c[1]&&c[2]&&c[3]&&isThumbPointing(lm); });
  }
  if (id === 2) {
    return lms.some(lm => { const u=getUp(lm); const c=getClosed(lm); return u[0]&&u[1]&&c[2]&&c[3]; });
  }
  if (id === 3) {
    return lms.some(lm => isOkGesture(lm));
  }
  if (id === 4) {
    return lms.some(lm => { const u=getUp(lm); return u[0]&&u[1]&&u[2]&&u[3]&&isThumbFolded(lm); });
  }
  if (id === 5) {
    if (lms.length < 2) return false;
    let cnt=0; lms.forEach(lm => { const c=getClosed(lm); if(c[0]&&c[1]&&c[2]&&c[3]&&isThumbPointing(lm)) cnt++; }); return cnt>=2;
  }
  if (id === 6) {
    return lms.some(lm => { const c=getClosed(lm); return c[0]&&c[1]&&c[2]&&c[3]&&isThumbFolded(lm); });
  }
  return false;
}

type RoundHistory = { gestureId: number; gestureName: string; correct: boolean; elapsedSec: number | null };

interface Props {
  username: string;
  onGameEnd: (result: { score: number; rounds: RoundHistory[] }) => void;
  mediapipeReady: boolean;
}

type Phase = "practice" | "transition" | "game" | "done";

export default function GestureGame({ username, onGameEnd, mediapipeReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<unknown>(null);
  const currentResultRef = useRef<HandResult>(null);
  const roundActiveRef = useRef(false);
  const scoredRef = useRef(false);
  const roundStartRef = useRef(0);
  const roundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for latest state — prevents stale closure in timer callbacks
  const scoreRef = useRef(0);
  const historyRef = useRef<RoundHistory[]>([]);
  const phaseRef = useRef<Phase>("practice");
  const roundRef = useRef(0);
  const practiceRoundRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("practice");
  const [practiceRound, setPracticeRound] = useState(0);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [sequence] = useState(() => Array.from({ length: TOTAL_ROUNDS }, () => GESTURES[Math.floor(Math.random() * GESTURES.length)]));
  const [practiceSeq] = useState(() => Array.from({ length: PRACTICE_ROUNDS }, () => GESTURES[Math.floor(Math.random() * GESTURES.length)]));
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"correct"|"wrong"|"neutral">("neutral");
  const [gestureLabel, setGestureLabel] = useState("รอการตรวจจับ...");
  const [timerPct, setTimerPct] = useState(1);
  const [countdownText, setCountdownText] = useState("");
  const [showImage, setShowImage] = useState(true);

  // Keep refs in sync with state
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { practiceRoundRef.current = practiceRound; }, [practiceRound]);

  const currentGesture = phase === "practice" ? practiceSeq[practiceRound] : sequence[round];

  const endRound = useCallback((correct: boolean, giveup = false) => {
    if (scoredRef.current) return;
    scoredRef.current = true;
    roundActiveRef.current = false;
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);

    // Read latest values via refs — avoids stale closure
    const currentScore = scoreRef.current;
    const currentHistory = historyRef.current;
    const currentPhase = phaseRef.current;
    const currentRound = roundRef.current;
    const currentPracticeRound = practiceRoundRef.current;

    const elapsed = correct ? (performance.now() - roundStartRef.current) / 1000 : null;

    if (giveup) {
      onGameEnd({ score: currentScore, rounds: currentHistory });
      setPhase("done");
      return;
    }

    if (currentPhase === "practice") {
      setFeedback(correct ? "✓ ถูกต้อง! (ซ้อม)" : "✗ หมดเวลา (ซ้อม)");
      setFeedbackType(correct ? "correct" : "wrong");
      setTimerPct(correct ? 1 : 0);
      setTimeout(() => {
        if (currentPracticeRound + 1 >= PRACTICE_ROUNDS) {
          setPhase("transition");
        } else {
          setPracticeRound(currentPracticeRound + 1);
        }
        setFeedback(""); setGestureLabel("รอการตรวจจับ...");
      }, 1000);
    } else {
      const gesture = sequence[currentRound];
      const newScore = correct ? currentScore + 1 : currentScore;
      const newHistory = [...currentHistory, { gestureId: gesture.id, gestureName: gesture.name, correct, elapsedSec: elapsed }];

      setHistory(newHistory);
      historyRef.current = newHistory;

      if (correct) {
        setScore(newScore);
        scoreRef.current = newScore;
        setFeedback("✓ ถูกต้อง! +1");
        setFeedbackType("correct");
        setTimerPct(1);
      } else {
        setFeedback("✗ หมดเวลา");
        setFeedbackType("wrong");
        setTimerPct(0);
      }

      setTimeout(() => {
        if (currentRound + 1 >= TOTAL_ROUNDS) {
          onGameEnd({ score: newScore, rounds: newHistory });
          setPhase("done");
        } else {
          setRound(currentRound + 1);
        }
        setFeedback(""); setGestureLabel("รอการตรวจจับ...");
      }, 1000);
    }
  }, [sequence, onGameEnd]);

  // check gesture each frame — reads refs for latest round/phase
  const checkGestureRef = useRef<() => void>(() => {});
  const checkGesture = useCallback(() => {
    if (!roundActiveRef.current || scoredRef.current) return;
    const r = currentResultRef.current;
    const currentPhase = phaseRef.current;
    const currentRound = roundRef.current;
    const currentPracticeRound = practiceRoundRef.current;
    const gesture = currentPhase === "practice" ? practiceSeq[currentPracticeRound] : sequence[currentRound];
    if (!gesture) return;
    const detected = checkGestureId(gesture.id, r);
    setGestureLabel(detected ? `✓ ตรวจพบ: ${gesture.name}` : "รอการตรวจจับ...");
    if (detected) endRound(true);
  }, [practiceSeq, sequence, endRound]);

  useEffect(() => { checkGestureRef.current = checkGesture; }, [checkGesture]);

  // start a round
  const startRound = useCallback(() => {
    scoredRef.current = false;
    roundActiveRef.current = false;
    setFeedback(""); setGestureLabel("รอการตรวจจับ..."); setTimerPct(1);
    setTimeout(() => {
      roundActiveRef.current = true;
      roundStartRef.current = performance.now();
      roundTimerRef.current = setTimeout(() => endRound(false), ROUND_TIME);
    }, 500);
  }, [endRound]);

  // timer bar animation
  useEffect(() => {
    if (!roundActiveRef.current) return;
    let raf: number;
    const animate = () => {
      const elapsed = performance.now() - roundStartRef.current;
      const pct = Math.max(0, 1 - elapsed / ROUND_TIME);
      setTimerPct(pct);
      if (pct > 0 && roundActiveRef.current) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [phase, round, practiceRound]);

  // transition countdown
  useEffect(() => {
    if (phase !== "transition") return;
    setShowImage(false);
    const steps = ["Ready...", "3", "2", "1", "GO!"];
    let i = 0;
    const delays = [800, 700, 700, 700, 700];
    const run = () => {
      if (i >= steps.length) { setCountdownText(""); setShowImage(true); setPhase("game"); return; }
      setCountdownText(steps[i]);
      setTimeout(run, delays[i]);
      i++;
    };
    run();
  }, [phase]);

  // start round when phase/round/practice changes
  useEffect(() => {
    if (phase === "practice" || phase === "game") startRound();
  }, [phase, round, practiceRound, startRound]);

  // MediaPipe setup — runs once on mount, only after mediapipeReady
  useEffect(() => {
    if (!mediapipeReady) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    let destroyed = false;

    async function waitForVideo(): Promise<void> {
      return new Promise<void>(resolve => {
        const check = () => { if (videoRef.current) { resolve(); return; } setTimeout(check, 50); };
        check();
      });
    }

    async function setup() {
      await waitForVideo();
      if (destroyed) return;

      const hands = new w.Hands({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });
      hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 });
      handsRef.current = hands;

      hands.onResults((results: HandResult) => {
        if (destroyed) return;
        currentResultRef.current = results;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && canvas && video) {
          canvas.width  = video.videoWidth  || 480;
          canvas.height = video.videoHeight || 360;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (results?.multiHandLandmarks) {
            for (const lm of results.multiHandLandmarks) {
              w.drawConnectors(ctx, lm, w.HAND_CONNECTIONS, { color: "#a78bfa", lineWidth: 3 });
              w.drawLandmarks(ctx, lm, { color: "#60a5fa", lineWidth: 1, radius: 4 });
            }
          }
        }
        checkGestureRef.current();
      });

      const camera = new w.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) await hands.send({ image: videoRef.current });
        },
        width: 480, height: 360,
      });
      camera.start();
    }

    setup().catch(console.error);
    return () => { destroyed = true; };
  }, [mediapipeReady]);

  const timerColor = timerPct > 0.5 ? "from-violet-600 to-blue-600" : timerPct > 0.25 ? "from-amber-600 to-yellow-500" : "from-red-700 to-red-500";

  return (
    <div className="flex flex-col items-center gap-3 p-3 w-full max-w-5xl mx-auto">

      {/* HUD */}
      <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-400">
        <span>ผู้เล่น: <b className="text-white">{username}</b></span>
        <span>
          {phase === "practice"
            ? <b className="text-emerald-400">ซ้อม {practiceRound + 1}/{PRACTICE_ROUNDS}</b>
            : phase === "game"
            ? <>รอบที่: <b className="text-white">{round + 1}/{TOTAL_ROUNDS}</b></>
            : null}
        </span>
        <span>คะแนน: <b className="text-white">{score}</b></span>
      </div>

      {/* Practice banner */}
      {phase === "practice" && (
        <div className="bg-emerald-900/40 border border-emerald-700 rounded-lg px-4 py-1.5 text-emerald-300 text-sm font-semibold">
          ซ้อมมือ — ไม่นับคะแนน
        </div>
      )}

      {/* Mobile: stack vertically / Desktop: side by side */}
      <div className="flex flex-col lg:flex-row gap-4 w-full items-center lg:items-start justify-center">

        {/* Camera */}
        <div className="relative w-full max-w-sm lg:w-[480px] lg:max-w-none aspect-[4/3] lg:h-[360px] rounded-2xl overflow-hidden border-2 border-slate-700 flex-shrink-0">
          <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full scale-x-[-1]" />
        </div>

        {/* Right panel */}
        <div className="flex flex-col items-center gap-3 w-full lg:flex-1 lg:min-w-[200px]">

          {/* Target image box */}
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-4 text-center w-full">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">ทำท่านี้!</p>
            {phase === "transition" ? (
              <div className="h-[120px] lg:h-[160px] flex items-center justify-center">
                <span className={`text-5xl font-bold ${countdownText === "GO!" ? "text-emerald-400" : "text-violet-400"}`}>
                  {countdownText}
                </span>
              </div>
            ) : (
              showImage && currentGesture && (
                <img
                  src={currentGesture.file}
                  alt={currentGesture.name}
                  className="w-[120px] h-[120px] lg:w-[160px] lg:h-[160px] object-contain invert mx-auto"
                />
              )
            )}
            {currentGesture && phase !== "transition" && (
              <p className="text-sm text-slate-200 mt-1">{currentGesture.name}</p>
            )}
          </div>

          {/* Timer bar */}
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${timerColor} transition-none`}
              style={{ width: `${timerPct * 100}%` }}
            />
          </div>

          {/* Feedback */}
          <div className={`text-xl font-bold h-8 text-center ${feedbackType === "correct" ? "text-emerald-400" : feedbackType === "wrong" ? "text-red-400" : ""}`}>
            {feedback}
          </div>
          <div className="text-xs text-slate-500 text-center">{gestureLabel}</div>

          {/* Give up */}
          <button
            onClick={() => { if (roundTimerRef.current) clearTimeout(roundTimerRef.current); endRound(false, true); }}
            className="w-full max-w-xs py-2.5 rounded-full bg-gradient-to-r from-red-900 to-red-700 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
          >
            🏳️ ยอมแพ้
          </button>
        </div>
      </div>
    </div>
  );
}
