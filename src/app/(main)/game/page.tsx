import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GameClient from "./GameClient";

export default async function GamePage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user!.id! },
    select: { username: true },
  });
  return <GameClient username={user?.username ?? ""} />;
}
