import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_GESTURE_IDS = new Set([1, 2, 3, 4, 5, 6]);
const MAX_ROUNDS = 20;
const MAX_ELAPSED = 300; // seconds — sanity cap

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { score, totalRounds, rounds } = body as Record<string, unknown>;

  if (
    typeof score !== "number" || !Number.isInteger(score) ||
    typeof totalRounds !== "number" || !Number.isInteger(totalRounds) ||
    !Array.isArray(rounds)
  ) {
    return NextResponse.json({ error: "Invalid game data" }, { status: 400 });
  }

  if (totalRounds < 1 || totalRounds > MAX_ROUNDS) {
    return NextResponse.json({ error: "Invalid totalRounds" }, { status: 400 });
  }
  if (score < 0 || score > totalRounds) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }
  if (rounds.length !== totalRounds) {
    return NextResponse.json({ error: "rounds length mismatch" }, { status: 400 });
  }

  // Validate each round
  for (const r of rounds) {
    if (typeof r !== "object" || r === null) {
      return NextResponse.json({ error: "Invalid round data" }, { status: 400 });
    }
    const { gestureId, gestureName, correct, elapsedSec } = r as Record<string, unknown>;

    if (!VALID_GESTURE_IDS.has(gestureId as number)) {
      return NextResponse.json({ error: "Invalid gestureId" }, { status: 400 });
    }
    if (typeof gestureName !== "string" || gestureName.length > 50) {
      return NextResponse.json({ error: "Invalid gestureName" }, { status: 400 });
    }
    if (typeof correct !== "boolean") {
      return NextResponse.json({ error: "Invalid correct field" }, { status: 400 });
    }
    if (elapsedSec !== null && elapsedSec !== undefined) {
      if (typeof elapsedSec !== "number" || elapsedSec < 0 || elapsedSec > MAX_ELAPSED) {
        return NextResponse.json({ error: "Invalid elapsedSec" }, { status: 400 });
      }
    }
  }

  // Server-side recount to prevent score tampering
  const recomputedScore = (rounds as Array<{ correct: unknown }>).filter(r => r.correct === true).length;
  if (recomputedScore !== score) {
    return NextResponse.json({ error: "Score mismatch" }, { status: 400 });
  }

  const result = await prisma.gameResult.create({
    data: {
      userId: session.user.id,
      score: recomputedScore,
      totalRounds,
      rounds: {
        create: (rounds as Array<{ gestureId: number; gestureName: string; correct: boolean; elapsedSec: number | null }>).map(r => ({
          gestureId: r.gestureId,
          gestureName: r.gestureName.trim(),
          correct: r.correct,
          elapsedSec: r.correct && r.elapsedSec != null ? r.elapsedSec : null,
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: result.id });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await prisma.gameResult.findMany({
    where: { userId: session.user.id },
    orderBy: { playedAt: "desc" },
    take: 20,
    include: { rounds: true },
  });

  return NextResponse.json(results);
}
