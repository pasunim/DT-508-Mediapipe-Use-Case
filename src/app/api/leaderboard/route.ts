import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results = await prisma.gameResult.groupBy({
    by: ["userId"],
    _max: { score: true },
    _count: { id: true },
    orderBy: { _max: { score: "desc" } },
    take: 20,
  });

  const userIds = results.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, avatarColor: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const leaderboard = results.map((r, i) => ({
    rank: i + 1,
    user: userMap[r.userId],
    bestScore: r._max.score,
    gamesPlayed: r._count.id,
  }));

  return NextResponse.json(leaderboard);
}
