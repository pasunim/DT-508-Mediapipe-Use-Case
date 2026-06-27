import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user!.id! },
    select: { username: true, email: true, avatarColor: true, createdAt: true },
  });

  const results = await prisma.gameResult.findMany({
    where: { userId: session!.user!.id! },
    orderBy: { playedAt: "desc" },
    take: 10,
  });

  const totalGames = results.length;
  const bestScore = totalGames ? Math.max(...results.map(r => r.score)) : 0;
  const avgScore = totalGames ? (results.reduce((s, r) => s + r.score, 0) / totalGames).toFixed(1) : "—";

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 sm:pb-6 flex flex-col gap-4">
      {/* Profile card */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-4 sm:p-6 flex items-center gap-4">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0"
          style={{ background: user?.avatarColor }}
        >
          {user?.username[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold truncate">{user?.username}</h2>
          <p className="text-slate-400 text-sm truncate">{user?.email}</p>
          <p className="text-slate-500 text-xs mt-1">
            เล่นมาตั้งแต่ {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("th-TH") : "—"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "เกมที่เล่น", value: totalGames },
          { label: "คะแนนสูงสุด", value: `${bestScore}/20` },
          { label: "คะแนนเฉลี่ย", value: avgScore },
        ].map(s => (
          <div key={s.label} className="bg-[#1e293b] border border-slate-700 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-violet-400">{s.value}</div>
            <div className="text-[11px] sm:text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* History */}
      <div>
        <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-3">ประวัติการเล่น</h3>
        {results.length === 0 ? (
          <p className="text-slate-500 text-sm">ยังไม่มีประวัติการเล่น</p>
        ) : (
          <div className="flex flex-col gap-2">
            {results.map(r => (
              <div key={r.id} className="bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs sm:text-sm text-slate-300">
                  {new Date(r.playedAt).toLocaleString("th-TH")}
                </span>
                <span className={`font-bold text-sm sm:text-base ${r.score >= 16 ? "text-emerald-400" : r.score >= 12 ? "text-yellow-400" : "text-red-400"}`}>
                  {r.score}/{r.totalRounds}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
