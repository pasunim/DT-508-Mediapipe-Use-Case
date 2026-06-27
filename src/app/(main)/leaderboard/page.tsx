import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const session = await auth();

  const results = await prisma.gameResult.groupBy({
    by: ["userId"],
    _max: { score: true },
    _count: { id: true },
    orderBy: { _max: { score: "desc" } },
    take: 20,
  });

  const userIds: string[] = results.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, avatarColor: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const board = results.map((r, i) => ({
    rank: i + 1,
    user: userMap[r.userId],
    bestScore: r._max.score ?? 0,
    gamesPlayed: r._count.id,
  }));

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-20 sm:pb-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
        🏆 อันดับสูงสุด
      </h1>
      <div className="flex flex-col gap-2">
        {board.map(row => {
          const isMe = row.user?.id === session?.user?.id;
          const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`;
          return (
            <div
              key={row.user?.id}
              className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border ${isMe ? "border-violet-500 bg-violet-900/20" : "border-slate-700 bg-[#1e293b]"}`}
            >
              <span className="w-7 sm:w-8 text-center text-base sm:text-lg flex-shrink-0">{medal}</span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: row.user?.avatarColor }}>
                {row.user?.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-sm sm:text-base truncate">{row.user?.username}</span>
                  {isMe && <span className="text-xs text-violet-400 flex-shrink-0">(คุณ)</span>}
                </div>
                <p className="text-xs text-slate-500">{row.gamesPlayed} เกม</p>
              </div>
              <span className="text-lg sm:text-xl font-bold text-violet-400 flex-shrink-0">{row.bestScore}<span className="text-xs sm:text-sm text-slate-500">/20</span></span>
            </div>
          );
        })}
        {board.length === 0 && <p className="text-slate-500 text-sm">ยังไม่มีข้อมูล</p>}
      </div>
    </div>
  );
}
